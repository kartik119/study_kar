// @ts-nocheck
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import { prisma } from '@study-karnataka/database';
import ExcelJS from 'exceljs';
import { CANONICAL_IMPORT_COLUMNS, McqBulkImportService } from '../services/mcq-bulk-import.service';

import { signAccessToken } from '../utils/jwt';

describe('Prompt 11 — MCQ Bulk Import Engine Integration Tests', () => {
  let adminToken: string;
  let categoryId: string;
  let subcategoryId: string;

  beforeAll(async () => {
    // 1. Authenticate Admin User via JWT Helper
    const adminUser = await prisma.adminUser.upsert({
      where: { email: 'bulk.import.admin@studykarnataka.com' },
      update: {},
      create: {
        email: 'bulk.import.admin@studykarnataka.com',
        fullName: 'Bulk Import Super Admin',
        passwordHash: 'hash',
        accountStatus: 'ACTIVE',
      },
    });

    adminToken = signAccessToken({
      userId: adminUser.id,
      accountType: 'ADMIN',
      roles: ['Super Admin'],
      permissions: ['mcq_tests.view', 'mcq.view', 'mcq.create', 'mcq.edit'],
      sessionId: 'bulk-import-session-id',
    });

    await prisma.mcqQuestion.deleteMany({
      where: {
        OR: [
          { questionTextEn: { contains: 'Unique Import Test' } },
          { questionTextEn: { contains: 'What is Article 14?' } },
        ],
      },
    });

    // 2. Ensure Master Taxonomy exists in test DB
    let cat = await prisma.academicCategory.findFirst({ where: { code: 'POLITY' } });
    if (!cat) {
      cat = await prisma.academicCategory.create({
        data: {
          code: 'POLITY',
          nameEn: 'Indian Polity',
          nameKn: 'ಭಾರತೀಯ ರಾಜಕೀಯ',
          slugEn: 'indian-polity-bulk',
          slugKn: 'karnataka-polity-bulk',
          displayOrder: 1,
        },
      });
    }
    categoryId = cat.id;

    let sub = await prisma.academicSubcategory.findFirst({ where: { code: 'FUNDAMENTAL_RIGHTS' } });
    if (!sub) {
      sub = await prisma.academicSubcategory.create({
        data: {
          code: 'FUNDAMENTAL_RIGHTS',
          nameEn: 'Fundamental Rights',
          nameKn: 'ಮೂಲಭೂತ ಹಕ್ಕುಗಳು',
          slugEn: 'fundamental-rights-bulk',
          slugKn: 'karnataka-rights-bulk',
          categoryId: cat.id,
          displayOrder: 1,
        },
      });
    }
    subcategoryId = sub.id;
  });

  it('1. GET /bulk-import/template/excel rejects unauthenticated request with 401', async () => {
    const res = await request(app).get('/api/v1/admin/mcq-library/bulk-import/template/excel');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('2. GET /bulk-import/template/csv rejects unauthenticated request with 401', async () => {
    const res = await request(app).get('/api/v1/admin/mcq-library/bulk-import/template/csv');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('3. GET /bulk-import/template/excel rejects user without mcq_tests.view permission with 403', async () => {
    const noPermToken = signAccessToken({
      userId: 'no-perm-user-id',
      accountType: 'ADMIN',
      roles: ['Content Manager'],
      permissions: ['students.view'],
      sessionId: 'no-perm-session',
    });

    const res = await request(app)
      .get('/api/v1/admin/mcq-library/bulk-import/template/excel')
      .set('Authorization', `Bearer ${noPermToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('4. GET /bulk-import/template/csv rejects user without mcq_tests.view permission with 403', async () => {
    const noPermToken = signAccessToken({
      userId: 'no-perm-user-id',
      accountType: 'ADMIN',
      roles: ['Content Manager'],
      permissions: ['students.view'],
      sessionId: 'no-perm-session',
    });

    const res = await request(app)
      .get('/api/v1/admin/mcq-library/bulk-import/template/csv')
      .set('Authorization', `Bearer ${noPermToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('5. GET /bulk-import/template/excel returns official multi-sheet XLSX template with real taxonomy and Kannada Unicode', async () => {
    const res = await request(app)
      .get('/api/v1/admin/mcq-library/bulk-import/template/excel')
      .set('Authorization', `Bearer ${adminToken}`)
      .responseType('blob');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('spreadsheetml.sheet');
    expect(res.headers['content-disposition']).toContain('attachment; filename="study-karnataka-mcq-import-template.xlsx"');

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(res.body);

    const sheetNames = workbook.worksheets.map((w) => w.name);
    expect(sheetNames).toContain('MCQ Import');
    expect(sheetNames).toContain('Instructions');
    expect(sheetNames).toContain('Category Codes');
    expect(sheetNames).toContain('Subcategory Codes');
    expect(sheetNames).toContain('Topic Codes');
    expect(sheetNames).toContain('Knowledge Area Codes');
    expect(sheetNames).toContain('Example MCQ');

    // 1. MCQ Import sheet must be HEADER-ONLY (rowCount === 1)
    const importSheet = workbook.getWorksheet('MCQ Import');
    expect(importSheet).toBeDefined();
    expect(importSheet?.rowCount).toBe(1);

    // 2. Verify real master data in Category Codes sheet & NO DEMO_ taxonomy
    const catSheet = workbook.getWorksheet('Category Codes');
    expect(catSheet).toBeDefined();
    const catRows: string[] = [];
    catSheet?.eachRow((row) => {
      catRows.push(String(row.getCell(1).value));
    });
    expect(catRows).toContain('POLITY');
    expect(catRows.some((c) => c.startsWith('DEMO_'))).toBe(false);

    // 3. Verify Kannada Unicode preservation in Category Codes sheet
    const knNames: string[] = [];
    catSheet?.eachRow((row) => {
      knNames.push(String(row.getCell(3).value));
    });
    expect(knNames.some((val) => val.includes('ರಾಜಕೀಯ'))).toBe(true);

    // 4. TEMPLATE SELF-VALIDATION: Run "Example MCQ" sheet through validator
    const exSheet = workbook.getWorksheet('Example MCQ');
    expect(exSheet).toBeDefined();

    // Create single-sheet buffer of Example MCQ sheet to run through validator
    const tempWb = new ExcelJS.Workbook();
    const tempSheet = tempWb.addWorksheet('MCQ Import');
    exSheet?.eachRow((row) => {
      const rowValues = (row.values as any[]).slice(1);
      tempSheet.addRow(rowValues);
    });

    const tempBuffer = await tempWb.xlsx.writeBuffer();
    const analyzeRes = await request(app)
      .post('/api/v1/admin/mcq-library/bulk-import/analyze')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from(tempBuffer), 'template_example_validation.xlsx');

    expect(analyzeRes.status).toBe(200);

    const valRes = await request(app)
      .post('/api/v1/admin/mcq-library/bulk-import/validate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        sessionId: analyzeRes.body.data.sessionId,
        importMode: 'ADD_NEW',
        columnMappings: analyzeRes.body.data.autoColumnMappings,
      });

    expect(valRes.status).toBe(200);
    expect(valRes.body.data.isImportAllowed).toBe(true);
    expect(valRes.body.data.errorRows).toBe(0);
    expect(valRes.body.data.validRows).toBe(2);
  });

  it('6. GET /bulk-import/template/csv returns canonical CSV template (HEADER-ONLY)', async () => {
    const res = await request(app)
      .get('/api/v1/admin/mcq-library/bulk-import/template/csv')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.headers['content-disposition']).toContain('attachment; filename="study-karnataka-mcq-import-template.csv"');

    // Verify required canonical headers
    expect(res.text).toContain('mcq_id');
    expect(res.text).toContain('question_en');
    expect(res.text).toContain('question_kn');
    expect(res.text).toContain('option_a_en');
    expect(res.text).toContain('option_a_kn');
    expect(res.text).toContain('correct_answer');
    expect(res.text).toContain('category_code');
    expect(res.text).toContain('subcategory_code');

    // Verify header-only (no sample data rows inserted)
    const lines = res.text.trim().split('\n');
    expect(lines.length).toBe(1);
  });

  it('3. POST /bulk-import/analyze analyzes uploaded XLSX file and detects headers', async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('MCQ Import');
    sheet.addRow(CANONICAL_IMPORT_COLUMNS.map((c) => c.key));
    sheet.addRow([
      '',
      'What is Article 14?',
      'ವಿಧಿ ೧೪ ಎಂದರೇನು?',
      'Equality',
      'ಸಮಾನತೆ',
      'Freedom',
      'ಸ್ವಾತಂತ್ರ್ಯ',
      'Justice',
      'ನ್ಯಾಯ',
      'Duty',
      'ಕರ್ತವ್ಯ',
      'A',
      'Article 14 guarantees equality.',
      'ವಿಧಿ ೧೪ ಸಮಾನತೆ ನೀಡುತ್ತದೆ.',
      'EASY',
      '1.0',
      '0.25',
      'POLITY',
      'FUNDAMENTAL_RIGHTS',
    ]);

    const buffer = await workbook.xlsx.writeBuffer();

    const res = await request(app)
      .post('/api/v1/admin/mcq-library/bulk-import/analyze')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from(buffer), 'test_mcq_import.xlsx');

    if (res.status !== 200) {
      console.error('Analyze Test Failed Response:', res.body);
    }

    expect(res.status).toBe(200);
    expect(res.body.data.sessionId).toBeDefined();
    expect(res.body.data.totalRowsDetected).toBe(1);
    expect(res.body.data.autoColumnMappings.question_en).toBe('question_en');
  });

  it('4. POST /bulk-import/validate validates mandatory bilingual completeness & taxonomy', async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('MCQ Import');
    sheet.addRow(CANONICAL_IMPORT_COLUMNS.map((c) => c.key));

    // Valid Row
    sheet.addRow([
      '',
      'Consider Article 21 of Constitution',
      'ಸಂವಿಧಾನದ ೨೧ನೇ ವಿಧಿಯನ್ನು ಪರಿಶೀಲಿಸಿ',
      'Right to Life',
      'ಜೀವಿಸುವ ಹಕ್ಕು',
      'Right to Property',
      'ಆಸ್ತಿ ಹಕ್ಕು',
      'Right to Vote',
      'ಮತದಾನದ ಹಕ್ಕು',
      'None',
      'ಯಾವುದೂ ಅಲ್ಲ',
      'A',
      'Article 21 guarantees Right to Life.',
      'ವಿಧಿ ೨೧ ಜೀವಿಸುವ ಹಕ್ಕು ನೀಡುತ್ತದೆ.',
      'MEDIUM',
      '1.0',
      '0.25',
      'POLITY',
      'FUNDAMENTAL_RIGHTS',
    ]);

    // Invalid Row (Missing Kannada Option C, Invalid Difficulty 'MODERATE')
    sheet.addRow([
      '',
      'What is Article 19?',
      'ವಿಧಿ ೧೯ ಎಂದರೇನು?',
      'Freedoms',
      'ಸ್ವಾತಂತ್ರ್ಯಗಳು',
      'Duties',
      'ಕರ್ತವ್ಯಗಳು',
      'Rights',
      '', // MISSING KANNADA OPTION C
      'None',
      'ಯಾವುದೂ ಅಲ್ಲ',
      'A',
      'Explanation EN',
      'Explanation KN',
      'MODERATE', // INVALID DIFFICULTY
      '1.0',
      '0.25',
      'POLITY',
      'FUNDAMENTAL_RIGHTS',
    ]);

    const buffer = await workbook.xlsx.writeBuffer();

    const analyzeRes = await request(app)
      .post('/api/v1/admin/mcq-library/bulk-import/analyze')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from(buffer), 'validation_test.xlsx');

    const sessionId = analyzeRes.body.data.sessionId;
    const mappings = analyzeRes.body.data.autoColumnMappings;

    const valRes = await request(app)
      .post('/api/v1/admin/mcq-library/bulk-import/validate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        sessionId,
        importMode: 'ADD_NEW',
        columnMappings: mappings,
      });

    expect(valRes.status).toBe(200);
    expect(valRes.body.data.isImportAllowed).toBe(false); // BLOCKED due to errors
    expect(valRes.body.data.errorRows).toBe(1);
    expect(valRes.body.data.validRows).toBe(1);
  });

  it('5. POST /bulk-import/execute imports valid rows atomically in ADD_NEW mode as DRAFTs', async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('MCQ Import');
    sheet.addRow(CANONICAL_IMPORT_COLUMNS.map((c) => c.key));

    sheet.addRow([
      '',
      'Unique Import Test Question 1',
      'ವಿಶಿಷ್ಟ ಆಮದು ಪರೀಕ್ಷಾ ಪ್ರಶ್ನೆ ೧',
      'Option A EN',
      'ಆಯ್ಕೆ ಎ ಕನ್ನಡ',
      'Option B EN',
      'ಆಯ್ಕೆ ಬಿ ಕನ್ನಡ',
      'Option C EN',
      'ಆಯ್ಕೆ ಸಿ ಕನ್ನಡ',
      'Option D EN',
      'ಆಯ್ಕೆ ಡಿ ಕನ್ನಡ',
      'B',
      'Detailed Explanation EN',
      'ವಿವರವಾದ ವಿವರಣೆ ಕನ್ನಡ',
      'HARD',
      '2.0',
      '0.50',
      'POLITY',
      'FUNDAMENTAL_RIGHTS',
    ]);

    const buffer = await workbook.xlsx.writeBuffer();

    const analyzeRes = await request(app)
      .post('/api/v1/admin/mcq-library/bulk-import/analyze')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from(buffer), 'execute_test.xlsx');

    const sessionId = analyzeRes.body.data.sessionId;
    const mappings = analyzeRes.body.data.autoColumnMappings;

    // Validate first
    await request(app)
      .post('/api/v1/admin/mcq-library/bulk-import/validate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        sessionId,
        importMode: 'ADD_NEW',
        columnMappings: mappings,
      });

    // Execute Import
    const execRes = await request(app)
      .post('/api/v1/admin/mcq-library/bulk-import/execute')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        sessionId,
        importMode: 'ADD_NEW',
        columnMappings: mappings,
      });

    if (execRes.status !== 200) {
      console.error('Execute Test Error Response:', JSON.stringify(execRes.body, null, 2));
    }

    expect(execRes.status).toBe(200);
    expect(execRes.body.data.status).toBe('COMPLETED');
    expect(execRes.body.data.importedRows).toBe(1);

    // Verify question in DB
    const importedQ = await prisma.mcqQuestion.findFirst({
      where: { questionTextEn: 'Unique Import Test Question 1' },
    });
    expect(importedQ).toBeDefined();
    expect(importedQ?.status).toBe('DRAFT');
    expect(importedQ?.correctOption).toBe('B');
    expect(importedQ?.code).toMatch(/^MCQ_\d+/);
  });

  it('6. GET /bulk-import/history retrieves import session logs', async () => {
    const res = await request(app)
      .get('/api/v1/admin/mcq-library/bulk-import/history')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  describe('Auto-Column Mapping & Header Normalization (Prompt 11)', () => {
    it('1. Exact canonical headers auto-map 1:1', () => {
      const headers = ['question_en', 'question_kn', 'category_code', 'subcategory_code'];
      const mappings = McqBulkImportService.buildAutoColumnMappings(headers);
      expect(mappings.question_en).toBe('question_en');
      expect(mappings.question_kn).toBe('question_kn');
      expect(mappings.category_code).toBe('category_code');
      expect(mappings.subcategory_code).toBe('subcategory_code');
    });

    it('2. Official XLSX template auto-maps all included canonical columns (100%)', async () => {
      const excelBuf = await McqBulkImportService.generateExcelTemplate();
      const result = await McqBulkImportService.analyzeFile('official_template.xlsx', excelBuf);
      expect(result.detectedHeaders.length).toBeGreaterThanOrEqual(21);
      expect(Object.keys(result.autoColumnMappings).length).toBe(result.detectedHeaders.length);
      expect(result.autoColumnMappings.question_en).toBe('question_en');
      expect(result.autoColumnMappings.question_kn).toBe('question_kn');
      expect(result.autoColumnMappings.category_code).toBe('category_code');
      expect(result.autoColumnMappings.subcategory_code).toBe('subcategory_code');
    });

    it('3. Official CSV template auto-maps all included canonical columns (100%)', async () => {
      const csvStr = await McqBulkImportService.generateCsvTemplate();
      const csvBuf = Buffer.from(csvStr, 'utf-8');
      const result = await McqBulkImportService.analyzeFile('official_template.csv', csvBuf);
      expect(result.detectedHeaders.length).toBeGreaterThanOrEqual(21);
      expect(Object.keys(result.autoColumnMappings).length).toBe(result.detectedHeaders.length);
      expect(result.autoColumnMappings.question_en).toBe('question_en');
    });

    it('4. Header whitespace is normalized safely', () => {
      const headers = ['  question_en  ', ' question_kn ', '\tcategory_code\n'];
      const mappings = McqBulkImportService.buildAutoColumnMappings(headers);
      expect(mappings.question_en).toBe('  question_en  ');
      expect(mappings.question_kn).toBe(' question_kn ');
      expect(mappings.category_code).toBe('\tcategory_code\n');
    });

    it('5. UTF-8 BOM on first CSV header is handled and normalized', () => {
      const headers = ['\uFEFFmcq_id', 'question_en'];
      const mappings = McqBulkImportService.buildAutoColumnMappings(headers);
      expect(mappings.mcq_id).toBe('\uFEFFmcq_id');
      expect(mappings.question_en).toBe('question_en');
    });

    it('6. Case normalization works safely', () => {
      const headers = ['QUESTION_EN', 'QUESTION_KN', 'DIFFICULTY'];
      const mappings = McqBulkImportService.buildAutoColumnMappings(headers);
      expect(mappings.question_en).toBe('QUESTION_EN');
      expect(mappings.question_kn).toBe('QUESTION_KN');
      expect(mappings.difficulty).toBe('DIFFICULTY');
    });

    it('7. Known aliases map correctly', () => {
      const headers = [
        'English Question',
        'Kannada Question',
        'Correct Answer',
        'Difficulty Level',
        'Category',
        'Sub Category',
      ];
      const mappings = McqBulkImportService.buildAutoColumnMappings(headers);
      expect(mappings.question_en).toBe('English Question');
      expect(mappings.question_kn).toBe('Kannada Question');
      expect(mappings.correct_answer).toBe('Correct Answer');
      expect(mappings.difficulty).toBe('Difficulty Level');
      expect(mappings.category_code).toBe('Category');
      expect(mappings.subcategory_code).toBe('Sub Category');
    });

    it('8. Ambiguous alias does NOT map automatically', () => {
      const headers = ['Question', 'Option'];
      const mappings = McqBulkImportService.buildAutoColumnMappings(headers);
      expect(mappings.question_en).toBeUndefined();
      expect(mappings.question_kn).toBeUndefined();
      expect(mappings.option_a_en).toBeUndefined();
    });

    it('9. Endpoint POST /bulk-import/analyze returns both detectedHeaders and headers', async () => {
      const csvStr = await McqBulkImportService.generateCsvTemplate();
      const csvBuf = Buffer.from(csvStr, 'utf-8');

      const res = await request(app)
        .post('/api/v1/admin/mcq-library/bulk-import/analyze')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', csvBuf, 'template.csv');

      expect(res.status).toBe(200);
      expect(res.body.data.detectedHeaders).toBeDefined();
      expect(res.body.data.headers).toBeDefined();
      expect(res.body.data.autoColumnMappings.question_en).toBe('question_en');
    });

    it('10. category_name, subcategory_name, and topic_name auto-map correctly when present', () => {
      const headers = ['category_name', 'subcategory_name', 'topic_name'];
      const mappings = McqBulkImportService.buildAutoColumnMappings(headers);
      expect(mappings.category_name).toBe('category_name');
      expect(mappings.subcategory_name).toBe('subcategory_name');
      expect(mappings.topic_name).toBe('topic_name');
    });

    it('11. MODERATE difficulty normalizes to MEDIUM cleanly as a non-blocking notice', async () => {
      const csvContent = `question_en,question_kn,option_a_en,option_a_kn,option_b_en,option_b_kn,option_c_en,option_c_kn,option_d_en,option_d_kn,correct_answer,explanation_en,explanation_kn,difficulty,positive_marks,negative_marks,category_code,subcategory_code
"What is Article 14?","ಆರ್ಟಿಕಲ್ 14 ಎಂದರೇನು?","Equality","ಸಮಾನತೆ","Freedom","ಸ್ವಾತಂತ್ರ್ಯ","Life","ಜೀವನ","Duty","ಕರ್ತವ್ಯ",A,"Explanation EN","Explanation KN",MODERATE,1.0,0.25,POLITY,FUNDAMENTAL_RIGHTS`;
      const csvBuf = Buffer.from(csvContent, 'utf-8');
      const analyzeRes = await McqBulkImportService.analyzeFile('test_moderate.csv', csvBuf);

      const valRes = await McqBulkImportService.validateSession(
        analyzeRes.sessionId,
        'ADD_NEW',
        analyzeRes.autoColumnMappings
      );

      expect(valRes.isImportAllowed).toBe(true);
      expect(valRes.rows[0].difficulty).toBe('MEDIUM');
      expect(valRes.difficultySummary?.normalizedModerateCount).toBe(1);
      const diffNotice = valRes.rows[0].issues.find((i) => i.errorCode === 'DIFFICULTY_NORMALIZED');
      expect(diffNotice).toBeDefined();
      expect(diffNotice?.isBlocking).toBe(false);
    });

    it('12. Source type aliases (GOVT_KARNATAKA, STANDARD_TEXT, ORIGINAL_CALCULATION) normalize correctly', async () => {
      const csvContent = `question_en,question_kn,option_a_en,option_a_kn,option_b_en,option_b_kn,option_c_en,option_c_kn,option_d_en,option_d_kn,correct_answer,explanation_en,explanation_kn,difficulty,positive_marks,negative_marks,category_code,subcategory_code,source_type
"Q1","Q1 KN","A","A KN","B","B KN","C","C KN","D","D KN",A,"Exp EN","Exp KN",EASY,1.0,0.25,POLITY,FUNDAMENTAL_RIGHTS,GOVT_KARNATAKA`;
      const csvBuf = Buffer.from(csvContent, 'utf-8');
      const analyzeRes = await McqBulkImportService.analyzeFile('test_source.csv', csvBuf);

      const valRes = await McqBulkImportService.validateSession(
        analyzeRes.sessionId,
        'ADD_NEW',
        analyzeRes.autoColumnMappings
      );

      expect(valRes.isImportAllowed).toBe(true);
      expect(valRes.sourceSummary?.officialSource).toBe(1);
      expect(valRes.sourceSummary?.normalizedAliasesCount).toBe(1);
    });

    it('13. Name-assisted Category resolution resolves Category by name when code is custom', async () => {
      const csvContent = `question_en,question_kn,option_a_en,option_a_kn,option_b_en,option_b_kn,option_c_en,option_c_kn,option_d_en,option_d_kn,correct_answer,explanation_en,explanation_kn,difficulty,positive_marks,negative_marks,category_code,category_name,subcategory_code,subcategory_name
"Q1","Q1 KN","A","A KN","B","B KN","C","C KN","D","D KN",A,"Exp EN","Exp KN",EASY,1.0,0.25,POLITY,"Indian Polity",P2-S01,"Fundamental Rights"`;
      const csvBuf = Buffer.from(csvContent, 'utf-8');
      const analyzeRes = await McqBulkImportService.analyzeFile('test_cat_name.csv', csvBuf);

      const valRes = await McqBulkImportService.validateSession(
        analyzeRes.sessionId,
        'ADD_NEW',
        analyzeRes.autoColumnMappings
      );

      expect(valRes.isImportAllowed).toBe(true);
      expect(valRes.rows[0].categoryNameEn).toBe('Indian Polity');
    });

    it('14. Category Code vs Name conflict produces blocking CATEGORY_CODE_NAME_CONFLICT error', async () => {
      const csvContent = `question_en,question_kn,option_a_en,option_a_kn,option_b_en,option_b_kn,option_c_en,option_c_kn,option_d_en,option_d_kn,correct_answer,explanation_en,explanation_kn,difficulty,positive_marks,negative_marks,category_code,category_name,subcategory_code
"Q1","Q1 KN","A","A KN","B","B KN","C","C KN","D","D KN",A,"Exp EN","Exp KN",EASY,1.0,0.25,POLITY,"Karnataka History & Heritage",FUNDAMENTAL_RIGHTS`;
      const csvBuf = Buffer.from(csvContent, 'utf-8');
      const analyzeRes = await McqBulkImportService.analyzeFile('test_conflict.csv', csvBuf);

      const valRes = await McqBulkImportService.validateSession(
        analyzeRes.sessionId,
        'ADD_NEW',
        analyzeRes.autoColumnMappings
      );

      expect(valRes.isImportAllowed).toBe(false);
      expect(valRes.errorRows).toBe(1);
      const conflictErr = valRes.rows[0].issues.find((i) => i.errorCode === 'CATEGORY_CODE_NAME_CONFLICT');
      expect(conflictErr).toBeDefined();
      expect(conflictErr?.isBlocking).toBe(true);
    });

    it('15. Optional Knowledge Area (KAS-P2) does NOT block row validation', async () => {
      const csvContent = `question_en,question_kn,option_a_en,option_a_kn,option_b_en,option_b_kn,option_c_en,option_c_kn,option_d_en,option_d_kn,correct_answer,explanation_en,explanation_kn,difficulty,positive_marks,negative_marks,category_code,subcategory_code,knowledge_area_code
"Q1","Q1 KN","A","A KN","B","B KN","C","C KN","D","D KN",A,"Exp EN","Exp KN",EASY,1.0,0.25,POLITY,FUNDAMENTAL_RIGHTS,KAS-P2`;
      const csvBuf = Buffer.from(csvContent, 'utf-8');
      const analyzeRes = await McqBulkImportService.analyzeFile('test_ka.csv', csvBuf);

      const valRes = await McqBulkImportService.validateSession(
        analyzeRes.sessionId,
        'ADD_NEW',
        analyzeRes.autoColumnMappings
      );

      expect(valRes.isImportAllowed).toBe(true);
      const kaNotice = valRes.rows[0].issues.find((i) => i.errorCode === 'OPTIONAL_KNOWLEDGE_AREA_UNMAPPED');
      expect(kaNotice).toBeDefined();
      expect(kaNotice?.isBlocking).toBe(false);
    });

    it('16. Custom incoming source mcq_id (KAS26-P2-S01-Q075) in ADD_NEW mode is non-blocking notice', async () => {
      const csvContent = `mcq_id,question_en,question_kn,option_a_en,option_a_kn,option_b_en,option_b_kn,option_c_en,option_c_kn,option_d_en,option_d_kn,correct_answer,explanation_en,explanation_kn,difficulty,positive_marks,negative_marks,category_code,subcategory_code
KAS26-P2-S01-Q075,"Q1","Q1 KN","A","A KN","B","B KN","C","C KN","D","D KN",A,"Exp EN","Exp KN",EASY,1.0,0.25,POLITY,FUNDAMENTAL_RIGHTS`;
      const csvBuf = Buffer.from(csvContent, 'utf-8');
      const analyzeRes = await McqBulkImportService.analyzeFile('test_custom_id.csv', csvBuf);

      const valRes = await McqBulkImportService.validateSession(
        analyzeRes.sessionId,
        'ADD_NEW',
        analyzeRes.autoColumnMappings
      );

      expect(valRes.isImportAllowed).toBe(true);
      const idNotice = valRes.rows[0].issues.find((i) => i.errorCode === 'SOURCE_ROW_ID_NOTICE');
      expect(idNotice).toBeDefined();
      expect(idNotice?.isBlocking).toBe(false);
    });

    it('17. Same uploaded Subcategory code (P2-S) with different names creates distinct taxonomy summary items', async () => {
      const csvContent = `question_en,question_kn,option_a_en,option_a_kn,option_b_en,option_b_kn,option_c_en,option_c_kn,option_d_en,option_d_kn,correct_answer,explanation_en,explanation_kn,difficulty,positive_marks,negative_marks,category_code,category_name,subcategory_code,subcategory_name
"Q1","Q1 KN","A","A KN","B","B KN","C","C KN","D","D KN",A,"Exp","Exp",EASY,1.0,0.25,P2-S,"State Importance",P2-S,"Karnataka Polity and Administration"
"Q2","Q2 KN","A","A KN","B","B KN","C","C KN","D","D KN",A,"Exp","Exp",EASY,1.0,0.25,P2-S,"State Importance",P2-S,"Karnataka Economy, Budget and Public Finance"`;
      const csvBuf = Buffer.from(csvContent, 'utf-8');
      const analyzeRes = await McqBulkImportService.analyzeFile('test_reused_subcode.csv', csvBuf);

      const valRes = await McqBulkImportService.validateSession(
        analyzeRes.sessionId,
        'ADD_NEW',
        analyzeRes.autoColumnMappings
      );

      const subItems = valRes.taxonomySummary?.filter((t: any) => t.type === 'SUBCATEGORY') || [];
      expect(subItems.length).toBe(2);
      expect(subItems.map((s: any) => s.uploadedName)).toContain('Karnataka Polity and Administration');
      expect(subItems.map((s: any) => s.uploadedName)).toContain('Karnataka Economy, Budget and Public Finance');
    });

    it('18. Explicit createTaxonomyMaster generates a unique canonical code', async () => {
      const createdSub = await McqBulkImportService.createTaxonomyMaster({
        type: 'SUBCATEGORY',
        nameEn: 'Karnataka Polity and Administration',
        parentId: categoryId,
      });

      expect(createdSub.id).toBeDefined();
      expect(createdSub.code).toContain('POLITY');
      expect(createdSub.nameEn).toBe('Karnataka Polity and Administration');
    });

    it('19. Endpoint POST /bulk-import/taxonomy/create creates master record cleanly (201)', async () => {
      const res = await request(app)
        .post('/api/v1/admin/mcq-library/bulk-import/taxonomy/create')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          type: 'SUBCATEGORY',
          nameEn: 'Karnataka History and Freedom Movement',
          parentId: categoryId,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.code).toBeDefined();
      expect(res.body.data.nameEn).toBe('Karnataka History and Freedom Movement');
    });
  });
});
