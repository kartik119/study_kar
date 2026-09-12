import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader, Card, Button, Badge, LoadingSpinner, ErrorState } from '@study-karnataka/ui';
import { StudyMaterialApi } from '../../api/study-materials.api';
import { ArrowLeft } from 'lucide-react';

export const InternalPreviewPage: React.FC = () => {
  const navigate = useNavigate();
  const { studyMaterialId, language, revisionId } = useParams<{
    studyMaterialId: string;
    language: 'en' | 'kn';
    revisionId: string;
  }>();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);

  useEffect(() => {
    if (!studyMaterialId || !language || !revisionId) return;
    setIsLoading(true);
    StudyMaterialApi.getPreviewData(studyMaterialId, language, revisionId)
      .then(setPreviewData)
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [studyMaterialId, language, revisionId]);

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0' }}>
        <LoadingSpinner size="lg" />
        <p style={{ marginTop: '16px', color: '#64748B' }}>Rendering internal student preview...</p>
      </div>
    );
  }
  if (error || !previewData) return <ErrorState title="Preview Failed" message={error || 'Preview data unavailable'} onRetry={() => window.location.reload()} />;

  const rev = previewData.revision;
  const sm = previewData.studyMaterial;

  return (
    <div style={{ padding: '24px', backgroundColor: '#F7F8FC', minHeight: '100vh' }}>
      <PageHeader
        title={`Internal Student Preview: ${rev.title}`}
        subtitle="Authenticated student portal preview mode rendered in Study Karnataka design theme"
        actions={
          <Button variant="outline" onClick={() => navigate(-1)} leftIcon={<ArrowLeft size={16} />}>
            Back
          </Button>
        }
      />

      {/* Student Portal View Mockup */}
      <Card style={{ maxWidth: '800px', margin: '0 auto', padding: '32px', backgroundColor: '#FFFFFF', borderRadius: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E6EAF0', paddingBottom: '16px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>{language === 'kn' ? '🇮🇳' : '🇬🇧'}</span>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
              {previewData.taxonomyPath}
            </span>
          </div>
          <Badge label={rev.status} variant="info" />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#111827', margin: '0 0 4px 0' }}>
            {rev.title}
          </h1>
          {rev.shortTitle && <p style={{ fontSize: '14px', color: '#64748B', margin: 0, fontWeight: 500 }}>{rev.shortTitle}</p>}
        </div>

        {rev.summary && (
          <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: '#FEF3C7', borderLeft: '4px solid #D97706', fontSize: '14px', color: '#92400E', marginBottom: '24px' }}>
            <strong>Summary: </strong> {rev.summary}
          </div>
        )}

        {/* Content Render */}
        <div style={{ fontSize: '16px', lineHeight: 1.7, color: '#1E293B', marginBottom: '32px' }}>
          {rev.plainTextContent ? (
            <div style={{ whiteSpace: 'pre-wrap' }}>{rev.plainTextContent}</div>
          ) : (
            <p style={{ color: '#94A3B8', fontStyle: 'italic' }}>No structured content added to this revision draft.</p>
          )}
        </div>

        <div style={{ paddingTop: '20px', borderTop: '1px solid #E6EAF0', display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#94A3B8' }}>
          <span>Study Karnataka Academic Notes</span>
          <span>Material ID: {sm.code}</span>
        </div>
      </Card>
    </div>
  );
};
