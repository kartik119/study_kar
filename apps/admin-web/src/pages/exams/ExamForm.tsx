import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react';
import { Button, Input, Select, FormField, Card, Badge, Modal } from '@study-karnataka/ui';
import { ExamAuthority, ExamProgramme } from '@study-karnataka/shared-types';
import {
  fetchAuthorities,
  createAuthority,
  deleteAuthority,
  fetchProgrammes,
  createProgramme,
  fetchExamById,
  createExam,
  updateExam,
  deleteProgramme,
} from '../../services/examApi';

export const ExamForm: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'basic' | 'english' | 'kannada' | 'eligibility' | 'dates' | 'resources' | 'seo' | 'logo'>('basic');

  // Master options
  const [authorities, setAuthorities] = useState<ExamAuthority[]>([]);
  const [programmes, setProgrammes] = useState<ExamProgramme[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Authority Modal
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authCode, setAuthCode] = useState('');
  const [authNameEn, setAuthNameEn] = useState('');
  const [authNameKn, setAuthNameKn] = useState('');
  const [authLogoUrl, setAuthLogoUrl] = useState('');

  // Programme Modal
  const [showProgModal, setShowProgModal] = useState(false);
  const [progCode, setProgCode] = useState('');
  const [progNameEn, setProgNameEn] = useState('');
  const [progNameKn, setProgNameKn] = useState('');

  // Form state
  const [programmeId, setProgrammeId] = useState('');
  const [selectedAuthId, setSelectedAuthId] = useState('');
  const [cycleCode, setCycleCode] = useState('');
  const [cycleYear, setCycleYear] = useState<number>(new Date().getFullYear());
  const [titleEn, setTitleEn] = useState('');
  const [titleKn, setTitleKn] = useState('');
  const [descriptionEn, setDescriptionEn] = useState('');
  const [descriptionKn, setDescriptionKn] = useState('');
  const [notificationNumber, setNotificationNumber] = useState('');
  const [notificationDate, setNotificationDate] = useState('');
  const [applicationStartDate, setApplicationStartDate] = useState('');
  const [applicationEndDate, setApplicationEndDate] = useState('');
  const [feePaymentEndDate, setFeePaymentEndDate] = useState('');
  const [tentativeExamDate, setTentativeExamDate] = useState('');
  const [resultDate, setResultDate] = useState('');
  const [officialNotificationUrl, setOfficialNotificationUrl] = useState('');
  const [applicationUrl, setApplicationUrl] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [visibility, setVisibility] = useState<'PRIVATE' | 'UNLISTED' | 'PUBLIC'>('PRIVATE');
  const [version, setVersion] = useState<number>(1);

  // Eligibility
  const [minimumAge, setMinimumAge] = useState<string>('');
  const [maximumAge, setMaximumAge] = useState<string>('');
  const [minimumEducationEn, setMinimumEducationEn] = useState('');
  const [minimumEducationKn, setMinimumEducationKn] = useState('');
  const [nationalityRequirementEn, setNationalityRequirementEn] = useState('');
  const [nationalityRequirementKn, setNationalityRequirementKn] = useState('');
  const [domicileRequirementEn, setDomicileRequirementEn] = useState('');
  const [domicileRequirementKn, setDomicileRequirementKn] = useState('');

  // Dates & Resources
  const [importantDates, setImportantDates] = useState<any[]>([]);
  const [officialResources, setOfficialResources] = useState<any[]>([]);

  // SEO
  const [slugEn, setSlugEn] = useState('');
  const [slugKn, setSlugKn] = useState('');
  const [metaTitleEn, setMetaTitleEn] = useState('');
  const [metaTitleKn, setMetaTitleKn] = useState('');
  const [metaDescriptionEn, setMetaDescriptionEn] = useState('');
  const [metaDescriptionKn, setMetaDescriptionKn] = useState('');

  // Readiness state
  const [readiness, setReadiness] = useState<any>(null);

  useEffect(() => {
    loadMasters();
  }, []);

  const loadMasters = async () => {
    try {
      const [authList, progList] = await Promise.all([fetchAuthorities(), fetchProgrammes()]);
      setAuthorities(authList);
      setProgrammes(progList);

      if (id) {
        const exam = await fetchExamById(id);
        setProgrammeId(exam.programmeId);
        if (exam.programme?.authorityId) setSelectedAuthId(exam.programme.authorityId);
        setCycleCode(exam.cycleCode);
        setCycleYear(exam.cycleYear);
        setTitleEn(exam.titleEn);
        setTitleKn(exam.titleKn);
        setDescriptionEn(exam.descriptionEn || '');
        setDescriptionKn(exam.descriptionKn || '');
        setNotificationNumber(exam.notificationNumber || '');
        setNotificationDate(exam.notificationDate ? new Date(exam.notificationDate).toISOString().slice(0, 10) : '');
        setApplicationStartDate(exam.applicationStartDate ? new Date(exam.applicationStartDate).toISOString().slice(0, 10) : '');
        setApplicationEndDate(exam.applicationEndDate ? new Date(exam.applicationEndDate).toISOString().slice(0, 10) : '');
        setFeePaymentEndDate(exam.feePaymentEndDate ? new Date(exam.feePaymentEndDate).toISOString().slice(0, 10) : '');
        setTentativeExamDate(exam.tentativeExamDate ? new Date(exam.tentativeExamDate).toISOString().slice(0, 10) : '');
        setResultDate(exam.resultDate ? new Date(exam.resultDate).toISOString().slice(0, 10) : '');
        setOfficialNotificationUrl(exam.officialNotificationUrl || '');
        setApplicationUrl(exam.applicationUrl || '');
        setLogoUrl(exam.logoUrl || '');
        setVisibility(exam.visibility);
        setVersion(exam.version);

        if (exam.eligibility) {
          setMinimumAge(exam.eligibility.minimumAge ? String(exam.eligibility.minimumAge) : '');
          setMaximumAge(exam.eligibility.maximumAge ? String(exam.eligibility.maximumAge) : '');
          setMinimumEducationEn(exam.eligibility.minimumEducationEn || '');
          setMinimumEducationKn(exam.eligibility.minimumEducationKn || '');
          setNationalityRequirementEn(exam.eligibility.nationalityRequirementEn || '');
          setNationalityRequirementKn(exam.eligibility.nationalityRequirementKn || '');
          setDomicileRequirementEn(exam.eligibility.domicileRequirementEn || '');
          setDomicileRequirementKn(exam.eligibility.domicileRequirementKn || '');
        }

        if (exam.importantDates) setImportantDates(exam.importantDates);
        if (exam.officialResources) setOfficialResources(exam.officialResources);
        if (exam.seo) {
          setSlugEn(exam.seo.slugEn || '');
          setSlugKn(exam.seo.slugKn || '');
          setMetaTitleEn(exam.seo.metaTitleEn || '');
          setMetaTitleKn(exam.seo.metaTitleKn || '');
          setMetaDescriptionEn(exam.seo.metaDescriptionEn || '');
          setMetaDescriptionKn(exam.seo.metaDescriptionKn || '');
        }
        setReadiness(exam.readiness);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load form data');
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleCreateAuth = async () => {
    if (!authCode || !authNameEn || !authNameKn) return;
    try {
      const created = await createAuthority({
        code: authCode,
        nameEn: authNameEn,
        nameKn: authNameKn,
        logoUrl: authLogoUrl || null,
      });
      setAuthorities([...authorities, created]);
      setSelectedAuthId(created.id);
      setShowAuthModal(false);
      setAuthCode('');
      setAuthNameEn('');
      setAuthNameKn('');
      setAuthLogoUrl('');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateProg = async () => {
    if (!selectedAuthId || !progCode || !progNameEn || !progNameKn) return;
    try {
      const created = await createProgramme({ authorityId: selectedAuthId, code: progCode, nameEn: progNameEn, nameKn: progNameKn });
      setProgrammes([...programmes, created]);
      setProgrammeId(created.id);
      setShowProgModal(false);
      setProgCode('');
      setProgNameEn('');
      setProgNameKn('');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteAuth = async () => {
    if (!selectedAuthId) return;
    if (!window.confirm('Are you sure you want to delete this exam authority?')) return;
    try {
      await deleteAuthority(selectedAuthId);
      setAuthorities(authorities.filter((a) => a.id !== selectedAuthId));
      setSelectedAuthId('');
      setProgrammeId('');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteProg = async () => {
    if (!programmeId) return;
    if (!window.confirm('Are you sure you want to delete this programme?')) return;
    try {
      await deleteProgramme(programmeId);
      setProgrammes(programmes.filter((p) => p.id !== programmeId));
      setProgrammeId('');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const addImportantDate = () => {
    setImportantDates([
      ...importantDates,
      { type: 'CUSTOM', labelEn: 'New Event', labelKn: 'ಹೊಸ ದಿನಾಂಕ', startAt: new Date().toISOString().slice(0, 10), isTentative: false, displayOrder: importantDates.length },
    ]);
  };

  const removeImportantDate = (idx: number) => {
    setImportantDates(importantDates.filter((_, i) => i !== idx));
  };

  const addOfficialResource = () => {
    setOfficialResources([
      ...officialResources,
      { resourceType: 'OTHER', labelEn: 'Official Website', labelKn: 'ಅಧಿಕೃತ ವೆಬ್‌ಸೈಟ್', url: 'https://', isActive: true, displayOrder: officialResources.length },
    ]);
  };

  const removeOfficialResource = (idx: number) => {
    setOfficialResources(officialResources.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);

      const payload = {
        programmeId,
        cycleCode: cycleCode.toUpperCase(),
        cycleYear: Number(cycleYear),
        titleEn,
        titleKn,
        descriptionEn,
        descriptionKn,
        notificationNumber: notificationNumber || null,
        notificationDate: notificationDate ? new Date(notificationDate).toISOString() : null,
        applicationStartDate: applicationStartDate ? new Date(applicationStartDate).toISOString() : null,
        applicationEndDate: applicationEndDate ? new Date(applicationEndDate).toISOString() : null,
        feePaymentEndDate: feePaymentEndDate ? new Date(feePaymentEndDate).toISOString() : null,
        tentativeExamDate: tentativeExamDate ? new Date(tentativeExamDate).toISOString() : null,
        resultDate: resultDate ? new Date(resultDate).toISOString() : null,
        officialNotificationUrl: officialNotificationUrl || null,
        applicationUrl: applicationUrl || null,
        logoUrl: logoUrl || null,
        visibility,
        version: isEdit ? version : undefined,
        eligibility: {
          minimumAge: minimumAge ? Number(minimumAge) : null,
          maximumAge: maximumAge ? Number(maximumAge) : null,
          minimumEducationEn: minimumEducationEn || null,
          minimumEducationKn: minimumEducationKn || null,
          nationalityRequirementEn: nationalityRequirementEn || null,
          nationalityRequirementKn: nationalityRequirementKn || null,
          domicileRequirementEn: domicileRequirementEn || null,
          domicileRequirementKn: domicileRequirementKn || null,
        },
        importantDates: importantDates.map((d, idx) => ({
          type: d.type || 'CUSTOM',
          labelEn: d.labelEn || 'Event',
          labelKn: d.labelKn || 'ಘಟನೆ',
          startAt: new Date(d.startAt).toISOString(),
          endAt: d.endAt ? new Date(d.endAt).toISOString() : null,
          isTentative: Boolean(d.isTentative),
          displayOrder: idx,
        })),
        officialResources: officialResources.map((r, idx) => ({
          resourceType: r.resourceType || 'OTHER',
          labelEn: r.labelEn || 'Link',
          labelKn: r.labelKn || 'ಲಿಂಕ್',
          url: r.url || 'https://',
          isActive: r.isActive !== false,
          displayOrder: idx,
        })),
        seo: {
          slugEn: slugEn || titleEn.toLowerCase().replace(/\s+/g, '-'),
          slugKn: slugKn || titleKn.toLowerCase().replace(/\s+/g, '-'),
          metaTitleEn: metaTitleEn || null,
          metaTitleKn: metaTitleKn || null,
          metaDescriptionEn: metaDescriptionEn || null,
          metaDescriptionKn: metaDescriptionKn || null,
        },
      };

      let result: any;
      if (isEdit && id) {
        result = await updateExam(id, payload);
      } else {
        result = await createExam(payload);
      }

      navigate(`/exams/${result.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to save exam record');
    } finally {
      setSaving(false);
    }
  };

  const filteredProgrammes = selectedAuthId ? programmes.filter((p) => p.authorityId === selectedAuthId) : programmes;

  return (
    <div style={{ padding: '8px 24px', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Button variant="ghost" onClick={() => navigate('/exams')}>
            <ArrowLeft size={18} />
          </Button>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>
              {isEdit ? 'Edit Exam Cycle' : 'Create New Exam Cycle'}
            </h1>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <Button variant="secondary" onClick={() => navigate('/exams')}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={saving}>
            <Save size={16} style={{ marginRight: '6px' }} /> {saving ? 'Saving...' : 'Save Exam Cycle'}
          </Button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '16px', backgroundColor: '#fef2f2', color: '#dc2626', borderRadius: '8px', marginBottom: '24px' }}>
          {error}
        </div>
      )}

      {/* Tabs Navigation */}
      <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid #e2e8f0', marginBottom: '16px', overflowX: 'auto' }}>
        {[
          { key: 'basic', label: '1. Basic Details' },
          { key: 'english', label: '2. English Content' },
          { key: 'kannada', label: '3. Kannada Content' },
          { key: 'eligibility', label: '4. Eligibility' },
          { key: 'dates', label: '5. Important Dates' },
          { key: 'resources', label: '6. Official Resources' },
          { key: 'seo', label: '7. SEO & Slugs' },
          { key: 'logo', label: '8. Exam Logo' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            style={{
              padding: '12px 18px',
              border: 'none',
              borderBottom: activeTab === tab.key ? '2px solid #084B7A' : '2px solid transparent',
              background: 'none',
              color: activeTab === tab.key ? '#084B7A' : '#64748b',
              fontWeight: activeTab === tab.key ? 600 : 500,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              fontSize: '14px',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <form onSubmit={handleSubmit}>
        {/* Tab 1: Basic Details */}
        {activeTab === 'basic' && (
          <Card style={{ padding: '24px' }}>
            <h3 style={{ marginBottom: '16px', fontSize: '18px' }}>Hierarchy & Notification Details</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <FormField label="Exam Authority" required>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Select
                      value={selectedAuthId}
                      onChange={(e) => {
                        setSelectedAuthId(e.target.value);
                        setProgrammeId('');
                      }}
                      options={[
                        { value: '', label: '-- Select Authority --' },
                        ...authorities.map((a) => ({ value: a.id, label: `${a.code} — ${a.nameEn}` })),
                      ]}
                    />
                    <Button type="button" variant="outline" onClick={() => setShowAuthModal(true)}>
                      + New
                    </Button>
                    {selectedAuthId && (
                      <Button type="button" variant="outline" onClick={handleDeleteAuth} style={{ color: '#ef4444', borderColor: '#ef4444' }}>
                        <Trash2 size={16} />
                      </Button>
                    )}
                  </div>
                </FormField>
              </div>

              <div>
                <FormField label="Exam Programme" required>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Select
                      value={programmeId}
                      onChange={(e) => {
                        const newProgId = e.target.value;
                        setProgrammeId(newProgId);
                        const selectedProg = programmes.find((p) => p.id === newProgId);
                        if (selectedProg && cycleYear) {
                          setCycleCode(`${selectedProg.code}_${cycleYear}`);
                        }
                      }}
                      options={[
                        { value: '', label: '-- Select Programme --' },
                        ...filteredProgrammes.map((p) => ({ value: p.id, label: `${p.code} — ${p.nameEn}` })),
                      ]}
                    />
                    <Button type="button" variant="outline" onClick={() => setShowProgModal(true)} disabled={!selectedAuthId}>
                      + New
                    </Button>
                    {programmeId && (
                      <Button type="button" variant="outline" onClick={handleDeleteProg} style={{ color: '#ef4444', borderColor: '#ef4444' }}>
                        <Trash2 size={16} />
                      </Button>
                    )}
                  </div>
                </FormField>
              </div>

              <div>
                <FormField label="Cycle Code" required>
                  <Input placeholder="e.g. KAS_2026" value={cycleCode} onChange={(e) => setCycleCode(e.target.value.toUpperCase())} />
                </FormField>
              </div>

              <div>
                <FormField label="Cycle Year" required>
                  <Input 
                    type="number" 
                    value={cycleYear} 
                    onChange={(e) => {
                      const newYear = Number(e.target.value);
                      setCycleYear(newYear);
                      if (programmeId) {
                        const selectedProg = programmes.find((p) => p.id === programmeId);
                        if (selectedProg) {
                          setCycleCode(`${selectedProg.code}_${newYear}`);
                        }
                      }
                    }} 
                  />
                </FormField>
              </div>

              <div>
                <FormField label="Notification Number">
                  <Input placeholder="e.g. PSC 01 GAZ 2026" value={notificationNumber} onChange={(e) => setNotificationNumber(e.target.value)} />
                </FormField>
              </div>

              <div>
                <FormField label="Visibility">
                  <Select
                    value={visibility}
                    onChange={(e) => setVisibility(e.target.value as any)}
                    options={[
                      { value: 'PRIVATE', label: 'PRIVATE (Internal only)' },
                      { value: 'UNLISTED', label: 'UNLISTED (Accessible by direct link)' },
                      { value: 'PUBLIC', label: 'PUBLIC (Visible in public lists)' },
                    ]}
                  />
                </FormField>
              </div>

              <div>
                <FormField label="Notification Date">
                  <Input type="date" value={notificationDate} onChange={(e) => setNotificationDate(e.target.value)} />
                </FormField>
              </div>

              <div>
                <FormField label="Application Start Date">
                  <Input type="date" value={applicationStartDate} onChange={(e) => setApplicationStartDate(e.target.value)} />
                </FormField>
              </div>

              <div>
                <FormField label="Application End Date">
                  <Input type="date" value={applicationEndDate} onChange={(e) => setApplicationEndDate(e.target.value)} />
                </FormField>
              </div>

              <div>
                <FormField label="Fee Payment End Date">
                  <Input type="date" value={feePaymentEndDate} onChange={(e) => setFeePaymentEndDate(e.target.value)} />
                </FormField>
              </div>

              <div>
                <FormField label="Tentative Exam Date">
                  <Input type="date" value={tentativeExamDate} onChange={(e) => setTentativeExamDate(e.target.value)} />
                </FormField>
              </div>

              <div>
                <FormField label="Result Date">
                  <Input type="date" value={resultDate} onChange={(e) => setResultDate(e.target.value)} />
                </FormField>
              </div>
            </div>
          </Card>
        )}

        {/* Tab 2: English Content */}
        {activeTab === 'english' && (
          <Card style={{ padding: '24px' }}>
            <h3 style={{ marginBottom: '16px', fontSize: '18px' }}>English Master Information</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <FormField label="Exam Title (English)" required>
                <Input placeholder="Karnataka Administrative Service (KAS) 2026 Cycle" value={titleEn} onChange={(e) => setTitleEn(e.target.value)} />
              </FormField>

              <FormField label="Detailed Description (English)">
                <textarea
                  style={{ width: '100%', minHeight: '120px', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  placeholder="Comprehensive recruitment details for Gazetted Probationers..."
                  value={descriptionEn}
                  onChange={(e) => setDescriptionEn(e.target.value)}
                />
              </FormField>

              <FormField label="Official Notification URL">
                <Input placeholder="https://kpsc.kar.nic.in/notification2026.pdf" value={officialNotificationUrl} onChange={(e) => setOfficialNotificationUrl(e.target.value)} />
              </FormField>

              <FormField label="Online Application Portal URL">
                <Input placeholder="https://kpsc.kar.nic.in/apply" value={applicationUrl} onChange={(e) => setApplicationUrl(e.target.value)} />
              </FormField>
            </div>
          </Card>
        )}

        {/* Tab 3: Kannada Content */}
        {activeTab === 'kannada' && (
          <Card style={{ padding: '24px' }}>
            <h3 style={{ marginBottom: '16px', fontSize: '18px' }}>Kannada Master Information (ಕನ್ನಡ ವಿವರಗಳು)</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <FormField label="Exam Title (Kannada)" required>
                <Input placeholder="ಕರ್ನಾಟಕ ಆಡಳಿತ ಸೇವೆ (ಕೆಎಎಸ್) ೨೦೨೬ ನೇಮಕಾತಿ ಪರೀಕ್ಷೆ" value={titleKn} onChange={(e) => setTitleKn(e.target.value)} />
              </FormField>

              <FormField label="Detailed Description (Kannada)">
                <textarea
                  style={{ width: '100%', minHeight: '120px', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  placeholder="ಗೆಜೆಟೆಡ್ ಪ್ರೊಬೇಷನರ್‌ಗಳ ಹುದ್ದೆಗಳ ಸಮಗ್ರ ನೇಮಕಾತಿ ವಿವರಣೆ..."
                  value={descriptionKn}
                  onChange={(e) => setDescriptionKn(e.target.value)}
                />
              </FormField>
            </div>
          </Card>
        )}

        {/* Tab 4: Eligibility */}
        {activeTab === 'eligibility' && (
          <Card style={{ padding: '24px' }}>
            <h3 style={{ marginBottom: '16px', fontSize: '18px' }}>Cycle Eligibility Criteria</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <FormField label="Minimum Age">
                <Input type="number" placeholder="21" value={minimumAge} onChange={(e) => setMinimumAge(e.target.value)} />
              </FormField>

              <FormField label="Maximum Age (General)">
                <Input type="number" placeholder="38" value={maximumAge} onChange={(e) => setMaximumAge(e.target.value)} />
              </FormField>

              <FormField label="Minimum Education (English)">
                <Input placeholder="Bachelor's Degree from a recognized university" value={minimumEducationEn} onChange={(e) => setMinimumEducationEn(e.target.value)} />
              </FormField>

              <FormField label="Minimum Education (Kannada)">
                <Input placeholder="ಮಾನ್ಯತೆ ಪಡೆದ ವಿಶ್ವವಿದ್ಯಾಲಯದಿಂದ ಪದವಿ" value={minimumEducationKn} onChange={(e) => setMinimumEducationKn(e.target.value)} />
              </FormField>

              <FormField label="Nationality Requirement (English)">
                <Input placeholder="Citizen of India" value={nationalityRequirementEn} onChange={(e) => setNationalityRequirementEn(e.target.value)} />
              </FormField>

              <FormField label="Nationality Requirement (Kannada)">
                <Input placeholder="ಭಾರತೀಯ ನಾಗರಿಕ" value={nationalityRequirementKn} onChange={(e) => setNationalityRequirementKn(e.target.value)} />
              </FormField>
            </div>
          </Card>
        )}

        {/* Tab 5: Important Dates */}
        {activeTab === 'dates' && (
          <Card style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', margin: 0 }}>Important Event Dates</h3>
              <Button type="button" variant="outline" onClick={addImportantDate}>
                <Plus size={16} style={{ marginRight: '4px' }} /> Add Event Date
              </Button>
            </div>

            {importantDates.map((d, idx) => (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr 140px 100px 40px', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
                <Select
                  value={d.type}
                  onChange={(e) => {
                    const updated = [...importantDates];
                    updated[idx].type = e.target.value;
                    setImportantDates(updated);
                  }}
                  options={[
                    { value: 'NOTIFICATION', label: 'Notification' },
                    { value: 'APPLICATION_START', label: 'App Start' },
                    { value: 'APPLICATION_END', label: 'App End' },
                    { value: 'EXAM', label: 'Exam Date' },
                    { value: 'RESULT', label: 'Result Date' },
                    { value: 'CUSTOM', label: 'Custom' },
                  ]}
                />
                <Input
                  placeholder="Label En"
                  value={d.labelEn}
                  onChange={(e) => {
                    const updated = [...importantDates];
                    updated[idx].labelEn = e.target.value;
                    setImportantDates(updated);
                  }}
                />
                <Input
                  placeholder="Label Kn"
                  value={d.labelKn}
                  onChange={(e) => {
                    const updated = [...importantDates];
                    updated[idx].labelKn = e.target.value;
                    setImportantDates(updated);
                  }}
                />
                <Input
                  type="date"
                  value={d.startAt ? d.startAt.slice(0, 10) : ''}
                  onChange={(e) => {
                    const updated = [...importantDates];
                    updated[idx].startAt = e.target.value;
                    setImportantDates(updated);
                  }}
                />
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                  <input
                    type="checkbox"
                    checked={d.isTentative}
                    onChange={(e) => {
                      const updated = [...importantDates];
                      updated[idx].isTentative = e.target.checked;
                      setImportantDates(updated);
                    }}
                  /> Tentative
                </label>
                <Button type="button" variant="ghost" onClick={() => removeImportantDate(idx)}>
                  <Trash2 size={16} style={{ color: '#dc2626' }} />
                </Button>
              </div>
            ))}
          </Card>
        )}

        {/* Tab 6: Official Resources */}
        {activeTab === 'resources' && (
          <Card style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', margin: 0 }}>Official Web Resources</h3>
              <Button type="button" variant="outline" onClick={addOfficialResource}>
                <Plus size={16} style={{ marginRight: '4px' }} /> Add Link
              </Button>
            </div>

            {officialResources.map((r, idx) => (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '140px 1fr 1fr 1.5fr 40px', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
                <Select
                  value={r.resourceType}
                  onChange={(e) => {
                    const updated = [...officialResources];
                    updated[idx].resourceType = e.target.value;
                    setOfficialResources(updated);
                  }}
                  options={[
                    { value: 'OFFICIAL_NOTIFICATION', label: 'Notification' },
                    { value: 'OFFICIAL_WEBSITE', label: 'Website' },
                    { value: 'APPLICATION', label: 'Application' },
                    { value: 'OTHER', label: 'Other' },
                  ]}
                />
                <Input
                  placeholder="Label En"
                  value={r.labelEn}
                  onChange={(e) => {
                    const updated = [...officialResources];
                    updated[idx].labelEn = e.target.value;
                    setOfficialResources(updated);
                  }}
                />
                <Input
                  placeholder="Label Kn"
                  value={r.labelKn}
                  onChange={(e) => {
                    const updated = [...officialResources];
                    updated[idx].labelKn = e.target.value;
                    setOfficialResources(updated);
                  }}
                />
                <Input
                  placeholder="URL (https://...)"
                  value={r.url}
                  onChange={(e) => {
                    const updated = [...officialResources];
                    updated[idx].url = e.target.value;
                    setOfficialResources(updated);
                  }}
                />
                <Button type="button" variant="ghost" onClick={() => removeOfficialResource(idx)}>
                  <Trash2 size={16} style={{ color: '#dc2626' }} />
                </Button>
              </div>
            ))}
          </Card>
        )}

        {/* Tab 7: SEO */}
        {activeTab === 'seo' && (
          <Card style={{ padding: '24px' }}>
            <h3 style={{ marginBottom: '16px', fontSize: '18px' }}>SEO Slugs & Meta Tags</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <FormField label="English Slug" required>
                <Input placeholder="kas-2026-recruitment" value={slugEn} onChange={(e) => setSlugEn(e.target.value)} />
              </FormField>

              <FormField label="Kannada Slug" required>
                <Input placeholder="ಕೆಎಎಸ್-೨೦೨೬-ನೇಮಕಾತಿ" value={slugKn} onChange={(e) => setSlugKn(e.target.value)} />
              </FormField>

              <FormField label="Meta Title (English)">
                <Input placeholder="KAS Exam 2026 — Dates & Syllabus" value={metaTitleEn} onChange={(e) => setMetaTitleEn(e.target.value)} />
              </FormField>

              <FormField label="Meta Title (Kannada)">
                <Input placeholder="ಕೆಎಎಸ್ ಪರೀಕ್ಷೆ ೨೦೨೬ — ದಿನಾಂಕಗಳು" value={metaTitleKn} onChange={(e) => setMetaTitleKn(e.target.value)} />
              </FormField>

              <FormField label="Meta Description (English)">
                <textarea
                  style={{ width: '100%', minHeight: '80px', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  placeholder="Official notification and study guide for KAS 2026..."
                  value={metaDescriptionEn}
                  onChange={(e) => setMetaDescriptionEn(e.target.value)}
                />
              </FormField>

              <FormField label="Meta Description (Kannada)">
                <textarea
                  style={{ width: '100%', minHeight: '80px', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  placeholder="ಕೆಎಎಸ್ ೨೦೨೬ ಪರೀಕ್ಷೆಯ ಅಧಿಕೃತ ಅಧಿಸೂಚನೆ..."
                  value={metaDescriptionKn}
                  onChange={(e) => setMetaDescriptionKn(e.target.value)}
                />
              </FormField>
            </div>
          </Card>
        )}

        {/* Tab 8: Exam Logo */}
        {activeTab === 'logo' && (
          <Card style={{ padding: '24px' }}>
            <h3 style={{ marginBottom: '16px', fontSize: '18px' }}>Exam Logo</h3>
            <p style={{ color: '#64748b', marginBottom: '16px', fontSize: '14px' }}>
              Upload an image to serve as the logo for this exam cycle.
            </p>
            <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <FormField label="Upload Image">
                  <input type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: 'block', marginBottom: '12px' }} />
                </FormField>
              </div>
              {logoUrl && (
                <div style={{ width: '120px', height: '120px', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img src={logoUrl} alt="Logo Preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Bottom Tab Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              const tabs = ['basic', 'english', 'kannada', 'eligibility', 'dates', 'resources', 'seo', 'logo'];
              const currentIndex = tabs.indexOf(activeTab);
              if (currentIndex > 0) setActiveTab(tabs[currentIndex - 1] as any);
            }}
            disabled={activeTab === 'basic'}
          >
            Previous Tab
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              const tabs = ['basic', 'english', 'kannada', 'eligibility', 'dates', 'resources', 'seo', 'logo'];
              const currentIndex = tabs.indexOf(activeTab);
              if (currentIndex < tabs.length - 1) setActiveTab(tabs[currentIndex + 1] as any);
            }}
            disabled={activeTab === 'logo'}
          >
            Next Tab
          </Button>
        </div>
      </form>

      {/* Modal 1: Create Authority */}
      <Modal title="Create New Exam Authority" isOpen={showAuthModal} onClose={() => setShowAuthModal(false)}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <FormField label="Authority Code" required>
            <Input placeholder="e.g. KPSC" value={authCode} onChange={(e) => setAuthCode(e.target.value.toUpperCase())} />
          </FormField>
          <FormField label="English Name" required>
            <Input placeholder="Karnataka Public Service Commission" value={authNameEn} onChange={(e) => setAuthNameEn(e.target.value)} />
          </FormField>
          <FormField label="Kannada Name" required>
            <Input placeholder="ಕರ್ನಾಟಕ ಲೋಕಸೇವಾ ಆಯೋಗ" value={authNameKn} onChange={(e) => setAuthNameKn(e.target.value)} />
          </FormField>
          <FormField label="Authority Logo (Optional)">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                const r = new FileReader();
                r.onloadend = () => setAuthLogoUrl(r.result as string);
                r.readAsDataURL(f);
              }}
              style={{ display: 'block' }}
            />
            {authLogoUrl && (
              <div style={{ marginTop: '8px', width: '48px', height: '48px', border: '1px solid #cbd5e1', borderRadius: '4px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
                <img src={authLogoUrl} alt="Preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
              </div>
            )}
          </FormField>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
            <Button variant="secondary" onClick={() => setShowAuthModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreateAuth}>Create Authority</Button>
          </div>
        </div>
      </Modal>

      {/* Modal 2: Create Programme */}
      <Modal title="Create New Exam Programme" isOpen={showProgModal} onClose={() => setShowProgModal(false)}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <FormField label="Programme Code" required>
            <Input placeholder="e.g. KAS" value={progCode} onChange={(e) => setProgCode(e.target.value.toUpperCase())} />
          </FormField>
          <FormField label="English Name" required>
            <Input placeholder="Karnataka Administrative Service" value={progNameEn} onChange={(e) => setProgNameEn(e.target.value)} />
          </FormField>
          <FormField label="Kannada Name" required>
            <Input placeholder="ಕರ್ನಾಟಕ ಆಡಳಿತ ಸೇವೆ" value={progNameKn} onChange={(e) => setProgNameKn(e.target.value)} />
          </FormField>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
            <Button variant="secondary" onClick={() => setShowProgModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreateProg}>Create Programme</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
