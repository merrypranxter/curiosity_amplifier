import { router, json, error } from '@appdeploy/sdk';
import { recommend } from './curiosity';
import { realtimeSubscriptionRoutes } from './realtime-subscribers';

export const handler = router({
  'GET /api/_healthcheck': [async () => json({ message: 'Success' })],
  'POST /api/recommend': [async ({ body }) => {
    try {
      const payload = (body || {}) as Record<string, unknown>;
      const interests = Array.isArray(payload.interests) ? payload.interests : [];
      if (!payload.serendipity && interests.length === 0) return error('At least one interest is required', 400);
      return json(await recommend(payload));
    } catch (err) {
      console.error('recommendation_failed', err);
      const rpcError = err as { statusCode?: number; responseText?: string };
      if (rpcError?.statusCode === 429) return error('The curiosity engine is briefly rate-limited. Try again in a moment.', 429);
      return error('The curiosity engine failed to assemble a complete bundle.', 502);
    }
  }],
  ...realtimeSubscriptionRoutes,
});
