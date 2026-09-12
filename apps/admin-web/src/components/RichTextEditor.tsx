import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, placeholder, minHeight = '300px' }) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({
        openOnClick: false,
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  if (!editor) return null;

  return (
    <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
      <div style={{ padding: '8px', backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          style={{ padding: '4px 8px', backgroundColor: editor.isActive('bold') ? '#E2E8F0' : 'transparent', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          B
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          style={{ padding: '4px 8px', backgroundColor: editor.isActive('italic') ? '#E2E8F0' : 'transparent', border: 'none', borderRadius: '4px', cursor: 'pointer', fontStyle: 'italic' }}
        >
          I
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          style={{ padding: '4px 8px', backgroundColor: editor.isActive('underline') ? '#E2E8F0' : 'transparent', border: 'none', borderRadius: '4px', cursor: 'pointer', textDecoration: 'underline' }}
        >
          U
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          style={{ padding: '4px 8px', backgroundColor: editor.isActive('strike') ? '#E2E8F0' : 'transparent', border: 'none', borderRadius: '4px', cursor: 'pointer', textDecoration: 'line-through' }}
        >
          S
        </button>
        <div style={{ width: '1px', backgroundColor: '#E2E8F0', margin: '0 4px' }} />
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          style={{ padding: '4px 8px', backgroundColor: editor.isActive('heading', { level: 1 }) ? '#E2E8F0' : 'transparent', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          H1
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          style={{ padding: '4px 8px', backgroundColor: editor.isActive('heading', { level: 2 }) ? '#E2E8F0' : 'transparent', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          H2
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          style={{ padding: '4px 8px', backgroundColor: editor.isActive('heading', { level: 3 }) ? '#E2E8F0' : 'transparent', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          H3
        </button>
        <div style={{ width: '1px', backgroundColor: '#E2E8F0', margin: '0 4px' }} />
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          style={{ padding: '4px 8px', backgroundColor: editor.isActive('bulletList') ? '#E2E8F0' : 'transparent', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          • List
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          style={{ padding: '4px 8px', backgroundColor: editor.isActive('orderedList') ? '#E2E8F0' : 'transparent', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          1. List
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          style={{ padding: '4px 8px', backgroundColor: editor.isActive('blockquote') ? '#E2E8F0' : 'transparent', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          " Quote
        </button>
        <div style={{ width: '1px', backgroundColor: '#E2E8F0', margin: '0 4px' }} />
        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          style={{ padding: '4px 8px', backgroundColor: 'transparent', border: 'none', borderRadius: '4px', cursor: editor.can().undo() ? 'pointer' : 'not-allowed', opacity: editor.can().undo() ? 1 : 0.5 }}
        >
          Undo
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          style={{ padding: '4px 8px', backgroundColor: 'transparent', border: 'none', borderRadius: '4px', cursor: editor.can().redo() ? 'pointer' : 'not-allowed', opacity: editor.can().redo() ? 1 : 0.5 }}
        >
          Redo
        </button>
      </div>
      <div style={{ padding: '16px', minHeight, cursor: 'text', outline: 'none' }} onClick={() => editor.commands.focus()}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};
