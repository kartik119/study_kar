import React, { useState } from 'react';
import { Modal, Badge, Button } from '@study-karnataka/ui';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface ActivityDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activityLog: any;
}

export const ActivityDetailsDrawer: React.FC<ActivityDetailsDrawerProps> = ({ isOpen, onClose, activityLog }) => {
  const [showTech, setShowTech] = useState(false);
  const navigate = useNavigate();

  if (!activityLog) return null;

  const log = activityLog;
  const user = log.adminUser || {};
  const profile = user.adminProfile || {};
  const role = profile.designation || user.adminRoles?.[0]?.role?.name || 'Admin';

  let beforeStr = '';
  let afterStr = '';

  try {
    if (log.previousValue) beforeStr = JSON.stringify(log.previousValue, null, 2);
    if (log.newValue) afterStr = JSON.stringify(log.newValue, null, 2);
  } catch(e) {}

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Activity Details" maxWidth="600px">
      <div style={{ padding: '0 24px 24px 24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', borderBottom: '1px solid #E2E8F0', paddingBottom: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '8px', backgroundColor: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '20px' }}>📄</span>
          </div>
          <div>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 600, color: '#0F172A' }}>{log.action}</h3>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', fontSize: '13px', color: '#64748B' }}>
              <Badge color="gray">{log.module}</Badge>
              <span>{format(new Date(log.createdAt), 'dd MMM yyyy • hh:mm a')}</span>
            </div>
          </div>
        </div>

        {/* Actor Section */}
        <div>
          <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#1E293B', marginBottom: '12px' }}>Actor</h4>
          <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div><span style={{ display: 'block', fontSize: '12px', color: '#64748B' }}>Name</span><span style={{ fontSize: '13px', color: '#0F172A', fontWeight: 500 }}>{user.fullName || 'System Automated Process'}</span></div>
              <div><span style={{ display: 'block', fontSize: '12px', color: '#64748B' }}>Role</span><span style={{ fontSize: '13px', color: '#0F172A', fontWeight: 500 }}>{role}</span></div>
              <div><span style={{ display: 'block', fontSize: '12px', color: '#64748B' }}>Email</span><span style={{ fontSize: '13px', color: '#0F172A', fontWeight: 500 }}>{user.email || '—'}</span></div>
              <div><span style={{ display: 'block', fontSize: '12px', color: '#64748B' }}>IP Address</span><span style={{ fontSize: '13px', color: '#0F172A', fontWeight: 500 }}>{log.ipAddress || 'Not captured'}</span></div>
            </div>
          </div>
        </div>

        {/* Event Section */}
        <div>
          <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#1E293B', marginBottom: '12px' }}>Event</h4>
          <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div><span style={{ display: 'block', fontSize: '12px', color: '#64748B' }}>Event ID</span><span style={{ fontSize: '13px', color: '#0F172A', fontWeight: 500 }}>{log.id}</span></div>
              <div><span style={{ display: 'block', fontSize: '12px', color: '#64748B' }}>Action Key</span><span style={{ fontSize: '13px', color: '#0F172A', fontWeight: 500 }}>{log.action}</span></div>
              <div><span style={{ display: 'block', fontSize: '12px', color: '#64748B' }}>Module</span><span style={{ fontSize: '13px', color: '#0F172A', fontWeight: 500 }}>{log.module}</span></div>
              <div><span style={{ display: 'block', fontSize: '12px', color: '#64748B' }}>Target Type</span><span style={{ fontSize: '13px', color: '#0F172A', fontWeight: 500 }}>{log.recordType || '—'}</span></div>
              <div style={{ gridColumn: 'span 2' }}>
                <span style={{ display: 'block', fontSize: '12px', color: '#64748B' }}>Target ID</span>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', color: '#0F172A', fontWeight: 500 }}>{log.recordId || '—'}</span>
                  {log.recordId && log.module === 'TEAM' && (
                    <Button variant="secondary" size="sm" onClick={() => navigate('/team/members')}>View in Directory</Button>
                  )}
                  {log.recordId && log.module === 'WORK_ASSIGNMENT' && (
                    <Button variant="secondary" size="sm" onClick={() => navigate('/team/work-assignments')}>View Assignment</Button>
                  )}
                  {log.recordId && log.module === 'ROLE_PERMISSION' && (
                    <Button variant="secondary" size="sm" onClick={() => navigate('/team/roles-permissions')}>View Roles</Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Details Section */}
        {log.reason && (
          <div>
            <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#1E293B', marginBottom: '12px' }}>Description</h4>
            <div style={{ fontSize: '13px', color: '#334155', backgroundColor: '#F8FAFC', padding: '12px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
              {log.reason}
            </div>
          </div>
        )}

        {/* Change Summary */}
        {(beforeStr || afterStr) && (
          <div>
            <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#1E293B', marginBottom: '12px' }}>Change Summary</h4>
            <div style={{ display: 'flex', gap: '16px' }}>
              {beforeStr && (
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', marginBottom: '8px' }}>Before</div>
                  <pre style={{ margin: 0, padding: '12px', backgroundColor: '#FEE2E2', color: '#991B1B', borderRadius: '6px', fontSize: '12px', overflowX: 'auto' }}>
                    {beforeStr}
                  </pre>
                </div>
              )}
              {afterStr && (
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', marginBottom: '8px' }}>After</div>
                  <pre style={{ margin: 0, padding: '12px', backgroundColor: '#DCFCE7', color: '#166534', borderRadius: '6px', fontSize: '12px', overflowX: 'auto' }}>
                    {afterStr}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Metadata */}
        <div>
          <button 
            onClick={() => setShowTech(!showTech)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', padding: 0, color: '#3B82F6', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
          >
            {showTech ? <ChevronUp size={16} /> : <ChevronDown size={16} />} Technical Details
          </button>
          
          {showTech && (
            <div style={{ marginTop: '12px', backgroundColor: '#1E293B', padding: '16px', borderRadius: '8px', color: '#E2E8F0', fontSize: '12px', fontFamily: 'monospace' }}>
              <div>"userAgent": "{log.userAgent || 'unknown'}"</div>
              <div>"timestamp": "{log.createdAt}"</div>
              <div>"id": "{log.id}"</div>
            </div>
          )}
        </div>

      </div>
    </Modal>
  );
};
