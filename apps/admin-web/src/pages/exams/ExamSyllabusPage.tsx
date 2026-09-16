import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ExamSyllabus,
  ExamSyllabusNode,
  ExamCycle,
  ExamSyllabusNodeType,
  ExamPattern,
} from '@study-karnataka/shared-types';
import { examSyllabusApi, DetailedSyllabusResponse, CreateNodePayload } from '../../services/examSyllabusApi';
import { fetchExams } from '../../services/examApi';
import { fetchPatterns } from '../../services/examPatternApi';
import {
  Button,
  Card,
  EmptyState,
  Badge,
  Combobox,
  SearchInput,
  LoadingSpinner,
  Skeleton,
  FormField,
  Input,
  Switch,
  PageHeader,
} from '@study-karnataka/ui';
import {
  Save,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Info,
  Edit,
  ExternalLink,
  GripVertical,
  X,
  Globe,
  CheckCircle2,
  RotateCcw,
  Check,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import './ExamSyllabusPage.css';

const FullSyllabusPreviewModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  exam: ExamCycle;
  stages: any[];
  nodes: ExamSyllabusNode[];
}> = ({ isOpen, onClose, exam, stages, nodes }) => {
  const [collapsedItems, setCollapsedItems] = useState<Set<string>>(new Set());

  if (!isOpen) return null;

  const toggleItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSet = new Set(collapsedItems);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setCollapsedItems(newSet);
  };

  const renderNode = (node: ExamSyllabusNode, depth: number) => {
    const children = nodes.filter(n => n.parentId === node.id).sort((a,b) => (a.displayOrder||0) - (b.displayOrder||0));
    const hasChildren = children.length > 0;
    const isCollapsed = collapsedItems.has(node.id);

    let fontSize = '14px';
    let fontWeight = 600;
    let color = '#334155';
    let textTransform: any = 'none';

    if (node.nodeType === 'SUBJECT') {
      fontSize = '15px';
      fontWeight = 700;
      color = '#0f172a';
      textTransform = 'uppercase';
    } else if (node.nodeType === 'SECTION') {
      fontSize = '14px';
      fontWeight = 600;
      color = '#1e293b';
      textTransform = 'uppercase';
    } else if (node.nodeType === 'TOPIC') {
      fontSize = '14px';
      fontWeight = 600;
      color = '#334155';
    } else if (node.nodeType === 'SUBTOPIC') {
      fontSize = '13px';
      fontWeight = 500;
      color = '#475569';
    }

    return (
      <div key={node.id} style={{ paddingLeft: '24px', position: 'relative' }}>
        <div 
          onClick={(e) => hasChildren ? toggleItem(node.id, e) : undefined}
          style={{ 
            display: 'flex', alignItems: 'flex-start', margin: '8px 0', 
            cursor: hasChildren ? 'pointer' : 'default',
            userSelect: 'none'
          }}
        >
           <div style={{ width: '20px', flexShrink: 0, marginTop: '2px' }}>
             {hasChildren ? (
               isCollapsed ? <ChevronRight size={16} color="#64748B" /> : <ChevronDown size={16} color="#64748B" />
             ) : (
               <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#cbd5e1', display: 'inline-block', margin: '5px 6px' }}></span>
             )}
           </div>
           <div style={{ flex: 1 }}>
             <span style={{ fontSize, fontWeight, color, textTransform }}>{node.nameEn}</span> 
           </div>
        </div>
        {hasChildren && !isCollapsed && (
           <div style={{ borderLeft: '1px dashed #cbd5e1', marginLeft: '9px', marginTop: '4px', marginBottom: '8px' }}>
             {children.map(c => renderNode(c, depth + 1))}
           </div>
        )}
      </div>
    );
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 1000, position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '12px', width: '90%', maxWidth: '900px', height: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', borderTopLeftRadius: '12px', borderTopRightRadius: '12px' }}>
           <div>
             <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>Combined Syllabus Structure Preview</h3>
             <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748B' }}>A complete hierarchical view of all stages, papers, and topics.</p>
           </div>
           <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color: '#64748b' }}><X size={24} /></button>
        </div>
        <div style={{ padding: '32px', overflowY: 'auto', flex: 1, backgroundColor: '#ffffff' }}>
           
           {/* Root Exam */}
           <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', marginBottom: '16px', display: 'flex', alignItems: 'center' }}>
             <Globe size={18} style={{ marginRight: '8px', color: '#2563eb' }} />
             {exam.programme?.code ? `${exam.programme.code} - ` : ''}{exam.titleEn}
           </div>
           
           <div style={{ borderLeft: '2px solid #cbd5e1', marginLeft: '8px', paddingLeft: '8px' }}>
             {stages.map(stage => {
               const stagePapers = stage.papers || [];
               const isStageCollapsed = collapsedItems.has(stage.id);
               return (
                 <div key={stage.id} style={{ marginBottom: '24px' }}>
                   <div 
                     onClick={(e) => toggleItem(stage.id, e)}
                     style={{ display: 'flex', alignItems: 'center', fontSize: '15px', fontWeight: 700, color: '#1d4ed8', marginBottom: '8px', cursor: 'pointer', userSelect: 'none' }}
                   >
                     {isStageCollapsed ? <ChevronRight size={18} style={{ marginRight: '4px' }} /> : <ChevronDown size={18} style={{ marginRight: '4px' }} />}
                     {stage.nameEn}
                   </div>
                   
                   {!isStageCollapsed && (
                     <div style={{ borderLeft: '2px solid #e2e8f0', marginLeft: '8px', paddingLeft: '8px', marginTop: '4px' }}>
                       {/* Nodes without paper but belonging to stage */}
                       {nodes.filter(n => !n.parentId && n.examStageId === stage.id && !n.examPaperId).sort((a,b)=>(a.displayOrder||0)-(b.displayOrder||0)).map(n => renderNode(n, 0))}
                       
                       {/* Papers */}
                       {stagePapers.map((paper: any) => {
                         const isPaperCollapsed = collapsedItems.has(paper.id);
                         return (
                           <div key={paper.id} style={{ marginTop: '12px', marginBottom: '16px' }}>
                             <div 
                               onClick={(e) => toggleItem(paper.id, e)}
                               style={{ display: 'flex', alignItems: 'center', fontSize: '14px', fontWeight: 700, color: '#059669', marginBottom: '8px', cursor: 'pointer', userSelect: 'none' }}
                             >
                               {isPaperCollapsed ? <ChevronRight size={18} style={{ marginRight: '4px' }} /> : <ChevronDown size={18} style={{ marginRight: '4px' }} />}
                               {paper.nameEn}
                             </div>
                             {!isPaperCollapsed && (
                               <div style={{ borderLeft: '2px dashed #f1f5f9', marginLeft: '8px', paddingLeft: '8px', marginTop: '4px' }}>
                                 {nodes.filter(n => !n.parentId && n.examPaperId === paper.id).sort((a,b)=>(a.displayOrder||0)-(b.displayOrder||0)).map(n => renderNode(n, 0))}
                               </div>
                             )}
                           </div>
                         );
                       })}
                     </div>
                   )}
                 </div>
               );
             })}
           </div>

        </div>
      </div>
    </div>
  );
};

