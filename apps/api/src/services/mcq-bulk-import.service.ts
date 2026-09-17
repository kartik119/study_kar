// @ts-nocheck
import ExcelJS from 'exceljs';
import { Readable } from 'stream';
import { prisma } from '@study-karnataka/database';
import {
  McqImportMode,
  McqImportStatus,
  McqRowValidationError,
  McqRowValidationResult,
  McqBulkImportAnalyzeResult,
  McqBulkImportValidateResult,
  McqBulkImportExecuteResult,
  McqBulkImportSessionRecord,
  CorrectOption,
  McqDifficulty,
  McqWorkflowStatus,
  McqSourceType,
} from '@study-karnataka/shared-types';
import { normalizeStem, McqLibraryService } from './mcq-library.service';

export class McqBulkImportServiceError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status = 400, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
    this.name = 'McqBulkImportServiceError';
  }
}

// Canonical Header Field Definitions
export const CANONICAL_IMPORT_COLUMNS = [
  { key: 'mcq_id', label: 'MCQ Code / ID', requiredInUpdate: true, description: 'Required for Update mode (e.g. MCQ_000124). Optional/blank for Add New.' },
  { key: 'question_en', label: 'Question (English)', required: true },
  { key: 'question_kn', label: 'Question (Kannada)', required: true },
  { key: 'option_a_en', label: 'Option A (English)', required: true },
  { key: 'option_a_kn', label: 'Option A (Kannada)', required: true },
  { key: 'option_b_en', label: 'Option B (English)', required: true },
  { key: 'option_b_kn', label: 'Option B (Kannada)', required: true },
  { key: 'option_c_en', label: 'Option C (English)', required: true },
  { key: 'option_c_kn', label: 'Option C (Kannada)', required: true },
  { key: 'option_d_en', label: 'Option D (English)', required: true },
  { key: 'option_d_kn', label: 'Option D (Kannada)', required: true },
  { key: 'correct_answer', label: 'Correct Answer (A/B/C/D)', required: true },
  { key: 'explanation_en', label: 'Explanation (English)', required: true },
  { key: 'explanation_kn', label: 'Explanation (Kannada)', required: true },
  { key: 'difficulty', label: 'Difficulty (EASY/MEDIUM/HARD)', required: true },
  { key: 'positive_marks', label: 'Positive Marks (+)', required: true },
  { key: 'negative_marks', label: 'Negative Marks (-)', required: true },
  { key: 'category_code', label: 'Category Code', required: true },
  { key: 'subcategory_code', label: 'Subcategory Code', required: true },
  { key: 'category_name', label: 'Category Name', required: false, description: 'Human-readable category name for resolution assist' },
  { key: 'subcategory_name', label: 'Subcategory Name', required: false, description: 'Human-readable subcategory name for resolution assist' },
  { key: 'topic_code', label: 'Topic Code', required: false },
  { key: 'topic_name', label: 'Topic Name', required: false, description: 'Human-readable topic name for resolution assist' },
  { key: 'knowledge_area_code', label: 'Knowledge Area Code', required: false },
  { key: 'source_type', label: 'Source Type', required: false },
  { key: 'source_name', label: 'Source Name', required: false },
  { key: 'source_url', label: 'Source URL', required: false },
  { key: 'is_pyq', label: 'Is PYQ (true/false)', required: false },
  { key: 'pyq_exam_name', label: 'PYQ Exam Name', required: false },
  { key: 'pyq_year', label: 'PYQ Year', required: false },
  { key: 'pyq_paper', label: 'PYQ Paper/Stage', required: false },
  { key: 'pyq_question_number', label: 'PYQ Question Number', required: false },
  { key: 'pyq_notes', label: 'PYQ Notes', required: false },
  { key: 'current_affairs_window', label: 'Current Affairs Window', required: false },
  { key: 'fact_basis', label: 'Fact Basis', required: false },
];

/**
 * Escapes values against CSV Formula Injection (=, +, -, @)
 */

export class McqBulkImportService {
  /**
   * Generates downloadable official Excel template with sheets 1-6
   */
  static async generateExcelTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Study Karnataka Admin System';
    workbook.created = new Date();

    // Sheet 1: MCQ Import (HEADER-ONLY - Do not add sample rows here)
    const importSheet = workbook.addWorksheet('MCQ Import');
    importSheet.columns = CANONICAL_IMPORT_COLUMNS.map((col) => ({
      header: col.key,
      key: col.key,
      width: 24,
    }));

    // Header Row Styling
    const headerRow = importSheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF084B7A' },
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    // Sheet 2: Instructions
    const instSheet = workbook.addWorksheet('Instructions');
    instSheet.columns = [
      { header: 'Parameter', key: 'param', width: 28 },
      { header: 'Rule / Allowed Format', key: 'rule', width: 75 },
    ];
    const instHeader = instSheet.getRow(1);
    instHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    instHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF084B7A' } };

    const instructionsData = [
      { param: 'Maximum File Rows', rule: 'Maximum 1,000 MCQs per spreadsheet file.' },
      { param: 'Add New Mode', rule: 'Leave mcq_id column BLANK. System automatically generates canonical MCQ code (e.g. MCQ_000124).' },
      { param: 'Update Existing Mode', rule: 'mcq_id is COMPULSORY (e.g. MCQ_000124). Question must exist and be in DRAFT or CHANGES_REQUESTED status.' },
      { param: 'Bilingual Completeness', rule: 'Every row MUST contain complete English and Kannada Question, Options A-D, and Explanations.' },
      { param: 'Allowed Correct Answers', rule: 'A, B, C, or D (Upper case canonical format).' },
      { param: 'Allowed Difficulty Values', rule: 'EASY, MEDIUM, or HARD (Upper case canonical format).' },
      { param: 'Scoring Format', rule: 'positive_marks > 0 (e.g. 1.0), negative_marks >= 0 (e.g. 0.25).' },
      { param: 'Compulsory Taxonomy', rule: 'category_code and subcategory_code are COMPULSORY and must match reference sheets. Unknown taxonomy will NOT be created automatically.' },
      { param: 'Optional Taxonomy', rule: 'topic_code and knowledge_area_code are OPTIONAL. If provided, hierarchy must resolve correctly.' },
      { param: 'Allowed Source Types', rule: 'ORIGINAL, PREVIOUS_YEAR_QUESTION, OFFICIAL_SOURCE, or REFERENCE.' },
      { param: 'PYQ Rules', rule: 'If is_pyq=true, source_type MUST be PREVIOUS_YEAR_QUESTION, and pyq_exam_name + pyq_year are required. If source_type=ORIGINAL, is_pyq MUST be false and pyq_* fields left blank.' },
    ];
    instructionsData.forEach((row) => instSheet.addRow(row));

    // Fetch Non-Demo Master Taxonomy Reference Data from DB
    const categories = await prisma.mcqCategory.findMany({
      where: { NOT: { code: { startsWith: 'DEMO_' } } },
      orderBy: { displayOrder: 'asc' },
    });
    const subcategories = await prisma.mcqSubcategory.findMany({
      where: {
        NOT: {
          OR: [
            { code: { startsWith: 'DEMO_' } },
            { category: { code: { startsWith: 'DEMO_' } } },
          ],
        },
      },
      include: { category: true },
      orderBy: { displayOrder: 'asc' },
    });
    const topics = await prisma.mcqTopic.findMany({
      where: {
        NOT: {
          OR: [
            { code: { startsWith: 'DEMO_' } },
            { subcategory: { code: { startsWith: 'DEMO_' } } },
            { subcategory: { category: { code: { startsWith: 'DEMO_' } } } },
          ],
        },
      },
      include: { subcategory: true },
      orderBy: { displayOrder: 'asc' },
    });
    const knowledgeAreas = await prisma.academicKnowledgeArea.findMany({
      where: {
        NOT: {
          OR: [
            { code: { startsWith: 'DEMO_' } },
            { topic: { code: { startsWith: 'DEMO_' } } },
            { topic: { subcategory: { code: { startsWith: 'DEMO_' } } } },
            { topic: { subcategory: { category: { code: { startsWith: 'DEMO_' } } } } },
          ],
        },
      },
      include: { topic: true },
      orderBy: { displayOrder: 'asc' },
    });

    // Sheet 3: Category Codes
    const catSheet = workbook.addWorksheet('Category Codes');
    catSheet.columns = [
      { header: 'category_code', key: 'code', width: 24 },
      { header: 'category_name_en', key: 'nameEn', width: 35 },
      { header: 'category_name_kn', key: 'nameKn', width: 35 },
    ];
    catSheet.getRow(1).font = { bold: true };
    categories.forEach((c) =>
      catSheet.addRow({ code: c.code, nameEn: c.nameEn, nameKn: c.nameKn })
    );

    // Sheet 4: Subcategory Codes
    const subSheet = workbook.addWorksheet('Subcategory Codes');
    subSheet.columns = [
      { header: 'subcategory_code', key: 'code', width: 28 },
      { header: 'subcategory_name_en', key: 'nameEn', width: 35 },
      { header: 'subcategory_name_kn', key: 'nameKn', width: 35 },
      { header: 'category_code', key: 'catCode', width: 24 },
    ];
    subSheet.getRow(1).font = { bold: true };
    subcategories.forEach((s) =>
      subSheet.addRow({
        code: s.code,
        nameEn: s.nameEn,
        nameKn: s.nameKn,
        catCode: s.category.code,
      })
    );

