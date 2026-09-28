// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Card,
  Button,
  FormField,
  Input,
  Select,
} from '@study-karnataka/ui';
import { TiptapEditor } from '../../components/editor/TiptapEditor';
import { quickRevisionApi } from '../../services/quickRevisionApi';
import { RevisionTaxonomyApi, RevisionCategory } from '../../api/revision-taxonomy.api';
import { Save, Layers, Globe, Columns, Image as ImageIcon, ChevronDown, ChevronRight } from 'lucide-react';

export const QuickRevisionAddCardPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEditing = Boolean(id);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'en' | 'kn' | 'split'>('en');

  // Basic Info - Shared
  const [priority] = useState('Medium');
  const [publishDate] = useState('');

  // English Workspace
  const [titleEn, setTitleEn] = useState('');
  const [slug, setSlug] = useState('');
  const [contentEn, setContentEn] = useState<any>(null);
  const [imageEn, setImageEn] = useState('');
  const [metaTitleEn, setMetaTitleEn] = useState('');
  const [metaDescriptionEn, setMetaDescriptionEn] = useState('');

  // Kannada Workspace
  const [titleKn, setTitleKn] = useState('');
  const [contentKn, setContentKn] = useState<any>(null);
  const [imageKn, setImageKn] = useState('');
  const [metaTitleKn, setMetaTitleKn] = useState('');
  const [metaDescriptionKn, setMetaDescriptionKn] = useState('');

  // Mapping & Taxonomy State (Merged Category & Subcategory)
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [examCycleId, setExamCycleId] = useState('');

  const [categories, setCategories] = useState<RevisionCategory[]>([]);
  const [selectedTaxonomies, setSelectedTaxonomies] = useState<{ categoryId: string; subcategoryId?: string }[]>([]);
  const [isTaxonomyExpanded, setIsTaxonomyExpanded] = useState<boolean>(true);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [taxonomySearchQuery, setTaxonomySearchQuery] = useState('');

  useEffect(() => {
    RevisionTaxonomyApi.getCategories()
      .then(res => {
        setCategories(res);
        const initialExpanded: Record<string, boolean> = {};
        res.forEach(c => {
          if (c.subcategories && c.subcategories.length > 0) {
            initialExpanded[c.id] = true;
          }
        });
        setExpandedCategories(initialExpanded);
      })
      .catch(console.error);
  }, []);

  // Pre-fill card when editing
  useEffect(() => {
    if (id) {
      setLoading(true);
      quickRevisionApi.getCard(id)
        .then(res => {
          if (res?.data) {
            const card = res.data;
            setTitleEn(card.titleEn || '');
            setTitleKn(card.titleKn || '');
            setSlug(card.slug || '');
            setContentEn(card.contentEn || null);
            setContentKn(card.contentKn || null);
            setImageEn(card.imageEn || '');
            setImageKn(card.imageKn || '');
            setMetaTitleEn(card.metaTitleEn || '');
            setMetaDescriptionEn(card.metaDescriptionEn || '');
            setMetaTitleKn(card.metaTitleKn || '');
            setMetaDescriptionKn(card.metaDescriptionKn || '');
            setCategoryId(card.categoryId || '');
            setSubcategoryId(card.subcategoryId || '');
            setExamCycleId(card.examCycleId || '');
            
            if (card.categoryId) {
              setSelectedTaxonomies([{
                categoryId: card.categoryId,
                ...(card.subcategoryId ? { subcategoryId: card.subcategoryId } : {})
              }]);
              setExpandedCategories(prev => ({ ...prev, [card.categoryId]: true }));
            }
          }
        })
        .catch(err => {
          console.error('Failed to load card for edit', err);
          alert('Failed to load card details.');
        })
        .finally(() => setLoading(false));
    }
  }, [id]);

  const toggleCategoryExpand = (catId: string) => {
    setExpandedCategories(prev => ({ ...prev, [catId]: !prev[catId] }));
  };

  const syncCategoryAndSubcategory = (taxonomies: { categoryId: string; subcategoryId?: string }[]) => {
    if (taxonomies.length === 0) {
      setCategoryId('');
      setSubcategoryId('');
      return;
    }
    const withSub = taxonomies.find(t => t.subcategoryId);
    if (withSub) {
      setCategoryId(withSub.categoryId);
      setSubcategoryId(withSub.subcategoryId || '');
    } else {
      setCategoryId(taxonomies[0].categoryId);
      setSubcategoryId('');
    }
  };

  const handleToggleCategory = (cat: RevisionCategory, currentChecked: boolean) => {
    const subList = cat.subcategories || [];

    if (currentChecked) {
      setSelectedTaxonomies(prev => {
        const next = prev.filter(t => t.categoryId !== cat.id);
        syncCategoryAndSubcategory(next);
        return next;
      });
    } else {
      setSelectedTaxonomies(prev => {
        const otherTaxonomies = prev.filter(t => t.categoryId !== cat.id);
        const newMappings = [
          { categoryId: cat.id },
          ...subList.map(sub => ({ categoryId: cat.id, subcategoryId: sub.id })),
        ];
        const next = [...otherTaxonomies, ...newMappings];
        syncCategoryAndSubcategory(next);
        return next;
      });
      setExpandedCategories(prev => ({ ...prev, [cat.id]: true }));
    }
  };

  const handleToggleSubcategory = (cat: RevisionCategory, subId: string, checked: boolean) => {
    const catId = cat.id;
    const subList = cat.subcategories || [];

    if (checked) {
      setSelectedTaxonomies(prev => {
        const exists = prev.some(t => t.categoryId === catId && t.subcategoryId === subId);
        if (exists) return prev;
        const hasCat = prev.some(t => t.categoryId === catId && !t.subcategoryId);
        const toAdd = [{ categoryId: catId, subcategoryId: subId }];
        if (!hasCat) {
          toAdd.unshift({ categoryId: catId });
        }
        const next = [...prev, ...toAdd];
        syncCategoryAndSubcategory(next);
        return next;
      });
    } else {
      setSelectedTaxonomies(prev => {
        const filtered = prev.filter(t => !(t.categoryId === catId && t.subcategoryId === subId));
        const remainingSubsForCat = filtered.filter(t => t.categoryId === catId && t.subcategoryId);
        let next = filtered;
        if (subList.length > 0 && remainingSubsForCat.length === 0) {
          next = filtered.filter(t => t.categoryId !== catId);
        }
        syncCategoryAndSubcategory(next);
        return next;
      });
    }
  };

  // Handle auto-generating slug
  useEffect(() => {
    if (!slug && titleEn) {
      setSlug(titleEn.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''));
    }
  }, [titleEn]);

  const handleImageEnUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setImageEn(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleImageKnUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setImageKn(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async (saveStatus = 'DRAFT') => {
    if (!titleEn) {
      alert("English Title is required.");
      return;
    }
    
    try {
      setLoading(true);

      const payload = {
        titleEn,
        titleKn,
        categoryId,
        subcategoryId,
        examCycleId,
        priority,
        status: saveStatus,
        publishDate: publishDate || null,
        contentEn,
        contentKn,
        imageEn,
        imageKn,
        slug,
        metaTitleEn,
        metaDescriptionEn,
        metaTitleKn,
        metaDescriptionKn,
      };

      let res;
      if (isEditing) {
        res = await quickRevisionApi.updateCard(id!, payload);
      } else {
        res = await quickRevisionApi.createCard(payload);
      }
      if (res?.success) {
        navigate('/quick-revision/library');
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to save card.");
    } finally {
      setLoading(false);
    }
  };

  const isSplitView = activeTab === 'split';

  return (
    <div style={{ padding: '24px', background: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: 700, color: '#111827' }}>
            {isEditing ? 'Edit Revision Card' : 'Create Revision Card'}
          </h1>
          <p style={{ margin: 0, color: '#64748b' }}>
            {isEditing ? 'Update bilingual revision card content and classification' : 'Create a new bilingual revision card with content and classification mapping'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Button variant="outline" onClick={() => navigate('/quick-revision/library')}>Back</Button>
          <Button variant="outline" onClick={() => handleSave('DRAFT')} disabled={loading} leftIcon={<Save size={16} />}>
            {isEditing ? 'Save as Draft' : 'Save Draft'}
          </Button>
          <Button variant="primary" onClick={() => handleSave('PUBLISHED')} disabled={loading}>
            {isEditing ? 'Update & Publish' : 'Publish Card'}
          </Button>
        </div>
      </div>

      {/* Bilingual Authoring Workspace Container */}
      <Card style={{ marginBottom: '24px', overflow: 'hidden' }}>
        {/* Workspace Header & Tabs */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          padding: '16px 20px', 
          background: '#ffffff', 
          borderBottom: '1px solid #e2e8f0' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a', fontWeight: 600 }}>
            <Globe size={20} color="#3b82f6" />
            Bilingual Authoring Workspace
          </div>
          
          <div style={{ display: 'flex', gap: '8px', background: '#f1f5f9', padding: '4px', borderRadius: '8px' }}>
            <button
              onClick={() => setActiveTab('en')}
              style={{
                padding: '6px 16px',
                borderRadius: '6px',
                border: 'none',
                background: activeTab === 'en' ? '#084B7A' : 'transparent',
                color: activeTab === 'en' ? 'white' : '#475569',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '14px',
                transition: 'all 0.2s'
              }}
            >
              GB English
            </button>
            <button
              onClick={() => setActiveTab('kn')}
              style={{
                padding: '6px 16px',
                borderRadius: '6px',
                border: 'none',
                background: activeTab === 'kn' ? '#047857' : 'transparent',
                color: activeTab === 'kn' ? 'white' : '#475569',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '14px',
                transition: 'all 0.2s'
              }}
            >
              IN ಕನ್ನಡ (Kannada)
            </button>
            <button
              onClick={() => setActiveTab('split')}
              style={{
                padding: '6px 16px',
                borderRadius: '6px',
                border: 'none',
                background: activeTab === 'split' ? '#f8fafc' : 'transparent',
                color: '#475569',
                boxShadow: activeTab === 'split' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s'
              }}
            >
              <Columns size={14} />
              50/50 Dual View
            </button>
          </div>
        </div>

        {/* Workspace Body */}
        <div style={{ 
          padding: '20px', 
          background: '#f8fafc',
          display: 'grid', 
          gridTemplateColumns: isSplitView ? '1fr 1fr' : '1fr', 
          gap: '20px' 
        }}>
          
          {/* ENGLISH WORKSPACE CARD */}
          {(activeTab === 'en' || isSplitView) && (
            <Card style={{ borderTop: '4px solid #084B7A', padding: '24px', borderRadius: '12px', background: 'white' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
                <span style={{ fontSize: '18px' }}>🇬🇧</span>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>English Workspace</h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', alignItems: 'start' }}>
                  <FormField label="English Title *">
                    <Input value={titleEn} onChange={(e) => setTitleEn(e.target.value)} placeholder="e.g. Modern History of Karnataka" />
                  </FormField>

                  <FormField label="URL Slug">
                    <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="e.g. modern-history-karnataka" />
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Auto-generated from title.</div>
                  </FormField>
                </div>

                <div style={{ padding: '24px', border: '1px dashed #cbd5e1', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', color: '#64748b', cursor: 'pointer', position: 'relative' }}>
                  {imageEn ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                      <img src={imageEn} alt="English Cover Preview" style={{ maxHeight: '120px', borderRadius: '4px', objectFit: 'contain' }} />
                      <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setImageEn(''); }} style={{ borderColor: '#ef4444', color: '#ef4444' }}>Remove Image</Button>
                    </div>
                  ) : (
                    <>
                      <ImageIcon size={32} style={{ color: '#94a3b8', marginBottom: '8px' }} />
                      <span style={{ fontSize: '14px', fontWeight: 600, color: '#334155' }}>Cover Image (English)</span>
                      <span style={{ fontSize: '12px', marginTop: '4px' }}>Recommended: 1200x800px. Click to browse.</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageEnUpload}
                    onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', display: imageEn ? 'none' : 'block' }}
                  />
                </div>

                <div style={{ marginTop: '8px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
                    English Content
                  </label>
                  <div style={{ minHeight: '250px', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                    <TiptapEditor 
                      content={contentEn} 
                      onChange={(json) => setContentEn(json)} 
                      placeholder="Start writing the English content..."
                      minHeight="250px"
                    />
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* KANNADA WORKSPACE CARD */}
          {(activeTab === 'kn' || isSplitView) && (
            <Card style={{ borderTop: '4px solid #047857', padding: '24px', borderRadius: '12px', background: 'white' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
                <span style={{ fontSize: '18px' }}>🇮🇳</span>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>ಕನ್ನಡ (Kannada) Workspace</h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <FormField label="Kannada Title">
                  <Input value={titleKn} onChange={(e) => setTitleKn(e.target.value)} placeholder="e.g. ಕರ್ನಾಟಕದ ಆಧುನಿಕ ಇತಿಹಾಸ" />
                </FormField>

                <div style={{ padding: '24px', border: '1px dashed #cbd5e1', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', color: '#64748b', cursor: 'pointer', position: 'relative' }}>
                  {imageKn ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                      <img src={imageKn} alt="Kannada Cover Preview" style={{ maxHeight: '120px', borderRadius: '4px', objectFit: 'contain' }} />
                      <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setImageKn(''); }} style={{ borderColor: '#ef4444', color: '#ef4444' }}>Remove Image</Button>
                    </div>
                  ) : (
                    <>
                      <ImageIcon size={32} style={{ color: '#94a3b8', marginBottom: '8px' }} />
                      <span style={{ fontSize: '14px', fontWeight: 600, color: '#334155' }}>Cover Image (Kannada)</span>
                      <span style={{ fontSize: '12px', marginTop: '4px' }}>Recommended: 1200x800px. Click to browse.</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageKnUpload}
                    onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', display: imageKn ? 'none' : 'block' }}
                  />
                </div>

                <div style={{ marginTop: '8px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
                    Kannada Content
                  </label>
                  <div style={{ minHeight: '250px', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                    <TiptapEditor 
                      content={contentKn} 
                      onChange={(json) => setContentKn(json)} 
                      placeholder="ಕನ್ನಡದಲ್ಲಿ ಬರೆಯಲು ಪ್ರಾರಂಭಿಸಿ..."
                      minHeight="250px"
                    />
                  </div>
                </div>
              </div>
            </Card>
          )}

        </div>
      </Card>

      {/* Compact Academic Mapping Card (Collapsible) */}
      <Card style={{ padding: '14px 18px', borderRadius: '12px', marginBottom: '24px', background: 'white' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={16} color="#084B7A" />
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#111827', margin: 0 }}>Academic Mapping</h3>
              <span style={{ fontSize: '10px', color: '#64748B', backgroundColor: '#F1F5F9', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>Optional</span>
              {selectedTaxonomies.length > 0 && (
                <span style={{ fontSize: '11px', color: '#047857', backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
                  {selectedTaxonomies.length} Mapped
                </span>
              )}
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsTaxonomyExpanded(!isTaxonomyExpanded)}
          >
            {isTaxonomyExpanded ? 'Collapse' : selectedTaxonomies.length > 0 ? 'Edit Mapping' : '+ Add Mapping'}
          </Button>
        </div>

        {isTaxonomyExpanded && (
          <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #F1F5F9' }}>
            <div style={{ marginBottom: '16px' }}>
              <Input
                value={taxonomySearchQuery}
                onChange={(e) => setTaxonomySearchQuery(e.target.value)}
                placeholder="Search categories or subcategories..."
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              <FormField label="Category & Subcategory">
                <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '8px', backgroundColor: '#FFFFFF' }}>
                  {categories.map((cat) => {
                    const q = taxonomySearchQuery.trim().toLowerCase();
                    const subList = cat.subcategories || [];
                    
                    const catMatch = !q || cat.nameEn.toLowerCase().includes(q) || (cat.nameKn || '').toLowerCase().includes(q);
                    
                    const filteredSubList = !q 
                      ? subList 
                      : catMatch 
                        ? subList 
                        : subList.filter(sub => sub.nameEn.toLowerCase().includes(q) || (sub.nameKn || '').toLowerCase().includes(q));
                        
                    const hasSubMatch = filteredSubList.length > 0;
                    
                    // Hide category if neither it nor its subcategories match the search query
                    if (q && !catMatch && !hasSubMatch) return null;

                    const hasSubs = subList.length > 0;
                    const selectedSubsForCat = selectedTaxonomies.filter(t => t.categoryId === cat.id && t.subcategoryId);
                    const isCatEntrySelected = selectedTaxonomies.some(t => t.categoryId === cat.id && !t.subcategoryId);

                    const allSubsSelected = hasSubs && subList.every(sub => selectedTaxonomies.some(t => t.categoryId === cat.id && t.subcategoryId === sub.id));
                    const someSubsSelected = hasSubs && selectedSubsForCat.length > 0;

                    const isMainChecked = hasSubs ? allSubsSelected : isCatEntrySelected;
                    const isMainIndeterminate = hasSubs && someSubsSelected && !allSubsSelected;
                    const isRowHighlighted = isMainChecked || someSubsSelected || isCatEntrySelected;

                    // Auto-expand if searching
                    const isExpanded = q ? true : expandedCategories[cat.id];
                    
                    return (
                      <div key={cat.id} style={{ marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', backgroundColor: isRowHighlighted ? '#F0FDF4' : 'transparent', borderRadius: '4px', paddingLeft: '4px' }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              toggleCategoryExpand(cat.id);
                            }}
                            style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            {isExpanded ? <ChevronDown size={14} color="#64748B" /> : <ChevronRight size={14} color="#64748B" />}
                          </button>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', padding: '4px 8px 4px 4px', flex: 1 }}>
                            <input 
                              type="checkbox" 
                              checked={isMainChecked}
                              ref={(el) => {
                                if (el) el.indeterminate = isMainIndeterminate;
                              }}
                              onChange={() => handleToggleCategory(cat, isMainChecked)}
                              style={{ cursor: 'pointer' }}
                            />
                            <span>📁 {cat.nameEn} {cat.nameKn ? `(${cat.nameKn})` : ''}</span>
                          </label>
                        </div>
                        
                        {filteredSubList.length > 0 && isExpanded && (
                          <div style={{ marginLeft: '24px', display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                            {filteredSubList.map(sub => {
                              const isSubSelected = selectedTaxonomies.some(t => t.categoryId === cat.id && t.subcategoryId === sub.id);
                              return (
                                <label key={sub.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', padding: '2px 4px', borderRadius: '4px', backgroundColor: isSubSelected ? '#F0FDF4' : 'transparent' }}>
                                  <input 
                                    type="checkbox" 
                                    checked={isSubSelected}
                                    onChange={(e) => handleToggleSubcategory(cat, sub.id, e.target.checked)}
                                    style={{ cursor: 'pointer' }}
                                  />
                                  <span>└─ {sub.nameEn} {sub.nameKn ? `(${sub.nameKn})` : ''}</span>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {categories.length === 0 && (
                    <div style={{ padding: '8px', fontSize: '13px', color: '#64748B' }}>No categories found. Create categories first in Quick Revision &gt; Categories.</div>
                  )}
                </div>
              </FormField>
            </div>

            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ minWidth: '220px' }}>
                <Select 
                  value={examCycleId} 
                  onChange={(e) => setExamCycleId(e.target.value)}
                  options={[
                    { label: 'Select Exam Mapping (Optional)...', value: '' },
                    { label: 'KPSC / KAS', value: 'kpsc-kas' },
                    { label: 'PSI', value: 'psi' },
                    { label: 'FDA / SDA', value: 'fda-sda' }
                  ]}
                />
              </div>

              {selectedTaxonomies.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedTaxonomies([]);
                    setCategoryId('');
                    setSubcategoryId('');
                  }}
                >
                  Clear Mapping
                </Button>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* SEO Settings */}
      <Card style={{ padding: '24px', marginBottom: '40px', background: 'white' }}>
        <h3 style={{ margin: '0 0 24px 0', color: '#0f172a', fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Globe size={20} color="#64748b" />
          SEO & Discovery Settings
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div>
            <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#475569' }}>English SEO</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <FormField label="Meta Title">
                <Input value={metaTitleEn} onChange={(e) => setMetaTitleEn(e.target.value)} placeholder="e.g. Fundamental Rights - Quick Revision" />
              </FormField>
              <FormField label="Meta Description">
                <Input value={metaDescriptionEn} onChange={(e) => setMetaDescriptionEn(e.target.value)} placeholder="Brief description for search engines..." />
              </FormField>
            </div>
          </div>
          
          <div>
            <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#475569' }}>Kannada SEO</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <FormField label="Meta Title (Kannada)">
                <Input value={metaTitleKn} onChange={(e) => setMetaTitleKn(e.target.value)} placeholder="e.g. ಮೂಲಭೂತ ಹಕ್ಕುಗಳು - ತ್ವರಿತ ಪರಿಷ್ಕರಣೆ" />
              </FormField>
              <FormField label="Meta Description (Kannada)">
                <Input value={metaDescriptionKn} onChange={(e) => setMetaDescriptionKn(e.target.value)} placeholder="ಸರ್ಚ್ ಎಂಜಿನ್‌ಗಳಿಗೆ ಸಂಕ್ಷಿಪ್ತ ವಿವರಣೆ..." />
              </FormField>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