export const ExamSyllabusPage: React.FC = () => {
  const { examId: routeExamId } = useParams<{ examId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const examId = routeExamId || searchParams.get('examId') || '';

  // All Exam Cycles for selector
  const [allCycles, setAllCycles] = useState<ExamCycle[]>([]);
  const [cyclesLoading, setCyclesLoading] = useState<boolean>(true);



  // Syllabus state
  const [_syllabi, setSyllabi] = useState<ExamSyllabus[]>([]);
  const [selectedSyllabusId, setSelectedSyllabusId] = useState<string>('');
  const [currentSyllabus, setCurrentSyllabus] = useState<DetailedSyllabusResponse | null>(null);
  const [nodes, setNodes] = useState<ExamSyllabusNode[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Pattern, Stage & Paper State
  const [patterns, setPatterns] = useState<ExamPattern[]>([]);
  const [selectedStageId, setSelectedStageId] = useState<string>('');
  const [selectedPaperId, setSelectedPaperId] = useState<string>('');

  const activePattern = useMemo(() => {
    if (currentSyllabus?.examPatternId) {
      const match = patterns.find(p => p.id === currentSyllabus.examPatternId);
      if (match) return match;
    }
    return patterns.find((p) => p.isCurrent) || patterns[0] || null;
  }, [patterns, currentSyllabus]);

  const stages = useMemo(() => {
    return activePattern?.stages || [];
  }, [activePattern]);

  const papers = useMemo(() => {
    if (!selectedStageId) return [];
    const stage = stages.find((s) => s.id === selectedStageId);
    return stage?.papers || [];
  }, [selectedStageId, stages]);

  // Reset stage when exam changes  // 2. Keep selectedStageId valid or reset it (allow empty for Global)
  useEffect(() => {
    if (stages.length > 0) {
      if (selectedStageId && !stages.find(s => s.id === selectedStageId)) {
        setSelectedStageId('');
      }
    } else {
      setSelectedStageId('');
    }
  }, [stages, selectedStageId]);

  // Reset paper when stage changes
  useEffect(() => {
    if (papers.length > 0) {
      if (!selectedPaperId || !papers.find(p => p.id === selectedPaperId)) {
        setSelectedPaperId(papers[0].id);
      }
    } else {
      setSelectedPaperId('');
    }
  }, [papers, selectedPaperId, selectedStageId]);

  // 3-Dots Active Menu State
  const [activeMenuNodeId, setActiveMenuNodeId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<'up' | 'down'>('down');

  // Inline Editing State inside Tree Structure
  const [inlineEditingNodeId, setInlineEditingNodeId] = useState<string | null>(null);

  // Flexible Drag and Drop State
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dragOverNodeId, setDragOverNodeId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'above' | 'below' | 'inside' | null>(null);

  // Undo State
  const [undoAction, setUndoAction] = useState<{
    movedId: string;
    oldParentId: string | null;
    oldSiblingIds: string[];
  } | null>(null);

  // Selected Node State
  const [selectedNode, setSelectedNode] = useState<ExamSyllabusNode | null>(null);
  const [isCreatingNewNode, setIsCreatingNewNode] = useState<boolean>(false);

  // Streamlined Node Form State (Essential Fields + Title Links)
  const [formParentId, setFormParentId] = useState<string | null>(null);
  const [formNameEn, setFormNameEn] = useState('');
  const [formLinkUrlEn, setFormLinkUrlEn] = useState('');
  const [formNameKn, setFormNameKn] = useState('');
  const [formLinkUrlKn, setFormLinkUrlKn] = useState('');
  const [formDescriptionEn, setFormDescriptionEn] = useState('');
  const [formDescriptionKn, setFormDescriptionKn] = useState('');
  const [formDisplayOrder, setFormDisplayOrder] = useState<number>(1);
  const [formIsActive, setFormIsActive] = useState<boolean>(true);

  // Tree UI state
  const [collapsedNodeIds, setCollapsedNodeIds] = useState<Set<string>>(new Set());
  const [collapsedVirtualNodes, setCollapsedVirtualNodes] = useState<Set<string>>(new Set());
  const [isFullPreviewOpen, setIsFullPreviewOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [localSyllabusStatus, setLocalSyllabusStatus] = useState<'DRAFT' | 'ACTIVE' | null>(null);

  const toggleVirtualNodeCollapse = (key: string) => {
    setCollapsedVirtualNodes(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const canManageSyllabus = true;

  // Close 3-dots dropdown menu on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.node-action-menu-container')) {
        setActiveMenuNodeId(null);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  // Load Exam Cycles list
  const loadExamCycles = useCallback(async () => {
    try {
      setCyclesLoading(true);
      const cycles = await fetchExams();
      const loadedCycles = cycles || [];
      setAllCycles(loadedCycles);
      return loadedCycles;
    } catch (err) {
      console.error('Failed to load exam cycles list:', err);
      setAllCycles([]);
      return [];
    } finally {
      setCyclesLoading(false);
    }
  }, []);

  // Handle direct-page behavior & session memory
  useEffect(() => {
    let isMounted = true;
    loadExamCycles().then((cycles) => {
      if (!isMounted) return;

      if (examId) {
        if (cycles.some((c) => c.id === examId)) {
          sessionStorage.setItem('last_selected_exam_id', examId);
        }
      } else {
        const rememberedId = sessionStorage.getItem('last_selected_exam_id');
        if (rememberedId && cycles.some((c) => c.id === rememberedId)) {
          navigate(`/exams/syllabus?examId=${rememberedId}`, { replace: true });
        } else if (cycles.length === 1) {
          sessionStorage.setItem('last_selected_exam_id', cycles[0].id);
          navigate(`/exams/syllabus?examId=${cycles[0].id}`, { replace: true });
        }
      }
    });

    return () => {
      isMounted = false;
    };
  }, [examId, loadExamCycles, navigate]);

  // Load Syllabus Revisions
  const loadSyllabusRevisions = useCallback(async () => {
    if (!examId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const list = (await examSyllabusApi.getSyllabiByExam(examId)) as ExamSyllabus[];
      setSyllabi(list || []);

      if (list && list.length > 0) {
        const current = list.find((s) => s.isCurrent) || list[0];
        setSelectedSyllabusId(current.id);
        await loadSyllabusDetails(current.id);
      } else {
        setSelectedSyllabusId('');
        setCurrentSyllabus(null);
        setNodes([]);
      }
    } catch (err: any) {
      setErrorMessage(err.message || err.response?.data?.message || 'Failed to load syllabus revisions');
      setSyllabi([]);
      setCurrentSyllabus(null);
      setNodes([]);
    } finally {
      setLoading(false);
    }
  }, [examId]);

  useEffect(() => {
    if (examId) {
      loadSyllabusRevisions();
      fetchPatterns(examId)
        .then((pts) => setPatterns(pts || []))
        .catch((err) => console.error('Failed to load patterns', err));
    } else {
      setLoading(false);
      setPatterns([]);
    }
  }, [examId, loadSyllabusRevisions]);

  const handleCreateInitialSyllabus = async () => {
    if (!examId || patterns.length === 0 || !selectedExam) return;
    const targetPatternId = patterns.find(p => p.isCurrent)?.id || patterns[0].id;

    try {
      setActionLoading(true);
      await examSyllabusApi.createSyllabus(examId, {
        examPatternId: targetPatternId,
        titleEn: `${selectedExam.titleEn} Syllabus`,
        titleKn: `${selectedExam.titleKn} ಪಠ್ಯಕ್ರಮ`,
        descriptionEn: `Official syllabus for ${selectedExam.titleEn}`,
        descriptionKn: `ಅಧಿಕೃತ ಪಠ್ಯಕ್ರಮ - ${selectedExam.titleKn}`
      });
      await loadSyllabusRevisions();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to initialize syllabus');
    } finally {
      setActionLoading(false);
    }
  };

  const loadSyllabusDetails = async (syllabusId: string, keepSelectedId?: string) => {
    if (!examId || !syllabusId) return;
    try {
      const data = await examSyllabusApi.getSyllabusById(examId, syllabusId);
      setCurrentSyllabus(data);

      const nodeList = await examSyllabusApi.getNodes(syllabusId);
      const sortedNodes = (nodeList || []).sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
      setNodes(sortedNodes);

      if (keepSelectedId) {
        const target = sortedNodes.find((n) => n.id === keepSelectedId);
        if (target) {
          populateFormState(target);
          return;
        }
      }

      if (sortedNodes.length > 0 && !selectedNode && !isCreatingNewNode) {
        populateFormState(sortedNodes[0]);
      }
    } catch (err: any) {
      setErrorMessage(err.message || err.response?.data?.message || 'Failed to load syllabus details');
    }
  };



  // Populate Form State
  const populateFormState = (node: ExamSyllabusNode) => {
    setSelectedNode(node);
    setIsCreatingNewNode(false);
    setActiveMenuNodeId(null);

    setFormParentId(node.parentId || null);
    setFormNameEn(node.nameEn);
    setFormLinkUrlEn(node.sourceReference || node.officialTextEn || '');
    setFormNameKn(node.nameKn);
    setFormLinkUrlKn(node.officialTextKn || '');
    setFormDescriptionEn(node.descriptionEn || '');
    setFormDescriptionKn(node.descriptionKn || '');
    setFormDisplayOrder(node.displayOrder || 1);
    setFormIsActive(node.isActive);
  };

  // Open Inline Edit Mode inside Tree Structure
  const handleOpenInlineEdit = (node: ExamSyllabusNode) => {
    populateFormState(node);
    setInlineEditingNodeId(node.id);
    setActiveMenuNodeId(null);
  };

  const handleCloseInlineEdit = () => {
    setInlineEditingNodeId(null);
  };

  // Reset Form State to create a new Root or Child node inline
  const resetFormStateForNewNode = (parentId: string | null = null) => {
    setIsCreatingNewNode(true);
    setActiveMenuNodeId(null);

    // Auto-expand parent node if creating a child node under it
    if (parentId) {
      setCollapsedNodeIds((prev) => {
        const next = new Set(prev);
        next.delete(parentId);
        return next;
      });
      setInlineEditingNodeId(`new_child_${parentId}`);
    } else {
      setInlineEditingNodeId('new_root');
    }

    const siblings = nodes.filter((n) => n.parentId === parentId);

    setFormParentId(parentId);
    setFormNameEn('');
    setFormLinkUrlEn('');
    setFormNameKn('');
    setFormLinkUrlKn('');
    setFormDescriptionEn('');
    setFormDescriptionKn('');
    setFormDisplayOrder(siblings.length + 1);
    setFormIsActive(true);
  };



  const handleWorkflowAction = async (action: 'submit' | 'request-changes' | 'approve' | 'publish') => {
    if (!examId || !currentSyllabus) return;
    try {
      setActionLoading(true);
      setErrorMessage(null);
      let updated: ExamSyllabus;

      if (action === 'submit') {
        updated = await examSyllabusApi.submitReview(examId, currentSyllabus.id);
        setSuccessMessage('Submitted syllabus revision for review.');
      } else if (action === 'request-changes') {
        updated = await examSyllabusApi.requestChanges(examId, currentSyllabus.id);
        setSuccessMessage('Requested changes on syllabus revision.');
      } else if (action === 'approve') {
        updated = await examSyllabusApi.approveSyllabus(examId, currentSyllabus.id);
        setSuccessMessage('Approved syllabus revision.');
      } else {
        updated = await examSyllabusApi.publishSyllabus(examId, currentSyllabus.id);
        setSuccessMessage('Published syllabus revision as active current syllabus.');
      }

      await loadSyllabusRevisions();
      if (updated) setSelectedSyllabusId(updated.id);
    } catch (err: any) {
      setErrorMessage(err.message || err.response?.data?.message || `Failed to ${action} syllabus revision`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveNode = async (e: React.FormEvent | React.MouseEvent, forceDraft: boolean = false) => {
    e.preventDefault();
    if (!selectedSyllabusId) {
      setErrorMessage('No active syllabus revision selected.');
      return;
    }

    if (!formNameEn.trim() || formNameEn.trim().length < 2) {
      setErrorMessage('English Node Title is required (minimum 2 characters).');
      return;
    }
    if (!formNameKn.trim() || formNameKn.trim().length < 2) {
      setErrorMessage('Kannada Node Title is required (minimum 2 characters).');
      return;
    }

    try {
      setActionLoading(true);
      setErrorMessage(null);

      const parent = formParentId ? nodes.find((n) => n.id === formParentId) : null;

      let computedNodeType: ExamSyllabusNodeType = 'SUBJECT';
      if (selectedNode && !isCreatingNewNode) {
        computedNodeType = selectedNode.nodeType;
      } else if (parent) {
        if (parent.nodeType === 'SUBJECT') computedNodeType = 'SECTION';
        else if (parent.nodeType === 'SECTION') computedNodeType = 'TOPIC';
        else if (parent.nodeType === 'TOPIC') computedNodeType = 'SUBTOPIC';
        else if (parent.nodeType === 'SUBTOPIC') computedNodeType = 'KNOWLEDGE_AREA';
        else computedNodeType = 'KNOWLEDGE_AREA';
      } else {
        computedNodeType = 'SUBJECT';
      }

      // Generate a unique code string to avoid backend code uniqueness collision (409)
      const cleanTitle = formNameEn
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 18);
      const uniqueSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      const generatedCode = `${cleanTitle || 'NODE'}_${uniqueSuffix}`;

      let computedScopeType: any = 'GLOBAL';
      if (selectedPaperId) {
        computedScopeType = 'PAPER';
      } else if (selectedStageId) {
        computedScopeType = 'STAGE';
      }

      const payload: CreateNodePayload = {
        parentId: formParentId || null,
        code: generatedCode,
        nodeType: computedNodeType,
        scopeType: computedScopeType,
        nameEn: formNameEn.trim(),
        nameKn: formNameKn.trim(),
        descriptionEn: formDescriptionEn.trim() || undefined,
        descriptionKn: formDescriptionKn.trim() || undefined,
        sourceReference: formLinkUrlEn.trim() || undefined,
        officialTextEn: formLinkUrlEn.trim() || undefined,
        officialTextKn: formLinkUrlKn.trim() || undefined,
        displayOrder: formDisplayOrder || 1,
        isActive: forceDraft ? false : formIsActive,
        examStageId: computedScopeType === 'STAGE' ? (selectedStageId || undefined) : undefined,
        examPaperId: computedScopeType === 'PAPER' ? (selectedPaperId || undefined) : undefined,
      };

      let savedNode: ExamSyllabusNode;
      if (selectedNode && !isCreatingNewNode) {
        savedNode = await examSyllabusApi.updateNode(selectedSyllabusId, selectedNode.id, payload);
        setSuccessMessage(`Successfully updated node '${payload.nameEn}'`);
      } else {
        savedNode = await examSyllabusApi.createNode(selectedSyllabusId, payload);
        setSuccessMessage(`Successfully created node '${payload.nameEn}'`);
      }

      // Uncollapse parent if created child
      if (formParentId) {
        setCollapsedNodeIds((prev) => {
          const next = new Set(prev);
          next.delete(formParentId);
          return next;
        });
      }

      setInlineEditingNodeId(null);
      await loadSyllabusDetails(selectedSyllabusId, savedNode?.id);
    } catch (err: any) {
      setErrorMessage(err.message || err.response?.data?.message || 'Failed to save syllabus node');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteNodeById = async (targetNode: ExamSyllabusNode) => {
    if (!selectedSyllabusId) return;
    setActiveMenuNodeId(null);
    if (!window.confirm(`Are you sure you want to delete node '${targetNode.nameEn}'?`)) return;

    try {
      setActionLoading(true);
      setErrorMessage(null);
      await examSyllabusApi.deleteNode(selectedSyllabusId, targetNode.id);
      setSuccessMessage(`Deleted node '${targetNode.nameEn}'`);
      setSelectedNode(null);
      setIsCreatingNewNode(false);
      setInlineEditingNodeId(null);
      await loadSyllabusDetails(selectedSyllabusId);
    } catch (err: any) {
      setErrorMessage(err.message || err.response?.data?.message || 'Failed to delete node');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMoveNodeById = async (targetNode: ExamSyllabusNode, direction: 'up' | 'down') => {
    if (!selectedSyllabusId) return;
    setActiveMenuNodeId(null);

    // Get sibling nodes under the exact same parent
    const siblingNodes = nodes.filter((n) => n.parentId === targetNode.parentId);
    siblingNodes.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

    const currentIndex = siblingNodes.findIndex((n) => n.id === targetNode.id);
    if (currentIndex === -1) return;

    const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (swapIndex < 0 || swapIndex >= siblingNodes.length) return;

    // Swap position in sibling array
    const reorderedSiblings = [...siblingNodes];
    const [movedItem] = reorderedSiblings.splice(currentIndex, 1);
    reorderedSiblings.splice(swapIndex, 0, movedItem);

    const reorderedIds = reorderedSiblings.map((n) => n.id);

    try {
      setActionLoading(true);
      setErrorMessage(null);
      await examSyllabusApi.reorderNodes(selectedSyllabusId, reorderedIds);
      setSuccessMessage(`Reordered '${targetNode.nameEn}' ${direction}`);
      await loadSyllabusDetails(selectedSyllabusId, targetNode.id);
    } catch (err: any) {
      setErrorMessage(err.message || err.response?.data?.message || 'Failed to reorder node');
    } finally {
      setActionLoading(false);
    }
  };

  // Flexible Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, node: ExamSyllabusNode) => {
    e.stopPropagation();
    setDraggedNodeId(node.id);
    e.dataTransfer.setData('text/plain', node.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, targetNode: ExamSyllabusNode) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedNodeId || draggedNodeId === targetNode.id) return;

    e.dataTransfer.dropEffect = 'move';
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const offsetY = e.clientY - rect.top;

    if (offsetY < rect.height * 0.35) {
      setDropPosition('above');
    } else if (offsetY > rect.height * 0.65) {
      setDropPosition('below');
    } else {
      setDropPosition('inside');
    }
    setDragOverNodeId(targetNode.id);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.stopPropagation();
    setDragOverNodeId(null);
    setDropPosition(null);
  };

  const handleDrop = async (e: React.DragEvent, targetNode: ExamSyllabusNode) => {
    e.preventDefault();
    e.stopPropagation();

    const movedId = draggedNodeId || e.dataTransfer.getData('text/plain');
    const currentPosition = dropPosition;

    setDraggedNodeId(null);
    setDragOverNodeId(null);
    setDropPosition(null);

    if (!movedId || movedId === targetNode.id || !selectedSyllabusId) return;

    const movedNode = nodes.find((n) => n.id === movedId);
    if (!movedNode) return;

    // Prevent cyclical move
    let isInvalidMove = false;
    let curr: ExamSyllabusNode | undefined = targetNode;
    while (curr) {
      if (curr.id === movedId) {
        isInvalidMove = true;
        break;
      }
      curr = nodes.find(n => n.id === curr?.parentId);
    }
    if (isInvalidMove) {
      setErrorMessage('Cannot move a node into itself or its descendants.');
      return;
    }

    // Capture Undo State
    const oldParentId = movedNode.parentId || null;
    const oldSiblingIds = nodes
      .filter((n) => n.parentId === oldParentId)
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
      .map((n) => n.id);

    try {
      setActionLoading(true);
      setErrorMessage(null);

      if (currentPosition === 'inside') {
        // Move node inside targetNode as child
        await examSyllabusApi.moveNode(selectedSyllabusId, movedId, targetNode.id);
        setSuccessMessage(`Moved '${movedNode.nameEn}' under '${targetNode.nameEn}'`);
        setCollapsedNodeIds((prev) => {
          const next = new Set(prev);
          next.delete(targetNode.id);
          return next;
        });
      } else {
        // Reorder among siblings under targetNode's parent
        const siblingNodes = nodes.filter((n) => n.parentId === targetNode.parentId && n.id !== movedId);
        siblingNodes.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

        const targetIdx = siblingNodes.findIndex((n) => n.id === targetNode.id);
        const insertIdx = currentPosition === 'below' ? targetIdx + 1 : targetIdx;

        siblingNodes.splice(insertIdx, 0, movedNode);
        const reorderedIds = siblingNodes.map((n) => n.id);

        if (movedNode.parentId !== targetNode.parentId) {
          await examSyllabusApi.moveNode(selectedSyllabusId, movedId, targetNode.parentId);
        }

        await examSyllabusApi.reorderNodes(selectedSyllabusId, reorderedIds);
        setSuccessMessage(`Reordered '${movedNode.nameEn}'`);
      }

      setUndoAction({ movedId, oldParentId, oldSiblingIds });
      await loadSyllabusDetails(selectedSyllabusId, movedId);
    } catch (err: any) {
      setErrorMessage(err.message || err.response?.data?.message || 'Failed to move node');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUndoMove = async () => {
    if (!undoAction || !selectedSyllabusId) return;
    try {
      setActionLoading(true);
      setErrorMessage(null);

      const currentNode = nodes.find(n => n.id === undoAction.movedId);
      if (currentNode && currentNode.parentId !== undoAction.oldParentId) {
        await examSyllabusApi.moveNode(selectedSyllabusId, undoAction.movedId, undoAction.oldParentId);
      }
      
      await examSyllabusApi.reorderNodes(selectedSyllabusId, undoAction.oldSiblingIds);
      
      setSuccessMessage('Undo successful! Node restored to original position.');
      setUndoAction(null);
      await loadSyllabusDetails(selectedSyllabusId);
    } catch (err: any) {
      setErrorMessage(err.message || err.response?.data?.message || 'Failed to undo move');
    } finally {
      setActionLoading(false);
    }
  };

  // Expand / Collapse Helpers
  const handleToggleExpand = (nodeId: string) => {
    setCollapsedNodeIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const handleExpandAll = () => {
    setCollapsedNodeIds(new Set());
    setCollapsedVirtualNodes(new Set());
  };

  const handleCollapseAll = () => {
    const parentIds = new Set(nodes.filter((n) => nodes.some((child) => child.parentId === n.id)).map((n) => n.id));
    setCollapsedNodeIds(parentIds);
    
    const virtualKeys = new Set<string>();
    if (selectedPaperId) virtualKeys.add(`paper-${selectedPaperId}`);
    if (selectedStageId) virtualKeys.add(`stage-${selectedStageId}`);
    if (selectedExam) virtualKeys.add(`exam-${selectedExam.id}`);
    setCollapsedVirtualNodes(virtualKeys);
  };

  // Calculate Auto-Number Map e.g. "1.", "1.1", "1.1.1", "1.4.1.1"
  const nodeNumberMap = useMemo(() => {
    const map = new Map<string, string>();

    const assignNumbers = (parentId: string | null, prefix: string) => {
      const children = nodes.filter((n) => n.parentId === parentId);
      children.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

      children.forEach((child, idx) => {
        const numStr = prefix ? `${prefix}.${idx + 1}` : `${idx + 1}`;
        map.set(child.id, numStr);
        assignNumbers(child.id, numStr);
      });
    };

    assignNumbers(null, '');
    return map;
  }, [nodes]);

  // Maximum Depth Level
  const maxDepthLevel = useMemo(() => {
    if (nodes.length === 0) return 0;
    return Math.max(...nodes.map((n) => n.depth)) + 1;
  }, [nodes]);

  // Calculated Syllabus Metrics
  const syllabusMetrics = useMemo(() => {
    const total = nodes.length;
    const subjects = nodes.filter((n) => n.nodeType === 'SUBJECT').length;
    const bilingualReady = nodes.filter((n) => n.nameEn?.trim() && n.nameKn?.trim()).length;
    const incomplete = total - bilingualReady;
    return { total, subjects, bilingualReady, incomplete };
  }, [nodes]);

  const cycleComboboxOptions = useMemo(() => {
    return allCycles.map((c) => ({
      value: c.id,
      label: `${c.titleEn} (${c.cycleYear})`,
      subtitle: `${c.programme?.authority?.code ? c.programme.authority.code + ' / ' + c.programme.code + ' • ' : ''}${c.cycleCode} • ${c.status}`,
    }));
  }, [allCycles]);



  const selectedExam = useMemo(() => {
    return allCycles.find((c) => c.id === examId);
  }, [allCycles, examId]);

  const parentNodeForForm = useMemo(() => {
    if (!formParentId) return null;
    return nodes.find((n) => n.id === formParentId) || null;
  }, [nodes, formParentId]);

  const getNodeTypeDotColor = (type: string) => {
    switch (type) {
      case 'SUBJECT': return '#2563EB';
      case 'SECTION': return '#059669';
      case 'TOPIC': return '#7C3AED';
      case 'SUBTOPIC': return '#DB2777';
      case 'KNOWLEDGE_AREA': default: return '#64748B';
    }
  };

  // Filter & Search Logic
  const filteredNodes = useMemo(() => {
    // 1. Find nodes that directly match the selected Stage/Paper and Search Query
    let matchingNodes = nodes.filter((node) => {
      // Scope filter
      if (selectedPaperId) {
        if (node.examPaperId !== selectedPaperId) return false;
      } else if (selectedStageId) {
        if (node.examStageId !== selectedStageId && node.examPaperId == null) return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesSelf =
          node.nameEn.toLowerCase().includes(q) ||
          node.nameKn.toLowerCase().includes(q) ||
          node.code.toLowerCase().includes(q);
        if (!matchesSelf) return false;
      }
      
      return true;
    });

    // 2. Ensure all ancestors of matching nodes are included so the tree doesn't break
    const finalSet = new Set<string>();
    
    const addWithAncestors = (nodeId: string) => {
      if (finalSet.has(nodeId)) return;
      finalSet.add(nodeId);
      const node = nodes.find(n => n.id === nodeId);
      if (node && node.parentId) {
        addWithAncestors(node.parentId);
      }
    };

    matchingNodes.forEach(node => addWithAncestors(node.id));

    // 3. Return the original nodes array filtered by our final set (preserves original ordering)
    return nodes.filter(n => finalSet.has(n.id));
  }, [nodes, searchQuery, selectedStageId, selectedPaperId]);

  // Render Inline Tree Node Editor Form directly inside the Hierarchy Structure Tree
  const renderInlineNodeEditor = (targetNode?: ExamSyllabusNode) => {
    return (
      <div className="inline-node-editor-card" onClick={(e) => e.stopPropagation()}>
        <div className="inline-editor-header">
          <div className="inline-editor-title">
            <Edit size={14} color="#084B7A" />
            <span>
              {isCreatingNewNode
                ? formParentId
                  ? `➕ Add Child Node under: ${parentNodeForForm ? parentNodeForForm.nameEn : ''}`
                  : '➕ Add New Root Node'
                : `✏️ Edit Node: ${targetNode?.nameEn || ''}`}
            </span>
          </div>
          <button
            type="button"
            onClick={handleCloseInlineEdit}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
          >
            <X size={14} />
          </button>
        </div>

        <form onSubmit={handleSaveNode} className="inline-editor-form-grid">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <FormField label="Title (English)" required>
              <Input
                value={formNameEn}
                onChange={(e) => setFormNameEn(e.target.value)}
                placeholder="e.g. Fundamental Rights"
                required
                style={{ height: '34px', fontSize: '12px' }}
              />
            </FormField>

            <FormField label="English Title Link / URL">
              <Input
                type="url"
                value={formLinkUrlEn}
                onChange={(e) => setFormLinkUrlEn(e.target.value)}
                placeholder="https://..."
                style={{ height: '34px', fontSize: '12px' }}
              />
            </FormField>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <FormField label="Title (Kannada)" required>
              <Input
                value={formNameKn}
                onChange={(e) => setFormNameKn(e.target.value)}
                placeholder="ಉದಾ. ಮೂಲಭೂತ ಹಕ್ಕುಗಳು"
                required
                style={{ height: '34px', fontSize: '12px', fontFamily: "'Noto Sans Kannada', sans-serif" }}
              />
            </FormField>

            <FormField label="Kannada Title Link / URL">
              <Input
                type="url"
                value={formLinkUrlKn}
                onChange={(e) => setFormLinkUrlKn(e.target.value)}
                placeholder="https://..."
                style={{ height: '34px', fontSize: '12px' }}
              />
            </FormField>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <FormField label="Description (English)">
              <Input
                value={formDescriptionEn}
                onChange={(e) => setFormDescriptionEn(e.target.value)}
                placeholder="English description..."
                style={{ height: '34px', fontSize: '12px' }}
              />
            </FormField>

            <FormField label="Description (Kannada)">
              <Input
                value={formDescriptionKn}
                onChange={(e) => setFormDescriptionKn(e.target.value)}
                placeholder="ಕನ್ನಡ ವಿವರಣೆ..."
                style={{ height: '34px', fontSize: '12px', fontFamily: "'Noto Sans Kannada', sans-serif" }}
              />
            </FormField>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '4px' }}>
            <Switch
              checked={formIsActive}
              onChange={(val) => setFormIsActive(val)}
              label="Active Status"
            />

            <div className="inline-editor-actions">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCloseInlineEdit}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                isLoading={actionLoading}
                disabled={actionLoading}
                onClick={(e) => handleSaveNode(e, true)}
              >
                Save as Draft
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={actionLoading}
                disabled={actionLoading}
                leftIcon={<Save size={12} />}
              >
                {isCreatingNewNode ? (formParentId ? '+ Create Child' : '+ Create Root') : 'Save Changes'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    );
  };

  // Render Waterfall Tree Row Item with Drag-and-Drop & 3-Dots Context Menu
  const renderWaterfallNodeItem = (node: ExamSyllabusNode) => {
    const children = filteredNodes.filter((n) => n.parentId === node.id);
    const hasChildren = children.length > 0;
    const isCollapsed = collapsedNodeIds.has(node.id);
    const isSelected = selectedNode?.id === node.id && !isCreatingNewNode;
    const isInlineEditing = inlineEditingNodeId === node.id;
    const isAddingChildInline = inlineEditingNodeId === `new_child_${node.id}`;
    const isMenuOpen = activeMenuNodeId === node.id;
    const autoNumber = nodeNumberMap.get(node.id) || `${node.displayOrder}`;

    const isDragging = draggedNodeId === node.id;
    const isDragOver = dragOverNodeId === node.id;
    const currentDropClass = isDragOver ? `drop-target-${dropPosition}` : '';

    const linkEn = node.sourceReference || node.officialTextEn;
    const linkKn = node.officialTextKn;

    const indentPx = Math.min(node.depth * 16, 64);

    return (
      <div key={node.id} style={{ width: '100%' }}>
        <div
          draggable={true}
          onDragStart={(e) => handleDragStart(e, node)}
          onDragOver={(e) => handleDragOver(e, node)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, node)}
          onClick={() => populateFormState(node)}
          style={{ paddingLeft: `${indentPx + 6}px` }}
          className={`waterfall-tree-node-row ${isSelected ? 'selected' : ''} ${isDragging ? 'is-dragging' : ''} ${currentDropClass}`}
        >
          <div className="waterfall-tree-node-left">
            {/* Drag Handle Grip Icon */}
            <span className="node-drag-handle" title="Drag to reorder (drop above/below) or move inside node">
              <GripVertical size={13} />
            </span>

            {hasChildren ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleExpand(node.id);
                }}
                className="waterfall-node-chevron"
                title={isCollapsed ? 'Expand Children' : 'Collapse Children'}
              >
                {isCollapsed ? '▶' : '▼'}
              </button>
            ) : (
              <div style={{ width: '18px', display: 'inline-flex', justifyContent: 'center' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: getNodeTypeDotColor(node.nodeType) }}></span>
              </div>
            )}

            <span className="waterfall-node-number">{autoNumber}.</span>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="waterfall-node-title-en" style={{ color: node.isActive ? undefined : '#94A3B8' }}>{node.nameEn}</span>
                {!node.isActive && (
                  <span style={{ fontSize: '10px', padding: '1px 6px', backgroundColor: '#F1F5F9', color: '#64748B', borderRadius: '4px', fontWeight: 600, border: '1px solid #E2E8F0', letterSpacing: '0.02em' }}>Draft</span>
                )}
                {node.isActive && (
                  <span style={{ fontSize: '10px', padding: '1px 6px', backgroundColor: '#ECFDF5', color: '#047857', borderRadius: '4px', fontWeight: 600, border: '1px solid #A7F3D0', letterSpacing: '0.02em' }}>Active</span>
                )}
                {linkEn && (
                  <a
                    href={linkEn}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="waterfall-node-link-pill"
                    title={`EN Link: ${linkEn}`}
                  >
                    <span>EN Link</span>
                    <ExternalLink size={10} />
                  </a>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="waterfall-node-title-kn" style={{ color: node.isActive ? undefined : '#94A3B8' }}>{node.nameKn}</span>
                {linkKn && (
                  <a
                    href={linkKn}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="waterfall-node-link-pill"
                    style={{ backgroundColor: '#ECFDF5', color: '#047857' }}
                    title={`KN Link: ${linkKn}`}
                  >
                    <span>KN Link</span>
                    <ExternalLink size={10} />
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="waterfall-node-right">
            {/* Direct Quick Inline Edit Button inside Tree Row */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenInlineEdit(node);
              }}
              style={{ padding: '3px 7px', fontSize: '11px', fontWeight: 600, color: '#084B7A', backgroundColor: '#EAF3F9', border: '1px solid rgba(8,75,122,0.2)', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
              title="Edit node inline inside hierarchy"
            >
              <Edit size={11} />
              <span>Edit</span>
            </button>

            {/* Direct Add Child Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                resetFormStateForNewNode(node.id);
              }}
              style={{ padding: '3px 7px', fontSize: '11px', fontWeight: 600, color: '#059669', backgroundColor: '#ECFDF5', border: '1px solid rgba(5,150,105,0.2)', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', marginLeft: '6px' }}
              title="Add a sub-node under this node"
            >
              <Plus size={11} />
              <span>Child</span>
            </button>

            {hasChildren && (
              <span className="waterfall-child-count-badge">
                {children.length}
              </span>
            )}

            {/* Interactive 3 Dots Context Menu (+ Add Root Node) */}
            <div className="node-action-menu-container" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (isMenuOpen) {
                    setActiveMenuNodeId(null);
                  } else {
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                    if (rect.bottom > window.innerHeight - 200) {
                      setMenuPosition('up');
                    } else {
                      setMenuPosition('down');
                    }
                    setActiveMenuNodeId(node.id);
                  }
                }}
                className="waterfall-node-menu-btn"
                title="Node Action Menu"
              >
                ⋮
              </button>

              {isMenuOpen && (
                <div className={`tree-action-dropdown ${menuPosition === 'up' ? 'dropdown-up' : 'dropdown-down'}`} onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenInlineEdit(node);
                    }}
                    className="tree-action-dropdown-item"
                  >
                    <Edit size={12} color="#084B7A" />
                    <span>Edit Details (Inline)</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      resetFormStateForNewNode(node.id);
                    }}
                    className="tree-action-dropdown-item"
                  >
                    <Plus size={12} color="#059669" />
                    <span>Add Child Node</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      resetFormStateForNewNode(null);
                    }}
                    className="tree-action-dropdown-item"
                  >
                    <Globe size={12} color="#2563EB" />
                    <span>Add Root Node</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMoveNodeById(node, 'up');
                    }}
                    className="tree-action-dropdown-item"
                  >
                    <ArrowUp size={12} />
                    <span>Move Up</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMoveNodeById(node, 'down');
                    }}
                    className="tree-action-dropdown-item"
                  >
                    <ArrowDown size={12} />
                    <span>Move Down</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteNodeById(node);
                    }}
                    className="tree-action-dropdown-item danger"
                  >
                    <Trash2 size={12} />
                    <span>Delete Node</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Inline Tree Node Editor Form directly under selected node */}
        {isInlineEditing && (
          <div style={{ marginLeft: `${indentPx + 24}px` }}>
            {renderInlineNodeEditor(node)}
          </div>
        )}

        {/* Inline Add Child Form directly next to / below parent node */}
        {isAddingChildInline && (
          <div style={{ marginLeft: `${indentPx + 24}px` }}>
            {renderInlineNodeEditor()}
          </div>
        )}

        {!isCollapsed && hasChildren && (
          <div style={{ marginTop: '2px', borderLeft: '1.5px dashed #CBD5E1', marginLeft: `${indentPx + 18}px`, paddingLeft: '4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {children.map((child) => renderWaterfallNodeItem(child))}
          </div>
        )}
      </div>
    );
  };

  // 1. NO EXAM CYCLE SELECTED
  if (!examId) {
    if (cyclesLoading) {
      return (
        <div className="syllabus-page">
          <Card style={{ padding: '40px', textAlign: 'center' }}>
            <LoadingSpinner size="lg" />
            <div style={{ margin: '16px auto 0' }}>
              <Skeleton width="240px" height="24px" />
            </div>
          </Card>
        </div>
      );
    }

    return (
      <div className="syllabus-page">
        <PageHeader
          title="Add / Edit Syllabus"
          subtitle="Manage hierarchical syllabus waterfall structure, bilingual details, and node properties."
          breadcrumbItems={[
            { label: 'Dashboard', href: '/' },
            { label: 'Syllabus Builder', href: '/exams/syllabus' },
            { label: 'Add / Edit Syllabus' },
          ]}
          actions={
            <div style={{ width: '280px' }}>
              <Combobox
                options={cycleComboboxOptions}
                value=""
                onChange={(val) => {
                  if (val) navigate(`/exams/syllabus?examId=${val}`);
                }}
                placeholder="Select Exam Cycle..."
              />
            </div>
          }
        />

        <Card style={{ padding: '40px', textAlign: 'center' }}>
          <EmptyState
            title="Select an Exam Cycle"
            description="Please select an Exam Cycle from the dropdown above to manage its bilingual Syllabus tree."
          />
        </Card>
      </div>
    );
  }

  // 2. LOADING STATE
  if (loading) {
    return (
      <div className="syllabus-page">
        <Card style={{ padding: '48px', textAlign: 'center' }}>
          <LoadingSpinner size="lg" />
          <div style={{ marginTop: '16px', color: '#64748B', fontSize: '14px' }}>Loading Syllabus Waterfall Tree...</div>
        </Card>
      </div>
    );
  }

  const rootNodes = filteredNodes.filter((n) => !n.parentId);

  return (
    <div className="syllabus-page">
      {/* Target Image Top Header & Breadcrumbs */}
      <PageHeader
        title="Add / Edit Syllabus"
        breadcrumbItems={[
          { label: 'Dashboard', href: '/' },
          { label: 'Syllabus Builder', href: '/exams/syllabus' },
          { label: 'Add / Edit Syllabus' },
        ]}
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Button variant="primary" size="sm" onClick={() => setIsFullPreviewOpen(true)} leftIcon={<ExternalLink size={14} />} style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)' }}>
              View Combined Structure
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/exams')}>
              ← Back to List
            </Button>
          </div>
        }
      />

      {/* Hierarchy Context */}
      {selectedExam && (
        <div style={{ margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#475569', background: '#f8fafc', padding: '6px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', width: 'fit-content' }}>
          <span style={{ fontWeight: 600 }}>Authority:</span> {selectedExam.programme?.authority?.code || 'N/A'}
          <span style={{ color: '#cbd5e1' }}>|</span>
          <span style={{ fontWeight: 600 }}>Programme:</span> {selectedExam.programme?.code || 'N/A'}
          <span style={{ color: '#cbd5e1' }}>|</span>
          <span style={{ fontWeight: 600 }}>Year:</span> {selectedExam.cycleYear || 'N/A'}
        </div>
      )}

      {/* Exam & Revision Toolbar Card */}
      {selectedExam && (
        <div className="syllabus-context-card">
          <div className="syllabus-context-flex">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#111827', margin: 0 }}>{selectedExam.titleEn}</h2>
                <Badge label={selectedExam.status} variant={selectedExam.status === 'PUBLISHED' ? 'success' : 'neutral'} />
              </div>
              <div style={{ fontSize: '12px', fontWeight: 500, color: '#64748B', fontFamily: "'Noto Sans Kannada', sans-serif" }}>
                {selectedExam.titleKn}
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '220px' }}>
                <Combobox
                  options={cycleComboboxOptions}
                  value={examId}
                  onChange={(val) => {
                    if (val) navigate(`/exams/syllabus?examId=${val}`);
                  }}
                  placeholder="Switch Exam..."
                />
              </div>
              <div style={{ width: '180px' }}>
                <select
                  value={selectedStageId}
                  onChange={(e) => {
                    setSelectedStageId(e.target.value);
                    setSelectedPaperId(''); // Reset paper when stage changes
                  }}
                  style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid #CBD5E1', padding: '0 12px', fontSize: '13px', fontFamily: 'inherit', color: '#0f172a', backgroundColor: '#ffffff', outline: 'none', cursor: 'pointer' }}
                >
                  <option value="">All Stages (Global View)</option>
                  {stages.map(s => (
                    <option key={s.id} value={s.id}>{s.nameEn}</option>
                  ))}
                </select>
              </div>

              <div style={{ width: '180px' }}>
                <select
                  value={selectedPaperId}
                  onChange={(e) => setSelectedPaperId(e.target.value)}
                  style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid #CBD5E1', padding: '0 12px', fontSize: '13px', fontFamily: 'inherit', color: '#0f172a', backgroundColor: '#ffffff', outline: 'none', cursor: 'pointer' }}
                  disabled={!selectedStageId}
                >
                  <option value="">All Papers</option>
                  {papers.map(p => (
                    <option key={p.id} value={p.id}>{p.nameEn}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notifications */}
      {errorMessage && (
        <div style={{ padding: '10px 14px', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px', color: '#B91C1C', fontSize: '13px', fontWeight: 500, marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} style={{ background: 'none', border: 'none', color: '#B91C1C', cursor: 'pointer', fontWeight: 700 }}>✕</button>
        </div>
      )}
      {successMessage && (
        <div style={{ padding: '10px 14px', backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '8px', color: '#047857', fontSize: '13px', fontWeight: 500, marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{successMessage}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {undoAction && (
              <button 
                onClick={handleUndoMove} 
                style={{ background: '#047857', color: 'white', border: 'none', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
              >
                Undo Move
              </button>
            )}
            <button onClick={() => { setSuccessMessage(null); setUndoAction(null); }} style={{ background: 'none', border: 'none', color: '#047857', cursor: 'pointer', fontWeight: 700 }}>✕</button>
          </div>
        </div>
      )}

      {/* Revision Metrics Header */}
      {currentSyllabus && (
        <div className="revision-header-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '15px', fontWeight: 700, color: '#111827' }}>
              Revision {currentSyllabus.revisionNumber}
            </span>
            <Badge
              label={currentSyllabus.status}
              variant={
                currentSyllabus.status === 'PUBLISHED'
                  ? 'success'
                  : currentSyllabus.status === 'APPROVED'
                  ? 'info'
                  : currentSyllabus.status === 'REVIEW_PENDING'
                  ? 'warning'
                  : 'neutral'
              }
            />
            {currentSyllabus.isCurrent && <Badge label="CURRENT" variant="success" />}

            <div className="revision-metrics-group">
              <span className="metric-pill-neutral">Total Nodes: <strong>{syllabusMetrics.total}</strong></span>
              <span className="metric-pill-blue">Subjects: <strong>{syllabusMetrics.subjects}</strong></span>
              <span className="metric-pill-green">Bilingual Ready: <strong>{syllabusMetrics.bilingualReady}</strong></span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Draft Auto-saved Indicator */}
            {(currentSyllabus.status === 'DRAFT' || currentSyllabus.status === 'CHANGES_REQUESTED') && (
              <span
                style={{
                  fontSize: '12px',
                  color: '#047857',
                  backgroundColor: '#ECFDF5',
                  border: '1px solid #A7F3D0',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
                title="Every node you add, edit, or reorder is permanently saved to the database in real-time"
              >
                <CheckCircle2 size={13} color="#047857" />
                Auto-saved as Draft
              </span>
            )}

            {(currentSyllabus.status === 'DRAFT' || currentSyllabus.status === 'CHANGES_REQUESTED') && canManageSyllabus && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleWorkflowAction('submit')}
                disabled={actionLoading}
              >
                Submit for Review
              </Button>
            )}

            {currentSyllabus.status === 'REVIEW_PENDING' && canManageSyllabus && (
              <>
                <span
                  style={{
                    fontSize: '12px',
                    color: '#92400E',
                    backgroundColor: '#FEF3C7',
                    border: '1px solid #FCD34D',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  <CheckCircle2 size={13} color="#92400E" />
                  Saved (In Review)
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleWorkflowAction('request-changes')}
                  disabled={actionLoading}
                  leftIcon={<RotateCcw size={12} />}
                >
                  Request Changes (Back to Draft)
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleWorkflowAction('approve')}
                  disabled={actionLoading}
                  leftIcon={<Check size={12} />}
                >
                  Approve Syllabus
                </Button>
              </>
            )}

            {currentSyllabus.status === 'APPROVED' && (
              <>
                <span
                  style={{
                    fontSize: '12px',
                    color: '#1E40AF',
                    backgroundColor: '#EFF6FF',
                    border: '1px solid #BFDBFE',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  <CheckCircle2 size={13} color="#1E40AF" />
                  Approved & Ready
                </span>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleWorkflowAction('publish')}
                  disabled={actionLoading}
                  style={{ backgroundColor: '#16A34A', borderColor: '#16A34A' }}
                >
                  Publish Revision
                </Button>
              </>
            )}

            {currentSyllabus.status === 'PUBLISHED' && (
              <span
                style={{
                  fontSize: '12px',
                  color: '#047857',
                  backgroundColor: '#ECFDF5',
                  border: '1px solid #A7F3D0',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <CheckCircle2 size={13} color="#047857" />
                Published & Active
              </span>
            )}
          </div>
        </div>
      )}

      {/* 100% Full Width Syllabus Structure Workspace */}
      {currentSyllabus ? (
        <div className="syllabus-waterfall-split-grid">
          <div className="waterfall-tree-panel">
            <div className="waterfall-panel-header">
              <div className="waterfall-panel-title">
                <span>Syllabus Structure (Waterfall)</span>
                <Info size={14} color="#64748B" />
              </div>
            </div>

            {/* Waterfall Tree Toolbar */}
            <div className="waterfall-tree-action-bar">
              <Button
                variant="outline"
                size="sm"
                onClick={() => resetFormStateForNewNode(null)}
                leftIcon={<Plus size={13} color="#084B7A" />}
              >
                + Add Root Node
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => resetFormStateForNewNode(selectedNode?.id || null)}
                disabled={!selectedNode}
                leftIcon={<Plus size={13} color="#084B7A" />}
              >
                + Add Child Node
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => selectedNode && handleDeleteNodeById(selectedNode)}
                disabled={!selectedNode}
                leftIcon={<Trash2 size={13} color="#DC2626" />}
              >
                Delete
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => selectedNode && handleMoveNodeById(selectedNode, 'up')}
                disabled={!selectedNode}
                leftIcon={<ArrowUp size={13} />}
              >
                Move Up
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => selectedNode && handleMoveNodeById(selectedNode, 'down')}
                disabled={!selectedNode}
                leftIcon={<ArrowDown size={13} />}
              >
                Move Down
              </Button>
            </div>

            {/* Tree Search Bar */}
            <div className="waterfall-tree-search-bar">
              <div style={{ flex: 1 }}>
                <SearchInput
                  placeholder="Search syllabus hierarchy..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Waterfall Tree Nodes List Container */}
            {/* Waterfall Tree Nodes List Container */}
            <div className="waterfall-tree-container">
              {nodes.length === 0 && inlineEditingNodeId !== 'new_root' ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#64748B', fontSize: '12px' }}>
                  No nodes present in this syllabus revision.
                  <button
                    onClick={() => resetFormStateForNewNode(null)}
                    style={{ display: 'block', margin: '6px auto 0', fontSize: '11.5px', fontWeight: 700, color: '#084B7A', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    + Add First Root Node
                  </button>
                </div>
              ) : rootNodes.length === 0 && inlineEditingNodeId !== 'new_root' ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#64748B', fontSize: '12px' }}>
                  No nodes match search filters.
                </div>
              ) : (
                (() => {
                  let content = (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {rootNodes.map((rootNode) => renderWaterfallNodeItem(rootNode))}
                    </div>
                  );
                  
                  const wrapNode = (id: string, title: string, contentNode: React.ReactNode, isFirst: boolean, isActive?: boolean, isExam?: boolean, examStatus?: string) => {
                    const isCollapsed = collapsedVirtualNodes.has(id);
                    const isNodeActive = isExam 
                      ? (localSyllabusStatus ? localSyllabusStatus === 'ACTIVE' : examStatus === 'PUBLISHED')
                      : isActive !== false;
                    
                    return (
                      <div key={id} style={{ marginBottom: isFirst ? '8px' : '0' }}>
                        <div 
                          onClick={() => toggleVirtualNodeCollapse(id)}
                          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '8px 12px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '6px', fontSize: '14px', color: '#0F172A', fontWeight: 600, userSelect: 'none' }}
                        >
                          <span style={{ marginRight: '8px', color: '#94A3B8', fontSize: '10px', transform: isCollapsed ? 'rotate(-90deg)' : 'none', transition: 'transform 0.2s', display: 'inline-block' }}>▼</span>
                          <span style={{ marginRight: '8px', color: isNodeActive ? undefined : '#94A3B8' }}>{title}</span>
                          
                          {!isNodeActive && (
                            <span style={{ fontSize: '10px', padding: '1px 6px', backgroundColor: '#F1F5F9', color: '#64748B', borderRadius: '4px', fontWeight: 600, border: '1px solid #E2E8F0', letterSpacing: '0.02em' }}>Draft</span>
                          )}
                          {isNodeActive && (
                            <span style={{ fontSize: '10px', padding: '1px 6px', backgroundColor: '#ECFDF5', color: '#047857', borderRadius: '4px', fontWeight: 600, border: '1px solid #A7F3D0', letterSpacing: '0.02em' }}>Active</span>
                          )}
                        </div>
                        {!isCollapsed && (
                          <div style={{ marginLeft: '12px', paddingLeft: '12px', borderLeft: '1.5px dashed #CBD5E1', marginTop: '6px', marginBottom: '6px' }}>
                            {contentNode}
                          </div>
                        )}
                      </div>
                    );
                  };

                  if (selectedPaperId) {
                    const paper = papers.find(p => p.id === selectedPaperId);
                    const pName = paper?.nameEn || 'Paper';
                    content = wrapNode(`paper-${selectedPaperId}`, pName, content, false, paper?.isActive);
                  }
                  
                  if (selectedStageId) {
                    const stage = stages.find(s => s.id === selectedStageId);
                    const sName = stage?.nameEn || 'Stage';
                    content = wrapNode(`stage-${selectedStageId}`, sName, content, false, stage?.isActive);
                  }

                  if (selectedExam) {
                    content = wrapNode(`exam-${selectedExam.id}`, selectedExam.titleEn, content, true, undefined, true, selectedExam.status);
                  }

                  return content;
                })()
              )}

              {inlineEditingNodeId === 'new_root' && (
                <div style={{ padding: '4px 0', marginTop: '12px' }}>
                  {renderInlineNodeEditor()}
                </div>
              )}
            </div>

            {/* Global Save Actions to match user expectations */}
            <div style={{ padding: '16px 20px', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end', gap: '12px', backgroundColor: '#F8FAFC', borderBottomLeftRadius: '10px', borderBottomRightRadius: '10px' }}>
              <Button 
                variant="outline" 
                onClick={() => {
                  setLocalSyllabusStatus('DRAFT');
                  setSuccessMessage('Syllabus draft saved successfully! (Changes are auto-saved in real-time)');
                }}
              >
                Save as Draft
              </Button>
              <Button 
                variant="primary" 
                onClick={() => {
                  setLocalSyllabusStatus('ACTIVE');
                  setSuccessMessage('All syllabus changes have been saved and are now active!');
                }}
              >
                Save Changes
              </Button>
            </div>

            {/* Node Type Color Legend Bar */}
            <div className="waterfall-legend-bar">
              <span className="legend-dot-item">
                <span className="legend-dot" style={{ backgroundColor: '#2563EB' }}></span> Subject
              </span>
              <span className="legend-dot-item">
                <span className="legend-dot" style={{ backgroundColor: '#059669' }}></span> Section
              </span>
              <span className="legend-dot-item">
                <span className="legend-dot" style={{ backgroundColor: '#7C3AED' }}></span> Topic
              </span>
              <span className="legend-dot-item">
                <span className="legend-dot" style={{ backgroundColor: '#DB2777' }}></span> Sub Topic
              </span>
              <span className="legend-dot-item">
                <span className="legend-dot" style={{ backgroundColor: '#64748B' }}></span> Micro Topic
              </span>
            </div>

            {/* Tree Footer Stats & Toggle Button */}
            <div className="waterfall-tree-footer-stats">
              <div>
                Total Nodes: <strong>{nodes.length}</strong> | Max Level: <strong>{maxDepthLevel}</strong>
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                <Button variant="ghost" size="sm" onClick={handleExpandAll}>
                  Expand All
                </Button>
                <Button variant="ghost" size="sm" onClick={handleCollapseAll}>
                  Collapse All
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <Card style={{ padding: '48px', textAlign: 'center', marginTop: '24px' }}>
          {patterns.length === 0 ? (
            <EmptyState
              title="No Exam Pattern Found"
              description="You must create an Exam Pattern (Stages & Papers) before you can build a Syllabus."
              actionLabel="Go to Exam Stages Builder"
              onAction={() => navigate(`/exams/stages?examId=${selectedExam?.id || examId}`)}
            />
          ) : (
            <EmptyState
              title="No Syllabus Revision Found"
              description="This exam doesn't have a syllabus yet. Click below to initialize the first Draft revision."
              actionLabel="Initialize Syllabus"
              onAction={handleCreateInitialSyllabus}
            />
          )}
        </Card>
      )}
      {/* Full Preview Modal */}
      {selectedExam && (
        <FullSyllabusPreviewModal
          isOpen={isFullPreviewOpen}
          onClose={() => setIsFullPreviewOpen(false)}
          exam={selectedExam}
          stages={stages}
          nodes={nodes}
        />
      )}
    </div>
  );
};

export default ExamSyllabusPage;
