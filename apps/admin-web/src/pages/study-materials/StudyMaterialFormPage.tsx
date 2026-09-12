import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  StudyMaterialContentType,
  AcademicCategory,
  AcademicSubcategory,
  AcademicTopic,
  AcademicKnowledgeArea,
  StudyMaterialLocaleRevisionStatus,
} from '@study-karnataka/shared-types';
import {
  PageHeader,
  Card,
  Button,
  FormField,
  Input,
  Select,
  Textarea,
  Badge,
  ErrorState,
  LoadingSpinner,
} from '@study-karnataka/ui';
import { StudyMaterialApi } from '../../api/study-materials.api';
import { AcademicTaxonomyApi } from '../../api/academic-taxonomy.api';
import { AcademicStageApi } from '../../api/academic-stage.api';
import { TiptapEditor } from '../../components/editor/TiptapEditor';
import {
  ArrowLeft,
  Save,
  Layers,
  CheckCircle,
  AlertCircle,
  FileCode,
  Search,
  Eye,
  Send,
  RefreshCw,
  Globe,
  HelpCircle,
  Lock,
  Coins,
  Sliders,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Columns,
  UploadCloud,
  Image as ImageIcon,
} from 'lucide-react';

const formatEnglishSlug = (text: string): string => {
  return (text || '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
};

const formatKannadaSlug = (text: string, fallbackEnText?: string): string => {
  const cleaned = (text || '')
    .toLowerCase()
    .replace(/&/g, 'mattu')
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9\u0C80-\u0CFF-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  if (cleaned) return cleaned;
  if (fallbackEnText) return formatEnglishSlug(fallbackEnText);
  return '';
};

export const StudyMaterialFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { studyMaterialId } = useParams<{ studyMaterialId?: string }>();
  const isEditing = Boolean(studyMaterialId);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Responsive Breakpoint Hook
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );
  const [activeTab, setActiveTab] = useState<'en' | 'kn' | 'split'>('en');

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isDesktop = windowWidth >= 768;

  // Form State
  const [code, setCode] = useState('');
  const [contentType, setContentType] = useState<StudyMaterialContentType>('ARTICLE');
  const [logoUrl, setLogoUrl] = useState('');

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const img = new window.Image();
    const objectUrl = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      if (img.width !== 1200 || img.height !== 800) {
        setError(`Logo must be exactly 1200x800 pixels (3:2 ratio). The uploaded image is ${img.width}x${img.height} pixels.`);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoUrl(reader.result as string);
        markUnsaved();
        setError(null);
      };
      reader.readAsDataURL(file);
    };
    img.src = objectUrl;
  };

  // Autosave status
  const [autosaveStatus, setAutosaveStatus] = useState<'IDLE' | 'UNSAVED' | 'SAVING' | 'SAVED' | 'FAILED'>('IDLE');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  // English Locale Revision State
  const [enRevId, setEnRevId] = useState<string | null>(null);
  const [enRevNumber, setEnRevNumber] = useState<number>(1);
  const [enStatus, setEnStatus] = useState<StudyMaterialLocaleRevisionStatus>('DRAFT');
  const [enTitle, setEnTitle] = useState('');
  const [enShortTitle, setEnShortTitle] = useState('');
  const [enSlug, setEnSlug] = useState('');
  const [enSummary, setEnSummary] = useState('');
  const [enContentJson, setEnContentJson] = useState<any>(null);
  const [enPlainText, setEnPlainText] = useState<string>('');
  const [enMetaTitle, setEnMetaTitle] = useState('');
  const [enMetaDescription, setEnMetaDescription] = useState('');

  // Kannada Locale Revision State
  const [knRevId, setKnRevId] = useState<string | null>(null);
  const [knRevNumber, setKnRevNumber] = useState<number>(1);
  const [knStatus, setKnStatus] = useState<StudyMaterialLocaleRevisionStatus>('DRAFT');
  const [knTitle, setKnTitle] = useState('');
  const [knShortTitle, setKnShortTitle] = useState('');
  const [knSlug, setKnSlug] = useState('');
  const [knSummary, setKnSummary] = useState('');
  const [knContentJson, setKnContentJson] = useState<any>(null);
  const [knPlainText, setKnPlainText] = useState<string>('');
  const [knMetaTitle, setKnMetaTitle] = useState('');
  const [knMetaDescription, setKnMetaDescription] = useState('');

  // SEO Accordion States
  const [showEnSeo, setShowEnSeo] = useState(false);
  const [showKnSeo, setShowKnSeo] = useState(false);

  // Taxonomy Selection State (Merged Category & Subcategory)
  const [categories, setCategories] = useState<AcademicCategory[]>([]);
  const [allSubcategoriesMap, setAllSubcategoriesMap] = useState<Record<string, AcademicSubcategory[]>>({});
  const [selectedTaxonomies, setSelectedTaxonomies] = useState<{ categoryId: string, subcategoryId?: string, topicId?: string, knowledgeAreaId?: string }[]>([]);
  const [isTaxonomyExpanded, setIsTaxonomyExpanded] = useState<boolean>(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [taxonomySearchQuery, setTaxonomySearchQuery] = useState('');

  const toggleCategoryExpand = (catId: string) => {
    setExpandedCategories(prev => ({ ...prev, [catId]: !prev[catId] }));
  };

  const handleToggleCategory = (cat: AcademicCategory, currentChecked: boolean) => {
    const subList = allSubcategoriesMap[cat.id] || [];

    if (currentChecked) {
      // Uncheck everything for this category
      setSelectedTaxonomies(prev => prev.filter(t => t.categoryId !== cat.id));
    } else {
      // Check category and ALL of its subcategories automatically
      const otherTaxonomies = selectedTaxonomies.filter(t => t.categoryId !== cat.id);
      const newMappings = [
        { categoryId: cat.id },
        ...subList.map(sub => ({ categoryId: cat.id, subcategoryId: sub.id })),
      ];
      setSelectedTaxonomies([...otherTaxonomies, ...newMappings]);
      // Auto-expand category so user can see all subcategories are checked
      setExpandedCategories(prev => ({ ...prev, [cat.id]: true }));
    }
    markUnsaved();
  };

  const handleToggleSubcategory = (catId: string, subId: string, checked: boolean) => {
    if (checked) {
      // Check this subcategory and ensure parent category mapping is present
      setSelectedTaxonomies(prev => {
        const exists = prev.some(t => t.categoryId === catId && t.subcategoryId === subId);
        if (exists) return prev;
        const hasCat = prev.some(t => t.categoryId === catId && !t.subcategoryId);
        const toAdd = [{ categoryId: catId, subcategoryId: subId }];
        if (!hasCat) {
          toAdd.unshift({ categoryId: catId });
        }
        return [...prev, ...toAdd];
      });
    } else {
      // Uncheck this subcategory so it is not included
      setSelectedTaxonomies(prev => {
        const filtered = prev.filter(t => !(t.categoryId === catId && t.subcategoryId === subId));
        const subList = allSubcategoriesMap[catId] || [];
        const remainingSubsForCat = filtered.filter(t => t.categoryId === catId && t.subcategoryId);
        // If no other subcategory remains selected, uncheck parent category too
        if (subList.length > 0 && remainingSubsForCat.length === 0) {
          return filtered.filter(t => t.categoryId !== catId);
        }
        return filtered;
      });
    }
    markUnsaved();
  };

  // Academic Stages Selection State
  const [availableStages, setAvailableStages] = useState<AcademicStage[]>([]);
  const [academicStageIds, setAcademicStageIds] = useState<string[]>([]);
  const [isStageExpanded, setIsStageExpanded] = useState<boolean>(true);

  useEffect(() => {
    loadTaxonomyCategories();
    AcademicStageApi.getAllStages().then(setAvailableStages).catch(err => console.error(err));
    if (isEditing && studyMaterialId) {
      loadStudyMaterial(studyMaterialId);
    }
  }, [studyMaterialId]);

  // Access Control & Monetization State
  const [accessType, setAccessType] = useState<'FREE' | 'PAID' | 'FREEMIUM'>('FREE');
  const [entitlementKey, setEntitlementKey] = useState<string>('');
  const [freeMcqSampleCount, setFreeMcqSampleCount] = useState<number>(5);
  const [freeQuickRevisionSampleCount, setFreeQuickRevisionSampleCount] = useState<number>(5);

  const [previewEndNodeIdEn, setPreviewEndNodeIdEn] = useState<string>('');
  const [previewEndNodeIdKn, setPreviewEndNodeIdKn] = useState<string>('');
  const [paywallTitleEn, setPaywallTitleEn] = useState<string>('');
  const [paywallMessageEn, setPaywallMessageEn] = useState<string>('');
  const [paywallTitleKn, setPaywallTitleKn] = useState<string>('');
  const [paywallMessageKn, setPaywallMessageKn] = useState<string>('');

  // Access Simulator Modal
  const [showAccessPreviewModal, setShowAccessPreviewModal] = useState<boolean>(false);
  const [previewModeSim, setPreviewModeSim] = useState<'ANONYMOUS_VISITOR' | 'FREE_USER' | 'ENTITLED_USER' | 'FULL_ADMIN_PREVIEW'>('ANONYMOUS_VISITOR');
  const [previewLangSim, setPreviewLangSim] = useState<'en' | 'kn'>('en');
  const [previewSimResult, setPreviewSimResult] = useState<any>(null);
  const [isPreviewSimLoading, setIsPreviewSimLoading] = useState<boolean>(false);

  // Section Accordion Collapsibles
  const [isAccessExpanded, setIsAccessExpanded] = useState<boolean>(true);

  // Preload taxonomy categories and subcategories to merge Category & Subcategory in 1 field
  const loadTaxonomyCategories = async () => {
    try {
      const data = await AcademicTaxonomyApi.getCategories({ moduleType: 'STUDY_MATERIAL' });
      setCategories(data);

      const subMap: Record<string, AcademicSubcategory[]> = {};
      await Promise.all(
        data.map(async (cat) => {
          try {
            const subs = await AcademicTaxonomyApi.getSubcategories(cat.id);
            subMap[cat.id] = subs || [];
          } catch {
            subMap[cat.id] = [];
          }
        })
      );
      setAllSubcategoriesMap(subMap);
    } catch (err) {
      console.error('Failed to load academic taxonomy categories:', err);
    }
  };

  // Compute Merged Category & Subcategory Options
  const mergedCategorySubcategoryOptions = useMemo(() => {
    const options: { value: string; label: string }[] = [
      { value: '', label: 'Select Category & Subcategory...' },
    ];

    categories.forEach((cat) => {
      options.push({
        value: `cat:${cat.id}`,
        label: `📁 ${cat.nameEn} (${cat.nameKn})`,
      });

      const subList = allSubcategoriesMap[cat.id] || [];
      subList.forEach((sub) => {
        options.push({
          value: `sub:${sub.id}:${cat.id}`,
          label: `   └─ ${sub.nameEn} (${sub.nameKn})`,
        });
      });
    });

    return options;
  }, [categories, allSubcategoriesMap]);

  // Topics and knowledge areas are not currently handled in the multi-select UI

  const loadStudyMaterial = async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data: any = await StudyMaterialApi.getStudyMaterialById(id);
      setCode(data.code);
      setContentType(data.contentType);
      if (data.logoUrl) setLogoUrl(data.logoUrl);

      if (data.accessType) setAccessType(data.accessType);
      if (data.entitlementKey) setEntitlementKey(data.entitlementKey);
      if (data.freeMcqSampleCount !== undefined) setFreeMcqSampleCount(data.freeMcqSampleCount);
      if (data.freeQuickRevisionSampleCount !== undefined) setFreeQuickRevisionSampleCount(data.freeQuickRevisionSampleCount);

      const enLoc = data.englishLocale || (data.locales && data.locales.find((l: any) => l.language === 'en'));
      if (enLoc) {
        const rev = data.englishRevision || enLoc.currentRevision || enLoc.currentDraftRevision || (enLoc.revisions && enLoc.revisions.length > 0 ? (enLoc.revisions.find((r: any) => r.isCurrentDraft) || enLoc.revisions[0]) : null);
        if (rev) {
          setEnRevId(rev.id);
          setEnRevNumber(rev.revisionNumber);
          setEnStatus(rev.status);
          setEnTitle(rev.title);
          setEnShortTitle(rev.shortTitle || '');
          setEnSlug(rev.slug);
          setEnSummary(rev.summary || '');
          setEnContentJson(rev.contentJson);
          setEnPlainText(rev.plainText || '');
          setEnMetaTitle(rev.metaTitle || '');
          setEnMetaDescription(rev.metaDescription || '');

          if (rev.previewEndNodeId) setPreviewEndNodeIdEn(rev.previewEndNodeId);
          if (rev.paywallTitle) setPaywallTitleEn(rev.paywallTitle);
          if (rev.paywallMessage) setPaywallMessageEn(rev.paywallMessage);
        }
      }

      const knLoc = data.kannadaLocale || (data.locales && data.locales.find((l: any) => l.language === 'kn'));
      if (knLoc) {
        const rev = data.kannadaRevision || knLoc.currentRevision || knLoc.currentDraftRevision || (knLoc.revisions && knLoc.revisions.length > 0 ? (knLoc.revisions.find((r: any) => r.isCurrentDraft) || knLoc.revisions[0]) : null);
        if (rev) {
          setKnRevId(rev.id);
          setKnRevNumber(rev.revisionNumber);
          setKnStatus(rev.status);
          setKnTitle(rev.title);
          setKnShortTitle(rev.shortTitle || '');
          setKnSlug(rev.slug);
          setKnSummary(rev.summary || '');
          setKnContentJson(rev.contentJson);
          setKnPlainText(rev.plainText || '');
          setKnMetaTitle(rev.metaTitle || '');
          setKnMetaDescription(rev.metaDescription || '');

          if (rev.previewEndNodeId) setPreviewEndNodeIdKn(rev.previewEndNodeId);
          if (rev.paywallTitle) setPaywallTitleKn(rev.paywallTitle);
          if (rev.paywallMessage) setPaywallMessageKn(rev.paywallMessage);
        }
      }

      if (data.taxonomyMappings && data.taxonomyMappings.length > 0) {
        setSelectedTaxonomies(data.taxonomyMappings.map((m: any) => ({
          categoryId: m.categoryId,
          subcategoryId: m.subcategoryId || undefined,
          topicId: m.topicId || undefined,
          knowledgeAreaId: m.knowledgeAreaId || undefined,
        })));
        setIsTaxonomyExpanded(true);
      }

      if (data.academicStages && data.academicStages.length > 0) {
        setAcademicStageIds(data.academicStages.map((as: any) => as.academicStageId));
        setIsStageExpanded(true);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load study material details');
    } finally {
      setIsLoading(false);
    }
  };

  const markUnsaved = () => {
    if (autosaveStatus !== 'UNSAVED') setAutosaveStatus('UNSAVED');
  };

  const handleFullSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setAutosaveStatus('SAVING');

    try {
      const cleanEnSlug = formatEnglishSlug(enSlug) || formatEnglishSlug(enTitle) || 'study-material';
      const cleanKnSlug = formatKannadaSlug(knSlug, cleanEnSlug) || formatKannadaSlug(knTitle, cleanEnSlug) || cleanEnSlug;

      setEnSlug(cleanEnSlug);
      setKnSlug(cleanKnSlug);

      // 1. Resolve complete taxonomy mapping with topic if a category/subcategory was chosen
      let primaryTaxonomy: any = undefined;
      const completeMapping = selectedTaxonomies.find(t => t.categoryId && t.subcategoryId && t.topicId);
      if (completeMapping) {
        primaryTaxonomy = completeMapping;
      } else {
        const subMapping = selectedTaxonomies.find(t => t.categoryId && t.subcategoryId);
        if (subMapping) {
          try {
            const topics = await AcademicTaxonomyApi.getTopics(subMapping.subcategoryId);
            if (topics && topics.length > 0) {
              primaryTaxonomy = {
                categoryId: subMapping.categoryId,
                subcategoryId: subMapping.subcategoryId,
                topicId: topics[0].id,
                isPrimary: true,
              };
            } else {
              const sub = allSubcategoriesMap[subMapping.categoryId]?.find(s => s.id === subMapping.subcategoryId);
              const subNameEn = sub?.nameEn || 'General';
              const subNameKn = sub?.nameKn || 'ಸಾಮಾನ್ಯ';
              const topicCode = `TOP_${(sub?.code || 'GEN').replace(/[^A-Z0-9]/g, '').slice(0, 10)}_${Date.now().toString().slice(-4)}`;
              const newTopic = await AcademicTaxonomyApi.createTopic({
                subcategoryId: subMapping.subcategoryId,
                code: topicCode,
                nameEn: subNameEn,
                nameKn: subNameKn,
                slugEn: (sub?.slugEn || 'general') + '-overview',
                slugKn: (sub?.slugKn || 'samanya') + '-parichaya',
                displayOrder: 1,
                isActive: true,
              });
              if (newTopic?.id) {
                primaryTaxonomy = {
                  categoryId: subMapping.categoryId,
                  subcategoryId: subMapping.subcategoryId,
                  topicId: newTopic.id,
                  isPrimary: true,
                };
              }
            }
          } catch (taxErr) {
            console.warn('Could not resolve topic for taxonomy mapping:', taxErr);
            primaryTaxonomy = undefined;
          }
        }
      }

      const enPayload = {
        title: enTitle.trim() || 'Untitled English Note',
        shortTitle: enShortTitle.trim() || undefined,
        slug: cleanEnSlug,
        summary: enSummary.trim() || undefined,
        contentJson: enContentJson || {},
        plainTextContent: enPlainText || '',
        metaTitle: enMetaTitle.trim() || undefined,
        metaDescription: enMetaDescription.trim() || undefined,
        previewEndNodeId: accessType === 'FREEMIUM' ? previewEndNodeIdEn || undefined : undefined,
        paywallTitle: accessType !== 'FREE' ? paywallTitleEn.trim() || undefined : undefined,
        paywallMessage: accessType !== 'FREE' ? paywallMessageEn.trim() || undefined : undefined,
      };

      const knPayload = {
        title: knTitle.trim() || 'Untitled Kannada Note',
        shortTitle: knShortTitle.trim() || undefined,
        slug: cleanKnSlug,
        summary: knSummary.trim() || undefined,
        contentJson: knContentJson || {},
        plainTextContent: knPlainText || '',
        metaTitle: knMetaTitle.trim() || undefined,
        metaDescription: knMetaDescription.trim() || undefined,
        previewEndNodeId: accessType === 'FREEMIUM' ? previewEndNodeIdKn || undefined : undefined,
        paywallTitle: accessType !== 'FREE' ? paywallTitleKn.trim() || undefined : undefined,
        paywallMessage: accessType !== 'FREE' ? paywallMessageKn.trim() || undefined : undefined,
      };

      let saved: any;
      if (isEditing && studyMaterialId) {
        // 1. Update Canonical
        const updatePayload: any = {
          code: code.trim().toUpperCase() || undefined,
          contentType,
          logoUrl: logoUrl || null,
          academicStageIds: academicStageIds.length > 0 ? academicStageIds : null,
        };
        saved = await StudyMaterialApi.updateStudyMaterial(studyMaterialId, updatePayload);

        // Sync Taxonomy Mappings
        const latestData = await StudyMaterialApi.getStudyMaterialById(studyMaterialId);
        const existingMappings = latestData.taxonomyMappings || [];
        
        if (primaryTaxonomy) {
          const isSame = existingMappings.some((m: any) => 
            m.categoryId === primaryTaxonomy.categoryId &&
            m.subcategoryId === primaryTaxonomy.subcategoryId &&
            m.topicId === primaryTaxonomy.topicId
          );
          if (!isSame) {
            for (const m of existingMappings) {
              await StudyMaterialApi.deleteTaxonomyMapping(studyMaterialId, m.id);
            }
            await StudyMaterialApi.addTaxonomyMapping(studyMaterialId, {
              categoryId: primaryTaxonomy.categoryId,
              subcategoryId: primaryTaxonomy.subcategoryId,
              topicId: primaryTaxonomy.topicId,
              isPrimary: true
            });
          }
        } else if (selectedTaxonomies.length === 0 && existingMappings.length > 0) {
          for (const m of existingMappings) {
            await StudyMaterialApi.deleteTaxonomyMapping(studyMaterialId, m.id);
          }
        }

        // 2. Save Revisions
        if (enRevId) {
          await (StudyMaterialApi as any).saveRevision(studyMaterialId, 'en', enRevId, enPayload);
        } else if (enTitle.trim()) {
          await StudyMaterialApi.saveLocale(studyMaterialId, 'en', enPayload);
        }

        if (knRevId) {
          await (StudyMaterialApi as any).saveRevision(studyMaterialId, 'kn', knRevId, knPayload);
        } else if (knTitle.trim()) {
          await StudyMaterialApi.saveLocale(studyMaterialId, 'kn', knPayload);
        }
      } else {
        // 2. Create Canonical
        const createPayload: any = {
          code: code.trim().toUpperCase() || undefined,
          contentType,
          logoUrl: logoUrl || null,
          academicStageIds: academicStageIds.length > 0 ? academicStageIds : null,
          taxonomyMapping: primaryTaxonomy,
          initialEnglishLocale: enTitle.trim() ? { title: enTitle.trim(), shortTitle: enShortTitle.trim() || undefined, slug: cleanEnSlug, summary: enSummary.trim() || undefined } : undefined,
          initialKannadaLocale: knTitle.trim() ? { title: knTitle.trim(), shortTitle: knShortTitle.trim() || undefined, slug: cleanKnSlug, summary: knSummary.trim() || undefined } : undefined,
        };
        saved = await StudyMaterialApi.createStudyMaterial(createPayload);

        // 2. Wait for server to return locales with their initial draft revisions, then save the content
        const newEnLocale = saved?.locales?.find((l: any) => l.language === 'en');
        const newKnLocale = saved?.locales?.find((l: any) => l.language === 'kn');
        const newEnRevId = newEnLocale?.revisions?.[0]?.id;
        const newKnRevId = newKnLocale?.revisions?.[0]?.id;

        if (newEnRevId) {
          await (StudyMaterialApi as any).saveRevision(saved.id, 'en', newEnRevId, enPayload);
        }
        if (newKnRevId) {
          await (StudyMaterialApi as any).saveRevision(saved.id, 'kn', newKnRevId, knPayload);
        }
      }

      setAutosaveStatus('SAVED');
      setLastSavedAt(new Date().toLocaleTimeString());

      if (!isEditing && saved?.id) {
        navigate(`/study-materials/${saved.id}/edit`, { replace: true });
      } else {
        // Reload to sync status and revision IDs
        if (isEditing && studyMaterialId) {
           await loadStudyMaterial(studyMaterialId);
        }
      }
    } catch (err: any) {
      console.error('Save failed', err);
      setError(err.message || 'Failed to save study material');
      setAutosaveStatus('FAILED');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReviewSubmission = async (lang: 'en' | 'kn') => {
    if (!studyMaterialId) return;
    const revId = lang === 'en' ? enRevId : knRevId;
    if (!revId) return;

    try {
      setIsLoading(true);
      if (typeof (StudyMaterialApi as any).submitRevisionForReview === 'function') {
        await (StudyMaterialApi as any).submitRevisionForReview(studyMaterialId, lang, revId, 'Ready for admin review');
      }
      await loadStudyMaterial(studyMaterialId);
    } catch (err: any) {
      setError(err.message || `Failed to submit ${lang} locale for review`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenAccessPreviewSim = () => {
    setShowAccessPreviewModal(true);
    fetchPreviewSim(previewModeSim, previewLangSim);
  };

  const fetchPreviewSim = async (role: string, lang: 'en' | 'kn') => {
    if (!studyMaterialId) return;
    setIsPreviewSimLoading(true);
    try {
      if (typeof (StudyMaterialApi as any).previewContentAccess === 'function') {
        const res = await (StudyMaterialApi as any).previewContentAccess(studyMaterialId, lang, role);
        setPreviewSimResult(res);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsPreviewSimLoading(false);
    }
  };

  const extractOutline = (contentJson: any) => {
    if (!contentJson || !contentJson.content || !Array.isArray(contentJson.content)) return [];
    const outline: Array<{ nodeId: string; label: string; location: string }> = [];

    contentJson.content.forEach((block: any, idx: number) => {
      if (block.type === 'heading') {
        const text = block.content?.map((c: any) => c.text).join('') || `Heading Section ${idx + 1}`;
        outline.push({
          nodeId: `block_${idx}`,
          label: `H${block.attrs?.level || 2}: ${text}`,
          location: `Section ${idx + 1}`,
        });
      }
    });

    if (outline.length === 0) {
      outline.push({ nodeId: 'block_default', label: 'Default Body Paragraph Boundary', location: 'After Intro Paragraph' });
    }
    return outline;
  };

  const calculateFreemiumWordCounts = (boundaryNodeId: string, plainText: string) => {
    const totalWords = plainText ? plainText.trim().split(/\s+/).filter(Boolean).length : 0;
    if (!boundaryNodeId || totalWords === 0) {
      return { freeWordCount: Math.round(totalWords * 0.4), lockedWordCount: Math.round(totalWords * 0.6), freePercentage: 40 };
    }
    const freeWordCount = Math.round(totalWords * 0.35);
    const lockedWordCount = Math.max(0, totalWords - freeWordCount);
    const freePercentage = totalWords > 0 ? Math.round((freeWordCount / totalWords) * 100) : 0;
    return { freeWordCount, lockedWordCount, freePercentage };
  };

  const enOutline = extractOutline(enContentJson);
  const knOutline = extractOutline(knContentJson);
  const enStats = calculateFreemiumWordCounts(previewEndNodeIdEn, enPlainText);
  const knStats = calculateFreemiumWordCounts(previewEndNodeIdKn, knPlainText);

  const renderStatusBadge = (status: StudyMaterialLocaleRevisionStatus) => {
    switch (status) {
      case 'PUBLISHED': return <Badge label="Published" variant="success" />;
      case 'APPROVED': return <Badge label="Approved" variant="info" />;
      case 'CHANGES_REQUESTED': return <Badge label="Changes Requested" variant="error" />;
      case 'DRAFT': default: return <Badge label="Draft" variant="neutral" />;
    }
  };

  if (isLoading && !enTitle && !code) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <LoadingSpinner size="lg" />
        <div style={{ marginTop: '16px', color: '#64748B', fontSize: '14px' }}>Loading Study Material Editor...</div>
      </div>
    );
  }

  const isSplitView = activeTab === 'split';

  return (
    <div style={{ padding: '8px 24px 80px', maxWidth: '1440px', margin: '0 auto', fontFamily: "'Inter', sans-serif" }}>
      {/* Compact Top Header */}
      <PageHeader
        title={isEditing ? `Edit: ${enTitle || knTitle || 'Study Material'}` : 'Create Study Material'}
        breadcrumbItems={[
          { label: 'Study Materials', href: '/study-materials' },
          { label: isEditing ? 'Edit Material' : 'Add Content' },
        ]}
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Badge label={isEditing ? enStatus : 'Draft'} variant="neutral" />

            {isEditing && code && (
              <div style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#F1F5F9', padding: '4px 10px', borderRadius: '6px', border: '1px solid #E2E8F0', color: '#475569' }}>
                <FileCode size={13} color="#64748B" />
                <span>ID: <strong style={{ color: '#0F172A', fontFamily: 'monospace' }}>{code}</strong></span>
              </div>
            )}

            {isEditing && (
              <div style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '6px', backgroundColor: '#FFFFFF', border: '1px solid #E6EAF0', color: '#475569' }}>
                {autosaveStatus === 'SAVING' && <RefreshCw className="w-3 h-3 animate-spin text-amber-500" />}
                {autosaveStatus === 'SAVED' && <CheckCircle className="w-3 h-3 text-emerald-500" />}
                {autosaveStatus === 'UNSAVED' && <AlertCircle className="w-3 h-3 text-amber-500" />}
                {autosaveStatus === 'FAILED' && <AlertCircle className="w-3 h-3 text-rose-500" />}
                <span>
                  {autosaveStatus === 'SAVING' && 'Saving...'}
                  {autosaveStatus === 'SAVED' && `Saved ${lastSavedAt || 'just now'}`}
                  {autosaveStatus === 'UNSAVED' && 'Unsaved'}
                  {autosaveStatus === 'FAILED' && 'Autosave Failed'}
                  {autosaveStatus === 'IDLE' && 'Saved'}
                </span>
              </div>
            )}

            <Button variant="outline" size="sm" onClick={() => navigate('/study-materials')} leftIcon={<ArrowLeft size={14} />}>
              Back
            </Button>
          </div>
        }
      />

      {error && <ErrorState title="Save Operation Error" message={error} onRetry={() => setError(null)} />}

      <form onSubmit={handleFullSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>



        {/* Compact Workspace Header Bar with Language Switcher */}
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
              onClick={() => setActiveTab('en')}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                backgroundColor: activeTab === 'en' ? '#084B7A' : '#F8FAFC',
                color: activeTab === 'en' ? '#FFFFFF' : '#475569',
                border: '1px solid',
                borderColor: activeTab === 'en' ? '#084B7A' : '#DCE6EE',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <span>🇬🇧 English</span>
              {renderStatusBadge(enStatus)}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('kn')}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                backgroundColor: activeTab === 'kn' ? '#047857' : '#F8FAFC',
                color: activeTab === 'kn' ? '#FFFFFF' : '#475569',
                border: '1px solid',
                borderColor: activeTab === 'kn' ? '#047857' : '#DCE6EE',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <span>🇮🇳 ಕನ್ನಡ (Kannada)</span>
              {renderStatusBadge(knStatus)}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('split')}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                backgroundColor: activeTab === 'split' ? '#334155' : '#F8FAFC',
                color: activeTab === 'split' ? '#FFFFFF' : '#475569',
                border: '1px solid',
                borderColor: activeTab === 'split' ? '#334155' : '#DCE6EE',
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
          </div>
        </div>

        {/* Compact Bilingual Authoring Workspace Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: isSplitView ? 'repeat(auto-fit, minmax(380px, 1fr))' : '1fr', gap: '14px' }}>
          {/* ENGLISH LOCALE CARD */}
          {(activeTab === 'en' || isSplitView) && (
            <Card style={{ borderTop: '4px solid #084B7A', padding: '16px', borderRadius: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E6EAF0', paddingBottom: '10px', marginBottom: '14px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px' }}>🇬🇧</span>
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#111827' }}>English Workspace</h3>
                    <Badge label={`Rev #${enRevNumber}`} variant="neutral" />
                  </div>
                  <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                    <Badge label={enTitle ? 'Content Ready' : 'Incomplete'} variant={enTitle ? 'success' : 'neutral'} />
                    <Badge label={enMetaTitle ? 'SEO Ready' : 'Missing SEO'} variant={enMetaTitle ? 'info' : 'neutral'} />
                  </div>
                </div>
                <div>{renderStatusBadge(enStatus)}</div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <FormField label="English Title" required>
                  <Input
                    value={enTitle}
                    onChange={(e) => {
                      const val = e.target.value;
                      const prevAutoSlug = formatEnglishSlug(enTitle);
                      if (!enSlug || enSlug === prevAutoSlug) {
                        setEnSlug(formatEnglishSlug(val));
                      }
                      setEnTitle(val);
                      markUnsaved();
                    }}
                    placeholder="e.g. Modern History of Karnataka"
                    required
                    style={{ height: '40px' }}
                  />
                </FormField>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <FormField label="English Short Title">
                    <Input
                      value={enShortTitle}
                      onChange={(e) => {
                        setEnShortTitle(e.target.value);
                        markUnsaved();
                      }}
                      placeholder="Short title for cards"
                      style={{ height: '40px' }}
                    />
                  </FormField>
                  <FormField label="English URL Slug">
                    <Input
                      value={enSlug}
                      onChange={(e) => {
                        setEnSlug(formatEnglishSlug(e.target.value));
                        markUnsaved();
                      }}
                      placeholder="modern-history-karnataka"
                      style={{ height: '40px' }}
                    />
                  </FormField>
                </div>

                <FormField label="English Summary">
                  <Textarea
                    value={enSummary}
                    onChange={(e) => {
                      setEnSummary(e.target.value);
                      markUnsaved();
                    }}
                    rows={2}
                    placeholder="Brief summary overview in English..."
                    style={{ minHeight: '60px' }}
                  />
                </FormField>

                {/* Styled English Logo Section */}
                <div style={{ marginTop: '8px', marginBottom: '8px', border: '1px solid #E6EAF0', borderRadius: '8px', overflow: 'hidden' }}>
                  <div style={{ padding: '8px 12px', backgroundColor: '#F8FAFC', borderBottom: '1px solid #E6EAF0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ImageIcon size={14} color="#084B7A" />
                    <h4 style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#334155' }}>Study Material Logo / Cover Icon (1200x800px)</h4>
                  </div>
                  <div style={{ padding: '12px', backgroundColor: '#FFFFFF' }}>
                    <div style={{ 
                      border: '1.5px dashed #CBD5E1', 
                      borderRadius: '6px', 
                      padding: '10px 16px', 
                      backgroundColor: '#F8FAFC', 
                      display: 'flex', 
                      flexDirection: 'row', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      gap: '16px',
                      position: 'relative',
                      overflow: 'hidden',
                      transition: 'all 0.2s ease',
                    }}>
                      {logoUrl ? (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '48px', height: '48px', borderRadius: '6px', overflow: 'hidden', border: '1px solid #E2E8F0', backgroundColor: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <img src={logoUrl} alt="Logo Preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                            </div>
                            <span style={{ fontSize: '13px', fontWeight: 500, color: '#334155' }}>Logo Selected</span>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setLogoUrl('');
                              markUnsaved();
                            }}
                            style={{ color: '#EF4444', borderColor: '#EF4444', padding: '4px 8px', fontSize: '11px', height: '26px' }}
                          >
                            Remove
                          </Button>
                        </>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#E0E7FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <UploadCloud size={16} color="#4F46E5" />
                          </div>
                          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <div>
                              <span style={{ fontSize: '13px', fontWeight: 600, color: '#4F46E5' }}>Click to upload</span>
                              <span style={{ fontSize: '13px', color: '#64748B' }}> or drag and drop</span>
                            </div>
                            <span style={{ fontSize: '11px', color: '#94A3B8' }}>(1200x800 pixels exactly, up to 5MB)</span>
                          </div>
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
                        style={{ 
                          position: 'absolute', 
                          top: 0, left: 0, width: '100%', height: '100%', 
                          opacity: 0, cursor: 'pointer',
                          display: logoUrl ? 'none' : 'block'
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Tiptap Structured Editor */}
                <FormField label="English Content Editor">
                  <TiptapEditor
                    content={enContentJson}
                    onChange={(json, plainText) => {
                      setEnContentJson(json);
                      setEnPlainText(plainText);
                      markUnsaved();
                    }}
                    language="en"
                    placeholder="Start writing the English study material here..."
                    autosaveStatus={autosaveStatus}
                    lastSavedAt={lastSavedAt}
                  />
                </FormField>

                {/* Compact English SEO Accordion */}
                <div style={{ border: '1px solid #E6EAF0', borderRadius: '8px', padding: '10px 14px', backgroundColor: '#F8FAFC', marginTop: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setShowEnSeo(!showEnSeo)}
                    style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', fontWeight: 600, color: '#334155', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Search size={14} color="#084B7A" />
                      English SEO & Search Preview Settings
                    </span>
                    <span>{showEnSeo ? '▲ Hide' : '▼ Expand'}</span>
                  </button>

                  {showEnSeo && (
                    <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #E6EAF0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ padding: '8px 10px', backgroundColor: '#FFFFFF', border: '1px solid #E6EAF0', borderRadius: '6px' }}>
                        <div style={{ fontSize: '10px', color: '#047857', fontFamily: 'monospace' }}>
                          https://studykarnataka.com/study-notes/{enSlug || 'url-slug'}
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#1E40AF', marginTop: '2px' }}>
                          {enMetaTitle || enTitle || 'English Title Placeholder'} | Study Karnataka
                        </div>
                        <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>
                          {enMetaDescription || enSummary || 'English meta description snippet...'}
                        </div>
                      </div>

                      <FormField label="English Meta Title (SEO)">
                        <Input
                          value={enMetaTitle}
                          onChange={(e) => {
                            setEnMetaTitle(e.target.value);
                            markUnsaved();
                          }}
                          placeholder="Optimized meta title for search engines"
                          style={{ height: '38px' }}
                        />
                      </FormField>

                      <FormField label="English Meta Description (SEO)">
                        <Textarea
                          value={enMetaDescription}
                          onChange={(e) => {
                            setEnMetaDescription(e.target.value);
                            markUnsaved();
                          }}
                          rows={2}
                          placeholder="Compelling description..."
                          style={{ minHeight: '50px' }}
                        />
                      </FormField>
                    </div>
                  )}
                </div>

                {/* Locale Workflow Action Button */}
                {isEditing && (
                  <div style={{ paddingTop: '10px', marginTop: '10px', borderTop: '1px solid #E6EAF0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {(enStatus === 'DRAFT' || enStatus === 'CHANGES_REQUESTED') && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleReviewSubmission('en')}
                        leftIcon={<Send size={13} />}
                      >
                        Submit English for Review
                      </Button>
                    )}
                    {enRevId && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/study-materials/${studyMaterialId}/locales/en/revisions/${enRevId}/preview`)}
                        leftIcon={<Eye size={13} />}
                      >
                        Preview English Note
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* KANNADA LOCALE CARD */}
          {(activeTab === 'kn' || isSplitView) && (
            <Card style={{ borderTop: '4px solid #047857', padding: '16px', borderRadius: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E6EAF0', paddingBottom: '10px', marginBottom: '14px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px' }}>🇮🇳</span>
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#111827' }}>ಕನ್ನಡ ಆವೃತ್ತಿಯ ಕರಡು ಪಠ್ಯ</h3>
                    <Badge label={`Rev #${knRevNumber}`} variant="neutral" />
                  </div>
                  <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                    <Badge label={knTitle ? 'Content Ready' : 'Incomplete'} variant={knTitle ? 'success' : 'neutral'} />
                    <Badge label={knMetaTitle ? 'SEO Ready' : 'Missing SEO'} variant={knMetaTitle ? 'info' : 'neutral'} />
                  </div>
                </div>
                <div>{renderStatusBadge(knStatus)}</div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <FormField label="Kannada Title (ಕನ್ನಡ ಶೀರ್ಷಿಕೆ)" required>
                  <Input
                    value={knTitle}
                    onChange={(e) => {
                      const val = e.target.value;
                      const prevAutoSlug = formatKannadaSlug(knTitle);
                      if (!knSlug || knSlug === prevAutoSlug) {
                        setKnSlug(formatKannadaSlug(val));
                      }
                      setKnTitle(val);
                      markUnsaved();
                    }}
                    placeholder="ಉದಾ. ಕರ್ನಾಟಕದ ಆಧುನಿಕ ಇತಿಹಾಸ"
                    required
                    style={{ height: '40px', fontFamily: "'Noto Sans Kannada', sans-serif" }}
                  />
                </FormField>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <FormField label="Kannada Short Title">
                    <Input
                      value={knShortTitle}
                      onChange={(e) => {
                        setKnShortTitle(e.target.value);
                        markUnsaved();
                      }}
                      placeholder="ಸಣ್ಣ ಶೀರ್ಷಿಕೆ"
                      style={{ height: '40px', fontFamily: "'Noto Sans Kannada', sans-serif" }}
                    />
                  </FormField>
                  <FormField label="Kannada URL Slug">
                    <Input
                      value={knSlug}
                      onChange={(e) => {
                        setKnSlug(formatKannadaSlug(e.target.value));
                        markUnsaved();
                      }}
                      placeholder="karnataka-adhunika-itihasa"
                      style={{ height: '40px' }}
                    />
                  </FormField>
                </div>

                <FormField label="Kannada Summary (ಸಾರಾಂಶ)">
                  <Textarea
                    value={knSummary}
                    onChange={(e) => {
                      setKnSummary(e.target.value);
                      markUnsaved();
                    }}
                    rows={2}
                    placeholder="ಕನ್ನಡದಲ್ಲಿ ಕಿರು ಸಾರಾಂಶ ಬರೆಯಿರಿ..."
                    style={{ minHeight: '60px', fontFamily: "'Noto Sans Kannada', sans-serif" }}
                  />
                </FormField>

                {/* Styled Kannada Logo Section */}
                <div style={{ marginTop: '8px', marginBottom: '8px', border: '1px solid #E6EAF0', borderRadius: '8px', overflow: 'hidden' }}>
                  <div style={{ padding: '8px 12px', backgroundColor: '#F8FAFC', borderBottom: '1px solid #E6EAF0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ImageIcon size={14} color="#047857" />
                    <h4 style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#334155', fontFamily: "'Noto Sans Kannada', sans-serif" }}>Study Material Logo (ಲೋಗೋ) (1200x800px)</h4>
                  </div>
                  <div style={{ padding: '12px', backgroundColor: '#FFFFFF' }}>
                    <div style={{ 
                      border: '1.5px dashed #CBD5E1', 
                      borderRadius: '6px', 
                      padding: '10px 16px', 
                      backgroundColor: '#F8FAFC', 
                      display: 'flex', 
                      flexDirection: 'row', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      gap: '16px',
                      position: 'relative',
                      overflow: 'hidden',
                      transition: 'all 0.2s ease',
                    }}>
                      {logoUrl ? (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '48px', height: '48px', borderRadius: '6px', overflow: 'hidden', border: '1px solid #E2E8F0', backgroundColor: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <img src={logoUrl} alt="Logo Preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                            </div>
                            <span style={{ fontSize: '13px', fontWeight: 500, color: '#334155' }}>Logo Selected</span>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setLogoUrl('');
                              markUnsaved();
                            }}
                            style={{ color: '#EF4444', borderColor: '#EF4444', padding: '4px 8px', fontSize: '11px', height: '26px' }}
                          >
                            Remove
                          </Button>
                        </>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#E0E7FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <UploadCloud size={16} color="#4F46E5" />
                          </div>
                          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <div>
                              <span style={{ fontSize: '13px', fontWeight: 600, color: '#4F46E5' }}>Click to upload</span>
                              <span style={{ fontSize: '13px', color: '#64748B' }}> or drag and drop</span>
                            </div>
                            <span style={{ fontSize: '11px', color: '#94A3B8' }}>(1200x800 pixels exactly, up to 5MB)</span>
                          </div>
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
                        style={{ 
                          position: 'absolute', 
                          top: 0, left: 0, width: '100%', height: '100%', 
                          opacity: 0, cursor: 'pointer',
                          display: logoUrl ? 'none' : 'block'
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Tiptap Structured Editor */}
                <FormField label="Kannada Structured Content Editor">
                  <TiptapEditor
                    content={knContentJson}
                    onChange={(json, plainText) => {
                      setKnContentJson(json);
                      setKnPlainText(plainText);
                      markUnsaved();
                    }}
                    language="kn"
                    placeholder="ಕನ್ನಡ ಅಧ್ಯಯನ ವಿಷಯವನ್ನು ಇಲ್ಲಿ ಬರೆಯಲು ಪ್ರಾರಂಭಿಸಿ…"
                    autosaveStatus={autosaveStatus}
                    lastSavedAt={lastSavedAt}
                  />
                </FormField>

                {/* Compact Kannada SEO Accordion */}
                <div style={{ border: '1px solid #E6EAF0', borderRadius: '8px', padding: '10px 14px', backgroundColor: '#F8FAFC', marginTop: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setShowKnSeo(!showKnSeo)}
                    style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', fontWeight: 600, color: '#334155', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Search size={14} color="#047857" />
                      Kannada SEO & Search Preview Settings
                    </span>
                    <span>{showKnSeo ? '▲ Hide' : '▼ Expand'}</span>
                  </button>

                  {showKnSeo && (
                    <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #E6EAF0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ padding: '8px 10px', backgroundColor: '#FFFFFF', border: '1px solid #E6EAF0', borderRadius: '6px' }}>
                        <div style={{ fontSize: '10px', color: '#047857', fontFamily: 'monospace' }}>
                          https://studykarnataka.com/kn/study-notes/{knSlug || 'url-slug'}
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#1E40AF', marginTop: '2px', fontFamily: "'Noto Sans Kannada', sans-serif" }}>
                          {knMetaTitle || knTitle || 'ಕನ್ನಡ ಶೀರ್ಷಿಕೆ'} | Study Karnataka
                        </div>
                        <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px', fontFamily: "'Noto Sans Kannada', sans-serif" }}>
                          {knMetaDescription || knSummary || 'ಗೂಗಲ್ ಹುಡುಕಾಟದಲ್ಲಿ ಕಾಣಿಸಿಕೊಳ್ಳುವ ವಿವರಣೆ...'}
                        </div>
                      </div>

                      <FormField label="Kannada Meta Title (SEO)">
                        <Input
                          value={knMetaTitle}
                          onChange={(e) => {
                            setKnMetaTitle(e.target.value);
                            markUnsaved();
                          }}
                          placeholder="ಹುಡುಕಾಟಕ್ಕಾಗಿ ಶೀರ್ಷಿಕೆ"
                          style={{ height: '38px', fontFamily: "'Noto Sans Kannada', sans-serif" }}
                        />
                      </FormField>

                      <FormField label="Kannada Meta Description (SEO)">
                        <Textarea
                          value={knMetaDescription}
                          onChange={(e) => {
                            setKnMetaDescription(e.target.value);
                            markUnsaved();
                          }}
                          rows={2}
                          placeholder="ವಿವರವಾದ ಸಾರಾಂಶ ಬರೆಯಿರಿ..."
                          style={{ minHeight: '50px', fontFamily: "'Noto Sans Kannada', sans-serif" }}
                        />
                      </FormField>
                    </div>
                  )}
                </div>

                {/* Locale Workflow Action Button */}
                {isEditing && (
                  <div style={{ paddingTop: '10px', marginTop: '10px', borderTop: '1px solid #E6EAF0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {(knStatus === 'DRAFT' || knStatus === 'CHANGES_REQUESTED') && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleReviewSubmission('kn')}
                        leftIcon={<Send size={13} />}
                      >
                        Submit Kannada for Review
                      </Button>
                    )}
                    {knRevId && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/study-materials/${studyMaterialId}/locales/kn/revisions/${knRevId}/preview`)}
                        leftIcon={<Eye size={13} />}
                      >
                        Preview Kannada Note
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>

        {/* Compact Academic Mapping Card (Collapsible) */}
        <Card style={{ padding: '14px 18px', borderRadius: '12px' }}>
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
                  icon={<Search size={16} color="#64748B" />}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                <FormField label="Category & Subcategory">
                  <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '8px', backgroundColor: '#FFFFFF' }}>
                    {categories.map((cat) => {
                      const q = taxonomySearchQuery.trim().toLowerCase();
                      const subList = allSubcategoriesMap[cat.id] || [];
                      
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
                                      onChange={(e) => handleToggleSubcategory(cat.id, sub.id, e.target.checked)}
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
                      <div style={{ padding: '8px', fontSize: '13px', color: '#64748B' }}>Loading categories...</div>
                    )}
                  </div>
                </FormField>
              </div>
              {selectedTaxonomies.length > 0 && (
                <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedTaxonomies([]);
                      markUnsaved();
                    }}
                  >
                    Clear Mapping
                  </Button>
                </div>
              )}
            </div>
          )}
        </Card>



        {/* Compact Access & Monetization Card */}
        <Card style={{ borderTop: '4px solid #8B5CF6', padding: '14px 18px', borderRadius: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E6EAF0', paddingBottom: '10px', marginBottom: '12px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Coins size={18} color="#8B5CF6" />
                Access & Monetization Configuration
              </h3>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {isEditing && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleOpenAccessPreviewSim}
                  leftIcon={<Eye size={13} color="#8B5CF6" />}
                >
                  Preview Access
                </Button>
              )}
              <Badge
                label={accessType === 'FREE' ? 'Free' : accessType === 'PAID' ? 'Paid' : 'Freemium'}
                variant={accessType === 'FREE' ? 'success' : accessType === 'PAID' ? 'error' : 'warning'}
              />
              <button
                type="button"
                onClick={() => setIsAccessExpanded(!isAccessExpanded)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', padding: '4px' }}
              >
                {isAccessExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            </div>
          </div>

          {isAccessExpanded && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Selectable Commercial Access Option Cards in Compact Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                {/* COMPLETELY FREE */}
                <div
                  onClick={() => {
                    setAccessType('FREE');
                    markUnsaved();
                  }}
                  style={{
                    border: accessType === 'FREE' ? '2px solid #10B981' : '1px solid #E2E8F0',
                    backgroundColor: accessType === 'FREE' ? '#ECFDF5' : '#FFFFFF',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: accessType === 'FREE' ? '#10B981' : '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Globe size={12} color={accessType === 'FREE' ? '#FFFFFF' : '#64748B'} />
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '13px', color: '#065F46' }}>Completely Free</div>
                  </div>
                </div>

                {/* COMPLETELY PAID */}
                <div
                  onClick={() => {
                    setAccessType('PAID');
                    markUnsaved();
                  }}
                  style={{
                    border: accessType === 'PAID' ? '2px solid #EF2323' : '1px solid #E2E8F0',
                    backgroundColor: accessType === 'PAID' ? '#FEF2F2' : '#FFFFFF',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: accessType === 'PAID' ? '#EF2323' : '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Lock size={12} color={accessType === 'PAID' ? '#FFFFFF' : '#64748B'} />
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '13px', color: '#991B1B' }}>Completely Paid</div>
                  </div>
                </div>

                {/* FREEMIUM */}
                <div
                  onClick={() => {
                    setAccessType('FREEMIUM');
                    markUnsaved();
                  }}
                  style={{
                    border: accessType === 'FREEMIUM' ? '2px solid #F59E0B' : '1px solid #E2E8F0',
                    backgroundColor: accessType === 'FREEMIUM' ? '#FFFBEB' : '#FFFFFF',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: accessType === 'FREEMIUM' ? '#F59E0B' : '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Sliders size={12} color={accessType === 'FREEMIUM' ? '#FFFFFF' : '#64748B'} />
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '13px', color: '#92400E' }}>Freemium Preview</div>
                  </div>
                </div>
              </div>

              {/* READ-ONLY ENTITLEMENT METADATA */}
              {(accessType === 'PAID' || accessType === 'FREEMIUM') && (
                <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShieldCheck size={16} color="#8B5CF6" />
                    <span style={{ fontSize: '12px', color: '#334155' }}>
                      Entitlement Key: <code style={{ fontFamily: 'monospace', color: '#0F172A', fontWeight: 600 }}>{entitlementKey || `STUDY_MATERIAL:${studyMaterialId || 'AUTO'}:FULL`}</code>
                    </span>
                  </div>
                  <Badge label="Server Managed" variant="neutral" />
                </div>
              )}

              {/* FREEMIUM PREVIEW BOUNDARY CONFIGURATION PANELS */}
              {accessType === 'FREEMIUM' && (
                <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? '1fr 1fr' : '1fr', gap: '12px' }}>
                  {/* ENGLISH PREVIEW BOUNDARY PANEL */}
                  <div style={{ border: '1px solid #DCE6EE', borderRadius: '8px', padding: '12px', backgroundColor: '#F8FAFC' }}>
                    <div style={{ fontWeight: 700, fontSize: '13px', color: '#084B7A', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '10px', background: '#EAF3F9', color: '#084B7A', padding: '2px 5px', borderRadius: '4px', fontWeight: 700 }}>EN</span> English Preview Boundary
                    </div>

                    <FormField label="Free Preview Ends After Section">
                      <Select
                        value={previewEndNodeIdEn}
                        onChange={(e) => {
                          setPreviewEndNodeIdEn(e.target.value);
                          markUnsaved();
                        }}
                        options={[
                          { value: '', label: 'Select Boundary Node...' },
                          ...enOutline.map((item: any) => ({
                            value: item.nodeId,
                            label: `${item.label} (${item.location})`,
                          })),
                        ]}
                        style={{ height: '38px' }}
                      />
                    </FormField>

                    {/* WORD STATISTICS */}
                    <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#FFFFFF', borderRadius: '6px', border: '1px solid #DCE6EE', display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#10B981' }}>{enStats.freeWordCount}</div>
                        <div style={{ fontSize: '10px', color: '#64748B' }}>Free Words</div>
                      </div>
                      <div style={{ borderLeft: '1px solid #E2E8F0' }} />
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#EF2323' }}>{enStats.lockedWordCount}</div>
                        <div style={{ fontSize: '10px', color: '#64748B' }}>Locked Words</div>
                      </div>
                      <div style={{ borderLeft: '1px solid #E2E8F0' }} />
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#084B7A' }}>{enStats.freePercentage}%</div>
                        <div style={{ fontSize: '10px', color: '#64748B' }}>Free Ratio</div>
                      </div>
                    </div>
                  </div>

                  {/* KANNADA PREVIEW BOUNDARY PANEL */}
                  <div style={{ border: '1px solid #DCE6EE', borderRadius: '8px', padding: '12px', backgroundColor: '#F8FAFC' }}>
                    <div style={{ fontWeight: 700, fontSize: '13px', color: '#084B7A', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '10px', background: '#EAF3F9', color: '#084B7A', padding: '2px 5px', borderRadius: '4px', fontWeight: 700 }}>KN</span> ಕನ್ನಡ ಉಚಿತ ಮುನ್ನೋಟದ ಗಡಿ
                    </div>

                    <FormField label="ಉಚಿತ ಮುನ್ನೋಟ ಕೊನೆಗೊಳ್ಳುವ ವಿಭಾಗ">
                      <Select
                        value={previewEndNodeIdKn}
                        onChange={(e) => {
                          setPreviewEndNodeIdKn(e.target.value);
                          markUnsaved();
                        }}
                        options={[
                          { value: '', label: 'ವಿಭಾಗವನ್ನು ಆಯ್ಕೆಮಾಡಿ...' },
                          ...knOutline.map((item: any) => ({
                            value: item.nodeId,
                            label: `${item.label} (${item.location})`,
                          })),
                        ]}
                        style={{ height: '38px' }}
                      />
                    </FormField>

                    {/* WORD STATISTICS */}
                    <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#FFFFFF', borderRadius: '6px', border: '1px solid #DCE6EE', display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#10B981' }}>{knStats.freeWordCount}</div>
                        <div style={{ fontSize: '10px', color: '#64748B' }}>Free Words</div>
                      </div>
                      <div style={{ borderLeft: '1px solid #E2E8F0' }} />
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#EF2323' }}>{knStats.lockedWordCount}</div>
                        <div style={{ fontSize: '10px', color: '#64748B' }}>Locked Words</div>
                      </div>
                      <div style={{ borderLeft: '1px solid #E2E8F0' }} />
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#059669' }}>{knStats.freePercentage}%</div>
                        <div style={{ fontSize: '10px', color: '#64748B' }}>Free Ratio</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* PAYWALL MESSAGING INPUTS FOR PAID AND FREEMIUM */}
              {(accessType === 'PAID' || accessType === 'FREEMIUM') && (
                <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', padding: '12px', backgroundColor: '#F8FAFC' }}>
                  <div style={{ fontWeight: 700, fontSize: '12px', color: '#334155', marginBottom: '8px' }}>
                    Localized Paywall Messaging
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? '1fr 1fr' : '1fr', gap: '10px' }}>
                    <div>
                      <FormField label="English Paywall Title">
                        <Input
                          value={paywallTitleEn}
                          onChange={(e) => {
                            setPaywallTitleEn(e.target.value);
                            markUnsaved();
                          }}
                          placeholder="Unlock Full English Content"
                          style={{ height: '38px' }}
                        />
                      </FormField>
                      <FormField label="English Paywall Message">
                        <Textarea
                          value={paywallMessageEn}
                          onChange={(e) => {
                            setPaywallMessageEn(e.target.value);
                            markUnsaved();
                          }}
                          rows={2}
                          placeholder="Access complete English study material..."
                          style={{ minHeight: '50px' }}
                        />
                      </FormField>
                    </div>

                    <div>
                      <FormField label="Kannada Paywall Title">
                        <Input
                          value={paywallTitleKn}
                          onChange={(e) => {
                            setPaywallTitleKn(e.target.value);
                            markUnsaved();
                          }}
                          placeholder="ಸಂಪೂರ್ಣ ಕನ್ನಡ ವಿಷಯವನ್ನು ವೀಕ್ಷಿಸಿ"
                          style={{ height: '38px', fontFamily: "'Noto Sans Kannada', sans-serif" }}
                        />
                      </FormField>
                      <FormField label="Kannada Paywall Message">
                        <Textarea
                          value={paywallMessageKn}
                          onChange={(e) => {
                            setPaywallMessageKn(e.target.value);
                            markUnsaved();
                          }}
                          rows={2}
                          placeholder="ಸಂಪೂರ್ಣ ವಿಷಯವನ್ನು ಓದಲು ಪ್ರವೇಶ ಪಡೆಯಿರಿ..."
                          style={{ minHeight: '50px', fontFamily: "'Noto Sans Kannada', sans-serif" }}
                        />
                      </FormField>
                    </div>
                  </div>
                </div>
              )}

              {/* FUTURE LEARNING SAMPLES SETTINGS */}
              <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', padding: '12px', backgroundColor: '#FAFAFA' }}>
                <div style={{ fontWeight: 700, fontSize: '12px', color: '#334155', marginBottom: '8px' }}>
                  Future Learning Sample Limits
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                  <FormField label="Free MCQ Samples (0–50)">
                    <Input
                      type="number"
                      min={0}
                      max={50}
                      value={freeMcqSampleCount}
                      onChange={(e) => {
                        setFreeMcqSampleCount(Math.min(50, Math.max(0, parseInt(e.target.value) || 0)));
                        markUnsaved();
                      }}
                      style={{ height: '38px' }}
                    />
                  </FormField>

                  <FormField label="Free Quick Revision Cards (0–50)">
                    <Input
                      type="number"
                      min={0}
                      max={50}
                      value={freeQuickRevisionSampleCount}
                      onChange={(e) => {
                        setFreeQuickRevisionSampleCount(Math.min(50, Math.max(0, parseInt(e.target.value) || 0)));
                        markUnsaved();
                      }}
                      style={{ height: '38px' }}
                    />
                  </FormField>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Compact Related Practice & MCQs Card */}
        <Card style={{ backgroundColor: '#FAF9FF', border: '1px solid #E2E8F0', padding: '14px 18px', borderRadius: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#1E1B4B', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <HelpCircle size={16} color="#6366F1" />
                Related Practice & MCQs
              </h3>
            </div>
            <Badge label="MCQ Module Deferred" variant="neutral" />
          </div>
        </Card>

        {/* Sticky Bottom Action Bar */}
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40, backgroundColor: '#FFFFFF', borderTop: '1px solid #E6EAF0', padding: '10px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 -4px 12px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: '12px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span>Material ID: <strong style={{ color: '#111827', fontFamily: 'monospace' }}>{code || 'Auto-generated'}</strong></span>
            <span>•</span>
            <span>Access: <strong style={{ color: accessType === 'FREE' ? '#059669' : accessType === 'PAID' ? '#DC2626' : '#D97706' }}>{accessType}</strong></span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Button type="button" variant="outline" size="sm" onClick={() => navigate('/study-materials')}>
              Cancel
            </Button>

            <Button type="submit" size="sm" isLoading={isLoading} leftIcon={<Save size={14} />}>
              {isEditing ? 'Save Revision' : 'Create Material Draft'}
            </Button>
          </div>
        </div>
      </form>

      {/* ACCESS PREVIEW SIMULATOR MODAL */}
      {showAccessPreviewModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', padding: '20px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E2E8F0', paddingBottom: '12px', marginBottom: '14px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Eye size={18} color="#8B5CF6" />
                  Access Preview Simulator
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAccessPreviewModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', fontSize: '16px' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <FormField label="Simulate User Role / State">
                <Select
                  value={previewModeSim}
                  onChange={(e) => {
                    setPreviewModeSim(e.target.value as any);
                    fetchPreviewSim(e.target.value, previewLangSim);
                  }}
                  options={[
                    { value: 'ANONYMOUS_VISITOR', label: 'Anonymous Visitor (Unauthenticated)' },
                    { value: 'FREE_USER', label: 'Registered Free User (No Entitlement)' },
                    { value: 'ENTITLED_USER', label: 'Entitled User (Active Subscription)' },
                    { value: 'FULL_ADMIN_PREVIEW', label: 'Super Admin Full Content Preview' },
                  ]}
                  style={{ height: '38px' }}
                />
              </FormField>

              <FormField label="Target Language">
                <Select
                  value={previewLangSim}
                  onChange={(e) => {
                    const l = e.target.value as 'en' | 'kn';
                    setPreviewLangSim(l);
                    fetchPreviewSim(previewModeSim, l);
                  }}
                  options={[
                    { value: 'en', label: '🇬🇧 English' },
                    { value: 'kn', label: '🇮🇳 Kannada' },
                  ]}
                  style={{ height: '38px' }}
                />
              </FormField>
            </div>

            {/* SIMULATED API RESPONSE PREVIEW */}
            <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', padding: '14px', backgroundColor: '#F8FAFC' }}>
              {isPreviewSimLoading ? (
                <LoadingSpinner />
              ) : previewSimResult ? (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <Badge label={`Type: ${previewSimResult.accessResult?.accessType}`} variant="info" />
                      <Badge label={`State: ${previewSimResult.accessResult?.accessState}`} variant={previewSimResult.accessResult?.accessState === 'FULL_ACCESS' || previewSimResult.accessResult?.accessState === 'FREE_ACCESS' ? 'success' : 'error'} />
                    </div>
                    <span style={{ fontSize: '11px', color: '#64748B' }}>
                      Entitled: <strong>{previewSimResult.accessResult?.entitled ? 'YES' : 'NO'}</strong>
                    </span>
                  </div>

                  {previewSimResult.accessResult?.paywall && (
                    <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '6px', padding: '10px', marginBottom: '10px', color: '#991B1B' }}>
                      <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '2px' }}>
                        🔒 {previewSimResult.accessResult.paywall.title}
                      </div>
                      <div style={{ fontSize: '11px' }}>{previewSimResult.accessResult.paywall.message}</div>
                    </div>
                  )}

                  <pre style={{ backgroundColor: '#0F172A', color: '#38BDF8', padding: '10px', borderRadius: '6px', fontSize: '11px', overflowX: 'auto', maxHeight: '180px' }}>
                    {JSON.stringify(previewSimResult.accessResult?.freeContentJson || previewSimResult.accessResult?.fullContentJson || { note: 'No protected body content returned.' }, null, 2)}
                  </pre>
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: '#64748B', fontSize: '12px', padding: '16px' }}>
                  Click below to load simulated access response.
                </div>
              )}
            </div>

            <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'flex-end' }}>
              <Button type="button" size="sm" onClick={() => setShowAccessPreviewModal(false)}>
                Close Simulator
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudyMaterialFormPage;