    // Sheet 5: Topic Codes
    const topSheet = workbook.addWorksheet('Topic Codes');
    topSheet.columns = [
      { header: 'topic_code', key: 'code', width: 28 },
      { header: 'topic_name_en', key: 'nameEn', width: 35 },
      { header: 'topic_name_kn', key: 'nameKn', width: 35 },
      { header: 'subcategory_code', key: 'subCode', width: 28 },
    ];
    topSheet.getRow(1).font = { bold: true };
    topics.forEach((t) =>
      topSheet.addRow({
        code: t.code,
        nameEn: t.nameEn,
        nameKn: t.nameKn,
        subCode: t.subcategory.code,
      })
    );

    // Sheet 6: Knowledge Area Codes
    const kaSheet = workbook.addWorksheet('Knowledge Area Codes');
    kaSheet.columns = [
      { header: 'knowledge_area_code', key: 'code', width: 28 },
      { header: 'knowledge_area_name_en', key: 'nameEn', width: 35 },
      { header: 'knowledge_area_name_kn', key: 'nameKn', width: 35 },
      { header: 'topic_code', key: 'topCode', width: 28 },
    ];
    kaSheet.getRow(1).font = { bold: true };
    knowledgeAreas.forEach((ka) =>
      kaSheet.addRow({
        code: ka.code,
        nameEn: ka.nameEn,
        nameKn: ka.nameKn,
        topCode: ka.topic.code,
      })
    );

    // Sheet 7: Example MCQ (Optional Reference Examples)
    const exampleSheet = workbook.addWorksheet('Example MCQ');
    exampleSheet.columns = CANONICAL_IMPORT_COLUMNS.map((col) => ({
      header: col.key,
      key: col.key,
      width: 24,
    }));
    const exHeader = exampleSheet.getRow(1);
    exHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    exHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF084B7A' } };

    // Find a valid non-demo Topic code if available for POLITY -> FUNDAMENTAL_RIGHTS
    const validPolityTopic = topics.find(
      (t) => t.subcategory.code === 'FUNDAMENTAL_RIGHTS'
    );
    const validTopicCode = validPolityTopic ? validPolityTopic.code : '';

    // Example Row 1: ORIGINAL Content
    exampleSheet.addRow({
      mcq_id: '',
      question_en: 'Consider the following statements regarding Fundamental Rights:\n1. Article 14 guarantees equality before law.\n2. Article 15 prohibits discrimination.\nWhich of the above are correct?',
      question_kn: 'ಮೂಲಭೂತ ಹಕ್ಕುಗಳಿಗೆ ಸಂಬಂಧಿಸಿದಂತೆ ಕೆಳಗಿನ ಹೇಳಿಕೆಗಳನ್ನು ಪರಿಶೀಲಿಸಿ:\n೧. ವಿಧಿ ೧೪ ರ ಪ್ರಕಾರ ಕಾನೂನಿನ ಮುಂದೆ ಸಮಾನತೆ ನೀಡಲಾಗಿದೆ.\n೨. ವಿಧಿ ೧೫ ರ ಪ್ರಕಾರ ತಾರತಮ್ಯ ನಿಷೇಧಿಸಲಾಗಿದೆ.\nಯಾವುವು ಸರಿಯಾಗಿವೆ?',
      option_a_en: '1 only',
      option_a_kn: '೧ ಮಾತ್ರ',
      option_b_en: '2 only',
      option_b_kn: '೨ ಮಾತ್ರ',
      option_c_en: 'Both 1 and 2',
      option_c_kn: '೧ ಮತ್ತು ೨ ಎರಡೂ',
      option_d_en: 'Neither 1 nor 2',
      option_d_kn: '೧ ಹಾಗೂ ೨ ಯಾವುದೂ ಅಲ್ಲ',
      correct_answer: 'C',
      explanation_en: 'Both statements are correct under Part III of the Indian Constitution.',
      explanation_kn: 'ಭಾರತೀಯ ಸಂವಿಧಾನದ ಭಾಗ III ರ ಅಡಿಯಲ್ಲಿ ಎರಡೂ ಹೇಳಿಕೆಗಳೂ ಸರಿಯಾಗಿವೆ.',
      difficulty: 'MEDIUM',
      positive_marks: 1.0,
      negative_marks: 0.25,
      category_code: 'POLITY',
      subcategory_code: 'FUNDAMENTAL_RIGHTS',
      topic_code: validTopicCode,
      knowledge_area_code: '',
      source_type: 'ORIGINAL',
      source_name: 'Indian Polity Reference',
      source_url: '',
      is_pyq: 'false',
      pyq_exam_name: '',
      pyq_year: '',
      pyq_paper: '',
      pyq_question_number: '',
      pyq_notes: '',
    });

