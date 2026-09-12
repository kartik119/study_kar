import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Card, FormField, Select, Alert, Badge } from '@study-karnataka/ui';
import { StudentTopicPracticeApi } from '../../api/student-topic-practice.api';
import { PracticeSelectionMode, PracticeAvailabilityResult } from '@study-karnataka/shared-types';

export const PracticeConfigurePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialCategoryId = searchParams.get('categoryId') || '';

  // Taxonomy state
  const [categories, setCategories] = useState<any[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [knowledgeAreas, setKnowledgeAreas] = useState<any[]>([]);

  const [selectedCategoryId, setSelectedCategoryId] = useState(initialCategoryId);
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState('');
  const [selectedTopicId, setSelectedTopicId] = useState('');
  const [selectedKnowledgeAreaId, setSelectedKnowledgeAreaId] = useState('');

  // Configuration options
  const [selectionMode, setSelectionMode] = useState<PracticeSelectionMode>('MIXED');
  const [requestedQuestionCount, setRequestedQuestionCount] = useState<number>(10);
  const [difficultyFilter, setDifficultyFilter] = useState<string>('ALL');
  const [pyqFilter, setPyqFilter] = useState<string>('ALL');

  // Availability & loading
  const [availability, setAvailability] = useState<PracticeAvailabilityResult | null>(null);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 1. Fetch Categories on mount
  useEffect(() => {
    fetch('/api/v1/admin/academic-taxonomy/categories')
      .then((r) => r.json())
      .then((data) => {
        const cats = data.data || [];
        setCategories(cats);
        if (!selectedCategoryId && cats.length > 0) {
          setSelectedCategoryId(cats[0].id);
        }
      })
      .catch(() => {});
  }, []);

  // 2. Fetch Subcategories when Category changes
  useEffect(() => {
    if (!selectedCategoryId) {
      setSubcategories([]);
      setSelectedSubcategoryId('');
      return;
    }
    fetch(`/api/v1/admin/academic-taxonomy/categories/${selectedCategoryId}/subcategories`)
      .then((r) => r.json())
      .then((data) => {
        setSubcategories(data.data || []);
        setSelectedSubcategoryId('');
        setSelectedTopicId('');
        setSelectedKnowledgeAreaId('');
      })
      .catch(() => setSubcategories([]));
  }, [selectedCategoryId]);

  // 3. Fetch Topics when Subcategory changes
  useEffect(() => {
    if (!selectedSubcategoryId) {
      setTopics([]);
      setSelectedTopicId('');
      return;
    }
    fetch(`/api/v1/admin/academic-taxonomy/subcategories/${selectedSubcategoryId}/topics`)
      .then((r) => r.json())
      .then((data) => {
        setTopics(data.data || []);
        setSelectedTopicId('');
        setSelectedKnowledgeAreaId('');
      })
      .catch(() => setTopics([]));
  }, [selectedSubcategoryId]);

  // 4. Fetch Knowledge Areas when Topic changes
  useEffect(() => {
    if (!selectedTopicId) {
      setKnowledgeAreas([]);
      setSelectedKnowledgeAreaId('');
      return;
    }
    fetch(`/api/v1/admin/academic-taxonomy/topics/${selectedTopicId}/knowledge-areas`)
      .then((r) => r.json())
      .then((data) => {
        setKnowledgeAreas(data.data || []);
        setSelectedKnowledgeAreaId('');
      })
      .catch(() => setKnowledgeAreas([]));
  }, [selectedTopicId]);

  // 5. Real-time Availability Check
  useEffect(() => {
    if (!selectedCategoryId) return;

    setLoadingAvailability(true);
    setError(null);

    StudentTopicPracticeApi.checkAvailability({
      categoryId: selectedCategoryId,
      subcategoryId: selectedSubcategoryId || undefined,
      topicId: selectedTopicId || undefined,
      knowledgeAreaId: selectedKnowledgeAreaId || undefined,
      selectionMode,
      difficultyFilter: difficultyFilter !== 'ALL' ? difficultyFilter : undefined,
      pyqFilter: pyqFilter !== 'ALL' ? pyqFilter : undefined,
      requestedQuestionCount,
    })
      .then((res) => {
        setAvailability(res);
      })
      .catch((err) => {
        setError(err.message);
        setAvailability(null);
      })
      .finally(() => setLoadingAvailability(false));
  }, [
    selectedCategoryId,
    selectedSubcategoryId,
    selectedTopicId,
    selectedKnowledgeAreaId,
    selectionMode,
    requestedQuestionCount,
    difficultyFilter,
    pyqFilter,
  ]);

  // Handle Start Session
  const handleStartPractice = async () => {
    if (!selectedCategoryId) return;

    setError(null);
    setStarting(true);

    try {
      const res = await StudentTopicPracticeApi.startSession({
        categoryId: selectedCategoryId,
        subcategoryId: selectedSubcategoryId || undefined,
        topicId: selectedTopicId || undefined,
        knowledgeAreaId: selectedKnowledgeAreaId || undefined,
        selectionMode,
        difficultyFilter: difficultyFilter !== 'ALL' ? difficultyFilter : undefined,
        pyqFilter: pyqFilter !== 'ALL' ? pyqFilter : undefined,
        requestedQuestionCount,
        acceptShortage: Boolean(availability?.hasShortage),
      });

      navigate(`/practice/session/${res.session.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to start practice session');
    } finally {
      setStarting(false);
    }
  };

  const modeDescriptions: Record<PracticeSelectionMode, { title: string; desc: string }> = {
    MIXED: {
      title: 'MIXED MODE (Recommended)',
      desc: 'Balanced practice using unseen, weak area, and previously answered questions.',
    },
    NEW_ONLY: {
      title: 'NEW ONLY',
      desc: 'Focus strictly on questions you have not attempted before in Topic Practice.',
    },
    WEAK_AREA: {
      title: 'WEAK AREA FOCUS',
      desc: 'Prioritize questions from topics and questions where your past accuracy is lower.',
    },
    INCORRECT_RETRY: {
      title: 'INCORRECT RETRY',
      desc: 'Retry questions you previously answered incorrectly.',
    },
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F7F9FC', fontFamily: 'Inter, sans-serif' }}>
      {/* Top Header */}
      <header
        style={{
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #DCE6EE',
          padding: '16px 32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Button variant="outline" size="sm" onClick={() => navigate('/practice')}>
            ← Back to Practice Home
          </Button>
          <h1 style={{ fontSize: '18px', fontWeight: 800, color: '#111827', margin: 0 }}>
            Configure Practice Session
          </h1>
        </div>
      </header>

      {/* Form Container */}
      <main style={{ maxWidth: '900px', margin: '32px auto', padding: '0 24px' }}>
        {error && (
          <div style={{ marginBottom: '24px' }}>
            <Alert variant="error" title="Practice Configuration Error" message={error} />
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Step 1: Scope Selection */}
          <Card title="1. Select Practice Scope" subtitle="Choose Category, Subcategory, or Topic level">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <FormField label="Subject / Category" required>
                <Select
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                  options={[
                    { value: '', label: 'Select Category...' },
                    ...categories.map((c) => ({ value: c.id, label: `${c.nameEn} (${c.nameKn})` })),
                  ]}
                />
              </FormField>

              <FormField label="Subcategory (Optional)">
                <Select
                  value={selectedSubcategoryId}
                  onChange={(e) => setSelectedSubcategoryId(e.target.value)}
                  disabled={!selectedCategoryId || subcategories.length === 0}
                  options={[
                    { value: '', label: 'All Subcategories' },
                    ...subcategories.map((s) => ({ value: s.id, label: `${s.nameEn} (${s.nameKn})` })),
                  ]}
                />
              </FormField>

              <FormField label="Topic (Optional)">
                <Select
                  value={selectedTopicId}
                  onChange={(e) => setSelectedTopicId(e.target.value)}
                  disabled={!selectedSubcategoryId || topics.length === 0}
                  options={[
                    { value: '', label: 'All Topics' },
                    ...topics.map((t) => ({ value: t.id, label: `${t.nameEn} (${t.nameKn})` })),
                  ]}
                />
              </FormField>

              <FormField label="Knowledge Area (Optional)">
                <Select
                  value={selectedKnowledgeAreaId}
                  onChange={(e) => setSelectedKnowledgeAreaId(e.target.value)}
                  disabled={!selectedTopicId || knowledgeAreas.length === 0}
                  options={[
                    { value: '', label: 'All Knowledge Areas' },
                    ...knowledgeAreas.map((k) => ({ value: k.id, label: `${k.nameEn} (${k.nameKn})` })),
                  ]}
                />
              </FormField>
            </div>
          </Card>

          {/* Step 2: Practice Mode */}
          <Card title="2. Select Practice Selection Mode" subtitle="Controls how questions are picked">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              {(['MIXED', 'NEW_ONLY', 'WEAK_AREA', 'INCORRECT_RETRY'] as PracticeSelectionMode[]).map((mode) => {
                const isSelected = selectionMode === mode;
                const info = modeDescriptions[mode];
                return (
                  <div
                    key={mode}
                    onClick={() => setSelectionMode(mode)}
                    style={{
                      border: isSelected ? '2px solid #084B7A' : '1px solid #DCE6EE',
                      backgroundColor: isSelected ? '#EAF3F9' : '#FFFFFF',
                      borderRadius: '10px',
                      padding: '16px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{ fontWeight: 800, fontSize: '13px', color: isSelected ? '#084B7A' : '#111827', marginBottom: '4px' }}>
                      {info.title}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748B', lineHeight: '1.4' }}>{info.desc}</div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Step 3: Question Count & Filters */}
          <Card title="3. Session Settings & Filters" subtitle="Preset question length, difficulty & source">
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '14px', fontWeight: 700, color: '#111827', display: 'block', marginBottom: '8px' }}>
                Number of Questions
              </label>
              <div style={{ display: 'flex', gap: '10px' }}>
                {[5, 10, 20, 25, 50].map((cnt) => (
                  <Button
                    key={cnt}
                    type="button"
                    variant={requestedQuestionCount === cnt ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setRequestedQuestionCount(cnt)}
                  >
                    {cnt} Questions
                  </Button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <FormField label="Difficulty Filter">
                <Select
                  value={difficultyFilter}
                  onChange={(e) => setDifficultyFilter(e.target.value)}
                  options={[
                    { value: 'ALL', label: 'All Difficulties' },
                    { value: 'EASY', label: 'Easy' },
                    { value: 'MEDIUM', label: 'Medium' },
                    { value: 'HARD', label: 'Hard' },
                  ]}
                />
              </FormField>

              <FormField label="Question Source Filter">
                <Select
                  value={pyqFilter}
                  onChange={(e) => setPyqFilter(e.target.value)}
                  options={[
                    { value: 'ALL', label: 'All Questions (PYQ & Original)' },
                    { value: 'PYQ_ONLY', label: 'PYQ Only (Previous Year Questions)' },
                    { value: 'NON_PYQ', label: 'Non-PYQ (Original Practice)' },
                  ]}
                />
              </FormField>
            </div>
          </Card>

          {/* Step 4: Availability & Shortage Bar */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #DCE6EE', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#111827', margin: 0 }}>Eligible Question Pool</h3>
                <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>
                  Calculated based on your selected taxonomy scope & practice filters
                </p>
              </div>

              {loadingAvailability ? (
                <span style={{ fontSize: '13px', color: '#64748B' }}>Checking availability...</span>
              ) : availability ? (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Badge label={`${availability.eligibleCount} Eligible`} variant={availability.eligibleCount > 0 ? 'success' : 'warning'} />
                  <Badge label={`${availability.unseenCount} Unseen`} variant="info" />
                  <Badge label={`${availability.previouslyIncorrectCount} Incorrect`} variant="warning" />
                </div>
              ) : null}
            </div>

            {availability?.hasShortage && (
              <div style={{ marginTop: '12px' }}>
                <Alert
                  variant="warning"
                  title="Question Shortage Notice"
                  message={`Only ${availability.eligibleCount} questions match your exact filter configuration. Clicking Start will create a ${availability.eligibleCount}-question practice session.`}
                />
              </div>
            )}

            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <Button variant="outline" size="lg" onClick={() => navigate('/practice')}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="lg"
                disabled={Boolean(starting || loadingAvailability || (availability && availability.eligibleCount === 0))}
                onClick={handleStartPractice}
              >
                {starting ? 'Generating Session...' : `Start Practice (${availability ? Math.min(requestedQuestionCount, availability.eligibleCount) : requestedQuestionCount} Questions)`}
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
