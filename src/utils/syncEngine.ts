import { SyncTransaction, BusinessDevice, DevicePlatform, Sale } from '../types';

const OFFLINE_QUEUE_PREFIX = 'ebs_sync_queue_v13';
const LOCAL_DEVICE_KEY = 'ebs_local_device_info_v13';
const SIMULATED_OFFLINE_KEY = 'ebs_simulated_offline_mode';

/**
 * Detect client platform
 */
export function detectPlatform(): DevicePlatform {
  const ua = navigator.userAgent.toLowerCase();
  if (/android/.test(ua)) return 'android';
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/win/.test(ua)) return 'windows';
  if (/mac/.test(ua)) return 'macos';
  if (/linux/.test(ua)) return 'linux';
  return 'web';
}

/**
 * Get or initialize local device identity
 */
export function getLocalDeviceIdentity(defaultName?: string, defaultPlatform?: DevicePlatform): {
  id: string;
  name: string;
  platform: DevicePlatform;
} {
  try {
    const saved = localStorage.getItem(LOCAL_DEVICE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object' && parsed.id) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed reading local device identity', e);
  }

  const platform = defaultPlatform || detectPlatform();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const id = `DEV-${platform.toUpperCase().slice(0, 3)}-${randomSuffix}`;
  const name = defaultName || `${platform === 'android' ? 'Smartphone (Android)' : platform === 'windows' ? 'POS Kaunta (Windows)' : 'Kifaa cha Mfumo'} #${randomSuffix}`;

  const device = { id, name, platform };
  try {
    localStorage.setItem(LOCAL_DEVICE_KEY, JSON.stringify(device));
  } catch (e) {}

  return device;
}

/**
 * Set custom local device identity (e.g. for testing simulator)
 */
export function setLocalDeviceIdentity(id: string, name: string, platform: DevicePlatform) {
  try {
    localStorage.setItem(LOCAL_DEVICE_KEY, JSON.stringify({ id, name, platform }));
  } catch (e) {}
}

/**
 * Check if app is in simulated offline mode
 */
export function isSimulatedOffline(): boolean {
  try {
    return localStorage.getItem(SIMULATED_OFFLINE_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Set simulated offline mode
 */
export function setSimulatedOffline(offline: boolean) {
  try {
    localStorage.setItem(SIMULATED_OFFLINE_KEY, offline ? 'true' : 'false');
  } catch {}
}

/**
 * Check true connectivity (browser online AND not simulated offline)
 */
export function isSystemOnline(): boolean {
  if (isSimulatedOffline()) return false;
  return navigator.onLine;
}

/**
 * Generate a unique local transaction sequence ID:
 * Format: DEVICE-ID + LOCAL-SEQUENCE + TIMESTAMP
 */
export function generateLocalTransactionId(deviceId: string): string {
  const ts = Date.now();
  const seq = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${deviceId}-SEQ${seq}-${ts}`;
}

/**
 * Get offline queue from localStorage
 */
export function getOfflineQueue(businessId: string): SyncTransaction[] {
  try {
    const raw = localStorage.getItem(`${OFFLINE_QUEUE_PREFIX}_${businessId}`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to parse offline queue', e);
  }
  return [];
}

/**
 * Save offline queue
 */
export function saveOfflineQueue(businessId: string, queue: SyncTransaction[]) {
  try {
    localStorage.setItem(`${OFFLINE_QUEUE_PREFIX}_${businessId}`, JSON.stringify(queue));
  } catch (e) {
    console.error('Failed to save offline queue', e);
  }
}

/**
 * Enqueue a transaction for offline sync
 */
export function enqueueOfflineTransaction(
  businessId: string,
  transaction: Omit<SyncTransaction, 'syncStatus' | 'attemptCount' | 'createdAt' | 'updatedAt'>
): SyncTransaction {
  const queue = getOfflineQueue(businessId);
  const now = new Date().toISOString();

  const syncItem: SyncTransaction = {
    ...transaction,
    createdAt: now,
    updatedAt: now,
    syncStatus: 'pending',
    attemptCount: 0
  };

  queue.push(syncItem);
  saveOfflineQueue(businessId, queue);
  return syncItem;
}

/**
 * Push pending queue to Server API
 */
export async function pushSyncQueueToServer(
  businessId: string = 'biz_default',
  deviceId: string = getLocalDeviceIdentity()?.id || 'DEV-WEB-DEFAULT',
  token?: string
): Promise<{
  success: boolean;
  syncedCount: number;
  remainingCount: number;
  error?: string;
}> {
  if (!isSystemOnline()) {
    return { success: false, syncedCount: 0, remainingCount: getOfflineQueue(businessId).length, error: 'Offline' };
  }

  const queue = getOfflineQueue(businessId);
  if (queue.length === 0) {
    return { success: true, syncedCount: 0, remainingCount: 0 };
  }

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-device-id': deviceId,
      'x-business-id': businessId
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const baseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
    const res = await fetch(`${baseUrl}/api/sync/push`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        deviceId,
        transactions: queue
      })
    });

    if (!res.ok) {
      throw new Error(`Server returned status ${res.status}`);
    }

    const data = await res.json();
    const successfulLocalIds = new Set(
      data.results?.filter((r: any) => r.status === 'synced').map((r: any) => r.localId)
    );

    // Keep only failed items in queue
    const remainingQueue = queue.filter(item => !successfulLocalIds.has(item.localId));
    saveOfflineQueue(businessId, remainingQueue);

    return {
      success: true,
      syncedCount: successfulLocalIds.size,
      remainingCount: remainingQueue.length
    };
  } catch (err: any) {
    console.warn('[Sync Engine] Push failed:', err?.message);
    return {
      success: false,
      syncedCount: 0,
      remainingCount: queue.length,
      error: err?.message || 'Push sync failed'
    };
  }
}

/**
 * Pull delta from server
 */
export async function pullDeltaFromServer(
  businessId: string,
  deviceId: string,
  sinceTimestamp?: string,
  token?: string
): Promise<any> {
  if (!isSystemOnline()) return null;

  try {
    const headers: Record<string, string> = {
      'x-device-id': deviceId,
      'x-business-id': businessId
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const query = sinceTimestamp ? `?since=${encodeURIComponent(sinceTimestamp)}` : '';
    const res = await fetch(`/api/sync/pull${query}`, { headers });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.warn('[Sync Engine] Pull failed:', e);
    return null;
  }
}
