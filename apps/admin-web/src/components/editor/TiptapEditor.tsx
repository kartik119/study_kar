import React, { useState, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Image from '@tiptap/extension-image';
import Highlight from '@tiptap/extension-highlight';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import Placeholder from '@tiptap/extension-placeholder';

import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Minus,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Link as LinkIcon,
  Unlink,
  Table as TableIcon,
  Image as ImageIcon,
  Highlighter,
  RotateCcw,
  RotateCw,
  Maximize2,
  Minimize2,
  Eraser,
  AlertTriangle,
  Sparkles,
  Bookmark,
  BookOpen,
  Calendar,
  UserCheck,
  Scale,
  BarChart3,
  History,
  Link2,
  ChevronDown,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  FileText,
  Code,
  Eye,
  X,
} from 'lucide-react';
import { Button, Input, FormField, Textarea } from '@study-karnataka/ui';

export interface TiptapEditorProps {
  content?: any;
  onChange?: (json: any, plainText: string, html?: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  language?: 'en' | 'kn';
  autosaveStatus?: 'IDLE' | 'UNSAVED' | 'SAVING' | 'SAVED' | 'FAILED';
  lastSavedAt?: string | null;
  minHeight?: string;
}

export const CALLOUT_TYPES = [
  {
    id: 'IMPORTANT_POINT',
    labelEn: 'Important Point',
    labelKn: 'ಮುಖ್ಯ ಪ್ರಮೇಯ',
    descEn: 'Key takeaway or core exam notice',
    descKn: 'ಮುಖ್ಯ ವಿಷಯ ಅಥವಾ ಪರೀಕ್ಷಾ ಸೂಚನೆ',
    icon: AlertTriangle,
    bgColor: '#FEF3C7',
    borderColor: '#F59E0B',
    textColor: '#92400E',
  },
  {
    id: 'EXAM_TIP',
    labelEn: 'Exam Tip',
    labelKn: 'ಪರೀಕ್ಷಾ ಸಲಹೆ',
    descEn: 'Scoring trick, shortcut or strategy',
    descKn: 'ಪರೀಕ್ಷಾ ತಂತ್ರ ಹಾಗೂ ಸುಲಭ ದಾರಿ',
    icon: Sparkles,
    bgColor: '#EFF6FF',
    borderColor: '#3B82F6',
    textColor: '#1E40AF',
  },
  {
    id: 'REMEMBER',
    labelEn: 'Remember',
    labelKn: 'ನೆನಪಿಡಿ',
    descEn: 'Crucial formula, rule or memory hook',
    descKn: 'ಪ್ರಮುಖ ಸೂತ್ರ ಅಥವಾ ನಿಯಮ',
    icon: Bookmark,
    bgColor: '#F3E8FF',
    borderColor: '#8B5CF6',
    textColor: '#6B21A8',
  },
  {
    id: 'DEFINITION',
    labelEn: 'Definition',
    labelKn: 'ವ್ಯಾಖ್ಯಾನ',
    descEn: 'Formal academic or legal definition',
    descKn: 'ಅಧಿಕೃತ ಶಬ್ದಕೋಶ / ವಿಷಯ ವ್ಯಾಖ್ಯಾನ',
    icon: BookOpen,
    bgColor: '#ECFDF5',
    borderColor: '#10B981',
    textColor: '#065F46',
  },
  {
    id: 'IMPORTANT_DATE',
    labelEn: 'Important Date',
    labelKn: 'ಪ್ರಮುಖ ದಿನಾಂಕ / ವರ್ಷ',
    descEn: 'Historical year, event or deadline',
    descKn: 'ಚಾರಿತ್ರಿಕ ದಿನಾಂಕ ಅಥವಾ ಮಹತ್ವದ ವರ್ಷ',
    icon: Calendar,
    bgColor: '#FFF1F2',
    borderColor: '#F43F5E',
    textColor: '#9F1239',
  },
  {
    id: 'IMPORTANT_PERSON',
    labelEn: 'Important Person',
    labelKn: 'ಪ್ರಮುಖ ವ್ಯಕ್ತಿ',
    descEn: 'Ruler, reformer, scientist or leader',
    descKn: 'ಸಾಧಕರು, ಸುಧಾರಕರು ಅಥವಾ ನಾಯಕರು',
    icon: UserCheck,
    bgColor: '#ECFEFF',
    borderColor: '#06B6D4',
    textColor: '#155E75',
  },
  {
    id: 'CONSTITUTIONAL_PROVISION',
    labelEn: 'Constitutional Provision',
    labelKn: 'ಸಂವಿಧಾನಾತ್ಮಕ ವಿಧಿ / ನಿಯಮ',
    descEn: 'Article, amendment, act or case law',
    descKn: 'ಸಂವಿಧಾನದ ವಿಧಿ, ತಿದ್ದುಪಡಿ ಅಥವಾ ಕಾಯ್ದೆ',
    icon: Scale,
    bgColor: '#EEF2FF',
    borderColor: '#6366F1',
    textColor: '#3730A3',
  },
  {
    id: 'DATA_STATISTIC',
    labelEn: 'Data / Statistic',
    labelKn: 'ಅಂಕಿಅಂಶ / ಮಾಹಿತಿ',
    descEn: 'Census figure, index or economic data',
    descKn: 'ಜನಗಣತಿ ಮಾಹಿತಿ ಅಥವಾ ಆರ್ಥಿಕ ಅಂಕಿಅಂಶ',
    icon: BarChart3,
    bgColor: '#F8FAFC',
    borderColor: '#64748B',
    textColor: '#1E293B',
  },
  {
    id: 'PYQ_REFERENCE',
    labelEn: 'PYQ Reference',
    labelKn: 'ಹಿಂದಿನ ಪರೀಕ್ಷಾ ಪ್ರಶ್ನೆ (PYQ)',
    descEn: 'Previous Year Question reference',
    descKn: 'ಹಿಂದಿನ ವರ್ಷದ ಪರೀಕ್ಷಾ ಪ್ರಶ್ನೆ ಉಲ್ಲೇಖ',
    icon: History,
    bgColor: '#FFEDD5',
    borderColor: '#F97316',
    textColor: '#9A3412',
  },
  {
    id: 'RELATED_TOPIC',
    labelEn: 'Related Topic',
    labelKn: 'ಸಂಬಂಧಿತ ವಿಷಯ',
    descEn: 'Cross-reference to another module',
    descKn: 'ಇತರ ಸಂಬಂಧಿತ ವಿಷಯದ ಲಿಂಕ್ / ಉಲ್ಲೇಖ',
    icon: Link2,
    bgColor: '#F0FDFA',
    borderColor: '#14B8A6',
    textColor: '#115E59',
  },
  {
    id: 'SHORT_NOTE',
    labelEn: 'Short Note',
    labelKn: 'ಕಿರು ಟಿಪ್ಪಣಿ',
    descEn: 'Concise revision summary or takeaway note',
    descKn: 'ಸಂಕ್ಷಿಪ್ತ ಪುನರಾವರ್ತನಾ ಟಿಪ್ಪಣಿ',
    icon: FileText,
    bgColor: '#F1F5F9',
    borderColor: '#475569',
    textColor: '#0F172A',
  },
];

export const TiptapEditor: React.FC<TiptapEditorProps> = ({
  content,
  onChange,
  placeholder,
  readOnly = false,
  language = 'en',
  autosaveStatus = 'IDLE',
  lastSavedAt,
  minHeight = '160px',
}) => {
  const defaultPlaceholder =
    placeholder ||
    (language === 'kn'
      ? 'ಕನ್ನಡ ಅಧ್ಯಯನ ವಿಷಯವನ್ನು ಇಲ್ಲಿ ಬರೆಯಲು ಪ್ರಾರಂಭಿಸಿ…'
      : 'Start writing the English study material here…');

  const [isFullscreen, setIsFullscreen] = useState(false);

  // Callout Dropdown Menu state
  const [showCalloutMenu, setShowCalloutMenu] = useState(false);
  const calloutMenuRef = useRef<HTMLDivElement>(null);

  // Link Modal state
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [linkOpenNewTab, setLinkOpenNewTab] = useState(true);

  // Image Modal state
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [imageBase64, setImageBase64] = useState('');
  const [imageFileName, setImageFileName] = useState('');
  const [imageAlt, setImageAlt] = useState('');
  const [imageCaption, setImageCaption] = useState('');

  // HTML Modal state
  const [showHtmlModal, setShowHtmlModal] = useState(false);
  const [htmlContent, setHtmlContent] = useState('');

  // Preview Modal state
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const editor = useEditor({
    editable: !readOnly,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
      }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: 'noopener noreferrer' } }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Image.configure({ allowBase64: true }),
      Highlight.configure({ multicolor: true }),
      Subscript,
      Superscript,
      Placeholder.configure({ placeholder: defaultPlaceholder }),
    ],
    content: content || '',
    onUpdate: ({ editor }: { editor: any }) => {
      if (onChange) {
        const json = editor.getJSON();
        const text = editor.getText();
        const html = editor.getHTML();
        onChange(json, text, html);
      }
    },
  });

  useEffect(() => {
    if (editor && content !== undefined) {
      if (typeof content === 'string') {
        const currentHtml = editor.getHTML();
        const isBothEmpty = (!content || content === '<p></p>') && editor.isEmpty;
        if (!isBothEmpty && currentHtml !== content && !editor.isFocused) {
          editor.commands.setContent(content || '', false);
        }
      } else {
        const currentJson = JSON.stringify(editor.getJSON());
        const newJson = JSON.stringify(content);
        if (currentJson !== newJson && !editor.isFocused) {
          editor.commands.setContent(content || '', false);
        }
      }
    }
  }, [content, editor]);

  // Click outside listener for callout menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (calloutMenuRef.current && !calloutMenuRef.current.contains(event.target as Node)) {
        setShowCalloutMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!editor) {
    return (
      <div style={{ padding: '24px', border: '1px solid #E6EAF0', borderRadius: '8px', backgroundColor: '#F8FAFC', textAlign: 'center', color: '#64748B', fontSize: '14px' }}>
        Initializing Study Karnataka Rich-Text Editor...
      </div>
    );
  }

  // Sanitized Link submit handler
  const handleLinkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkUrl.trim()) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    } else {
      let safeUrl = linkUrl.trim();
      if (/^(javascript|data|file):/i.test(safeUrl)) {
        alert('Security Warning: Only http, https, and mailto URLs are allowed.');
        return;
      }
      if (!/^(https?:\/\/|mailto:|\/)/i.test(safeUrl)) {
        safeUrl = `https://${safeUrl}`;
      }

      if (linkText.trim() && editor.state.selection.empty) {
        editor.chain().focus().insertContent(`<a href="${safeUrl}" target="${linkOpenNewTab ? '_blank' : '_self'}">${linkText.trim()}</a>`).run();
      } else {
        editor.chain().focus().extendMarkRange('link').setLink({ href: safeUrl, target: linkOpenNewTab ? '_blank' : '_self' }).run();
      }
    }
    setShowLinkModal(false);
    setLinkUrl('');
    setLinkText('');
  };

  // Sanitized Image submit handler
  const handleImageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let safeSrc = imageBase64 || imageUrl.trim();
      if (!safeSrc) {
        alert('Please provide an image URL or upload a file.');
        return;
      }

      if (!safeSrc.startsWith('data:image/')) {
        if (/^(javascript|data|file):/i.test(safeSrc) && !safeSrc.startsWith('data:image/')) {
          alert('Security Warning: Only http, https, and valid image data URLs are allowed.');
          return;
        }
      }

      // Use insertContent instead of setImage to guarantee we don't overwrite the document if selection is lost
      let contentToInsert: any = [
        {
          type: 'image',
          attrs: {
            src: safeSrc,
            alt: imageAlt.trim(),
            title: imageCaption.trim() || null,
          },
        },
      ];

      if (imageCaption.trim()) {
        contentToInsert.push({
          type: 'paragraph',
          content: [{ type: 'text', text: imageCaption.trim() }],
        });
      }

      // Ensure focus is safely restored at the end of the document if lost
      editor.chain().focus().insertContent(contentToInsert).run();

      setShowImageModal(false);
      setImageUrl('');
      setImageBase64('');
      setImageFileName('');
      setImageAlt('');
      setImageCaption('');
    } catch (error: any) {
      alert("Failed to insert image. The file might be corrupted.");
      console.error("Image insertion error:", error);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setImageBase64('');
      setImageFileName('');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('File is too large. Please upload an image smaller than 5MB.');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setImageBase64(event.target.result as string);
        setImageFileName(file.name);
        if (!imageAlt) {
          setImageAlt(file.name.split('.')[0] || 'Uploaded image');
        }
      }
    };
    reader.readAsDataURL(file);
  };

  // Insert Callout Block
  const insertCalloutBlock = (callout: typeof CALLOUT_TYPES[0]) => {
    const title = language === 'kn' ? callout.labelKn : callout.labelEn;
    const calloutHtml = `
      <div style="margin: 16px 0; padding: 16px; border-left: 4px solid ${callout.borderColor}; background-color: ${callout.bgColor}; border-radius: 6px; color: ${callout.textColor}; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
        <div style="font-weight: 700; font-size: 14px; margin-bottom: 6px; display: flex; align-items: center; gap: 8px; text-transform: uppercase; letter-spacing: 0.5px;">
          <span>📌</span> ${title}
        </div>
        <div style="font-size: 14px; line-height: 1.6;">
          Write ${callout.labelEn.toLowerCase()} description and exam notes here...
        </div>
      </div><p></p>
    `;
    editor.chain().focus().insertContent(calloutHtml).run();
    setShowCalloutMenu(false);
  };

  const wordCount = editor.getText().trim().split(/\s+/).filter(Boolean).length;
  const charCount = editor.getText().length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  const isTableActive = editor.isActive('table');

  // Active state style helper
  const getButtonStyle = (isActive: boolean, disabled: boolean = false) => ({
    padding: '6px 8px',
    borderRadius: '6px',
    border: isActive ? '1px solid #DCE6EE' : '1px solid transparent',
    backgroundColor: isActive ? '#EAF3F9' : 'transparent',
    color: isActive ? '#084B7A' : disabled ? '#CBD5E1' : '#475569',
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s ease',
  });

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#FFFFFF',
        border: '1px solid #E6EAF0',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: isFullscreen ? 'none' : '0 1px 3px rgba(0,0,0,0.05)',
        ...(isFullscreen
          ? {
              position: 'fixed',
              inset: 0,
              zIndex: 100,
              borderRadius: 0,
              height: '100vh',
              width: '100vw',
            }
          : {}),
      }}
    >
      {/* Fullscreen Focus Mode Header Bar */}
      {isFullscreen && (
        <div
          style={{
            padding: '12px 24px',
            backgroundColor: '#1E293B',
            color: '#FFFFFF',
            display: 'flex',
          justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid #334155',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '20px' }}>{language === 'kn' ? '🇮🇳' : '🇬🇧'}</span>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 700 }}>
                {language === 'kn' ? 'ಕನ್ನಡ ಲೇಖನ ಸಂಪಾದಕ (Focus Mode)' : 'English Study Material Editor (Focus Mode)'}
              </div>
              <div style={{ fontSize: '12px', color: '#94A3B8' }}>
                Distraction-free full-screen authoring workspace
              </div>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsFullscreen(false)}
            leftIcon={<Minimize2 size={14} />}
            style={{ color: '#FFFFFF', borderColor: '#475569' }}
          >
            Exit Full Screen
          </Button>
        </div>
      )}

      {/* Editor Toolbar */}
      {!readOnly && (
        <div
          style={{
            padding: '8px 12px',
            backgroundColor: '#F8FAFC',
            borderBottom: '1px solid #E6EAF0',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px',
          }}
        >
          {/* 1. HISTORY GROUP */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px', paddingRight: '6px', borderRight: '1px solid #E6EAF0' }}>
            <button
              type="button"
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              style={getButtonStyle(false, !editor.can().undo())}
              title="Undo (Ctrl+Z)"
              aria-label="Undo"
            >
              <RotateCcw size={15} />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              style={getButtonStyle(false, !editor.can().redo())}
              title="Redo (Ctrl+Y)"
              aria-label="Redo"
            >
              <RotateCw size={15} />
            </button>
          </div>

          {/* 2. BLOCK STYLE DROPDOWN */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', paddingRight: '6px', borderRight: '1px solid #E6EAF0' }}>
            <select
              value={
                editor.isActive('heading', { level: 2 })
                  ? 'h2'
                  : editor.isActive('heading', { level: 3 })
                  ? 'h3'
                  : editor.isActive('heading', { level: 4 })
                  ? 'h4'
                  : 'p'
              }
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'h2') editor.chain().focus().toggleHeading({ level: 2 }).run();
                else if (val === 'h3') editor.chain().focus().toggleHeading({ level: 3 }).run();
                else if (val === 'h4') editor.chain().focus().toggleHeading({ level: 4 }).run();
                else editor.chain().focus().setParagraph().run();
              }}
              style={{
                fontSize: '13px',
                fontWeight: 600,
                padding: '5px 8px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                color: '#1E293B',
                cursor: 'pointer',
              }}
              aria-label="Block Style Format"
            >
              <option value="p">Paragraph</option>
              <option value="h2">Heading 2 (H2)</option>
              <option value="h3">Heading 3 (H3)</option>
              <option value="h4">Heading 4 (H4)</option>
            </select>
          </div>

          {/* 3. FORMATTING GROUP */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px', paddingRight: '6px', borderRight: '1px solid #E6EAF0' }}>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBold().run()}
              style={getButtonStyle(editor.isActive('bold'))}
              title="Bold (Ctrl+B)"
              aria-label="Bold"
            >
              <Bold size={15} />
            </button>

            <button
              type="button"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              style={getButtonStyle(editor.isActive('italic'))}
              title="Italic (Ctrl+I)"
              aria-label="Italic"
            >
              <Italic size={15} />
            </button>

            <button
              type="button"
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              style={getButtonStyle(editor.isActive('underline'))}
              title="Underline (Ctrl+U)"
              aria-label="Underline"
            >
              <UnderlineIcon size={15} />
            </button>

            <button
              type="button"
              onClick={() => editor.chain().focus().toggleStrike().run()}
              style={getButtonStyle(editor.isActive('strike'))}
              title="Strikethrough"
              aria-label="Strikethrough"
            >
              <Strikethrough size={15} />
            </button>

            <button
              type="button"
              onClick={() => editor.chain().focus().toggleHighlight().run()}
              style={getButtonStyle(editor.isActive('highlight'))}
              title="Highlight Text"
              aria-label="Highlight Text"
            >
              <Highlighter size={15} />
            </button>
          </div>

          {/* 4. LISTS & BLOCKQUOTE GROUP */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px', paddingRight: '6px', borderRight: '1px solid #E6EAF0' }}>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              style={getButtonStyle(editor.isActive('bulletList'))}
              title="Bullet List"
              aria-label="Bullet List"
            >
              <List size={15} />
            </button>

            <button
              type="button"
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              style={getButtonStyle(editor.isActive('orderedList'))}
              title="Numbered List"
              aria-label="Numbered List"
            >
              <ListOrdered size={15} />
            </button>

            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              style={getButtonStyle(editor.isActive('blockquote'))}
              title="Blockquote"
              aria-label="Blockquote"
            >
              <Quote size={15} />
            </button>
          </div>

          {/* 5. ALIGNMENT GROUP */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px', paddingRight: '6px', borderRight: '1px solid #E6EAF0' }}>
            <button
              type="button"
              onClick={() => editor.chain().focus().setTextAlign('left').run()}
              style={getButtonStyle(editor.isActive({ textAlign: 'left' }))}
              title="Align Left"
              aria-label="Align Left"
            >
              <AlignLeft size={15} />
            </button>

            <button
              type="button"
              onClick={() => editor.chain().focus().setTextAlign('center').run()}
              style={getButtonStyle(editor.isActive({ textAlign: 'center' }))}
              title="Align Center"
              aria-label="Align Center"
            >
              <AlignCenter size={15} />
            </button>

            <button
              type="button"
              onClick={() => editor.chain().focus().setTextAlign('right').run()}
              style={getButtonStyle(editor.isActive({ textAlign: 'right' }))}
              title="Align Right"
              aria-label="Align Right"
            >
              <AlignRight size={15} />
            </button>

            <button
              type="button"
              onClick={() => editor.chain().focus().setTextAlign('justify').run()}
              style={getButtonStyle(editor.isActive({ textAlign: 'justify' }))}
              title="Justify"
              aria-label="Justify Text"
            >
              <AlignJustify size={15} />
            </button>
          </div>

          {/* 6. INSERTS GROUP */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px', paddingRight: '6px', borderRight: '1px solid #E6EAF0' }}>
            <button
              type="button"
              onClick={() => {
                setLinkUrl(editor.getAttributes('link').href || '');
                setShowLinkModal(true);
              }}
              style={getButtonStyle(editor.isActive('link'))}
              title="Insert / Edit Link"
              aria-label="Insert Link"
            >
              <LinkIcon size={15} />
            </button>

            {editor.isActive('link') && (
              <button
                type="button"
                onClick={() => editor.chain().focus().unsetLink().run()}
                style={{ ...getButtonStyle(false), color: '#DC2626' }}
                title="Remove Link"
                aria-label="Remove Link"
              >
                <Unlink size={15} />
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowImageModal(true)}
              style={getButtonStyle(false)}
              title="Insert HTTPS Image"
              aria-label="Insert Image"
            >
              <ImageIcon size={15} />
            </button>

            <button
              type="button"
              onClick={() => {
                setHtmlContent('');
                setShowHtmlModal(true);
              }}
              style={getButtonStyle(false)}
              title="Insert Raw HTML"
              aria-label="Insert HTML"
            >
              <Code size={15} />
            </button>

            <button
              type="button"
              onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
              style={getButtonStyle(isTableActive)}
              title="Insert Table (3x3)"
              aria-label="Insert Table"
            >
              <TableIcon size={15} />
            </button>

            <button
              type="button"
              onClick={() => editor.chain().focus().setHorizontalRule().run()}
              style={getButtonStyle(false)}
              title="Horizontal Divider Line"
              aria-label="Horizontal Rule"
            >
              <Minus size={15} />
            </button>
          </div>

          {/* 7. STUDY KARNATAKA CALLOUT DROPDOWN MENU */}
          <div style={{ position: 'relative', display: 'inline-block' }} ref={calloutMenuRef}>
            <button
              type="button"
              onClick={() => setShowCalloutMenu(!showCalloutMenu)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #084B7A',
                backgroundColor: '#EAF3F9',
                color: '#084B7A',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
              title="Add Exam Callout Block"
              aria-label="Add Study Block"
            >
              <Sparkles size={14} />
              <span>+ Add Study Block</span>
              <ChevronDown size={14} />
            </button>

            {showCalloutMenu && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  marginTop: '4px',
                  zIndex: 50,
                  width: '320px',
                  maxHeight: '380px',
                  overflowY: 'auto',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E6EAF0',
                  borderRadius: '10px',
                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                  padding: '6px',
                }}
              >
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', padding: '6px 8px', borderBottom: '1px solid #E6EAF0', marginBottom: '4px' }}>
                  Study Karnataka Callout Blocks
                </div>
                {CALLOUT_TYPES.map((callout) => {
                  const Icon = callout.icon;
                  const label = language === 'kn' ? callout.labelKn : callout.labelEn;
                  const desc = language === 'kn' ? callout.descKn : callout.descEn;
                  return (
                    <button
                      key={callout.id}
                      type="button"
                      onClick={() => insertCalloutBlock(callout)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px',
                        border: 'none',
                        backgroundColor: 'transparent',
                        cursor: 'pointer',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <div style={{ padding: '6px', borderRadius: '6px', backgroundColor: callout.bgColor, color: callout.textColor, display: 'flex', alignItems: 'center' }}>
                        <Icon size={16} />
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>{label}</div>
                        <div style={{ fontSize: '11px', color: '#64748B', marginTop: '1px' }}>{desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 8. UTILITIES GROUP */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px', marginLeft: 'auto' }}>
            <button
              type="button"
              onClick={() => editor.chain().focus().unsetAllMarks().run()}
              style={getButtonStyle(false)}
              title="Clear Formatting"
              aria-label="Clear Formatting"
            >
              <Eraser size={15} />
            </button>

            <button
              type="button"
              onClick={() => setShowPreviewModal(true)}
              style={getButtonStyle(showPreviewModal)}
              title="Preview Content"
              aria-label="Preview Content"
            >
              <Eye size={15} />
            </button>

            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              style={getButtonStyle(isFullscreen)}
              title={isFullscreen ? 'Exit Full Screen' : 'Full Screen Focus Mode'}
              aria-label="Toggle Fullscreen Editor"
            >
              {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>
          </div>
        </div>
      )}

      {/* CONTEXTUAL TABLE TOOLBAR */}
      {isTableActive && !readOnly && (
        <div style={{ padding: '6px 12px', backgroundColor: '#EFF6FF', borderBottom: '1px solid #BFDBFE', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
          <span style={{ fontWeight: 600, color: '#1E40AF', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <TableIcon size={14} /> Table Tools:
          </span>
          <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().addRowBefore().run()}>+ Row Above</Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().addRowAfter().run()}>+ Row Below</Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().deleteRow().run()}>- Delete Row</Button>
          <span style={{ color: '#BFDBFE' }}>|</span>
          <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().addColumnBefore().run()}>+ Col Left</Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().addColumnAfter().run()}>+ Col Right</Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().deleteColumn().run()}>- Delete Col</Button>
          <span style={{ color: '#BFDBFE' }}>|</span>
          <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().deleteTable().run()} style={{ color: '#DC2626' }}>Delete Table</Button>
        </div>
      )}

      {/* EDITOR CANVAS AREA */}
      <div
        style={{
          padding: '20px',
          minHeight: isFullscreen ? 'calc(100vh - 160px)' : minHeight,
          maxHeight: isFullscreen ? 'none' : '500px',
          overflowY: 'auto',
          fontSize: '14px',
          lineHeight: 1.6,
          color: '#1E293B',
          fontFamily: language === 'kn' ? "'Kannada Sangam MN', 'Noto Sans Kannada', sans-serif" : "Inter, system-ui, -apple-system, sans-serif",
        }}
      >
        <style>{`
          .ProseMirror { 
            outline: none !important; 
            color: #1E293B;
          }
          /* Paragraphs */
          .ProseMirror p, .tiptap-preview-content p { 
            margin-top: 0; 
            margin-bottom: 0.75em; 
            line-height: 1.6;
          }
          .ProseMirror p:last-child, .tiptap-preview-content p:last-child {
            margin-bottom: 0;
          }
          
          /* Headings */
          .ProseMirror h1, .ProseMirror h2, .ProseMirror h3, .ProseMirror h4,
          .tiptap-preview-content h1, .tiptap-preview-content h2, .tiptap-preview-content h3, .tiptap-preview-content h4 {
            margin-top: 1.5em; 
            margin-bottom: 0.5em; 
            line-height: 1.3; 
            font-weight: 600; 
            color: #0F172A;
          }
          .ProseMirror h1, .tiptap-preview-content h1 { font-size: 1.875em; }
          .ProseMirror h2, .tiptap-preview-content h2 { font-size: 1.5em; }
          .ProseMirror h3, .tiptap-preview-content h3 { font-size: 1.25em; }
          .ProseMirror h4, .tiptap-preview-content h4 { font-size: 1.1em; }
          
          /* Lists */
          .ProseMirror ul, .ProseMirror ol, .tiptap-preview-content ul, .tiptap-preview-content ol {
            padding-left: 1.5em; 
            margin-top: 0.5em;
            margin-bottom: 1em;
          }
          .ProseMirror ul, .tiptap-preview-content ul { list-style-type: disc; }
          .ProseMirror ol, .tiptap-preview-content ol { list-style-type: decimal; }
          
          .ProseMirror li, .tiptap-preview-content li { 
            margin-top: 0.25em; 
            margin-bottom: 0.25em; 
          }
          /* Critical: Ensure paragraphs inside list items don't break onto a new line from the bullet */
          .ProseMirror li p, .tiptap-preview-content li p { 
            margin: 0; 
            display: inline; 
          }

          /* Media */
          .ProseMirror img, .tiptap-preview-content img {
            max-width: 100%; 
            height: auto; 
            border-radius: 8px; 
            border: 1px solid #E2E8F0; 
            margin: 1.5rem auto; 
            display: block;
          }

          /* Blocks */
          .ProseMirror blockquote, .tiptap-preview-content blockquote {
            border-left: 4px solid #CBD5E1; 
            margin: 1.5rem 0; 
            color: #475569; 
            font-style: italic; 
            background-color: #F8FAFC; 
            padding: 1rem 1rem 1rem 1.25rem; 
            border-radius: 0 8px 8px 0;
          }
          .ProseMirror blockquote p:last-child, .tiptap-preview-content blockquote p:last-child {
            margin-bottom: 0;
          }

          .ProseMirror a, .tiptap-preview-content a { 
            color: #2563EB; 
            text-decoration: underline; 
            cursor: pointer; 
          }
          
          /* Tables */
          .ProseMirror table, .tiptap-preview-content table {
            border-collapse: collapse; 
            width: 100%; 
            margin: 1.5rem 0; 
            border: 1px solid #CBD5E1;
          }
          .ProseMirror th, .ProseMirror td, .tiptap-preview-content th, .tiptap-preview-content td {
            border: 1px solid #CBD5E1; 
            padding: 0.75rem; 
            text-align: left;
          }
          .ProseMirror th, .tiptap-preview-content th { 
            background-color: #F1F5F9; 
            font-weight: 600; 
            color: #1E293B; 
          }
        `}</style>
        <EditorContent editor={editor} className="outline-none" style={{ minHeight: minHeight || '160px' }} />
      </div>

      {/* FOOTER BAR: WORD COUNT & AUTOSAVE STATUS */}
      <div
        style={{
          padding: '10px 16px',
          backgroundColor: '#F8FAFC',
          borderTop: '1px solid #E6EAF0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '12px',
          color: '#64748B',
        }}
      >
        {/* Word Count Display */}
        <div>
          <strong>{wordCount}</strong> words • <strong>{charCount}</strong> characters • ~<strong>{readingTime}</strong> min read
        </div>

        {/* Autosave Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {autosaveStatus === 'SAVING' && <RefreshCw size={14} className="animate-spin" color="#F59E0B" />}
          {autosaveStatus === 'SAVED' && <CheckCircle size={14} color="#10B981" />}
          {autosaveStatus === 'UNSAVED' && <AlertCircle size={14} color="#F59E0B" />}
          {autosaveStatus === 'FAILED' && <AlertCircle size={14} color="#EF2323" />}
          <span style={{ fontWeight: 500 }}>
            {autosaveStatus === 'SAVING' && 'Saving...'}
            {autosaveStatus === 'SAVED' && `Saved ✓ ${lastSavedAt ? `at ${lastSavedAt}` : ''}`}
            {autosaveStatus === 'UNSAVED' && 'Unsaved Changes'}
            {autosaveStatus === 'FAILED' && 'Save Failed'}
            {autosaveStatus === 'IDLE' && 'Saved ✓'}
          </span>
        </div>
      </div>

      {/* LINK INSERTION MODAL */}
      {showLinkModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 110, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <form onSubmit={handleLinkSubmit} style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '440px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600, color: '#111827' }}>Insert / Edit Hyperlink</h3>
            <FormField label="URL Address (https://...)" required>
              <Input
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://studykarnataka.com/notes"
                autoFocus
                required
              />
            </FormField>
            {editor.state.selection.empty && (
              <FormField label="Display Link Text">
                <Input
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  placeholder="Click here to view notes"
                />
              </FormField>
            )}
            <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                id="linkOpenNewTab"
                checked={linkOpenNewTab}
                onChange={(e) => setLinkOpenNewTab(e.target.checked)}
              />
              <label htmlFor="linkOpenNewTab" style={{ fontSize: '13px', color: '#334155' }}>Open in new tab</label>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
              <Button type="button" variant="outline" size="sm" onClick={() => setShowLinkModal(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm">
                Apply Link
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* IMAGE INSERTION MODAL */}
      {showImageModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 110, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '440px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600, color: '#111827' }}>Insert Image</h3>
            
            <FormField label="Upload from Device">
              {imageFileName ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: '#F1F5F9', borderRadius: '6px', border: '1px solid #CBD5E1' }}>
                  <span style={{ fontSize: '13px', color: '#0F172A', fontWeight: 500 }}>{imageFileName}</span>
                  <button type="button" onClick={() => { setImageBase64(''); setImageFileName(''); }} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>Remove</button>
                </div>
              ) : (
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '8px',
                    fontSize: '13px',
                    color: '#475569',
                    border: '1px dashed #CBD5E1',
                    borderRadius: '6px',
                    backgroundColor: '#F8FAFC',
                    cursor: 'pointer'
                  }}
                />
              )}
            </FormField>

            {!imageBase64 && (
              <>
                <div style={{ textAlign: 'center', margin: '12px 0', color: '#94A3B8', fontSize: '12px', fontWeight: 600 }}>OR</div>
                <FormField label="Image HTTPS URL" required={!imageUrl}>
                  <Input
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://images.studykarnataka.com/map.jpg"
                    required={!imageUrl}
                  />
                </FormField>
              </>
            )}

            <FormField label="Alt Text (Required for accessibility)" required>
              <Input
                value={imageAlt}
                onChange={(e) => setImageAlt(e.target.value)}
                placeholder="Map of Karnataka River Basins"
                required
              />
            </FormField>
            <FormField label="Caption (Optional)">
              <Input
                value={imageCaption}
                onChange={(e) => setImageCaption(e.target.value)}
                placeholder="Figure 1.1: Major River Basins of Karnataka"
              />
            </FormField>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
              <Button type="button" variant="outline" size="sm" onClick={() => setShowImageModal(false)}>
                Cancel
              </Button>
              <Button type="button" size="sm" disabled={!imageBase64 && !imageUrl.trim()} onClick={handleImageSubmit}>
                Insert Image
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* RAW HTML EDIT MODAL */}
      {showHtmlModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 110, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '600px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600, color: '#111827' }}>Insert Raw HTML</h3>
            <FormField label="Paste your HTML content here">
              <Textarea
                value={htmlContent}
                onChange={(e) => setHtmlContent(e.target.value)}
                rows={12}
                placeholder="<p>Paste your HTML snippet here...</p>"
                style={{ fontFamily: 'monospace', fontSize: '13px', lineHeight: '1.5', backgroundColor: '#1E293B', color: '#F8FAFC', border: '1px solid #334155' }}
              />
            </FormField>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
              <Button type="button" variant="outline" size="sm" onClick={() => setShowHtmlModal(false)}>
                Cancel
              </Button>
              <Button type="button" size="sm" onClick={() => {
                if (htmlContent.trim()) {
                  // Sanitize the HTML string to remove newlines and extra spaces between tags.
                  // Otherwise, Tiptap's parser converts \n\n into empty paragraphs or empty list items.
                  const cleanedHtml = htmlContent
                    .replace(/>\s+</g, '><') // Remove whitespace between tags
                    .trim();
                  editor.chain().focus().insertContent(cleanedHtml).run();
                }
                setShowHtmlModal(false);
                setHtmlContent('');
              }}>
                Insert HTML
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* PREVIEW MODAL */}
      {showPreviewModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 120, backgroundColor: 'rgba(15, 23, 42, 0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px' }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', width: '100%', maxWidth: '800px', height: '100%', maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FAFC', borderTopLeftRadius: '12px', borderTopRightRadius: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Eye size={18} color="#084B7A" />
                Live Content Preview
              </h3>
              <button
                onClick={() => setShowPreviewModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px', borderRadius: '4px' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#E2E8F0')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <X size={20} />
              </button>
            </div>
            
            <div 
              style={{ 
                flex: 1, 
                overflowY: 'auto', 
                padding: '32px 48px',
                fontSize: '15px',
                lineHeight: 1.7,
                color: '#334155',
                fontFamily: language === 'kn' ? "'Kannada Sangam MN', 'Noto Sans Kannada', sans-serif" : "Inter, system-ui, -apple-system, sans-serif",
              }}
              className="tiptap-preview-content"
              dangerouslySetInnerHTML={{ __html: editor.getHTML() }}
            />
            
            <div style={{ padding: '16px 24px', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end', backgroundColor: '#F8FAFC', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}>
              <Button type="button" onClick={() => setShowPreviewModal(false)}>
                Close Preview
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
