import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  StudyMaterialDetail,
  AcademicCategory,
  AcademicSubcategory,
  AcademicTopic,
  AcademicKnowledgeArea,
  PermissionKey,
} from '@study-karnataka/shared-types';
import {
  PageHeader,
  Card,
  Button,
  Badge,
  ErrorState,
  LoadingSpinner,
  Modal,
  FormField,
  Select,
} from '@study-karnataka/ui';
import { StudyMaterialApi, ApiError } from '../../api/study-materials.api';
import { AcademicTaxonomyApi } from '../../api/academic-taxonomy.api';
import {
  ArrowLeft,
  Edit2,
  Archive,
  RotateCcw,
  Trash2,
  Globe,
  AlertCircle,
  Layers,
  Plus,
  History,
  Star,
} from 'lucide-react';

export const StudyMaterialDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { studyMaterialId } = useParams<{ studyMaterialId: string }>();

  // Permissions
  const storedUserRaw = localStorage.getItem('admin_user');
  const user = storedUserRaw ? JSON.parse(storedUserRaw) : null;
  const userPermissions: PermissionKey[] = user?.permissions || [];
  const userRoles: string[] = user?.roles || ['Super Admin'];
  const isSuperAdmin = userRoles.includes('Super Admin');

  const canUpdate = isSuperAdmin || userPermissions.includes('study_materials.update');
  const canArchive = isSuperAdmin || userPermissions.includes('study_materials.archive');
  const canDeleteDraft = isSuperAdmin || userPermissions.includes('study_materials.delete_draft');

  const [detail, setDetail] = useState<StudyMaterialDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState(false);

  // Add Mapping Modal State
  const [isAddMappingOpen, setIsAddMappingOpen] = useState(false);
  const [mappingCategory, setMappingCategory] = useState('');
  const [mappingSubcategory, setMappingSubcategory] = useState('');
  const [mappingTopic, setMappingTopic] = useState('');
  const [mappingKnowledgeArea, setMappingKnowledgeArea] = useState('');

  const [categories, setCategories] = useState<AcademicCategory[]>([]);
  const [subcategories, setSubcategories] = useState<AcademicSubcategory[]>([]);
  const [topics, setTopics] = useState<AcademicTopic[]>([]);
  const [knowledgeAreas, setKnowledgeAreas] = useState<AcademicKnowledgeArea[]>([]);

  const loadDetail = useCallback(async () => {
    if (!studyMaterialId) return;
    setIsLoading(true);
    setError(null);
    setIsForbidden(false);

    try {
      const data = await StudyMaterialApi.getStudyMaterialById(studyMaterialId);
      setDetail(data);
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 403) {
        setIsForbidden(true);
      } else {
        setError(err.message || 'Failed to load study material detail');
      }
    } finally {
      setIsLoading(false);
    }
  }, [studyMaterialId]);

  useEffect(() => {
    loadDetail();
    AcademicTaxonomyApi.getCategories({ moduleType: 'STUDY_MATERIAL' }).then(setCategories).catch(console.error);
  }, [loadDetail]);

  useEffect(() => {
    if (mappingCategory) {
      AcademicTaxonomyApi.getSubcategories(mappingCategory).then(setSubcategories).catch(console.error);
    } else setSubcategories([]);
  }, [mappingCategory]);

  useEffect(() => {
    if (mappingSubcategory) {
      AcademicTaxonomyApi.getTopics(mappingSubcategory).then(setTopics).catch(console.error);
    } else setTopics([]);
  }, [mappingSubcategory]);

  useEffect(() => {
    if (mappingTopic) {
      AcademicTaxonomyApi.getKnowledgeAreas(mappingTopic).then(setKnowledgeAreas).catch(console.error);
    } else setKnowledgeAreas([]);
  }, [mappingTopic]);

  const handleArchiveToggle = async () => {
    if (!detail || !canArchive) return;
    try {
      if (detail.recordStatus === 'ACTIVE') {
        await StudyMaterialApi.archiveStudyMaterial(detail.id);
      } else {
        await StudyMaterialApi.restoreStudyMaterial(detail.id);
      }
      loadDetail();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteDraft = async () => {
    if (!detail || !canDeleteDraft) return;
    if (!window.confirm(`Delete draft study material '${detail.code}'?`)) return;
    try {
      await StudyMaterialApi.deleteDraftStudyMaterial(detail.id);
      navigate('/study-materials');
    } catch (err: any) {
      alert(err.message || 'Cannot delete draft study material');
    }
  };

  const handleAddMapping = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detail || !canUpdate) return;
    try {
      await StudyMaterialApi.addTaxonomyMapping(detail.id, {
        categoryId: mappingCategory,
        subcategoryId: mappingSubcategory,
        topicId: mappingTopic,
        knowledgeAreaId: mappingKnowledgeArea || undefined,
        isPrimary: false,
      });
      setIsAddMappingOpen(false);
      loadDetail();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleMakePrimary = async (mappingId: string) => {
    if (!detail || !canUpdate) return;
    try {
      await StudyMaterialApi.makePrimaryTaxonomyMapping(detail.id, mappingId);
      loadDetail();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteMapping = async (mappingId: string) => {
    if (!detail || !canUpdate) return;
    if (!window.confirm('Remove this taxonomy mapping?')) return;
    try {
      await StudyMaterialApi.deleteTaxonomyMapping(detail.id, mappingId);
      loadDetail();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: '24px', backgroundColor: '#F7F8FC', minHeight: '100vh' }}>
        <Card style={{ padding: '48px', textAlign: 'center', backgroundColor: '#FFFFFF', borderRadius: '16px' }}>
          <LoadingSpinner size="lg" />
          <p style={{ marginTop: '16px', color: '#64748B', fontSize: '14px' }}>Loading study material details...</p>
        </Card>
      </div>
    );
  }

  if (isForbidden) {
    return (
      <div style={{ padding: '24px', backgroundColor: '#F7F8FC', minHeight: '100vh' }}>
        <ErrorState title="403 — Access Forbidden" message="Your administrative role does not have permission to view this Study Material." />
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div style={{ padding: '24px', backgroundColor: '#F7F8FC', minHeight: '100vh' }}>
        <ErrorState title="Study Material Not Found" message={error || 'The requested study material does not exist.'} onRetry={loadDetail} />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', backgroundColor: '#F7F8FC', minHeight: '100vh', fontFamily: 'Inter, sans-serif', maxWidth: '1080px', margin: '0 auto' }}>
      {/* Page Header */}
      <PageHeader
        title={String(detail?.code || 'Study Material')}
        subtitle={`Version ${detail.version} • Created ${new Date(detail.createdAt).toLocaleDateString()}`}
        actions={
          <div style={{ display: 'flex', gap: '12px' }}>
            <Button variant="outline" leftIcon={<ArrowLeft size={16} />} onClick={() => navigate('/study-materials')}>
              Back
            </Button>

            {canUpdate && (
              <Button variant="outline" leftIcon={<Edit2 size={16} />} onClick={() => navigate(`/study-materials/${detail.id}/edit`)}>
                Edit Record
              </Button>
            )}

            {canArchive && (
              <Button
                variant="secondary"
                leftIcon={detail.recordStatus === 'ACTIVE' ? <Archive size={16} /> : <RotateCcw size={16} />}
                onClick={handleArchiveToggle}
              >
                {detail.recordStatus === 'ACTIVE' ? 'Archive' : 'Restore'}
              </Button>
            )}

            {canDeleteDraft && detail.recordStatus === 'ACTIVE' && (
              <Button variant="danger" leftIcon={<Trash2 size={16} />} onClick={handleDeleteDraft}>
                Delete Draft
              </Button>
            )}
          </div>
        }
      />

      {detail.logoUrl && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px', padding: '12px 18px', backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E6EAF0' }}>
          <div style={{ width: '48px', height: '48px', border: '1px solid #CBD5E1', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <img src={detail.logoUrl} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
          </div>
          <div>
            <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>Material Logo</span>
            <div style={{ fontSize: '14px', color: '#111827', fontWeight: 600 }}>{detail.englishRevision?.title || detail.kannadaRevision?.title || detail.code}</div>
          </div>
        </div>
      )}

      {/* Diagnostics Card */}
      <Card style={{ marginBottom: '24px', padding: '24px', borderRadius: '16px', border: '1px solid #E6EAF0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E6EAF0', paddingBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#111827', margin: '0 0 4px 0' }}>
              Foundation Readiness Diagnostics
            </h2>
            <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>
              Evaluates canonical completeness, bilingual locale presence, and taxonomy structural integrity.
            </p>
          </div>

          <div>
            <Badge
              label={detail.foundationReadiness || 'NOT_STARTED'}
              variant={detail.foundationReadiness === 'BOTH_LANGUAGES_READY' ? 'success' : 'warning'}
            />
          </div>
        </div>

        {detail.readinessDetails?.missingFields?.length > 0 && (
          <div style={{ marginTop: '16px', padding: '16px', borderRadius: '8px', backgroundColor: '#FEF3C7', border: '1px solid #FCD34D' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600, color: '#92400E' }}>
              <AlertCircle size={16} />
              <span>Missing Requirements for Both Languages Ready Status:</span>
            </div>
            <ul style={{ margin: '8px 0 0 20px', padding: 0, fontSize: '13px', color: '#78350F' }}>
              {detail.readinessDetails.missingFields.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {/* Locales Side-by-Side */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', marginBottom: '24px' }}>
        {/* English Locale Card */}
        <Card style={{ padding: '24px', borderRadius: '16px', border: '1px solid #E6EAF0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E6EAF0', paddingBottom: '12px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Globe size={18} color="#2563EB" />
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#111827', margin: 0 }}>English Draft Locale</h3>
            </div>
            <Badge label={detail.englishLocale ? 'Draft Ready' : 'Missing'} variant={detail.englishLocale ? 'info' : 'neutral'} />
          </div>

          {detail.englishLocale ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Title</label>
                <div style={{ fontWeight: 600, color: '#111827' }}>{detail.englishLocale.title}</div>
              </div>

              {detail.englishLocale.shortTitle && (
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Short Title</label>
                  <div style={{ color: '#334155' }}>{detail.englishLocale.shortTitle}</div>
                </div>
              )}

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>URL Slug</label>
                <div style={{ fontFamily: 'monospace', fontSize: '12px', color: '#2563EB' }}>{detail.englishLocale.slug}</div>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Summary</label>
                <p style={{ fontSize: '13px', color: '#475569', margin: '4px 0 0 0' }}>{detail.englishLocale.summary || 'No summary provided'}</p>
              </div>
            </div>
          ) : (
            <div style={{ padding: '24px', textAlign: 'center', color: '#94A3B8', fontSize: '14px' }}>English locale draft missing.</div>
          )}
        </Card>

        {/* Kannada Locale Card */}
        <Card style={{ padding: '24px', borderRadius: '16px', border: '1px solid #E6EAF0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E6EAF0', paddingBottom: '12px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Globe size={18} color="#7C3AED" />
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#111827', margin: 0 }}>Kannada Draft Locale</h3>
            </div>
            <Badge label={detail.kannadaLocale ? 'Draft Ready' : 'Missing'} variant={detail.kannadaLocale ? 'warning' : 'neutral'} />
          </div>

          {detail.kannadaLocale ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Title</label>
                <div style={{ fontWeight: 600, color: '#111827' }}>{detail.kannadaLocale.title}</div>
              </div>

              {detail.kannadaLocale.shortTitle && (
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Short Title</label>
                  <div style={{ color: '#334155' }}>{detail.kannadaLocale.shortTitle}</div>
                </div>
              )}

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>URL Slug</label>
                <div style={{ fontFamily: 'monospace', fontSize: '12px', color: '#7C3AED' }}>{detail.kannadaLocale.slug}</div>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Summary</label>
                <p style={{ fontSize: '13px', color: '#475569', margin: '4px 0 0 0' }}>{detail.kannadaLocale.summary || 'No summary provided'}</p>
              </div>
            </div>
          ) : (
            <div style={{ padding: '24px', textAlign: 'center', color: '#94A3B8', fontSize: '14px' }}>Kannada locale draft missing.</div>
          )}
        </Card>
      </div>

      {/* Taxonomy Mappings */}
      <Card style={{ marginBottom: '24px', padding: '24px', borderRadius: '16px', border: '1px solid #E6EAF0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E6EAF0', paddingBottom: '12px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={18} color="#EF2323" />
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#111827', margin: 0 }}>Academic Taxonomy Mappings (Optional)</h3>
            <span style={{ fontSize: '11px', color: '#64748B', backgroundColor: '#F1F5F9', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>Optional</span>
          </div>

          {canUpdate && (
            <Button
              variant="primary"
              size="sm"
              style={{ backgroundColor: '#EF2323', borderColor: '#EF2323' }}
              leftIcon={<Plus size={14} />}
              onClick={() => setIsAddMappingOpen(true)}
            >
              Add Academic Mapping
            </Button>
          )}
        </div>

        {!detail.taxonomyMappings || detail.taxonomyMappings.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', backgroundColor: '#F8FAFC', borderRadius: '12px', border: '1px dashed #CBD5E1' }}>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748B', fontWeight: 500 }}>
              Unmapped — This Study Material is independent and has no assigned academic category or topic.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E6EAF0' }}>
                <tr>
                  <th style={{ padding: '10px 14px', textAlign: 'left', color: '#64748B' }}>Category</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', color: '#64748B' }}>Subcategory</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', color: '#64748B' }}>Topic</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', color: '#64748B' }}>Knowledge Area</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', color: '#64748B' }}>Type</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right', color: '#64748B' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {detail.taxonomyMappings?.map((map) => (
                  <tr key={map.id} style={{ borderBottom: '1px solid #E6EAF0' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 600, color: '#111827' }}>{map.category?.nameEn}</td>
                    <td style={{ padding: '12px 14px', color: '#334155' }}>{map.subcategory?.nameEn}</td>
                    <td style={{ padding: '12px 14px', color: '#334155' }}>{map.topic?.nameEn}</td>
                    <td style={{ padding: '12px 14px', color: '#64748B' }}>{map.knowledgeArea?.nameEn || '—'}</td>
                    <td style={{ padding: '12px 14px' }}>
                      {map.isPrimary ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#D97706', fontWeight: 700, fontSize: '11px', backgroundColor: '#FEF3C7', padding: '2px 8px', borderRadius: '12px' }}>
                          <Star size={12} fill="#D97706" /> Primary
                        </span>
                      ) : (
                        <span style={{ fontSize: '11px', color: '#94A3B8' }}>Secondary</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                      {canUpdate && (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                          {!map.isPrimary && (
                            <Button variant="ghost" size="sm" onClick={() => handleMakePrimary(map.id)}>
                              Make Primary
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteMapping(map.id)}>
                            <Trash2 size={14} color="#EF2323" />
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Access & Monetization Section */}
      <Card style={{ marginBottom: '24px', padding: '24px', borderRadius: '16px', border: '1px solid #E6EAF0', borderTop: '4px solid #8B5CF6' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E6EAF0', paddingBottom: '12px', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#111827', margin: 0 }}>Access & Monetization Policy</h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748B' }}>Commercial entitlement classification and language preview configurations.</p>
          </div>
          <Badge
            label={(detail as any).accessType || 'FREE'}
            variant={(detail as any).accessType === 'PAID' ? 'error' : (detail as any).accessType === 'FREEMIUM' ? 'warning' : 'success'}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', fontSize: '13px' }}>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Access Classification</label>
            <div style={{ fontWeight: 700, color: '#111827', marginTop: '2px' }}>
              {(detail as any).accessType === 'FREE' ? 'Completely Free' : (detail as any).accessType === 'PAID' ? 'Completely Paid' : 'Freemium (Free Preview)'}
            </div>
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Entitlement Key</label>
            <div style={{ fontFamily: 'monospace', fontSize: '12px', color: '#8B5CF6', marginTop: '2px' }}>
              `STUDY_MATERIAL:${detail.id}:FULL`
            </div>
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Free MCQ Sample Count</label>
            <div style={{ fontWeight: 600, color: '#334155', marginTop: '2px' }}>
              {(detail as any).freeMcqSampleCount ?? 0} Samples
            </div>
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Free Quick Revision Cards</label>
            <div style={{ fontWeight: 600, color: '#334155', marginTop: '2px' }}>
              {(detail as any).freeQuickRevisionSampleCount ?? 0} Cards
            </div>
          </div>
        </div>
      </Card>

      {/* Audit History */}
      <Card style={{ padding: '24px', borderRadius: '16px', border: '1px solid #E6EAF0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #E6EAF0', paddingBottom: '12px', marginBottom: '16px' }}>
          <History size={18} color="#64748B" />
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#111827', margin: 0 }}>Audit Trail History</h3>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {detail.auditLogs && detail.auditLogs.length > 0 ? (
            detail.auditLogs.map((log) => (
              <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E6EAF0', fontSize: '12px' }}>
                <div>
                  <span style={{ fontWeight: 700, color: '#EF2323' }}>{log.action}</span>
                  {log.reason && <span style={{ marginLeft: '8px', fontStyle: 'italic', color: '#64748B' }}>— "{log.reason}"</span>}
                </div>
                <div style={{ color: '#94A3B8' }}>{new Date(log.createdAt).toLocaleString()}</div>
              </div>
            ))
          ) : (
            <div style={{ fontSize: '13px', color: '#94A3B8' }}>No audit log entries recorded.</div>
          )}
        </div>
      </Card>

      {/* Add Mapping Modal */}
      <Modal
        isOpen={isAddMappingOpen}
        onClose={() => setIsAddMappingOpen(false)}
        title="Add Secondary Taxonomy Mapping"
      >
        <form onSubmit={handleAddMapping} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <FormField label="Category *" required>
            <Select
              required
              value={mappingCategory}
              onChange={(e) => setMappingCategory(e.target.value)}
              options={[
                { label: '-- Select Category --', value: '' },
                ...categories.map((c) => ({ label: c.nameEn, value: c.id })),
              ]}
            />
          </FormField>

          <FormField label="Subcategory *" required>
            <Select
              required
              disabled={!mappingCategory}
              value={mappingSubcategory}
              onChange={(e) => setMappingSubcategory(e.target.value)}
              options={[
                { label: '-- Select Subcategory --', value: '' },
                ...subcategories.map((s) => ({ label: s.nameEn, value: s.id })),
              ]}
            />
          </FormField>

          <FormField label="Topic *" required>
            <Select
              required
              disabled={!mappingSubcategory}
              value={mappingTopic}
              onChange={(e) => setMappingTopic(e.target.value)}
              options={[
                { label: '-- Select Topic --', value: '' },
                ...topics.map((t) => ({ label: t.nameEn, value: t.id })),
              ]}
            />
          </FormField>

          <FormField label="Knowledge Area">
            <Select
              disabled={!mappingTopic}
              value={mappingKnowledgeArea}
              onChange={(e) => setMappingKnowledgeArea(e.target.value)}
              options={[
                { label: '-- Optional Knowledge Area --', value: '' },
                ...knowledgeAreas.map((ka) => ({ label: ka.nameEn, value: ka.id })),
              ]}
            />
          </FormField>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
            <Button type="button" variant="outline" onClick={() => setIsAddMappingOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" style={{ backgroundColor: '#EF2323', borderColor: '#EF2323' }}>
              Add Mapping
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
