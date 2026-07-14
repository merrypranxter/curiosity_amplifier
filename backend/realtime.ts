import { removeSubscriptionsByConnection } from './realtime-subscribers';

export const realtime = async (event: any) => {
  let msg: any = {};
  try { msg = JSON.parse(event.body || '{}'); } catch {}
  if (msg.type === 'system.connected') return { statusCode: 200 };
  if (msg.type === 'system.disconnected') {
    const connectionId = msg.payload?.connection_id;
    if (connectionId) await removeSubscriptionsByConnection(connectionId);
  }
  return { statusCode: 200 };
};