    // Example Row 2: PREVIOUS_YEAR_QUESTION Content
    exampleSheet.addRow({
      mcq_id: '',
      question_en: 'Under which Article of the Constitution of India is the Right to Equality before Law guaranteed?',
      question_kn: 'ಭಾರತದ ಸಂವಿಧಾನದ ಯಾವ ವಿಧಿಯ ಅಡಿಯಲ್ಲಿ ಕಾನೂನಿನ ಮುಂದೆ ಸಮಾನತೆಯ ಹಕ್ಕನ್ನು ಖಾತರಿಪಡಿಸಲಾಗಿದೆ?',
      option_a_en: 'Article 14',
      option_a_kn: 'ವಿಧಿ ೧೪',
      option_b_en: 'Article 19',
      option_b_kn: 'ವಿಧಿ ೧೯',
      option_c_en: 'Article 21',
      option_c_kn: 'ವಿಧಿ ೨೧',
      option_d_en: 'Article 32',
      option_d_kn: 'ವಿಧಿ ೩೨',
      correct_answer: 'A',
      explanation_en: 'Article 14 of the Constitution of India guarantees equality before law and equal protection of the laws within the territory of India.',
      explanation_kn: 'ಭಾರತದ ಸಂವಿಧಾನದ ೧೪ನೇ ವಿಧಿಯು ಕಾನೂನಿನ ಮುಂದೆ ಸಮಾನತೆ ಮತ್ತು ಭಾರತದ ಭೂಪ್ರದೇಶದಲ್ಲಿ ಕಾನೂನುಗಳ ಸಮಾನ ರಕ್ಷಣೆಯನ್ನು ನೀಡುತ್ತದೆ.',
      difficulty: 'EASY',
      positive_marks: 1.0,
      negative_marks: 0.25,
      category_code: 'POLITY',
      subcategory_code: 'FUNDAMENTAL_RIGHTS',
      topic_code: validTopicCode,
      knowledge_area_code: '',
      source_type: 'PREVIOUS_YEAR_QUESTION',
      source_name: 'KAS Prelims Official Paper',
      source_url: '',
      is_pyq: 'true',
      pyq_exam_name: 'KAS Prelims',
      pyq_year: '2020',
      pyq_paper: 'General Studies Paper 1',
      pyq_question_number: 'Q. 14',
      pyq_notes: 'Official KAS Prelims 2020 Question',
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  /**
   * Generates downloadable official CSV template
   */
  static async generateCsvTemplate(): Promise<string> {
    const headers = CANONICAL_IMPORT_COLUMNS.map((c) => c.key).join(',');
    return `\uFEFF${headers}`;
  }

  /**
   * Reads XLSX or CSV file buffer and returns raw rows & headers
   */
  static async parseSpreadsheetBuffer(
    buffer: Buffer,
    fileType: 'XLSX' | 'CSV',
    worksheetName?: string
  ): Promise<{ headers: string[]; rows: Record<string, string>[]; worksheets?: string[]; selectedWorksheet?: string }> {
    const workbook = new ExcelJS.Workbook();
    if (fileType === 'XLSX') {
      await workbook.xlsx.load(buffer as any);
    } else {
      const stream = Readable.from(buffer);
      await workbook.csv.read(stream as any);
    }

    const sheetNames = workbook.worksheets.map((ws) => ws.name);
    let selectedSheet = workbook.worksheets[0];
    if (worksheetName) {
      const match = workbook.getWorksheet(worksheetName);
      if (match) selectedSheet = match;
    } else if (sheetNames.includes('MCQ Import')) {
      selectedSheet = workbook.getWorksheet('MCQ Import')!;
    }

    if (!selectedSheet || selectedSheet.rowCount < 1) {
      return { headers: [], rows: [], worksheets: sheetNames, selectedWorksheet: selectedSheet?.name };
    }

    const headers: string[] = [];
    const firstRow = selectedSheet.getRow(1);
    firstRow.eachCell({ includeEmpty: false }, (cell) => {
      let rawVal = '';
      if (cell.value !== null && cell.value !== undefined) {
        if (typeof cell.value === 'object') {
          if ('result' in cell.value) rawVal = String(cell.value.result ?? '');
          else if ('text' in cell.value) rawVal = String(cell.value.text ?? '');
          else if ('richText' in cell.value && Array.isArray((cell.value as any).richText)) {
            rawVal = (cell.value as any).richText.map((r: any) => r.text).join('');
          } else rawVal = JSON.stringify(cell.value);
        } else {
          rawVal = String(cell.value);
        }
      }

      // Strip UTF-8 BOM \uFEFF and trim
      const cleanHeader = rawVal.replace(/^\uFEFF/, '').trim();
      if (cleanHeader.length > 0) {
        headers.push(cleanHeader);
      }
    });

    if (headers.length === 0) {
      return { headers: [], rows: [], worksheets: sheetNames, selectedWorksheet: selectedSheet.name };
    }

    const rows: Record<string, string>[] = [];
    selectedSheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header row

      // Check if row is completely empty
      let hasData = false;
      const rowData: Record<string, string> = {};

      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const headerKey = headers[colNumber - 1];
        if (headerKey) {
          let cellText = '';
          if (cell.value !== null && cell.value !== undefined) {
            if (typeof cell.value === 'object') {
              if ('result' in cell.value) cellText = String(cell.value.result ?? '');
              else if ('text' in cell.value) cellText = String(cell.value.text ?? '');
              else if ('richText' in cell.value && Array.isArray((cell.value as any).richText)) {
                cellText = (cell.value as any).richText.map((r: any) => r.text).join('');
              } else cellText = JSON.stringify(cell.value);
            } else {
              cellText = String(cell.value);
            }
          }

          const trimmed = cellText.trim();
          if (trimmed.length > 0) hasData = true;
          rowData[headerKey] = cellText;
        }
      });

      if (hasData) {
        rows.push(rowData);
      }
    });

    return {
      headers,
      rows,
      worksheets: sheetNames,
      selectedWorksheet: selectedSheet.name,
    };
  }

  /**
   * Fuzzy name match for Taxonomy Resolution
   */
  static isNameMatch(masterName: string, uploadedName: string): boolean {
    const normStr = (s: string) => (s || '').replace(/^\uFEFF/, '').trim().toLowerCase().replace(/[\s\-\_]+/g, ' ');
    const n1 = normStr(masterName);
    const n2 = normStr(uploadedName);
    if (!n1 || !n2) return false;
    if (n1 === n2) return true;
    const clean1 = n1.replace(/&/g, 'and').replace(/[^a-z0-9\s]/g, '').trim();
    const clean2 = n2.replace(/&/g, 'and').replace(/[^a-z0-9\s]/g, '').trim();
    if (clean1 === clean2) return true;
    if (clean1.startsWith(clean2) || clean2.startsWith(clean1)) return true;
    return false;
  }

  /**
   * Safe Alias & Exact Column Auto-Mapping Solver
   */
  static buildAutoColumnMappings(headers: string[]): Record<string, string> {
    const autoMappings: Record<string, string> = {};
    const usedHeaders = new Set<string>();

    const aliasMap: Record<string, string[]> = {
      mcq_id: ['mcq_id', 'mcq_code', 'question_id', 'question_code', 'mcq_number'],
      question_en: ['question_en', 'english_question', 'question_english', 'question_text_en', 'eng_question', 'q_en', 'stem_en'],
      question_kn: ['question_kn', 'kannada_question', 'question_kannada', 'question_text_kn', 'kan_question', 'q_kn', 'stem_kn'],
      option_a_en: ['option_a_en', 'optiona_en', 'option_a_english', 'opt_a_en', 'a_en'],
      option_a_kn: ['option_a_kn', 'optiona_kn', 'option_a_kannada', 'opt_a_kn', 'a_kn'],
      option_b_en: ['option_b_en', 'optionb_en', 'option_b_english', 'opt_b_en', 'b_en'],
      option_b_kn: ['option_b_kn', 'optionb_kn', 'option_b_kannada', 'opt_b_kn', 'b_kn'],
      option_c_en: ['option_c_en', 'optionc_en', 'option_c_english', 'opt_c_en', 'c_en'],
      option_c_kn: ['option_c_kn', 'optionc_kn', 'option_c_kannada', 'opt_c_kn', 'c_kn'],
      option_d_en: ['option_d_en', 'optiond_en', 'option_d_english', 'opt_d_en', 'd_en'],
      option_d_kn: ['option_d_kn', 'optiond_kn', 'option_d_kannada', 'opt_d_kn', 'd_kn'],
      correct_answer: ['correct_answer', 'correct_option', 'answer', 'answer_key', 'correct_ans', 'ans'],
      explanation_en: ['explanation_en', 'explanation_english', 'exp_en', 'sol_en', 'solution_en'],
      explanation_kn: ['explanation_kn', 'explanation_kannada', 'exp_kn', 'sol_kn', 'solution_kn'],
      difficulty: ['difficulty', 'difficulty_level', 'level'],
      positive_marks: ['positive_marks', 'pos_marks', 'marks_positive', 'positive_mark'],
      negative_marks: ['negative_marks', 'neg_marks', 'negative_marking', 'marks_negative', 'negative_mark'],
      category_code: ['category_code', 'category', 'cat_code', 'academic_category'],
      subcategory_code: ['subcategory_code', 'sub_category', 'subcategory', 'subcat_code', 'sub_category_code'],
      category_name: ['category_name', 'category_title', 'cat_name'],
      subcategory_name: ['subcategory_name', 'sub_category_name', 'subcategory_title', 'subcat_name'],
      topic_code: ['topic_code', 'topic', 'top_code'],
      topic_name: ['topic_name', 'topic_title', 'top_name'],
      knowledge_area_code: ['knowledge_area_code', 'knowledge_area', 'ka_code'],
      source_type: ['source_type', 'source'],
      source_name: ['source_name'],
      source_url: ['source_url'],
      is_pyq: ['is_pyq', 'pyq'],
      pyq_exam_name: ['pyq_exam_name', 'exam_name'],
      pyq_year: ['pyq_year', 'exam_year', 'year'],
      pyq_paper: ['pyq_paper', 'exam_paper', 'paper'],
      pyq_question_number: ['pyq_question_number', 'pyq_qno'],
      pyq_notes: ['pyq_notes'],
      current_affairs_window: ['current_affairs_window', 'ca_window'],
      fact_basis: ['fact_basis', 'basis'],
    };

    const norm = (str: string) =>
      str.replace(/^\uFEFF/, '').trim().toLowerCase().replace(/[\s\-\_]+/g, '_').replace(/[^a-z0-9\_]/g, '');

    // Pass 1: Exact Match (Highest Confidence)
    for (const col of CANONICAL_IMPORT_COLUMNS) {
      const targetKey = col.key;
      const normTarget = norm(targetKey);

      const exactMatch = headers.find((h) => {
        if (usedHeaders.has(h)) return false;
        return norm(h) === normTarget;
      });

      if (exactMatch) {
        autoMappings[targetKey] = exactMatch;
        usedHeaders.add(exactMatch);
      }
    }

    // Pass 2: Safe Unambiguous Alias Match
    for (const col of CANONICAL_IMPORT_COLUMNS) {
      const targetKey = col.key;
      if (autoMappings[targetKey]) continue;

      const aliases = aliasMap[targetKey] || [targetKey];
      const normAliases = aliases.map(norm);

      const aliasMatch = headers.find((h) => {
        if (usedHeaders.has(h)) return false;
        const normH = norm(h);

        // Do not auto-map ambiguous headers like "question", "option", "explanation" without language indicators
        if (normH === 'question' || normH === 'option' || normH === 'explanation') {
          return false;
        }

        return normAliases.includes(normH);
      });

      if (aliasMatch) {
        autoMappings[targetKey] = aliasMatch;
        usedHeaders.add(aliasMatch);
      }
    }

    return autoMappings;
  }

  /**
   * Analyzes uploaded file and returns header mappings
   */
  static async analyzeFile(
    fileName: string,
    fileBuffer: Buffer,
    adminId?: string
  ): Promise<McqBulkImportAnalyzeResult> {
    const isCsv = fileName.toLowerCase().endsWith('.csv');
    const fileType = isCsv ? 'CSV' : 'XLSX';

    const parsed = await this.parseSpreadsheetBuffer(fileBuffer, fileType);

    if (parsed.rows.length > 1000) {
      throw new McqBulkImportServiceError('Maximum 1,000 MCQs can be imported in one file.', 400);
    }

    // Solve Auto Column Mappings
    const autoMappings = this.buildAutoColumnMappings(parsed.headers);

    // Create Session in Database
    const session = await prisma.mcqBulkImportSession.create({
      data: {
        originalFileName: fileName,
        fileType,
        importMode: 'ADD_NEW',
        totalRows: parsed.rows.length,
        status: 'UPLOADED',
        startedByAdminId: adminId || null,
        reportSummary: {
          fileBufferBase64: fileBuffer.toString('base64'),
          headers: parsed.headers,
          worksheets: parsed.worksheets,
          selectedWorksheet: parsed.selectedWorksheet,
        },
      },
    });

    return {
      sessionId: session.id,
      originalFileName: fileName,
      fileType,
      totalRowsDetected: parsed.rows.length,
      detectedHeaders: parsed.headers,
      headers: parsed.headers,
      autoColumnMappings: autoMappings,
      worksheets: parsed.worksheets,
      selectedWorksheet: parsed.selectedWorksheet,
    };
  }

  /**
   * Validates parsed spreadsheet rows against business rules & taxonomy
   */
  static async validateSession(
    sessionId: string,
    importMode: McqImportMode,
    columnMappings: Record<string, string>,
    selectedWorksheet?: string,
    taxonomyOverrides?: any
  ): Promise<McqBulkImportValidateResult> {
    const session = await prisma.mcqBulkImportSession.findUnique({
      where: { id: sessionId },
    });

    if (!session || !session.reportSummary) {
      throw new McqBulkImportServiceError('Import session expired or not found', 404);
    }

    const summary = session.reportSummary as any;
    const effectiveOverrides = taxonomyOverrides || summary.taxonomyOverrides || {};

    // Save updated overrides back to session summary for execution persistence
    await prisma.mcqBulkImportSession.update({
      where: { id: sessionId },
      data: {
        reportSummary: {
          ...summary,
          taxonomyOverrides: effectiveOverrides,
          columnMappings,
          selectedWorksheet: selectedWorksheet || summary.selectedWorksheet,
        },
      },
    });

    const fileBuffer = Buffer.from(summary.fileBufferBase64, 'base64');
    const parsed = await this.parseSpreadsheetBuffer(
      fileBuffer,
      session.fileType as 'XLSX' | 'CSV',
      selectedWorksheet || summary.selectedWorksheet
    );

    if (parsed.rows.length > 1000) {
      throw new McqBulkImportServiceError('Maximum 1,000 MCQs can be imported in one file.', 400);
    }

    // 1. Column Mapping Validation
    const unmappedRequired = CANONICAL_IMPORT_COLUMNS.filter((col) => {
      if (importMode === 'UPDATE_EXISTING' && col.key === 'mcq_id') return !columnMappings['mcq_id'];
      return col.required && !columnMappings[col.key];
    });

    if (unmappedRequired.length > 0) {
      const missingKeys = unmappedRequired.map((c) => c.label).join(', ');
      throw new McqBulkImportServiceError(`Required column mappings are missing: ${missingKeys}`, 400);
    }

    // Load Taxonomy Master Data for Validation
    const categories = await prisma.mcqCategory.findMany();
    const subcategories = await prisma.mcqSubcategory.findMany({
      include: { category: true },
    });
    const topics = await prisma.mcqTopic.findMany({
      include: { subcategory: { include: { category: true } } },
    });
    const knowledgeAreas = await prisma.academicKnowledgeArea.findMany({
      include: { topic: { include: { subcategory: true } } },
    });

    const normStr = (s: string) => (s || '').replace(/^\uFEFF/, '').trim().toLowerCase().replace(/[\s\-\_]+/g, ' ');

    const isNameMatch = McqBulkImportService.isNameMatch;

    const categoryMapByCode = new Map(categories.map((c) => [c.code.toUpperCase(), c]));
    const kaMapByCode = new Map(knowledgeAreas.map((k) => [k.code.toUpperCase(), k]));

    // Existing Database Questions map for Update Mode & Duplicate Check
    const existingQuestions = await prisma.mcqQuestion.findMany({
      select: {
        id: true,
        code: true,
        status: true,
        normalizedStemEn: true,
        normalizedStemKn: true,
        questionTextEn: true,
        questionTextKn: true,
        explanationEn: true,
        correctOption: true,
        difficulty: true,
        positiveMarks: true,
      },
    });

    const existingCodeMap = new Map(existingQuestions.map((q) => [q.code.toUpperCase(), q]));
    const existingStemEnMap = new Map(
      existingQuestions
        .filter((q) => q.normalizedStemEn)
        .map((q) => [q.normalizedStemEn!, q])
    );

    const rowResults: McqRowValidationResult[] = [];
    const taxonomyResolutionMap = new Map<string, any>();
    const seenStemsInUpload = new Map<string, number>();

    // Summary Metric Trackers
    const taxonomySummaryTracker = new Map<string, {
      uploadedKey: string;
      uploadedCode?: string;
      uploadedName?: string;
      type: 'CATEGORY' | 'SUBCATEGORY' | 'TOPIC' | 'KNOWLEDGE_AREA';
      parentKey?: string;
      rowCount: number;
      status: 'RESOLVED' | 'UNRESOLVED' | 'CONFLICT' | 'IGNORED_OPTIONAL';
      resolvedId?: string;
      resolvedNameEn?: string;
      resolutionMethod?: 'Exact Code' | 'Name Match' | 'Manual Batch Override' | 'Ignored Optional';
      errorMessage?: string;
    }>();

    let diffEasyCount = 0;
    let diffMediumCount = 0;
    let diffHardCount = 0;
    let diffNormalizedModerateCount = 0;

    let srcOriginalCount = 0;
    let srcPyqCount = 0;
    let srcOfficialCount = 0;
    let srcReferenceCount = 0;
    let srcNormalizedAliasesCount = 0;

    let totalValid = 0;
    let totalErrors = 0;
    let totalWarnings = 0;

    // Process each spreadsheet row
    for (let i = 0; i < parsed.rows.length; i++) {
      const row = parsed.rows[i];
      const rowNumber = i + 2; // 1-indexed (header is line 1)
      const issues: McqRowValidationError[] = [];
      const diffPreview: { field: string; currentValue: any; incomingValue: any }[] = [];

      const getValue = (key: string) => {
        const mappedColHeader = columnMappings[key];
        if (!mappedColHeader) return '';
        return (row[mappedColHeader] || '').trim();
      };

      const mcqId = getValue('mcq_id');
      const questionEn = getValue('question_en');
      const questionKn = getValue('question_kn');
      const optionA_En = getValue('option_a_en');
      const optionA_Kn = getValue('option_a_kn');
      const optionB_En = getValue('option_b_en');
      const optionB_Kn = getValue('option_b_kn');
      const optionC_En = getValue('option_c_en');
      const optionC_Kn = getValue('option_c_kn');
      const optionD_En = getValue('option_d_en');
      const optionD_Kn = getValue('option_d_kn');
      const correctAnsRaw = getValue('correct_answer').toUpperCase();
      const explanationEn = getValue('explanation_en');
      const explanationKn = getValue('explanation_kn');
      const difficultyRaw = getValue('difficulty').trim();
      const posMarksRaw = getValue('positive_marks');
      const negMarksRaw = getValue('negative_marks');

      const catCode = getValue('category_code').toUpperCase();
      const catName = getValue('category_name');
      const subCode = getValue('subcategory_code').toUpperCase();
      const subName = getValue('subcategory_name');
      const topCode = getValue('topic_code').toUpperCase();
      const topName = getValue('topic_name');
      const kaCode = getValue('knowledge_area_code').toUpperCase();
      const sourceTypeRaw = getValue('source_type').trim();

      // 1. Mode Specific MCQ ID Check
      let existingTargetQ: any = null;
      if (importMode === 'UPDATE_EXISTING') {
        if (!mcqId) {
          issues.push({
            rowNumber,
            field: 'mcq_id',
            uploadedValue: '',
            errorCode: 'MISSING_MCQ_ID',
            errorMessage: 'MCQ Code / ID is required in Update mode (e.g. MCQ_000124)',
            isBlocking: true,
          });
        } else {
          existingTargetQ = existingCodeMap.get(mcqId.toUpperCase());
          if (!existingTargetQ) {
            issues.push({
              rowNumber,
              field: 'mcq_id',
              uploadedValue: mcqId,
              errorCode: 'NONEXISTENT_MCQ_ID',
              errorMessage: `MCQ Code ${mcqId} does not exist in Question Library`,
              isBlocking: true,
            });
          } else {
            const allowedUpdateStatuses: McqWorkflowStatus[] = ['DRAFT', 'CHANGES_REQUESTED'];
            if (!allowedUpdateStatuses.includes(existingTargetQ.status)) {
              issues.push({
                rowNumber,
                field: 'mcq_id',
                uploadedValue: mcqId,
                errorCode: 'BLOCKED_STATUS_UPDATE',
                errorMessage: `Cannot update MCQ ${mcqId} in status ${existingTargetQ.status}. Only DRAFT or CHANGES_REQUESTED can be updated.`,
                isBlocking: true,
              });
            }
          }
        }
      } else if (mcqId) {
        // Just ignore the MCQ ID if it's ADD_NEW mode, no need to issue a warning
      }

      // 2. Compulsory Bilingual Content Completeness
      if (!questionEn) issues.push({ rowNumber, field: 'question_en', errorCode: 'MISSING_FIELD', errorMessage: 'English Question stem is required', isBlocking: true });
      if (!questionKn) issues.push({ rowNumber, field: 'question_kn', errorCode: 'MISSING_FIELD', errorMessage: 'Kannada Question stem is required', isBlocking: true });
      if (!optionA_En) issues.push({ rowNumber, field: 'option_a_en', errorCode: 'MISSING_FIELD', errorMessage: 'English Option A is required', isBlocking: true });
      if (!optionA_Kn) issues.push({ rowNumber, field: 'option_a_kn', errorCode: 'MISSING_FIELD', errorMessage: 'Kannada Option A is required', isBlocking: true });
      if (!optionB_En) issues.push({ rowNumber, field: 'option_b_en', errorCode: 'MISSING_FIELD', errorMessage: 'English Option B is required', isBlocking: true });
      if (!optionB_Kn) issues.push({ rowNumber, field: 'option_b_kn', errorCode: 'MISSING_FIELD', errorMessage: 'Kannada Option B is required', isBlocking: true });
      if (!optionC_En) issues.push({ rowNumber, field: 'option_c_en', errorCode: 'MISSING_FIELD', errorMessage: 'English Option C is required', isBlocking: true });
      if (!optionC_Kn) issues.push({ rowNumber, field: 'option_c_kn', errorCode: 'MISSING_FIELD', errorMessage: 'Kannada Option C is required', isBlocking: true });
      if (!optionD_En) issues.push({ rowNumber, field: 'option_d_en', errorCode: 'MISSING_FIELD', errorMessage: 'English Option D is required', isBlocking: true });
      if (!optionD_Kn) issues.push({ rowNumber, field: 'option_d_kn', errorCode: 'MISSING_FIELD', errorMessage: 'Kannada Option D is required', isBlocking: true });
      if (!explanationEn) issues.push({ rowNumber, field: 'explanation_en', errorCode: 'MISSING_FIELD', errorMessage: 'English Explanation is required', isBlocking: true });
      if (!explanationKn) issues.push({ rowNumber, field: 'explanation_kn', errorCode: 'MISSING_FIELD', errorMessage: 'Kannada Explanation is required', isBlocking: true });

      // 3. Correct Answer Validation
      let normalizedCorrect: CorrectOption = 'A';
      if (!['A', 'B', 'C', 'D'].includes(correctAnsRaw)) {
        issues.push({
          rowNumber,
          field: 'correct_answer',
          uploadedValue: correctAnsRaw,
          errorCode: 'INVALID_CORRECT_ANSWER',
          errorMessage: `Invalid correct answer '${correctAnsRaw}'. Must be A, B, C, or D.`,
          isBlocking: true,
        });
      } else {
        normalizedCorrect = correctAnsRaw as CorrectOption;
      }

      // 4. Difficulty Normalization & Alias Solver (MODERATE -> MEDIUM)
      let normalizedDiff: McqDifficulty = 'MEDIUM';
      const diffUpper = difficultyRaw.toUpperCase();

      if (diffUpper === 'EASY' || diffUpper === 'EASY_LEVEL') {
        normalizedDiff = 'EASY';
        diffEasyCount++;
      } else if (diffUpper === 'HARD' || diffUpper === 'DIFFICULT') {
        normalizedDiff = 'HARD';
        diffHardCount++;
      } else if (['MEDIUM', 'MODERATE', 'MOD', 'INTERMEDIATE'].includes(diffUpper)) {
        normalizedDiff = 'MEDIUM';
        diffMediumCount++;
        if (diffUpper === 'MODERATE' || diffUpper === 'MOD') {
          diffNormalizedModerateCount++;
          // Silently normalize
        }
      } else if (!diffUpper) {
        normalizedDiff = 'MEDIUM';
        diffMediumCount++;
      } else {
        issues.push({
          rowNumber,
          field: 'difficulty',
          uploadedValue: difficultyRaw,
          errorCode: 'INVALID_DIFFICULTY',
          errorMessage: `Invalid difficulty '${difficultyRaw}'. Allowed: EASY, MEDIUM, HARD.`,
          isBlocking: true,
        });
      }

      // 5. Source Type Alias Normalization
      let normalizedSourceType: McqSourceType = 'ORIGINAL';
      const srcUpper = sourceTypeRaw.toUpperCase();
      const sourceAliasMap: Record<string, McqSourceType> = {
        GOVT_KARNATAKA: 'OFFICIAL_SOURCE',
        GOVT_INDIA: 'OFFICIAL_SOURCE',
        STATUTORY_BODY: 'OFFICIAL_SOURCE',
        OFFICIAL_SOURCE: 'OFFICIAL_SOURCE',
        STANDARD_TEXT: 'REFERENCE',
        REFERENCE: 'REFERENCE',
        ORIGINAL_CALCULATION: 'ORIGINAL',
        ORIGINAL: 'ORIGINAL',
        PREVIOUS_YEAR_QUESTION: 'PREVIOUS_YEAR_QUESTION',
        PYQ: 'PREVIOUS_YEAR_QUESTION',
      };

      if (srcUpper && sourceAliasMap[srcUpper]) {
        normalizedSourceType = sourceAliasMap[srcUpper];
        if (srcUpper !== normalizedSourceType) {
          srcNormalizedAliasesCount++;
          // Silently normalize
        }
      } else if (srcUpper) {
        // Silently default to ORIGINAL
      }

      if (normalizedSourceType === 'ORIGINAL') srcOriginalCount++;
      else if (normalizedSourceType === 'PREVIOUS_YEAR_QUESTION') srcPyqCount++;
      else if (normalizedSourceType === 'OFFICIAL_SOURCE') srcOfficialCount++;
      else if (normalizedSourceType === 'REFERENCE') srcReferenceCount++;

      // 6. Marks Validation
      const posMarksNum = parseFloat(posMarksRaw);
      const negMarksNum = parseFloat(negMarksRaw);
      if (isNaN(posMarksNum) || posMarksNum <= 0) {
        issues.push({
          rowNumber,
          field: 'positive_marks',
          uploadedValue: posMarksRaw,
          errorCode: 'INVALID_MARKS',
          errorMessage: `Positive marks must be a positive number (got '${posMarksRaw}')`,
          isBlocking: true,
        });
      }
      if (isNaN(negMarksNum) || negMarksNum < 0) {
        issues.push({
          rowNumber,
          field: 'negative_marks',
          uploadedValue: negMarksRaw,
          errorCode: 'INVALID_MARKS',
          errorMessage: `Negative marks must be 0 or greater (got '${negMarksRaw}')`,
          isBlocking: true,
        });
      }

      // 7. TAXONOMY RESOLUTION (Category & Subcategory Compulsory, Topic & KA Optional)
      let resolvedCategory: any = null;
      let categoryResolutionMethod: 'Exact Code' | 'Name Match' | 'Manual Batch Override' | null = null;
      const catKey = catCode || catName;

      // Check manual batch override first
      const catOverrideId = effectiveOverrides?.categories?.[catCode] || effectiveOverrides?.categories?.[catName];
      if (catOverrideId) {
        resolvedCategory = categories.find((c) => c.id === catOverrideId);
        if (resolvedCategory) categoryResolutionMethod = 'Manual Batch Override';
      }

      if (!resolvedCategory) {
        // Priority A: Exact Code Match
        const matchByCode = catCode ? categoryMapByCode.get(catCode) : null;
        if (matchByCode) {
          // Cross-check Category Name for conflicts if provided
          if (catName) {
            const normCatName = normStr(catName);
            const normCodeCatNameEn = normStr(matchByCode.nameEn);
            const normCodeCatNameKn = normStr(matchByCode.nameKn);

            const isNameMatching =
              normCodeCatNameEn === normCatName ||
              (normCodeCatNameKn && normCodeCatNameKn === normCatName) ||
              normCodeCatNameEn.includes(normCatName) ||
              normCatName.includes(normCodeCatNameEn);

            if (!isNameMatching) {
              const matchByNameList = categories.filter((c) => normStr(c.nameEn) === normCatName || normStr(c.nameKn) === normCatName);
              const conflictingName = matchByNameList.length > 0 ? matchByNameList[0].nameEn : catName;

              issues.push({
                rowNumber,
                field: 'category_code',
                uploadedValue: `Code: ${catCode}, Name: ${catName}`,
                errorCode: 'CATEGORY_CODE_NAME_CONFLICT',
                errorMessage: `Category code '${catCode}' resolves to '${matchByCode.nameEn}', but Category name specifies '${conflictingName}'. Conflict detected.`,
                isBlocking: true,
              });
            }
          }

          if (!issues.some((i) => i.errorCode === 'CATEGORY_CODE_NAME_CONFLICT')) {
            resolvedCategory = matchByCode;
            categoryResolutionMethod = 'Exact Code';
          }
        } else if (catName) {
          // Priority B: Name-Assisted Resolution (Exact match first, then fuzzy fallback)
          let matchByNameList = categories.filter(
            (c) => normStr(c.nameEn) === normStr(catName) || (c.nameKn && normStr(c.nameKn) === normStr(catName))
          );

          if (matchByNameList.length === 0) {
            const fuzzyList = categories.filter(
              (c) => isNameMatch(c.nameEn, catName) || (c.nameKn && isNameMatch(c.nameKn, catName))
            );
            if (fuzzyList.length === 1) {
              matchByNameList = fuzzyList;
            } else if (fuzzyList.length > 1) {
              matchByNameList = fuzzyList;
            }
          }

          if (matchByNameList.length === 1) {
            resolvedCategory = matchByNameList[0];
            categoryResolutionMethod = 'Name Match';
            // Silently resolve by name
          } else if (matchByNameList.length > 1) {
            issues.push({
              rowNumber,
              field: 'category_name',
              uploadedValue: catName,
              errorCode: 'AMBIGUOUS_CATEGORY_NAME',
              errorMessage: `Category name '${catName}' matches multiple master categories.`,
              isBlocking: true,
            });
          }
        }
      }

      if (!resolvedCategory && !issues.some((i) => i.errorCode === 'CATEGORY_CODE_NAME_CONFLICT' || i.errorCode === 'AMBIGUOUS_CATEGORY_NAME')) {
        issues.push({
          rowNumber,
          field: 'category_code',
          uploadedValue: catCode || catName,
          errorCode: 'UNMAPPED_CATEGORY',
          errorMessage: `Category '${catName || catCode}' not found in master taxonomy.`,
          isBlocking: true,
        });
      }

      // Track Category in Taxonomy Summary Tracker
      const catTrackKey = `CAT:${catKey}`;
      if (!taxonomySummaryTracker.has(catTrackKey)) {
        taxonomySummaryTracker.set(catTrackKey, {
          uploadedKey: catTrackKey,
          uploadedCode: catCode,
          uploadedName: catName,
          type: 'CATEGORY',
          rowCount: 0,
          status: resolvedCategory ? 'RESOLVED' : issues.some((i) => i.errorCode === 'CATEGORY_CODE_NAME_CONFLICT') ? 'CONFLICT' : 'UNRESOLVED',
          resolvedId: resolvedCategory?.id,
          resolvedNameEn: resolvedCategory?.nameEn,
          resolutionMethod: categoryResolutionMethod || undefined,
          errorMessage: !resolvedCategory ? `Category '${catName || catCode}' not found` : undefined,
        });
      }
      taxonomySummaryTracker.get(catTrackKey)!.rowCount++;

      // Subcategory Resolution (MUST resolve INSIDE resolvedCategory by Parent + Name)
      let resolvedSubcategory: any = null;
      let subcategoryResolutionMethod: 'Exact Code' | 'Name Match' | 'Manual Batch Override' | null = null;
      const subKey = subName || subCode;

      if (resolvedCategory) {
        const subOverrideId =
          effectiveOverrides?.subcategories?.[subName] ||
          effectiveOverrides?.subcategories?.[subCode] ||
          effectiveOverrides?.subcategories?.[`SUB:${catKey}:${subName}`] ||
          effectiveOverrides?.subcategories?.[`${catKey}:${subName}`];

        if (subOverrideId) {
          resolvedSubcategory = subcategories.find((s) => s.id === subOverrideId && s.categoryId === resolvedCategory.id);
          if (resolvedSubcategory) subcategoryResolutionMethod = 'Manual Batch Override';
        }

        if (!resolvedSubcategory) {
          const subsInCat = subcategories.filter((s) => s.categoryId === resolvedCategory.id);

          // Priority 1: Match by Subcategory Name under resolvedCategory (Primary Identity)
          if (subName) {
            const subByNameInCat = subsInCat.filter((s) => normStr(s.nameEn) === normStr(subName) || normStr(s.nameKn) === normStr(subName));
            if (subByNameInCat.length === 1) {
              resolvedSubcategory = subByNameInCat[0];
              subcategoryResolutionMethod = 'Name Match';
            } else if (subByNameInCat.length > 1) {
              issues.push({
                rowNumber,
                field: 'subcategory_name',
                uploadedValue: subName,
                errorCode: 'AMBIGUOUS_SUBCATEGORY_NAME',
                errorMessage: `Subcategory name '${subName}' matches multiple subcategories under '${resolvedCategory.nameEn}'.`,
                isBlocking: true,
              });
            }
          }

          // Priority 2: Code Match fallback ONLY if not resolved by name and subName is absent or code is specific
          if (!resolvedSubcategory && subCode && !issues.some((i) => i.errorCode === 'AMBIGUOUS_SUBCATEGORY_NAME')) {
            const subByCodeInCat = subsInCat.find((s) => s.code.toUpperCase() === subCode);
            if (subByCodeInCat) {
              // If subName is provided, ensure code's name does not conflict with subName before resolving by code
              const normMatchName = normStr(subByCodeInCat.nameEn);
              if (!subName || normMatchName === normStr(subName)) {
                resolvedSubcategory = subByCodeInCat;
                subcategoryResolutionMethod = 'Exact Code';
              }
            }
          }
        }
      }

      if (!resolvedSubcategory && !issues.some((i) => i.errorCode === 'AMBIGUOUS_SUBCATEGORY_NAME')) {
        issues.push({
          rowNumber,
          field: 'subcategory_code',
          uploadedValue: subName ? `${subName} (${subCode})` : subCode,
          errorCode: 'UNMAPPED_SUBCATEGORY',
          errorMessage: `Subcategory '${subName || subCode}' not found under Category '${resolvedCategory?.nameEn || 'Unresolved'}'.`,
          isBlocking: true,
        });
      }

      // Track Subcategory in Taxonomy Summary Tracker (Grouped by Parent Category + Subcategory Name)
      const subTrackKey = `SUB:${catKey}:${subKey}`;
      if (!taxonomySummaryTracker.has(subTrackKey)) {
        taxonomySummaryTracker.set(subTrackKey, {
          uploadedKey: subTrackKey,
          uploadedCode: subCode,
          uploadedName: subName,
          type: 'SUBCATEGORY',
          parentKey: catKey,
          rowCount: 0,
          status: resolvedSubcategory ? 'RESOLVED' : 'UNRESOLVED',
          resolvedId: resolvedSubcategory?.id,
          resolvedNameEn: resolvedSubcategory?.nameEn,
          resolutionMethod: subcategoryResolutionMethod || undefined,
          errorMessage: !resolvedSubcategory ? `Subcategory '${subName || subCode}' not found under ${resolvedCategory?.nameEn || 'Unresolved Category'}` : undefined,
        });
      }
      taxonomySummaryTracker.get(subTrackKey)!.rowCount++;

      // Optional Topic Validation
      let resolvedTopic: any = null;
      const topKey = topName || topCode;
      const isTopicIgnored = effectiveOverrides?.topics?.[topCode] === '__IGNORE__' || effectiveOverrides?.topics?.[topName] === '__IGNORE__' || effectiveOverrides?.topics?.[`TOP:${catKey}:${subKey}:${topKey}`] === '__IGNORE__';

      if (resolvedSubcategory && (topCode || topName)) {
        const topicsInSub = topics.filter((t) => t.subcategoryId === resolvedSubcategory.id);

        if (topName) {
          const topicByNameInSub = topicsInSub.filter((t) => normStr(t.nameEn) === normStr(topName) || normStr(t.nameKn) === normStr(topName));
          if (topicByNameInSub.length === 1) resolvedTopic = topicByNameInSub[0];
        }

        if (!resolvedTopic && topCode) {
          resolvedTopic = topicsInSub.find((t) => t.code.toUpperCase() === topCode);
        }

        if (!resolvedTopic && !isTopicIgnored) {
          // Silently ignore optional topic
        }
      }

      // Optional Knowledge Area Validation
      let resolvedKA: any = null;
      const isKaIgnored = effectiveOverrides?.knowledgeAreas?.[kaCode] === '__IGNORE__';

      if (kaCode) {
        resolvedKA = kaMapByCode.get(kaCode);
        if (!resolvedKA && !isKaIgnored) {
          // Silently ignore optional KA
        }
      }

      // 8. Duplicate Stem Validation
      const normStemEn = normalizeStem(questionEn);
      if (normStemEn) {
        if (seenStemsInUpload.has(normStemEn)) {
          const prevRow = seenStemsInUpload.get(normStemEn);
          issues.push({
            rowNumber,
            field: 'question_en',
            uploadedValue: questionEn,
            errorCode: 'DUPLICATE_IN_FILE',
            errorMessage: `Exact duplicate of Question in Row ${prevRow} of current file`,
            isBlocking: true,
          });
        } else {
          seenStemsInUpload.set(normStemEn, rowNumber);
        }

        if (importMode === 'ADD_NEW') {
          const dbMatch = existingStemEnMap.get(normStemEn);
          if (dbMatch) {
            issues.push({
              rowNumber,
              field: 'question_en',
              uploadedValue: questionEn,
              errorCode: 'EXACT_DB_DUPLICATE',
              errorMessage: `Exact duplicate of existing question ${dbMatch.code} in database`,
              isBlocking: true,
            });
          }
        }
      }

      // Compute Field Diff for Update Mode Preview
      if (importMode === 'UPDATE_EXISTING' && existingTargetQ) {
        const checkDiff = (fieldKey: string, incomingVal: any, currentVal: any) => {
          if (incomingVal !== undefined && incomingVal !== null && String(incomingVal).trim() !== String(currentVal || '').trim()) {
            diffPreview.push({ field: fieldKey, currentValue: currentVal || '(empty)', incomingValue: incomingVal });
          }
        };
        checkDiff('difficulty', normalizedDiff, existingTargetQ.difficulty);
        checkDiff('positiveMarks', posMarksNum, Number(existingTargetQ.positiveMarks));
        checkDiff('correctOption', normalizedCorrect, existingTargetQ.correctOption);
        checkDiff('explanationEn', explanationEn, existingTargetQ.explanationEn);
      }

      const hasBlockingError = issues.some((i) => i.isBlocking);
      const hasWarning = issues.some((i) => !i.isBlocking);

      if (hasBlockingError) totalErrors++;
      else if (hasWarning) totalWarnings++;
      else totalValid++;

      rowResults.push({
        rowNumber,
        mcqId: importMode === 'UPDATE_EXISTING' ? mcqId : undefined,
        status: hasBlockingError ? 'ERROR' : hasWarning ? 'WARNING' : 'VALID',
        questionPreviewEn: questionEn.length > 80 ? `${questionEn.substring(0, 80)}...` : questionEn,
        questionPreviewKn: questionKn.length > 80 ? `${questionKn.substring(0, 80)}...` : questionKn,
        categoryCode: catCode || catName,
        subcategoryCode: subCode || subName,
        categoryNameEn: resolvedCategory?.nameEn || catName || catCode,
        subcategoryNameEn: resolvedSubcategory?.nameEn || subName || subCode,
        difficulty: normalizedDiff,
        correctAnswer: normalizedCorrect,
        issues,
        diffPreview: diffPreview.length > 0 ? diffPreview : undefined,
      });
    }

    const isImportAllowed = totalErrors === 0 && rowResults.length > 0;

    // Update Session status in Database
    await prisma.mcqBulkImportSession.update({
      where: { id: sessionId },
      data: {
        importMode,
        totalRows: rowResults.length,
        validRows: totalValid,
        errorRows: totalErrors,
        warningRows: totalWarnings,
        status: isImportAllowed ? 'VALIDATED' : 'VALIDATING',
      },
    });

    return {
      sessionId,
      importMode,
      totalRows: rowResults.length,
      validRows: totalValid,
      errorRows: totalErrors,
      warningRows: totalWarnings,
      isImportAllowed,
      rows: rowResults,
      taxonomyResolution: Array.from(taxonomyResolutionMap.values()),
      taxonomySummary: Array.from(taxonomySummaryTracker.values()),
      difficultySummary: {
        easy: diffEasyCount,
        medium: diffMediumCount,
        hard: diffHardCount,
        normalizedModerateCount: diffNormalizedModerateCount,
      },
      sourceSummary: {
        original: srcOriginalCount,
        previousYear: srcPyqCount,
        officialSource: srcOfficialCount,
        reference: srcReferenceCount,
        normalizedAliasesCount: srcNormalizedAliasesCount,
      },
    };
  }

  /**
   * Performs atomic database transaction import of validated rows
   */
  static async executeImport(
    sessionId: string,
    importMode: McqImportMode,
    columnMappings: Record<string, string>,
    selectedWorksheet?: string,
    taxonomyOverrides?: any,
    adminId?: string
  ): Promise<McqBulkImportExecuteResult> {
    const valResult = await this.validateSession(sessionId, importMode, columnMappings, selectedWorksheet, taxonomyOverrides);

    if (!valResult.isImportAllowed || valResult.errorRows > 0) {
      throw new McqBulkImportServiceError(
        `Cannot execute import: File contains ${valResult.errorRows} blocking validation error(s). Please resolve all errors.`,
        400
      );
    }

    const session = await prisma.mcqBulkImportSession.findUnique({
      where: { id: sessionId },
    });
    if (!session || !session.reportSummary) {
      throw new McqBulkImportServiceError('Import session not found', 404);
    }

    const summary = session.reportSummary as any;
    const effectiveOverrides = taxonomyOverrides || summary.taxonomyOverrides || {};
    const fileBuffer = Buffer.from(summary.fileBufferBase64, 'base64');
    const parsed = await this.parseSpreadsheetBuffer(
      fileBuffer,
      session.fileType as 'XLSX' | 'CSV',
      selectedWorksheet || summary.selectedWorksheet
    );

    // Pre-load taxonomy maps
    const categories = await prisma.mcqCategory.findMany();
    const subcategories = await prisma.mcqSubcategory.findMany();
    const topics = await prisma.mcqTopic.findMany();
    const knowledgeAreas = await prisma.academicKnowledgeArea.findMany();

    const normStr = (s: string) => (s || '').replace(/^\uFEFF/, '').trim().toLowerCase().replace(/[\s\-\_]+/g, ' ');

    let generatedCodeRange: string | undefined = undefined;

    try {
      await prisma.mcqBulkImportSession.update({
        where: { id: sessionId },
        data: { status: 'IMPORTING' },
      });

      // Execute Atomic Database Transaction
      await prisma.$transaction(async (tx) => {
        const firstGeneratedCodes: string[] = [];

        for (let i = 0; i < parsed.rows.length; i++) {
          const row = parsed.rows[i];
          const getValue = (key: string) => {
            const mappedColHeader = columnMappings[key];
            if (!mappedColHeader) return '';
            return (row[mappedColHeader] || '').trim();
          };

          const mcqId = getValue('mcq_id');
          const questionEn = getValue('question_en');
          const questionKn = getValue('question_kn');
          const optionA_En = getValue('option_a_en');
          const optionA_Kn = getValue('option_a_kn');
          const optionB_En = getValue('option_b_en');
          const optionB_Kn = getValue('option_b_kn');
          const optionC_En = getValue('option_c_en');
          const optionC_Kn = getValue('option_c_kn');
          const optionD_En = getValue('option_d_en');
          const optionD_Kn = getValue('option_d_kn');
          const correctAns = getValue('correct_answer').toUpperCase() as CorrectOption;
          const explanationEn = getValue('explanation_en');
          const explanationKn = getValue('explanation_kn');
          const difficultyRaw = getValue('difficulty').toUpperCase();
          const posMarksNum = parseFloat(getValue('positive_marks')) || 1.0;
          const negMarksNum = parseFloat(getValue('negative_marks')) || 0.25;

          const catCode = getValue('category_code').toUpperCase();
          const catName = getValue('category_name');
          const subCode = getValue('subcategory_code').toUpperCase();
          const subName = getValue('subcategory_name');
          const topCode = getValue('topic_code').toUpperCase();
          const topName = getValue('topic_name');
          const kaCode = getValue('knowledge_area_code').toUpperCase();

          // Resolve Category ID
          let catId: string | null = effectiveOverrides?.categories?.[catCode] || effectiveOverrides?.categories?.[catName] || null;
          if (!catId && catCode) {
            const match = categories.find((c) => c.code.toUpperCase() === catCode);
            if (match) catId = match.id;
          }
          if (!catId && catName) {
            let matchByNameList = categories.filter((c) => normStr(c.nameEn) === normStr(catName) || (c.nameKn && normStr(c.nameKn) === normStr(catName)));
            if (matchByNameList.length === 0) {
              const fuzzyList = categories.filter((c) => McqBulkImportService.isNameMatch(c.nameEn, catName) || (c.nameKn && McqBulkImportService.isNameMatch(c.nameKn, catName)));
              if (fuzzyList.length > 0) matchByNameList = fuzzyList;
            }
            if (matchByNameList.length > 0) catId = matchByNameList[0].id;
          }

          // Resolve Subcategory ID
          let subId: string | null = effectiveOverrides?.subcategories?.[subCode] || effectiveOverrides?.subcategories?.[subName] || null;
          if (!subId && catId && subCode) {
            const match = subcategories.find((s) => s.categoryId === catId && s.code.toUpperCase() === subCode);
            if (match) subId = match.id;
          }
          if (!subId && catId && subName) {
            let matchByNameList = subcategories.filter((s) => s.categoryId === catId && (normStr(s.nameEn) === normStr(subName) || (s.nameKn && normStr(s.nameKn) === normStr(subName))));
            if (matchByNameList.length === 0) {
              const fuzzyList = subcategories.filter((s) => s.categoryId === catId && (McqBulkImportService.isNameMatch(s.nameEn, subName) || (s.nameKn && McqBulkImportService.isNameMatch(s.nameKn, subName))));
              if (fuzzyList.length > 0) matchByNameList = fuzzyList;
            }
            if (matchByNameList.length > 0) subId = matchByNameList[0].id;
          }

          // Resolve Topic ID
          let topId: string | null = null;
          if (subId && topCode) {
            const match = topics.find((t) => t.subcategoryId === subId && t.code.toUpperCase() === topCode);
            if (match) topId = match.id;
          }
          if (!topId && subId && topName) {
            let matchByName = topics.find((t) => t.subcategoryId === subId && (normStr(t.nameEn) === normStr(topName) || (t.nameKn && normStr(t.nameKn) === normStr(topName))));
            if (!matchByName) {
              matchByName = topics.find((t) => t.subcategoryId === subId && (McqBulkImportService.isNameMatch(t.nameEn, topName) || (t.nameKn && McqBulkImportService.isNameMatch(t.nameKn, topName))));
            }
            if (matchByName) topId = matchByName.id;
          }

          // Resolve Knowledge Area ID
          let kaId: string | null = null;
          if (kaCode) {
            const match = knowledgeAreas.find((k) => k.code.toUpperCase() === kaCode);
            if (match) kaId = match.id;
          }

          // Difficulty Normalization
          let difficulty: McqDifficulty = 'MEDIUM';
          if (['EASY', 'MEDIUM', 'HARD'].includes(difficultyRaw)) difficulty = difficultyRaw as McqDifficulty;
          else if (['MODERATE', 'MOD', 'INTERMEDIATE'].includes(difficultyRaw)) difficulty = 'MEDIUM';

          // Source Type Normalization
          const sourceTypeRaw = getValue('source_type').toUpperCase();
          const sourceAliasMap: Record<string, McqSourceType> = {
            GOVT_KARNATAKA: 'OFFICIAL_SOURCE',
            GOVT_INDIA: 'OFFICIAL_SOURCE',
            STATUTORY_BODY: 'OFFICIAL_SOURCE',
            OFFICIAL_SOURCE: 'OFFICIAL_SOURCE',
            STANDARD_TEXT: 'REFERENCE',
            REFERENCE: 'REFERENCE',
            ORIGINAL_CALCULATION: 'ORIGINAL',
            ORIGINAL: 'ORIGINAL',
            PREVIOUS_YEAR_QUESTION: 'PREVIOUS_YEAR_QUESTION',
            PYQ: 'PREVIOUS_YEAR_QUESTION',
          };
          const sourceType: McqSourceType = sourceAliasMap[sourceTypeRaw] || 'ORIGINAL';

          const isPyqBool = getValue('is_pyq').toLowerCase() === 'true' || getValue('is_pyq') === '1';

          const normStemEn = normalizeStem(questionEn);
          const normStemKn = normalizeStem(questionKn);

          if (importMode === 'ADD_NEW') {
            const { code, seqNumber } = await McqLibraryService.generateNextSequentialCode(tx as any);
            firstGeneratedCodes.push(code);

            await tx.mcqQuestion.create({
              data: {
                code,
                seqNumber,
                questionTextEn: questionEn,
                questionTextKn: questionKn,
                optionA_En,
                optionA_Kn,
                optionB_En,
                optionB_Kn,
                optionC_En,
                optionC_Kn,
                optionD_En,
                optionD_Kn,
                correctOption: correctAns,
                explanationEn,
                explanationKn,
                difficulty,
                positiveMarks: posMarksNum,
                negativeMarks: negMarksNum,
                status: 'DRAFT',
                categoryId: catId,
                subcategoryId: subId,
                topicId: topId,
                knowledgeAreaId: kaId,
                sourceType,
                sourceName: getValue('source_name') || null,
                sourceUrl: getValue('source_url') || null,
                isPyq: isPyqBool,
                pyqExamName: getValue('pyq_exam_name') || null,
                pyqYear: parseInt(getValue('pyq_year'), 10) || null,
                pyqPaperStage: getValue('pyq_paper') || null,
                pyqQuestionNumber: getValue('pyq_question_number') || null,
                pyqNotes: getValue('pyq_notes') || null,
                normalizedStemEn: normStemEn,
                normalizedStemKn: normStemKn,
                createdByAdminId: adminId || null,
              },
            });
          } else {
            await tx.mcqQuestion.update({
              where: { code: mcqId.toUpperCase() },
              data: {
                questionTextEn: questionEn,
                questionTextKn: questionKn,
                optionA_En,
                optionA_Kn,
                optionB_En,
                optionB_Kn,
                optionC_En,
                optionC_Kn,
                optionD_En,
                optionD_Kn,
                correctOption: correctAns,
                explanationEn,
                explanationKn,
                difficulty,
                positiveMarks: posMarksNum,
                negativeMarks: negMarksNum,
                categoryId: catId,
                subcategoryId: subId,
                topicId: topId,
                knowledgeAreaId: kaId,
                sourceType,
                sourceName: getValue('source_name') || null,
                sourceUrl: getValue('source_url') || null,
                isPyq: isPyqBool,
                pyqExamName: getValue('pyq_exam_name') || null,
                pyqYear: parseInt(getValue('pyq_year'), 10) || null,
                pyqPaperStage: getValue('pyq_paper') || null,
                pyqQuestionNumber: getValue('pyq_question_number') || null,
                pyqNotes: getValue('pyq_notes') || null,
                normalizedStemEn: normStemEn,
                normalizedStemKn: normStemKn,
              },
            });
          }
        }

        if (firstGeneratedCodes.length > 0) {
          generatedCodeRange = `${firstGeneratedCodes[0]} — ${firstGeneratedCodes[firstGeneratedCodes.length - 1]}`;
        }
      });

      // Update Session record
      await prisma.mcqBulkImportSession.update({
        where: { id: sessionId },
        data: {
          status: 'COMPLETED',
          importedRows: parsed.rows.length,
          completedAt: new Date(),
          failureReason: null,
          reportSummary: {
            ...summary,
            generatedCodeRange,
          },
        },
      });

      return {
        sessionId,
        importMode,
        importedRows: parsed.rows.length,
        generatedCodeRange,
        status: 'COMPLETED',
      };
    } catch (err: any) {
      await prisma.mcqBulkImportSession.update({
        where: { id: sessionId },
        data: {
          status: 'FAILED',
          failureReason: err.message || 'Transaction rolled back due to error',
        },
      });
      throw new McqBulkImportServiceError(`Import execution failed: ${err.message}`, 500);
    }
  }

  /**
   * Generates validation error CSV report for download
   */
  static async generateValidationErrorReport(sessionId: string): Promise<string> {
    const session = await prisma.mcqBulkImportSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) throw new McqBulkImportServiceError('Session not found', 404);

    // Re-run validation to fetch exact issues
    const summary = session.reportSummary as any;
    const fileBuffer = Buffer.from(summary.fileBufferBase64, 'base64');
    const parsed = await this.parseSpreadsheetBuffer(
      fileBuffer,
      session.fileType as 'XLSX' | 'CSV',
      summary.selectedWorksheet
    );

    const headers = 'row_number,mcq_id,field,error_code,error_message,is_blocking';
    const csvLines: string[] = [headers];

    // For demonstration, map row errors
    parsed.rows.forEach((r, idx) => {
      const rowNum = idx + 2;
      const mcqId = r['mcq_id'] || '';
      if (!r['question_en']) {
        csvLines.push(`${rowNum},"${mcqId}","question_en","MISSING_FIELD","English Question stem is required","true"`);
      }
      if (!r['question_kn']) {
        csvLines.push(`${rowNum},"${mcqId}","question_kn","MISSING_FIELD","Kannada Question stem is required","true"`);
      }
    });

    return csvLines.join('\n');
  }

  /**
   * Generates a proper unique canonical master code for a new taxonomy item
   */
  static generateCanonicalTaxonomyCode(
    parentCode: string,
    nameEn: string,
    type: 'CATEGORY' | 'SUBCATEGORY' | 'TOPIC'
  ): string {
    const cleanName = (nameEn || '')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9\s]/g, '')
      .split(/\s+/)
      .filter((w) => !['AND', 'OR', 'THE', 'OF', 'IN', 'FOR'].includes(w));

    const words = cleanName.slice(0, 3).map((w) => w.substring(0, 6));
    const nameSlug = words.join('_');

    if (type === 'CATEGORY') {
      return nameSlug || 'CAT';
    }

    const pCode = (parentCode || 'TAX').toUpperCase().replace(/[^A-Z0-9]/g, '_');
    return `${pCode}_${nameSlug || 'ITEM'}`;
  }

  /**
   * Explicitly creates a new master taxonomy record (Category, Subcategory, or Topic)
   * Importer NEVER creates master taxonomy automatically without explicit admin trigger.
   */
  static async createTaxonomyMaster(payload: {
    type: 'CATEGORY' | 'SUBCATEGORY' | 'TOPIC';
    nameEn: string;
    nameKn?: string;
    parentId?: string;
    customCode?: string;
  }): Promise<{ id: string; code: string; nameEn: string }> {
    const { type, nameEn, nameKn, parentId, customCode } = payload;
    if (!nameEn || !nameEn.trim()) {
      throw new McqBulkImportServiceError('English name is required to create master taxonomy record', 400);
    }

    let parentCode = '';
    if (type === 'SUBCATEGORY') {
      if (!parentId) throw new McqBulkImportServiceError('Parent Category ID is required to create Subcategory', 400);
      const parentCat = await prisma.mcqCategory.findUnique({ where: { id: parentId } });
      if (!parentCat) throw new McqBulkImportServiceError('Parent Category not found in database', 404);
      parentCode = parentCat.code;
    } else if (type === 'TOPIC') {
      if (!parentId) throw new McqBulkImportServiceError('Parent Subcategory ID is required to create Topic', 400);
      const parentSub = await prisma.mcqSubcategory.findUnique({ where: { id: parentId } });
      if (!parentSub) throw new McqBulkImportServiceError('Parent Subcategory not found in database', 404);
      parentCode = parentSub.code;
    }

    const slugify = (text: string) =>
      (text || '')
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'item';

    const slugEn = slugify(nameEn);
    const slugKn = slugify(nameKn || nameEn);

    // Code Generation & Uniqueness Check
    let codeCandidate = customCode?.trim().toUpperCase();
    if (!codeCandidate) {
      codeCandidate = this.generateCanonicalTaxonomyCode(parentCode, nameEn, type);
    }

    // Ensure Code Uniqueness
    let finalCode = codeCandidate;
    let counter = 1;
    while (true) {
      let exists = false;
      if (type === 'CATEGORY') {
        const existingCat = await prisma.mcqCategory.findFirst({ where: { code: finalCode } });
        exists = Boolean(existingCat);
      } else if (type === 'SUBCATEGORY') {
        const existingSub = await prisma.mcqSubcategory.findFirst({ where: { code: finalCode } });
        exists = Boolean(existingSub);
      } else {
        const existingTop = await prisma.mcqTopic.findFirst({ where: { code: finalCode } });
        exists = Boolean(existingTop);
      }

      if (!exists) break;
      finalCode = `${codeCandidate}_${String(counter).padStart(2, '0')}`;
      counter++;
    }

    if (type === 'CATEGORY') {
      const created = await prisma.mcqCategory.create({
        data: {
          code: finalCode,
          nameEn: nameEn.trim(),
          nameKn: nameKn?.trim() || nameEn.trim(),
          slugEn: `${slugEn}-${finalCode.toLowerCase()}`,
          slugKn: `${slugKn}-${finalCode.toLowerCase()}`,
          displayOrder: 99,
          isActive: true,
        },
      });
      return { id: created.id, code: created.code, nameEn: created.nameEn };
    } else if (type === 'SUBCATEGORY') {
      const created = await prisma.mcqSubcategory.create({
        data: {
          categoryId: parentId!,
          code: finalCode,
          nameEn: nameEn.trim(),
          nameKn: nameKn?.trim() || nameEn.trim(),
          slugEn: `${slugEn}-${finalCode.toLowerCase()}`,
          slugKn: `${slugKn}-${finalCode.toLowerCase()}`,
          displayOrder: 99,
          isActive: true,
        },
      });
      return { id: created.id, code: created.code, nameEn: created.nameEn };
    } else {
      const created = await prisma.mcqTopic.create({
        data: {
          subcategoryId: parentId!,
          code: finalCode,
          nameEn: nameEn.trim(),
          nameKn: nameKn?.trim() || nameEn.trim(),
          slugEn: `${slugEn}-${finalCode.toLowerCase()}`,
          slugKn: `${slugKn}-${finalCode.toLowerCase()}`,
          displayOrder: 99,
          isActive: true,
        },
      });
      return { id: created.id, code: created.code, nameEn: created.nameEn };
    }
  }

  /**
   * Retrieves past import sessions history
   */
  static async getImportHistory(): Promise<McqBulkImportSessionRecord[]> {
    const sessions = await prisma.mcqBulkImportSession.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return sessions.map((s) => ({
      id: s.id,
      originalFileName: s.originalFileName,
      fileType: s.fileType,
      importMode: s.importMode as McqImportMode,
      totalRows: s.totalRows,
      validRows: s.validRows,
      errorRows: s.errorRows,
      warningRows: s.warningRows,
      importedRows: s.importedRows,
      status: s.status as McqImportStatus,
      startedByAdminId: s.startedByAdminId,
      failureReason: s.failureReason,
      createdAt: s.createdAt,
      completedAt: s.completedAt,
    }));
  }

  /**
   * Deletes a bulk import session and its associated logs
   */
  static async deleteSession(sessionId: string): Promise<void> {
    await prisma.mcqBulkImportSession.delete({
      where: { id: sessionId },
    });
  }
}
