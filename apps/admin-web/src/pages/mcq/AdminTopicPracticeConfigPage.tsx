import React, { useState, useEffect } from 'react';
import { Button, Card, Badge, Alert, Select, FormField, Input } from '@study-karnataka/ui';

export const AdminTopicPracticeConfigPage: React.FC = () => {
  const [categories, setCategories] = useState<any[]>([]);
  const [configs, setConfigs] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [accessClassification, setAccessClassification] = useState<string>('FREE');
  const [maxQuestions, setMaxQuestions] = useState<number>(50);
  const [isEnabled, setIsEnabled] = useState<boolean>(true);

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    setLoading(true);
    setError(null);
    try {
      const adminToken = localStorage.getItem('admin_token') || '';
      const headers = { Authorization: `Bearer ${adminToken}` };

      const [catRes, configRes] = await Promise.all([
        fetch('/api/v1/admin/academic-taxonomy/categories?moduleType=MCQ', { headers }).then((r) => r.json()),
        fetch('/api/v1/admin/topic-practice/configs', { headers }).then((r) => r.json()),
      ]);

      const catList = catRes.data || [];
      setCategories(catList);
      setConfigs(configRes.data || []);
      if (catList.length > 0) {
        setSelectedCategory(catList[0].id);
      }
    } catch (err: any) {
      setError('Failed to load topic practice configurations');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory) return;

    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const adminToken = localStorage.getItem('admin_token') || '';
      const res = await fetch('/api/v1/admin/topic-practice/configs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          categoryId: selectedCategory,
          accessClassification,
          maxQuestions: Number(maxQuestions),
          isEnabled,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to save configuration');
      }

      setSuccessMsg('Topic practice taxonomy access configuration updated successfully.');
      loadAdminData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: '24px', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#111827', margin: 0 }}>
          Topic Practice Configuration & Governance
        </h1>
        <p style={{ fontSize: '14px', color: '#64748B', margin: '4px 0 0 0' }}>
          Configure dynamic topic practice rules, access classifications (Free / Paid / Freemium), and session limits per subject category.
        </p>
      </div>

      {error && (
        <div style={{ marginBottom: '20px' }}>
          <Alert variant="error" title="Error" message={error} />
        </div>
      )}

      {successMsg && (
        <div style={{ marginBottom: '20px' }}>
          <Alert variant="success" title="Success" message={successMsg} />
        </div>
      )}

      {/* Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        <Card>
          <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 600 }}>Active Practice Engine</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#16A34A', margin: '4px 0' }}>ENABLED</div>
          <div style={{ fontSize: '12px', color: '#64748B' }}>Dynamic Taxonomy Pool</div>
        </Card>

        <Card>
          <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 600 }}>Subject Categories</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#111827', margin: '4px 0' }}>{categories.length}</div>
          <div style={{ fontSize: '12px', color: '#64748B' }}>Configured Subjects</div>
        </Card>

        <Card>
          <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 600 }}>Default Access Policy</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#084B7A', margin: '4px 0' }}>FREE</div>
          <div style={{ fontSize: '12px', color: '#64748B' }}>Deferred Payment Hook</div>
        </Card>

        <Card>
          <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 600 }}>Max Session Limit</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#111827', margin: '4px 0' }}>50 MCQs</div>
          <div style={{ fontSize: '12px', color: '#64748B' }}>Prevents accidental overload</div>
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '24px' }}>
        {/* Config Form */}
        <Card title="Configure Subject Practice Access" subtitle="Set access classification & question limits">
          <form onSubmit={handleSaveConfig} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <FormField label="Subject Category" required>
              <Select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                options={categories.map((c) => ({ value: c.id, label: `${c.nameEn} (${c.code})` }))}
              />
            </FormField>

            <FormField label="Access Classification" required helperText="Supports Free, Paid, or Freemium entitlement hook">
              <Select
                value={accessClassification}
                onChange={(e) => setAccessClassification(e.target.value)}
                options={[
                  { value: 'FREE', label: 'FREE — Open practice access for all students' },
                  { value: 'PAID', label: 'PAID — Requires subscription entitlement' },
                  { value: 'FREEMIUM', label: 'FREEMIUM — Sample question limit applies' },
                ]}
              />
            </FormField>

            <FormField label="Maximum Questions Per Session" required>
              <Input
                type="number"
                value={maxQuestions}
                onChange={(e) => setMaxQuestions(Number(e.target.value))}
                min={5}
                max={100}
              />
            </FormField>

            <FormField label="Topic Practice Status">
              <Select
                value={isEnabled ? 'ENABLED' : 'DISABLED'}
                onChange={(e) => setIsEnabled(e.target.value === 'ENABLED')}
                options={[
                  { value: 'ENABLED', label: 'Active (Enabled)' },
                  { value: 'DISABLED', label: 'Disabled (Temporarily block practice)' },
                ]}
              />
            </FormField>

            <Button type="submit" variant="primary" size="md" disabled={saving}>
              {saving ? 'Saving...' : 'Save Configuration'}
            </Button>
          </form>
        </Card>

        {/* Existing Configs List */}
        <Card title="Category Practice Access Rules" subtitle="Overridden taxonomy configurations">
          {loading ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#64748B' }}>Loading practice rules...</div>
          ) : configs.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#64748B' }}>
              All categories currently use the default FREE practice access policy (50 questions max).
            </div>
          ) : (
            <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', fontWeight: 600 }}>
                    <th style={{ padding: '12px 16px' }}>Category</th>
                    <th style={{ padding: '12px 16px' }}>Access Policy</th>
                    <th style={{ padding: '12px 16px' }}>Max Questions</th>
                    <th style={{ padding: '12px 16px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {configs.map((row: any) => (
                    <tr key={row.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: '#111827' }}>
                        {row.category?.nameEn || 'All Categories'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <Badge label={row.accessClassification} variant={row.accessClassification === 'FREE' ? 'success' : 'warning'} />
                      </td>
                      <td style={{ padding: '12px 16px', color: '#334155' }}>{row.maxQuestions}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <Badge label={row.isEnabled ? 'Enabled' : 'Disabled'} variant={row.isEnabled ? 'success' : 'neutral'} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
