import { db, ws, json, error } from '@appdeploy/sdk';

const SUBSCRIPTIONS_TABLE = 'entity_subscriptions';
type SubscriptionRecord = { id: string; entity_type: string; entity_id: string; connection_id: string; created_at: number };

async function listSubscriptions(): Promise<SubscriptionRecord[]> {
  const { items } = await db.list(SUBSCRIPTIONS_TABLE, { limit: 1000 });
  return items as SubscriptionRecord[];
}

export async function removeSubscriptionsByConnection(connectionId: string) {
  const ids = (await listSubscriptions()).filter((item) => item.connection_id === connectionId).map((item) => item.id);
  if (ids.length) await db.delete(SUBSCRIPTIONS_TABLE, ids);
}

async function addSubscription(entityType: string, entityId: string, connectionId: string) {
  await db.add(SUBSCRIPTIONS_TABLE, [{ entity_type: entityType, entity_id: entityId, connection_id: connectionId, created_at: Date.now() }]);
}

async function removeSubscriptions(entityType: string, entityId: string, connectionId: string) {
  const ids = (await listSubscriptions()).filter((item) => item.entity_type === entityType && item.entity_id === entityId && item.connection_id === connectionId).map((item) => item.id);
  if (ids.length) await db.delete(SUBSCRIPTIONS_TABLE, ids);
}

export async function notifySubscribers(entityType: string, entityId: string, payload: unknown, excludeConnectionId?: string) {
  const targets = (await listSubscriptions()).filter((item) => item.entity_type === entityType && item.entity_id === entityId).map((item) => item.connection_id).filter((id) => id !== excludeConnectionId);
  const ids = Array.from(new Set(targets));
  if (ids.length) await ws.send(ids, { v: 1, type: 'entity.update', payload: { entity_type: entityType, entity_id: entityId, data: payload } });
}

export const realtimeSubscriptionRoutes = {
  'POST /api/subscriptions': [async ({ body }) => {
    const { entity_type, entity_id, connection_id } = (body || {}) as Record<string, string>;
    if (!entity_type || !entity_id || !connection_id) return error('entity_type, entity_id, connection_id are required');
    await addSubscription(entity_type, entity_id, connection_id);
    return json({ ok: true });
  }],
  'POST /api/subscriptions/remove': [async ({ body }) => {
    const { entity_type, entity_id, connection_id } = (body || {}) as Record<string, string>;
    if (!entity_type || !entity_id || !connection_id) return error('entity_type, entity_id, connection_id are required');
    await removeSubscriptions(entity_type, entity_id, connection_id);
    return json({ ok: true });
  }],
};
