// @ts-nocheck
import { 
  StudentStudyPlan, 
  StudyPlannerRule, 
  ExamSyllabusNode, 
  StudyTopicPlanningMetadata 
} from '@study-karnataka/database';

export interface StudySession {
  topicId: string;
  parentSubjectId: string | null;
  plannedMinutes: number;
  sessionNumber: number;
  totalSessions: number;
}

export interface SyllabusNodeWithMetadata extends ExamSyllabusNode {
  planningMetadata?: StudyTopicPlanningMetadata | null;
  children?: SyllabusNodeWithMetadata[];
}

export class StudyPlanAcademicAllocationService {
  
  /**
   * Generates a fully ordered queue of study sessions representing the First Pass Syllabus.
   */
  static generateSessionQueue(
    plan: StudentStudyPlan,
    rule: StudyPlannerRule,
    nodes: SyllabusNodeWithMetadata[] // usually subjects/topics tree
  ): StudySession[] {
    
    // 1. Calculate First Pass Budget
    const firstPassBudget = Math.floor(plan.conceptTargetMinutes * (rule.firstPassConceptPercentage / 100));
    
    // Build in-memory tree to guarantee pre-order (serial-wise) traversal
    const childrenMap = new Map<string, SyllabusNodeWithMetadata[]>();
    const rootNodes: SyllabusNodeWithMetadata[] = [];
    
    for (const node of nodes) {
      if (node.parentId) {
        if (!childrenMap.has(node.parentId)) childrenMap.set(node.parentId, []);
        childrenMap.get(node.parentId)!.push(node);
      } else {
        rootNodes.push(node);
      }
    }
    
    // Sort siblings
    rootNodes.sort((a, b) => a.displayOrder - b.displayOrder);
    for (const children of childrenMap.values()) {
      children.sort((a, b) => a.displayOrder - b.displayOrder);
    }
    
    // Pre-order traverse to get flat sorted list
    const flatSerialNodes: SyllabusNodeWithMetadata[] = [];
    function traverse(node: SyllabusNodeWithMetadata) {
      flatSerialNodes.push(node);
      const children = childrenMap.get(node.id) || [];
      for (const child of children) {
        traverse(child);
      }
    }
    for (const root of rootNodes) {
      traverse(root);
    }
    
    // 2. Map topics to their parent subjects (dynamic leaf node detection)
    const allTopics: { topic: SyllabusNodeWithMetadata; subjectId: string | null }[] = [];
    const subjects = new Map<string, SyllabusNodeWithMetadata>();
    
    // Identify which nodes act as parents
    const parentIds = new Set(nodes.map(n => n.parentId).filter(Boolean));
    
    for (const node of flatSerialNodes) {
      if (!parentIds.has(node.id)) {
        // It's a leaf node -> treat as an allocatable topic
        allTopics.push({
          topic: node,
          subjectId: node.parentId
        });
      } else {
        // It acts as a parent
        subjects.set(node.id, node);
      }
    }
    
    if (allTopics.length === 0) return [];

    // Under the day-based algorithm, each topic is a single atomic session assigned to a day.
    const baseQueue: StudySession[] = allTopics.map(item => ({
      topicId: item.topic.id,
      parentSubjectId: item.subjectId,
      plannedMinutes: 0, // Managed dynamically in generation service based on daily target
      sessionNumber: 1,
      totalSessions: 1
    }));

    // 5. Apply Rotation Strategy
    return this.applyRotation(baseQueue, rule);
  }
  
  private static applyRotation(queue: StudySession[], rule: StudyPlannerRule): StudySession[] {
    if (rule.subjectRotationStrategy === 'SEQUENTIAL') {
      // Just respect syllabus order
      return queue;
    }
    
    // Example alternative strategy: ROTATE_BY_SUBJECT
    if (rule.subjectRotationStrategy === 'ROTATE_BY_SUBJECT') {
      const maxConsecutive = rule.maxSameTopicConsecutiveDays || 3; // roughly 3 days worth
      const rotated: StudySession[] = [];
      const remainingQueue = [...queue];
      
      let currentSubjectId: string | null = null;
      let consecutiveCount = 0;
      
      while (remainingQueue.length > 0) {
        let nextIndex = 0;
        
        // Find next session that fits constraints
        for (let i = 0; i < remainingQueue.length; i++) {
          const candidate = remainingQueue[i];
          if (candidate.parentSubjectId !== currentSubjectId || consecutiveCount < maxConsecutive) {
            nextIndex = i;
            break;
          }
        }
        
        const next = remainingQueue.splice(nextIndex, 1)[0];
        
        if (next.parentSubjectId === currentSubjectId) {
          consecutiveCount++;
        } else {
          currentSubjectId = next.parentSubjectId;
          consecutiveCount = 1;
        }
        
        rotated.push(next);
      }
      
      return rotated;
    }
    
    return queue;
  }
}
