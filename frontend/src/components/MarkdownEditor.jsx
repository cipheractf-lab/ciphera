import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Edit3, Eye } from 'lucide-react';
import './MarkdownEditor.css';

/**
 * Minimal write/preview markdown editor. Reuses react-markdown (already
 * a dependency) for rendering rather than pulling in a dedicated editor
 * library -- this is a plain textarea with a live preview tab, not a
 * WYSIWYG editor.
 */
function MarkdownEditor({ value, onChange, placeholder = 'Write something...', maxLength = 2000, label }) {
  const [tab, setTab] = useState('write');

  return (
    <div className="md-editor">
      {label && <label className="md-editor-label">{label}</label>}
      <div className="md-editor-tabs">
        <button
          type="button"
          className={`md-editor-tab${tab === 'write' ? ' is-active' : ''}`}
          onClick={() => setTab('write')}
        >
          <Edit3 size={14} /> Write
        </button>
        <button
          type="button"
          className={`md-editor-tab${tab === 'preview' ? ' is-active' : ''}`}
          onClick={() => setTab('preview')}
        >
          <Eye size={14} /> Preview
        </button>
        <span className="md-editor-count">{value.length}/{maxLength}</span>
      </div>

      {tab === 'write' ? (
        <textarea
          className="md-editor-textarea"
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
          placeholder={placeholder}
          rows={6}
        />
      ) : (
        <div className="md-editor-preview">
          {value.trim() ? (
            <ReactMarkdown>{value}</ReactMarkdown>
          ) : (
            <p className="md-editor-preview-empty">Nothing to preview yet.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default MarkdownEditor;
