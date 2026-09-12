import { describe, it, expect } from 'vitest';
import { mcqLibraryApi } from '../api/mcq-library.api';

describe('MCQ Library UI & API Client Unit Tests', () => {
  it('1. should expose mcqLibraryApi methods', () => {
    expect(typeof mcqLibraryApi.getQuestions).toBe('function');
    expect(typeof mcqLibraryApi.createQuestion).toBe('function');
    expect(typeof mcqLibraryApi.getQuestionById).toBe('function');
    expect(typeof mcqLibraryApi.updateQuestion).toBe('function');
    expect(typeof mcqLibraryApi.deleteQuestion).toBe('function');
    expect(typeof mcqLibraryApi.getMockTests).toBe('function');
    expect(typeof mcqLibraryApi.createMockTest).toBe('function');
    expect(typeof mcqLibraryApi.addQuestionsToMockTest).toBe('function');
  });
});
