import { describe, it, expect } from 'vitest';
import appConfig from '../../app.json';

describe('Mobile App Shell & Configuration', () => {
  it('should have valid Expo app config name and slug', () => {
    expect(appConfig.expo.name).toBe('Study Karnataka');
    expect(appConfig.expo.slug).toBe('study-karnataka');
  });

  it('should configure iOS and Android package identifiers', () => {
    expect(appConfig.expo.ios.bundleIdentifier).toBe('com.studykarnataka.app');
    expect(appConfig.expo.android.package).toBe('com.studykarnataka.app');
  });
});
