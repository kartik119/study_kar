// @ts-nocheck
import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { app } from '../app';

// Mock database health check for unit integration testing
vi.mock('@study-karnataka/database', () => ({
  checkDatabaseHealth: vi.fn().mockResolvedValue(true),
}));

describe('Health Endpoints', () => {
  it('GET /health should return 200 with HealthStatus schema', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.api).toBe(true);
    expect(res.body.data.database).toBe(true);
    expect(res.body.data.status).toBe('ok');
    expect(res.body.data.version).toBeDefined();
    expect(res.body.data.timestamp).toBeDefined();
  });

  it('GET /api/v1/health should return identical 200 payload', async () => {
    const res = await request(app).get('/api/v1/health');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.api).toBe(true);
    expect(res.body.data.database).toBe(true);
  });
});
