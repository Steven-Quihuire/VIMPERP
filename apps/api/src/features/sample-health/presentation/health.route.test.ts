import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../../../app/create-app';

describe('GET /health', () => {
  it('returns 200', async () => {
    const app = createApp({
      healthGateway: {
        ping: () => Promise.resolve(),
      },
    });

    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });
});
