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
    
    // 2. Map topics to their parent subjects
    const allTopics: { topic: SyllabusNodeWithMetadata; subjectId: string | null }[] = [];
    const subjects = new Map<string, SyllabusNodeWithMetadata>();
    
    // First pass: identify subjects
    for (const node of nodes) {
      if (node.nodeType === 'SUBJECT') {
        subjects.set(node.id, node);
      }
    }
    
    // Second pass: map topics
    for (const node of nodes) {
      if (node.nodeType === 'TOPIC') {
        allTopics.push({
          topic: node,
          subjectId: node.parentId && subjects.has(node.parentId) ? node.parentId : null
        });
      }
    }
    
    if (allTopics.length === 0) return [];

    // 3. Allocate budget to topics
    let remainingBudget = firstPassBudget;
    const estimatedMinutesPerTopic = Math.ceil(firstPassBudget / allTopics.length);
    
    const topicAllocations: { topicId: string, subjectId: string | null, allocatedMinutes: number }[] = [];
    
    for (const item of allTopics) {
      let duration = 0;
      if (item.topic.planningMetadata?.estimatedConceptMinutes) {
        duration = item.topic.planningMetadata.estimatedConceptMinutes;
      } else {
        // Fallback
        duration = Math.min(
          Math.max(estimatedMinutesPerTopic, rule.minTopicMinutes),
          rule.maxFallbackTopicMinutes
        );
      }
      
      // Safety cap so we don't exceed budget entirely, though first pass is just a target.
      // If duration exceeds remaining, we can still assign it (it's a target, not a strict wallet),
      // but let's be reasonable. The user says "The budget is a ceiling/target, not a requirement to artificially stretch".
      
      topicAllocations.push({
        topicId: item.topic.id,
        subjectId: item.subjectId,
        allocatedMinutes: duration
      });
      
      remainingBudget -= duration;
    }

    // 4. Split allocations into Sessions
    const baseQueue: StudySession[] = [];
    for (const allocation of topicAllocations) {
      const preferred = rule.preferredSessionMinutes || 120;
      const totalSessions = Math.ceil(allocation.allocatedMinutes / preferred);
      
      let minsLeft = allocation.allocatedMinutes;
      for (let s = 1; s <= totalSessions; s++) {
        const sessionMins = Math.min(minsLeft, preferred);
        if (sessionMins > 0) {
          baseQueue.push({
            topicId: allocation.topicId,
            parentSubjectId: allocation.subjectId,
            plannedMinutes: sessionMins,
            sessionNumber: s,
            totalSessions: totalSessions
          });
        }
        minsLeft -= sessionMins;
      }
    }

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
