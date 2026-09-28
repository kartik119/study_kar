// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Modal, Button, Badge } from '@study-karnataka/ui';
import { teamApi } from '../../api/team.api';

export const EditScopeDrawer: React.FC<{ isOpen: boolean; onClose: () => void; member: any; onSave: () => void }> = ({ isOpen, onClose, member, onSave }) => {
  const [loading, setLoading] = useState(false);
  const [moduleScope, setModuleScope] = useState<string[]>([]);
  const [examScope, setExamScope] = useState<string[]>([]);

  useEffect(() => {
    if (member) {
      setModuleScope(member.memberModuleScope || []);
      setExamScope(member.examScope || []);
    }
  }, [member]);

  const allModules = ['Students', 'Study Plans', 'Mock Tests', 'Study Materials', 'Live Classes', 'Mentorship', 'Analytics'];
  const allExams = ['UPSC', 'KPSC'];
  
  const roleModules = member?.role?.permissions?.map((p: any) => p.module) || [];

  const handleModuleToggle = (m: string) => {
    if (!roleModules.includes(m) && member?.role?.name !== 'Super Admin') {
      alert(`Role ${member?.role?.name} does not have access to ${m}`);
      return;
    }
    setModuleScope(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);
  };

  const handleExamToggle = (e: string) => {
    setExamScope(prev => prev.includes(e) ? prev.filter(x => x !== e) : [...prev, e]);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await teamApi.editAccess(member.id, {
        memberModuleScope: moduleScope,
        examScope: examScope
      });
      alert('Scope updated successfully');
      onSave();
    } catch (err: any) {
      alert(err.message || 'Failed to update scope');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Edit Scope - ${member?.fullName || member?.email || 'Member'}`} maxWidth="500px">
      <div style={{ padding: '0 24px 24px 24px' }}>
        <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', marginTop: '16px' }}>Module Scope</h4>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '24px' }}>
          {allModules.map(m => {
            const hasRoleAccess = roleModules.includes(m) || member?.role?.name === 'Super Admin';
            return (
              <div
                key={m}
                onClick={() => handleModuleToggle(m)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '20px',
                  border: '1px solid',
                  borderColor: moduleScope.includes(m) ? '#3B82F6' : '#E2E8F0',
                  backgroundColor: moduleScope.includes(m) ? '#EFF6FF' : '#fff',
                  color: moduleScope.includes(m) ? '#1E40AF' : hasRoleAccess ? '#475569' : '#CBD5E1',
                  cursor: hasRoleAccess ? 'pointer' : 'not-allowed',
                  fontSize: '13px',
                  userSelect: 'none'
                }}
              >
                {m} {!hasRoleAccess && <span style={{ fontSize: '10px' }}>🔒</span>}
              </div>
            );
          })}
        </div>

        <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>Exam Scope</h4>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '32px' }}>
          {allExams.map(e => (
            <div
              key={e}
              onClick={() => handleExamToggle(e)}
              style={{
                padding: '6px 12px',
                borderRadius: '20px',
                border: '1px solid',
                borderColor: examScope.includes(e) ? '#8B5CF6' : '#E2E8F0',
                backgroundColor: examScope.includes(e) ? '#F5F3FF' : '#fff',
                color: examScope.includes(e) ? '#5B21B6' : '#475569',
                cursor: 'pointer',
                fontSize: '13px',
                userSelect: 'none'
              }}
            >
              {e}
            </div>
          ))}
        </div>
      
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #E2E8F0', paddingTop: '16px', marginTop: '16px' }}>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleSave} isLoading={loading}>Save Scope</Button>
        </div>
      </div>
    </Modal>
  );
};
