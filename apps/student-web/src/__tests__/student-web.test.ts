import { describe, it, expect } from 'vitest';
import { App } from '../App';

describe('Student Web Portal', () => {
  it('should export Student Web App component', () => {
    expect(typeof App).toBe('function');
  });
});
