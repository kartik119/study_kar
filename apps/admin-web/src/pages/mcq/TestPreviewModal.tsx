import React from 'react';
import { X } from 'lucide-react';

export const TestPreviewModal: React.FC<{ test: any; onClose: () => void }> = ({ test, onClose }) => {
  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px', overflowY: 'auto' }}>
      <div style={{ backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', width: '100%', maxWidth: '800px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8FAFC' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#4338CA', backgroundColor: '#EEF2FF', padding: '4px 12px', borderRadius: '8px', fontSize: '14px' }}>
              {test.code}
            </span>
            <span style={{ padding: '2px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, backgroundColor: '#E2E8F0', color: '#334155' }}>
              {test.status}
            </span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#64748B' }}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A', marginBottom: '8px' }}>
            {test.titleEn}
          </h2>
          <h3 style={{ fontSize: '16px', fontWeight: 400, color: '#64748B', marginBottom: '24px' }}>
            {test.titleKn}
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            <div style={{ backgroundColor: '#F8FAFC', padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '4px' }}>Questions</div>
              <div style={{ fontWeight: 600, color: '#0F172A' }}>{test.selectedCount || 0} / {test.totalQuestions}</div>
            </div>
            <div style={{ backgroundColor: '#F8FAFC', padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '4px' }}>Duration</div>
              <div style={{ fontWeight: 600, color: '#0F172A' }}>{test.durationMinutes} min</div>
            </div>
            <div style={{ backgroundColor: '#F8FAFC', padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '4px' }}>Total Marks</div>
              <div style={{ fontWeight: 600, color: '#0F172A' }}>{test.totalMarks}</div>
            </div>
          </div>

          <h4 style={{ fontSize: '16px', fontWeight: 600, color: '#0F172A', marginBottom: '16px', borderBottom: '1px solid #E2E8F0', paddingBottom: '8px' }}>
            Questions Preview
          </h4>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {test.questions?.map((q: any, idx: number) => (
              <div key={idx} style={{ padding: '16px', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{ width: '28px', height: '28px', backgroundColor: '#EFF6FF', color: '#2563EB', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '12px', flexShrink: 0 }}>
                    {idx + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: '#0F172A', marginBottom: '4px', fontSize: '15px' }}>
                      {q.question?.questionTextEn}
                    </div>
                    <div style={{ color: '#64748B', fontSize: '14px', marginBottom: '12px' }}>
                      {q.question?.questionTextKn}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px' }}>
                      <div style={{ padding: '8px', backgroundColor: '#F8FAFC', borderRadius: '6px', border: q.question?.correctOption === 'A' ? '1px solid #10B981' : '1px solid #E2E8F0' }}>
                        <strong style={{ color: '#475569' }}>A.</strong> {q.question?.optionA_En}
                      </div>
                      <div style={{ padding: '8px', backgroundColor: '#F8FAFC', borderRadius: '6px', border: q.question?.correctOption === 'B' ? '1px solid #10B981' : '1px solid #E2E8F0' }}>
                        <strong style={{ color: '#475569' }}>B.</strong> {q.question?.optionB_En}
                      </div>
                      <div style={{ padding: '8px', backgroundColor: '#F8FAFC', borderRadius: '6px', border: q.question?.correctOption === 'C' ? '1px solid #10B981' : '1px solid #E2E8F0' }}>
                        <strong style={{ color: '#475569' }}>C.</strong> {q.question?.optionC_En}
                      </div>
                      <div style={{ padding: '8px', backgroundColor: '#F8FAFC', borderRadius: '6px', border: q.question?.correctOption === 'D' ? '1px solid #10B981' : '1px solid #E2E8F0' }}>
                        <strong style={{ color: '#475569' }}>D.</strong> {q.question?.optionD_En}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {(!test.questions || test.questions.length === 0) && (
              <div style={{ textAlign: 'center', color: '#64748B', padding: '24px' }}>
                No questions selected for this test yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
