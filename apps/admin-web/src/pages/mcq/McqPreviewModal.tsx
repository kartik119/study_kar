import React, { useState } from 'react';
import { X, CheckCircle2, Languages, Sparkles } from 'lucide-react';
import { McqQuestion } from '@study-karnataka/shared-types';

export interface McqPreviewModalProps {
  question: McqQuestion;
  onClose: () => void;
}

export const McqPreviewModal: React.FC<McqPreviewModalProps> = ({ question, onClose }) => {
  const [langMode, setLangMode] = useState<'bilingual' | 'en' | 'kn'>('bilingual');

  const getDifficultyBadge = (diff: string) => {
    switch (diff) {
      case 'EASY':
        return <span style={{ padding: '2px 10px', borderRadius: '9999px', fontSize: '12px', fontWeight: 700, backgroundColor: '#D1FAE5', color: '#065F46' }}>Easy</span>;
      case 'MEDIUM':
        return <span style={{ padding: '2px 10px', borderRadius: '9999px', fontSize: '12px', fontWeight: 700, backgroundColor: '#FEF3C7', color: '#92400E' }}>Medium</span>;
      case 'HARD':
        return <span style={{ padding: '2px 10px', borderRadius: '9999px', fontSize: '12px', fontWeight: 700, backgroundColor: '#FFE4E6', color: '#9F1239' }}>Hard</span>;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <span style={{ padding: '2px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, backgroundColor: '#059669', color: 'white' }}>Approved</span>;
      case 'REVIEW_PENDING':
        return <span style={{ padding: '2px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, backgroundColor: '#F59E0B', color: 'white' }}>Review Pending</span>;
      case 'CHANGES_REQUESTED':
        return <span style={{ padding: '2px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, backgroundColor: '#E11D48', color: 'white' }}>Changes Requested</span>;
      case 'ARCHIVED':
        return <span style={{ padding: '2px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, backgroundColor: '#475569', color: 'white' }}>Archived</span>;
      default:
        return <span style={{ padding: '2px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, backgroundColor: '#E2E8F0', color: '#334155' }}>Draft</span>;
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px', overflowY: 'auto' }}>
      <div style={{ backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', width: '100%', maxWidth: '768px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8FAFC' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#4338CA', backgroundColor: '#EEF2FF', padding: '4px 12px', borderRadius: '8px', fontSize: '14px' }}>
              {question.code}
            </span>
            {getStatusBadge(question.status)}
            {getDifficultyBadge(question.difficulty)}
          </div>
          <button onClick={onClose} style={{ color: '#94A3B8', cursor: 'pointer', padding: '6px', borderRadius: '8px', background: 'none', border: 'none' }}>
            <X size={20} />
          </button>
        </div>

        {/* Language Switcher Bar */}
        <div style={{ padding: '12px 24px', borderBottom: '1px solid #F1F5F9', backgroundColor: 'rgba(248, 250, 252, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>Admin Authorized Preview</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: 'rgba(226, 232, 240, 0.7)', padding: '4px', borderRadius: '8px' }}>
            <Languages size={16} style={{ color: '#64748B', marginLeft: '8px', marginRight: '4px' }} />
            <button
              onClick={() => setLangMode('bilingual')}
              style={{ padding: '4px 12px', fontSize: '12px', fontWeight: 500, borderRadius: '6px', transition: 'colors 0.2s', border: 'none', cursor: 'pointer', ...(langMode === 'bilingual' ? { backgroundColor: '#4F46E5', color: 'white' } : { backgroundColor: 'transparent', color: '#334155' }) }}
            >
              Bilingual
            </button>
            <button
              onClick={() => setLangMode('en')}
              style={{ padding: '4px 12px', fontSize: '12px', fontWeight: 500, borderRadius: '6px', transition: 'colors 0.2s', border: 'none', cursor: 'pointer', ...(langMode === 'en' ? { backgroundColor: '#4F46E5', color: 'white' } : { backgroundColor: 'transparent', color: '#334155' }) }}
            >
              English
            </button>
            <button
              onClick={() => setLangMode('kn')}
              style={{ padding: '4px 12px', fontSize: '12px', fontWeight: 500, borderRadius: '6px', transition: 'colors 0.2s', border: 'none', cursor: 'pointer', ...(langMode === 'kn' ? { backgroundColor: '#4F46E5', color: 'white' } : { backgroundColor: 'transparent', color: '#334155' }) }}
            >
              ಕನ್ನಡ
            </button>
          </div>
        </div>

        {/* Question Details Body */}
        <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px', color: '#0F172A', flex: 1 }}>
          {/* Question Stems */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', backgroundColor: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
            {(langMode === 'bilingual' || langMode === 'en') && (
              <div>
                <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B', display: 'block', marginBottom: '4px' }}>
                  English Question
                </span>
                <div
                  style={{ fontSize: '16px', fontWeight: 600, color: '#0F172A', lineHeight: 1.6 }}
                  dangerouslySetInnerHTML={{ __html: question.questionTextEn || '<i>No English question stem provided</i>' }}
                />
              </div>
            )}

            {(langMode === 'bilingual' || langMode === 'kn') && (
              <div style={langMode === 'bilingual' ? { paddingTop: '12px', borderTop: '1px solid #E2E8F0' } : {}}>
                <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B', display: 'block', marginBottom: '4px' }}>
                  Kannada Question (ಕನ್ನಡ)
                </span>
                <div
                  style={{ fontSize: '16px', fontWeight: 500, color: '#1E293B', lineHeight: 1.6 }}
                  dangerouslySetInnerHTML={{ __html: question.questionTextKn || '<i>ಕನ್ನಡ ಪ್ರಶ್ನೆ ಲಭ್ಯವಿಲ್ಲ</i>' }}
                />
              </div>
            )}
          </div>

          {/* Options Grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h4 style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B', margin: 0 }}>Options (A, B, C, D)</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '12px' }}>
              {[
                { key: 'A', en: question.optionA_En, kn: question.optionA_Kn },
                { key: 'B', en: question.optionB_En, kn: question.optionB_Kn },
                { key: 'C', en: question.optionC_En, kn: question.optionC_Kn },
                { key: 'D', en: question.optionD_En, kn: question.optionD_Kn },
              ].map((opt) => {
                const isCorrect = question.correctOption === opt.key;
                return (
                  <div
                    key={opt.key}
                    style={{ padding: '14px', borderRadius: '12px', border: '1px solid', display: 'flex', alignItems: 'flex-start', gap: '12px', transition: 'colors 0.2s', ...(isCorrect ? { backgroundColor: '#ECFDF5', borderColor: '#6EE7B7', boxShadow: '0 0 0 2px rgba(16, 185, 129, 0.2)' } : { backgroundColor: 'white', borderColor: '#E2E8F0' }) }}
                  >
                    <span
                      style={{ width: '28px', height: '28px', flexShrink: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, ...(isCorrect ? { backgroundColor: '#059669', color: 'white' } : { backgroundColor: '#F1F5F9', color: '#334155' }) }}
                    >
                      {opt.key}
                    </span>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '14px' }}>
                      {(langMode === 'bilingual' || langMode === 'en') && (
                        <div
                          style={isCorrect ? { fontWeight: 600, color: '#022C22' } : { color: '#1E293B' }}
                          dangerouslySetInnerHTML={{
                            __html: opt.en || '<span style="color: #94A3B8; font-style: italic;">Empty</span>',
                          }}
                        />
                      )}
                      {(langMode === 'bilingual' || langMode === 'kn') && (
                        <div
                          style={{ fontSize: '12px', ...(isCorrect ? { color: '#065F46' } : { color: '#475569' }) }}
                          dangerouslySetInnerHTML={{
                            __html: opt.kn || '<span style="color: #94A3B8; font-style: italic;">ಖಾಲಿ</span>',
                          }}
                        />
                      )}
                    </div>
                    {isCorrect && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 700, color: '#047857', flexShrink: 0, backgroundColor: '#D1FAE5', padding: '2px 8px', borderRadius: '4px' }}>
                        <CheckCircle2 size={16} style={{ color: '#059669' }} /> Correct
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Explanations */}
          {(question.explanationEn || question.explanationKn) && (
            <div style={{ backgroundColor: 'rgba(238, 242, 255, 0.6)', borderRadius: '12px', padding: '16px', border: '1px solid #E0E7FF', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#4338CA' }}>
                <Sparkles size={16} style={{ color: '#4F46E5' }} /> Answer Explanation
              </span>
              {(langMode === 'bilingual' || langMode === 'en') && question.explanationEn && (
                <div
                  style={{ fontSize: '12px', color: '#1E1B4B', lineHeight: 1.6 }}
                  dangerouslySetInnerHTML={{ __html: question.explanationEn }}
                />
              )}
              {(langMode === 'bilingual' || langMode === 'kn') && question.explanationKn && (
                <div
                  style={{ fontSize: '12px', color: '#334155', lineHeight: 1.6 }}
                  dangerouslySetInnerHTML={{ __html: question.explanationKn }}
                />
              )}
            </div>
          )}

          {/* Taxonomy & PYQ Information */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', paddingTop: '12px', borderTop: '1px solid #F1F5F9', fontSize: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontWeight: 700, color: '#64748B', display: 'block' }}>Academic Taxonomy:</span>
              <div style={{ color: '#1E293B' }}>
                {question.categoryNameEn || 'Uncategorized'} ➔ {question.subcategoryNameEn || 'None'}
              </div>
              {question.topicNameEn && (
                <div style={{ color: '#475569' }}>Topic: {question.topicNameEn}</div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontWeight: 700, color: '#64748B', display: 'block' }}>Scoring & Source Metadata:</span>
              <div style={{ color: '#1E293B' }}>
                Marks: +{Number(question.positiveMarks)} / -{Number(question.negativeMarks)}
              </div>
              {question.isPyq && (
                <div style={{ color: '#4338CA', fontWeight: 600 }}>
                  PYQ: {question.pyqExamName || 'Competitive Exam'} ({question.pyqYear || 'N/A'})
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
