import { Router } from 'express';
import { z } from 'zod';

const healthResponseSchema = z.object({
  status: z.literal('ok'),
});

type GetHealth = () => Promise<{ status: 'ok' }>;

export const createHealthRouter = (getHealth: GetHealth): Router => {
  const router = Router();

  router.get('/health', async (_request, response, next) => {
    try {
      const health = healthResponseSchema.parse(await getHealth());

      response.status(200).json(health);
    } catch (error) {
      next(error);
    }
  });

  return router;
};
