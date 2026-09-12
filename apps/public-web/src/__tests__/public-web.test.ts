import { describe, it, expect } from 'vitest';
import { App } from '../App';

describe('Public Web Application', () => {
  it('should export main App component', () => {
    expect(typeof App).toBe('function');
  });
});
