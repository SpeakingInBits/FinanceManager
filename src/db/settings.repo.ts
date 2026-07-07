import { getDb } from './client';

export async function getSetting<V>(key: string): Promise<V | undefined> {
  const db = await getDb();
  const entry = await db.get('settings', key);
  return entry?.value as V | undefined;
}

export async function setSetting<V>(key: string, value: V): Promise<void> {
  const db = await getDb();
  await db.put('settings', { key, value });
}
