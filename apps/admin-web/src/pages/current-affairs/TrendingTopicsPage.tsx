import React, { useEffect, useState } from 'react';
import { Card, PageHeader, Button, Modal, Input } from '@study-karnataka/ui';
import { currentAffairsApi } from '../../services/currentAffairsApi';

export const TrendingTopicsPage: React.FC = () => {
  const [topics, setTopics] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newTopic, setNewTopic] = useState({
    topicEn: '',
    topicKn: '',
    slug: '',
    priority: 0
  });

  useEffect(() => {
    fetchTopics();
  }, []);

  const fetchTopics = async () => {
    setLoading(true);
    try {
      const res = await currentAffairsApi.getTrendingTopics();
      setTopics(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!newTopic.topicEn || !newTopic.topicKn || !newTopic.slug) {
      alert("Please fill all required fields (EN, KN, Slug).");
      return;
    }

    setIsSaving(true);
    try {
      await currentAffairsApi.createTrendingTopic({
        topicEn: newTopic.topicEn,
        topicKn: newTopic.topicKn,
        slug: newTopic.slug,
        priority: newTopic.priority
      });
      setIsModalOpen(false);
      setNewTopic({ topicEn: '', topicKn: '', slug: '', priority: 0 });
      fetchTopics(); // Refresh list
    } catch (e) {
      console.error(e);
      alert("Failed to create topic.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6" style={{ padding: '24px' }}>
      <PageHeader
        title="Trending Topics"
        description="Manage trending topics for the frontend"
        breadcrumbItems={[
          { label: 'Dashboard', href: '/' },
          { label: 'Current Affairs', href: '/current-affairs' },
          { label: 'Trending Topics' },
        ]}
        actions={
          <Button onClick={() => setIsModalOpen(true)}>
            + Add Topic
          </Button>
        }
      />

      <Card style={{ marginTop: '24px' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>Loading topics...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #E2E8F0', backgroundColor: '#F8FAFC' }}>
                <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Topic (EN)</th>
                <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Topic (KN)</th>
                <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Priority</th>
                <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {topics.map((t) => (
                <tr key={t.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                  <td style={{ padding: '16px', fontWeight: 500, color: '#1E293B' }}>{t.topicEn}</td>
                  <td style={{ padding: '16px', color: '#475569' }}>{t.topicKn}</td>
                  <td style={{ padding: '16px', color: '#475569' }}>{t.priority}</td>
                  <td style={{ padding: '16px' }}>
                    <span style={{ 
                      padding: '4px 8px', 
                      borderRadius: '9999px', 
                      fontSize: '12px',
                      fontWeight: 600,
                      backgroundColor: t.isActive ? '#DCFCE7' : '#F1F5F9',
                      color: t.isActive ? '#166534' : '#475569'
                    }}>
                      {t.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
              {topics.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: '32px', textAlign: 'center', color: '#64748B' }}>No trending topics found.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Trending Topic">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: '400px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Topic Name (English) *</label>
            <Input 
              value={newTopic.topicEn} 
              onChange={e => {
                const val = e.target.value;
                setNewTopic({...newTopic, topicEn: val, slug: val.toLowerCase().replace(/[^a-z0-9]+/g, '-')});
              }}
              placeholder="e.g. UPSC Exam"
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Topic Name (Kannada) *</label>
            <Input 
              value={newTopic.topicKn} 
              onChange={e => setNewTopic({...newTopic, topicKn: e.target.value})}
              placeholder="e.g. ಯುಪಿಎಸ್ಸಿ ಪರೀಕ್ಷೆ"
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Slug / URL Path *</label>
            <Input 
              value={newTopic.slug} 
              onChange={e => setNewTopic({...newTopic, slug: e.target.value})}
              placeholder="e.g. upsc-exam"
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Display Priority</label>
            <Input 
              type="number"
              value={newTopic.priority} 
              onChange={e => setNewTopic({...newTopic, priority: parseInt(e.target.value) || 0})}
              placeholder="0"
            />
            <p style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>Higher priority topics appear first on the frontend.</p>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Topic'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
