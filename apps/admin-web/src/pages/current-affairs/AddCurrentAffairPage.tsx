import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  PageHeader,
  Tabs,
  Input,
  Select,
  Button,
  Card,
  Badge,
  FormField,
} from '@study-karnataka/ui';
import { currentAffairsApi } from '../../services/currentAffairsApi';
import { TiptapEditor } from '../../components/editor/TiptapEditor';
import { Globe, Columns, Search, Plus, X, Trash2 } from 'lucide-react';

export const AddCurrentAffairPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [showAddCategoryModal, setShowAddCategoryModal] = useState<false | 'en' | 'kn'>(false);
  const [newCatName, setNewCatName] = useState('');
  const [addingCategory, setAddingCategory] = useState(false);

  const [showAddSourceModal, setShowAddSourceModal] = useState<false | 'en' | 'kn'>(false);
  const [newSourceName, setNewSourceName] = useState('');
  const [addingSource, setAddingSource] = useState(false);

  // Responsive Breakpoint Hook
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );
  const [activeLangTab, setActiveLangTab] = useState<'en' | 'kn' | 'split'>('en');

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isDesktop = windowWidth >= 1200;
  const isSplitView = activeLangTab === 'split' && isDesktop;
  
  const [categories, setCategories] = useState<any[]>([]);
  const [sources, setSources] = useState<any[]>([]);
  // Mock exams/subjects for UI. In a real scenario, fetch from exam APIs
  const [exams, setExams] = useState<any[]>([{ id: 'mock-kpsc', name: 'KPSC' }]);
  const [subjects, setSubjects] = useState<any[]>([{ id: 'mock-hist', name: 'History' }]);

  const [formData, setFormData] = useState({
    titleEn: '',
    titleKn: '',
    slug: '',
    summaryEn: '',
    summaryKn: '',
    categoryId: '',
    sourceId: '',
    publishedAt: '',
    readingTimeMinutes: '',
    featuredImageUrl: '',
    featuredImageUrlKn: '',
    imageAltEn: '',
    imageAltKn: '',
    imageCaptionEn: '',
    imageCaptionKn: '',
    isFeatured: false,
    allowComments: true,
    contentEn: '',
    contentKn: '',
    importance: 'MEDIUM',
    visibility: 'PUBLIC',
    metaTitleEn: '',
    metaTitleKn: '',
    metaDescriptionEn: '',
    metaDescriptionKn: '',
    canonicalUrl: '',
    status: 'DRAFT',
    language: 'en',
    
    // Arrays for mappings
    selectedExams: [] as string[],
    selectedStages: [] as string[],
    selectedSubjects: [] as string[],
    selectedTopics: [] as string[],
    selectedTags: [] as string[]
  });

  useEffect(() => {
    Promise.all([
      currentAffairsApi.getCategories(),
      currentAffairsApi.getSources()
    ]).then(([catRes, srcRes]) => {
      setCategories(catRes.data || []);
      setSources(srcRes.data || []);
    });

    if (isEdit) {
      setLoading(true);
      currentAffairsApi.getById(id!).then((res) => {
        const item = res.data;
        setFormData(prev => ({
          ...prev,
          ...item,
          readingTimeMinutes: item.readingTimeMinutes?.toString() || '',
          publishedAt: item.publishedAt ? new Date(item.publishedAt).toISOString().slice(0, 16) : '',
          selectedExams: item.exams?.map((e: any) => e.examCycleId) || [],
          selectedStages: item.stages?.map((e: any) => e.examStageId) || [],
          selectedSubjects: item.categoriesMapped?.map((e: any) => e.categoryId) || [],
          selectedTopics: item.topicsMapped?.map((e: any) => e.topicId) || []
        }));
      }).finally(() => setLoading(false));
    }
  }, [id, isEdit]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, lang: 'en' | 'kn' = 'en') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const field = lang === 'en' ? 'featuredImageUrl' : 'featuredImageUrlKn';
      setFormData(prev => ({ ...prev, [field]: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (status: 'DRAFT' | 'PUBLISHED') => {
    setSaving(true);
    try {
      const { 
        language, 
        selectedExams, 
        selectedStages, 
        selectedSubjects, 
        selectedTopics, 
        selectedTags, 
        ...payloadData 
      } = formData;

      const payload = {
        ...payloadData,
        readingTimeMinutes: formData.readingTimeMinutes ? parseInt(formData.readingTimeMinutes, 10) : null,
        publishedAt: formData.publishedAt ? new Date(formData.publishedAt).toISOString() : null,
        status,
        exams: selectedExams.filter(id => !id.startsWith('mock-')),
        stages: selectedStages.filter(id => !id.startsWith('mock-')),
        subjects: selectedSubjects.filter(id => !id.startsWith('mock-')),
        topics: selectedTopics.filter(id => !id.startsWith('mock-')),
        tags: selectedTags.filter(id => !id.startsWith('mock-'))
      };

      if (isEdit) {
        await currentAffairsApi.update(id!, payload);
        if (status === 'PUBLISHED') await currentAffairsApi.publish(id!);
        alert(`Successfully ${status === 'PUBLISHED' ? 'published' : 'updated draft'}`);
      } else {
        const res = await currentAffairsApi.create({ ...payload, status });
        alert(`Successfully ${status === 'PUBLISHED' ? 'published' : 'saved draft'}`);
        navigate(`/current-affairs/${res.data.id}/edit`, { replace: true });
      }
    } catch (err) {
      console.error(err);
      alert('Error saving current affair');
    } finally {
      setSaving(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCatName) return alert('Please enter a category name');
    setAddingCategory(true);
    try {
      const res = await currentAffairsApi.createCategory({
        nameEn: newCatName,
        nameKn: newCatName,
        slug: newCatName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      });
      setCategories(prev => [...prev, res.data]);
      setFormData(prev => ({ ...prev, categoryId: res.data.id }));
      setShowAddCategoryModal(false);
      setNewCatName('');
    } catch (err) {
      console.error(err);
      alert('Failed to create category');
    } finally {
      setAddingCategory(false);
    }
  };

  const handleAddSource = async () => {
    if (!newSourceName) return alert('Please enter a source name');
    setAddingSource(true);
    try {
      const res = await currentAffairsApi.createSource({
        name: newSourceName
      });
      setSources(prev => [...prev, res.data]);
      setFormData(prev => ({ ...prev, sourceId: res.data.id }));
      setShowAddSourceModal(false);
      setNewSourceName('');
    } catch (err) {
      console.error(err);
      alert('Failed to create source');
    } finally {
      setAddingSource(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!formData.categoryId) return;
    if (!window.confirm("Are you sure you want to delete this category? Any articles using it might be affected.")) return;
    try {
      await currentAffairsApi.deleteCategory(formData.categoryId);
      setCategories(prev => prev.filter(c => c.id !== formData.categoryId));
      setFormData(prev => ({ ...prev, categoryId: '' }));
      alert('Category deleted successfully');
    } catch (err) {
      console.error(err);
      alert('Failed to delete category');
    }
  };

  const handleDeleteSource = async () => {
    if (!formData.sourceId) return;
    if (!window.confirm("Are you sure you want to delete this source? Any articles using it might be affected.")) return;
    try {
      await currentAffairsApi.deleteSource(formData.sourceId);
      setSources(prev => prev.filter(s => s.id !== formData.sourceId));
      setFormData(prev => ({ ...prev, sourceId: '' }));
      alert('Source deleted successfully');
    } catch (err) {
      console.error(err);
      alert('Failed to delete source');
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div style={{ paddingBottom: '40px' }}>
      <PageHeader
        title={isEdit ? "Edit Current Affair" : "Add Current Affair"}
        subtitle="Create and manage current affairs articles for students."
        breadcrumbItems={[
          { label: 'Dashboard', href: '/' },
          { label: 'Current Affairs', href: '/current-affairs' },
          { label: isEdit ? "Edit" : "Add" },
        ]}
        actions={
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {formData.status && <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569', backgroundColor: '#F1F5F9', padding: '4px 10px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>{formData.status}</span>}
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '13px', color: '#475569', fontWeight: 500 }}>Importance:</span>
              <select value={formData.importance} onChange={e => handleChange('importance', e.target.value)} style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none', backgroundColor: 'white' }}>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>

            {isEdit && (
              <Button variant="outline" size="sm" style={{ color: '#EF4444', borderColor: '#FCA5A5', height: '32px' }} onClick={() => currentAffairsApi.softDelete(id!).then(() => navigate('/current-affairs'))}>Trash</Button>
            )}

            <div style={{ width: '1px', height: '24px', backgroundColor: '#E2E8F0', margin: '0 4px' }} />
            
            <Button variant="outline" onClick={() => navigate('/current-affairs')} style={{ height: '36px' }}>Cancel</Button>
            <Button variant="secondary" onClick={() => handleSave('DRAFT')} disabled={saving} style={{ height: '36px' }}>Save as Draft</Button>
            <Button onClick={() => handleSave('PUBLISHED')} disabled={saving} style={{ height: '36px' }}>Publish</Button>
          </div>
        }
      />

      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', width: '100%' }}>
        
        {/* Main Content (Full Width) */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '14px', width: '100%', minWidth: 0 }}>

          {/* Bilingual Authoring Workspace */}
          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #DCE6EE', borderRadius: '12px', padding: '10px 16px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Globe size={18} color="#084B7A" />
              <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#111827' }}>
                Bilingual Authoring Workspace
              </h2>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setActiveLangTab('en')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  backgroundColor: activeLangTab === 'en' ? '#084B7A' : '#F8FAFC',
                  color: activeLangTab === 'en' ? '#FFFFFF' : '#475569',
                  border: '1px solid',
                  borderColor: activeLangTab === 'en' ? '#084B7A' : '#DCE6EE',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>🇬🇧 English</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveLangTab('kn')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  backgroundColor: activeLangTab === 'kn' ? '#047857' : '#F8FAFC',
                  color: activeLangTab === 'kn' ? '#FFFFFF' : '#475569',
                  border: '1px solid',
                  borderColor: activeLangTab === 'kn' ? '#047857' : '#DCE6EE',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>🇮🇳 ಕನ್ನಡ (Kannada)</span>
              </button>

              {isDesktop && (
                <button
                  type="button"
                  onClick={() => setActiveLangTab('split')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 600,
                    backgroundColor: activeLangTab === 'split' ? '#334155' : '#F8FAFC',
                    color: activeLangTab === 'split' ? '#FFFFFF' : '#475569',
                    border: '1px solid',
                    borderColor: activeLangTab === 'split' ? '#334155' : '#DCE6EE',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Columns size={14} />
                  <span>50/50 Dual View</span>
                </button>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isSplitView ? '1fr 1fr' : '1fr', gap: '14px' }}>
            {/* ENGLISH LOCALE CARD */}
            {(activeLangTab === 'en' || isSplitView) && (
              <Card style={{ borderTop: '4px solid #084B7A', padding: '16px', borderRadius: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E6EAF0', paddingBottom: '10px', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px' }}>🇬🇧</span>
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#111827' }}>English Workspace</h3>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#1E293B', marginBottom: '8px' }}>URL Slug *</label>
                      <Input value={formData.slug} onChange={(e) => handleChange('slug', e.target.value)} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#1E293B', marginBottom: '8px' }}>Canonical URL</label>
                      <Input value={formData.canonicalUrl} onChange={(e) => handleChange('canonicalUrl', e.target.value)} />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#1E293B', marginBottom: '8px' }}>Published Date</label>
                      <Input type="datetime-local" value={formData.publishedAt} onChange={(e) => handleChange('publishedAt', e.target.value)} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#1E293B', marginBottom: '8px' }}>Reading Time (mins)</label>
                      <Input type="number" value={formData.readingTimeMinutes} onChange={(e) => handleChange('readingTimeMinutes', e.target.value)} />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#1E293B', marginBottom: '8px' }}>Category (English) *</label>
                        <Select 
                          value={formData.categoryId} 
                          onChange={(e) => handleChange('categoryId', e.target.value)}
                          options={[{ label: 'Select Category', value: '' }, ...categories.map(c => ({ label: c.nameEn, value: c.id }))]}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <Button type="button" variant="outline" onClick={() => setShowAddCategoryModal('en')} style={{ height: '38px', padding: '0 12px' }}>
                          <Plus size={16} />
                        </Button>
                        {formData.categoryId && (
                          <Button type="button" variant="outline" onClick={handleDeleteCategory} style={{ height: '38px', padding: '0 12px', color: '#EF4444', borderColor: '#FCA5A5' }}>
                            <Trash2 size={16} />
                          </Button>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#1E293B', marginBottom: '8px' }}>Source (English) *</label>
                        <Select 
                          value={formData.sourceId} 
                          onChange={(e) => handleChange('sourceId', e.target.value)}
                          options={[{ label: 'Select Source', value: '' }, ...sources.map(s => ({ label: s.name, value: s.id }))]}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <Button type="button" variant="outline" onClick={() => setShowAddSourceModal('en')} style={{ height: '38px', padding: '0 12px' }}>
                          <Plus size={16} />
                        </Button>
                        {formData.sourceId && (
                          <Button type="button" variant="outline" onClick={handleDeleteSource} style={{ height: '38px', padding: '0 12px', color: '#EF4444', borderColor: '#FCA5A5' }}>
                            <Trash2 size={16} />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: '14px' }}>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#1E293B', marginBottom: '8px' }}>English Title *</label>
                    <Input value={formData.titleEn} onChange={(e) => handleChange('titleEn', e.target.value)} />
                  </div>
                  
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#1E293B', marginBottom: '8px' }}>English Summary *</label>
                    <textarea 
                      style={{ width: '100%', border: '1px solid #CBD5E1', borderRadius: '6px', padding: '8px', minHeight: '80px' }}
                      value={formData.summaryEn}
                      onChange={(e) => handleChange('summaryEn', e.target.value)}
                    />
                  </div>

                  <div style={{ border: '1px dashed #CBD5E1', padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
                    <p style={{ margin: 0, fontWeight: 500, color: '#475569', fontSize: '14px' }}>English Featured Image</p>
                    <p style={{ margin: 0, fontSize: '12px', color: '#94A3B8', marginBottom: '12px' }}>Supported: JPG, PNG, WEBP</p>
                    
                    {formData.featuredImageUrl ? (
                      <div style={{ marginTop: '12px' }}>
                        <img src={formData.featuredImageUrl} alt="Featured EN" style={{ maxWidth: '100%', maxHeight: '160px', borderRadius: '6px' }} />
                        <div style={{ marginTop: '12px' }}>
                          <Button variant="outline" size="sm" onClick={() => handleChange('featuredImageUrl', '')}>Remove Image</Button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <input
                          type="file"
                          accept="image/jpeg, image/png, image/webp"
                          style={{ display: 'none' }}
                          id="featured-image-upload-en"
                          onChange={(e) => handleImageUpload(e, 'en')}
                        />
                        <label htmlFor="featured-image-upload-en">
                          <Button variant="outline" size="sm" onClick={() => document.getElementById('featured-image-upload-en')?.click()}>
                            Upload English Image
                          </Button>
                        </label>
                      </div>
                    )}
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#1E293B', marginBottom: '8px' }}>
                      English Content Editor *
                    </label>
                    <TiptapEditor 
                      content={formData.contentEn || ''} 
                      onChange={(_json, plainText, html) => handleChange('contentEn', html || plainText)}
                      placeholder="Write comprehensive current affairs article in English..."
                      language="en"
                      minHeight="280px"
                    />
                  </div>

                  <div style={{ border: '1px solid #E6EAF0', borderRadius: '8px', padding: '10px 14px', backgroundColor: '#F8FAFC' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '10px' }}>
                      <Search size={14} color="#084B7A" />
                      English SEO
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#1E293B', marginBottom: '6px' }}>Meta Title</label>
                      <Input value={formData.metaTitleEn} onChange={(e) => handleChange('metaTitleEn', e.target.value)} />
                    </div>
                    <div style={{ marginTop: '10px' }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#1E293B', marginBottom: '6px' }}>Meta Description</label>
                      <textarea 
                        style={{ width: '100%', border: '1px solid #CBD5E1', borderRadius: '6px', padding: '8px', minHeight: '60px' }}
                        value={formData.metaDescriptionEn}
                        onChange={(e) => handleChange('metaDescriptionEn', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* KANNADA LOCALE CARD */}
            {(activeLangTab === 'kn' || isSplitView) && (
              <Card style={{ borderTop: '4px solid #047857', padding: '16px', borderRadius: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E6EAF0', paddingBottom: '10px', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px' }}>🇮🇳</span>
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#111827' }}>Kannada Workspace</h3>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#1E293B', marginBottom: '8px' }}>URL ಸ್ಲಗ್ *</label>
                      <Input value={formData.slug} onChange={(e) => handleChange('slug', e.target.value)} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#1E293B', marginBottom: '8px' }}>ಕಾನೊನಿಕಲ್ ಯುಆರ್ಎಲ್</label>
                      <Input value={formData.canonicalUrl} onChange={(e) => handleChange('canonicalUrl', e.target.value)} />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#1E293B', marginBottom: '8px' }}>ಪ್ರಕಟಿತ ದಿನಾಂಕ</label>
                      <Input type="datetime-local" value={formData.publishedAt} onChange={(e) => handleChange('publishedAt', e.target.value)} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#1E293B', marginBottom: '8px' }}>ಓದುವ ಸಮಯ (ನಿಮಿಷಗಳು)</label>
                      <Input type="number" value={formData.readingTimeMinutes} onChange={(e) => handleChange('readingTimeMinutes', e.target.value)} />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#1E293B', marginBottom: '8px' }}>ವರ್ಗ (Category) *</label>
                        <Select 
                          value={formData.categoryId} 
                          onChange={(e) => handleChange('categoryId', e.target.value)}
                          options={[{ label: 'ವರ್ಗವನ್ನು ಆಯ್ಕೆಮಾಡಿ', value: '' }, ...categories.map(c => ({ label: c.nameKn || c.nameEn, value: c.id }))]}
                          style={{ fontFamily: "'Noto Sans Kannada', sans-serif" }}
                        />
                      </div>
                      <Button type="button" variant="outline" onClick={() => setShowAddCategoryModal('kn')} style={{ height: '38px', padding: '0 12px' }}>
                        <Plus size={16} />
                      </Button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#1E293B', marginBottom: '8px' }}>ಮೂಲ (Source) *</label>
                        <Select 
                          value={formData.sourceId} 
                          onChange={(e) => handleChange('sourceId', e.target.value)}
                          options={[{ label: 'ಮೂಲವನ್ನು ಆಯ್ಕೆಮಾಡಿ', value: '' }, ...sources.map(s => ({ label: s.name, value: s.id }))]}
                          style={{ fontFamily: "'Noto Sans Kannada', sans-serif" }}
                        />
                      </div>
                      <Button type="button" variant="outline" onClick={() => setShowAddSourceModal('kn')} style={{ height: '38px', padding: '0 12px' }}>
                        <Plus size={16} />
                      </Button>
                    </div>
                  </div>

                  <div style={{ marginTop: '14px' }}>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#1E293B', marginBottom: '8px' }}>Kannada Title (ಕನ್ನಡ ಶೀರ್ಷಿಕೆ) *</label>
                    <Input value={formData.titleKn} onChange={(e) => handleChange('titleKn', e.target.value)} style={{ fontFamily: "'Noto Sans Kannada', sans-serif" }} />
                  </div>
                  
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#1E293B', marginBottom: '8px' }}>Kannada Summary (ಸಾರಾಂಶ) *</label>
                    <textarea 
                      style={{ width: '100%', border: '1px solid #CBD5E1', borderRadius: '6px', padding: '8px', minHeight: '80px', fontFamily: "'Noto Sans Kannada', sans-serif" }}
                      value={formData.summaryKn}
                      onChange={(e) => handleChange('summaryKn', e.target.value)}
                    />
                  </div>

                  <div style={{ border: '1px dashed #CBD5E1', padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
                    <p style={{ margin: 0, fontWeight: 500, color: '#475569', fontSize: '14px' }}>Kannada Featured Image</p>
                    <p style={{ margin: 0, fontSize: '12px', color: '#94A3B8', marginBottom: '12px' }}>Supported: JPG, PNG, WEBP</p>
                    
                    {formData.featuredImageUrlKn ? (
                      <div style={{ marginTop: '12px' }}>
                        <img src={formData.featuredImageUrlKn} alt="Featured KN" style={{ maxWidth: '100%', maxHeight: '160px', borderRadius: '6px' }} />
                        <div style={{ marginTop: '12px' }}>
                          <Button variant="outline" size="sm" onClick={() => handleChange('featuredImageUrlKn', '')}>Remove Image</Button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <input
                          type="file"
                          accept="image/jpeg, image/png, image/webp"
                          style={{ display: 'none' }}
                          id="featured-image-upload-kn"
                          onChange={(e) => handleImageUpload(e, 'kn')}
                        />
                        <label htmlFor="featured-image-upload-kn">
                          <Button variant="outline" size="sm" onClick={() => document.getElementById('featured-image-upload-kn')?.click()}>
                            Upload Kannada Image
                          </Button>
                        </label>
                      </div>
                    )}
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#1E293B', marginBottom: '8px', fontFamily: "'Noto Sans Kannada', sans-serif" }}>
                      Kannada Content Editor (ಕನ್ನಡ ವಿಷಯ ಸಂಪಾದಕ) *
                    </label>
                    <TiptapEditor 
                      content={formData.contentKn || ''} 
                      onChange={(_json, plainText, html) => handleChange('contentKn', html || plainText)}
                      placeholder="ನಿಮ್ಮ ಪ್ರಚಲಿತ ವಿದ್ಯಮಾನಗಳ ಲೇಖನದ ವಿಷಯವನ್ನು ಕನ್ನಡದಲ್ಲಿ ಬರೆಯಿರಿ..."
                      language="kn"
                      minHeight="280px"
                    />
                  </div>

                  <div style={{ border: '1px solid #E6EAF0', borderRadius: '8px', padding: '10px 14px', backgroundColor: '#F8FAFC' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '10px' }}>
                      <Search size={14} color="#047857" />
                      Kannada SEO
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#1E293B', marginBottom: '6px' }}>Meta Title</label>
                      <Input value={formData.metaTitleKn} onChange={(e) => handleChange('metaTitleKn', e.target.value)} style={{ fontFamily: "'Noto Sans Kannada', sans-serif" }} />
                    </div>
                    <div style={{ marginTop: '10px' }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#1E293B', marginBottom: '6px' }}>Meta Description</label>
                      <textarea 
                        style={{ width: '100%', border: '1px solid #CBD5E1', borderRadius: '6px', padding: '8px', minHeight: '60px', fontFamily: "'Noto Sans Kannada', sans-serif" }}
                        value={formData.metaDescriptionKn}
                        onChange={(e) => handleChange('metaDescriptionKn', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>

        </div>

        {/* Add Category Modal */}
        {showAddCategoryModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
            <div style={{ backgroundColor: '#fff', borderRadius: '12px', width: '400px', maxWidth: '90%', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #E2E8F0' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>{showAddCategoryModal === 'kn' ? 'ಹೊಸ ವರ್ಗವನ್ನು ಸೇರಿಸಿ' : 'Add New Category'}</h3>
                <button onClick={() => setShowAddCategoryModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                  <X size={18} color="#64748B" />
                </button>
              </div>
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#334155', marginBottom: '6px' }}>
                    {showAddCategoryModal === 'kn' ? 'ವರ್ಗದ ಹೆಸರು' : 'Category Name'}
                  </label>
                  <Input 
                    value={newCatName} 
                    onChange={(e) => setNewCatName(e.target.value)} 
                    placeholder={showAddCategoryModal === 'kn' ? "ಉದಾ: ತಂತ್ರಜ್ಞಾನ" : "e.g. Technology"} 
                    style={showAddCategoryModal === 'kn' ? { fontFamily: "'Noto Sans Kannada', sans-serif" } : {}}
                  />
                </div>
              </div>
              <div style={{ padding: '16px 20px', backgroundColor: '#F8FAFC', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end', gap: '8px', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}>
                <Button variant="outline" onClick={() => setShowAddCategoryModal(false)}>Cancel</Button>
                <Button onClick={handleAddCategory} disabled={addingCategory || !newCatName}>
                  {addingCategory ? 'Adding...' : 'Add Category'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Add Source Modal */}
        {showAddSourceModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
            <div style={{ backgroundColor: '#fff', borderRadius: '12px', width: '400px', maxWidth: '90%', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #E2E8F0' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>{showAddSourceModal === 'kn' ? 'ಹೊಸ ಮೂಲವನ್ನು ಸೇರಿಸಿ' : 'Add New Source'}</h3>
                <button onClick={() => setShowAddSourceModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                  <X size={18} color="#64748B" />
                </button>
              </div>
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#334155', marginBottom: '6px' }}>
                    {showAddSourceModal === 'kn' ? 'ಮೂಲದ ಹೆಸರು' : 'Source Name'}
                  </label>
                  <Input 
                    value={newSourceName} 
                    onChange={(e) => setNewSourceName(e.target.value)} 
                    placeholder={showAddSourceModal === 'kn' ? "ಉದಾ: ಪ್ರಜಾವಾಣಿ" : "e.g. The Hindu"} 
                    style={showAddSourceModal === 'kn' ? { fontFamily: "'Noto Sans Kannada', sans-serif" } : {}}
                  />
                </div>
              </div>
              <div style={{ padding: '16px 20px', backgroundColor: '#F8FAFC', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end', gap: '8px', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}>
                <Button variant="outline" onClick={() => setShowAddSourceModal(false)}>Cancel</Button>
                <Button onClick={handleAddSource} disabled={addingSource || !newSourceName}>
                  {addingSource ? 'Adding...' : 'Add Source'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
  );
};
