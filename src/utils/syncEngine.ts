import { SyncTransaction, SyncStatus, BusinessDevice, DevicePlatform, Sale, LiveOverviewResponse } from '../types';

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
 * Helper to get clean API Base URL:
 * - In Web Browser & AI Studio Preview: Always returns '' (relative path /api/...)
 *   which connects cleanly to the active EBS Express/Vite backend on the same origin without CORS issues.
 * - In Native Shell (Capacitor Android / iOS): Uses saved server URL or VITE_API_BASE_URL.
 * - If user explicitly configured an external custom server (and not unreachable localhost on remote web):
 *   Uses that custom server.
 */
export function getApiBaseUrl(): string {
  if (typeof window === 'undefined') return '';

  const isNative =
    Boolean((window as any)?.Capacitor?.isNativePlatform?.()) ||
    window.location.protocol === 'capacitor:' ||
    window.location.protocol === 'file:';

  const saved = localStorage.getItem('ebs_server_url')?.trim();

  // If user explicitly configured a custom server in settings:
  if (saved && saved.startsWith('http')) {
    const isRemoteWeb = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
    const isSavedLocalhost = saved.includes('localhost') || saved.includes('127.0.0.1') || saved.includes('0.0.0.0');
    // Guard against unreachable localhost when running in remote web preview
    if (!(isRemoteWeb && isSavedLocalhost)) {
      return saved.replace(/\/$/, '');
    }
  }

  // If in native mobile shell (Android APK), use remote server URL from environment
  if (isNative) {
    const envUrl = ((import.meta as any).env?.VITE_API_BASE_URL || '').trim().replace(/\/$/, '');
    return envUrl;
  }

  // In Web Browser & AI Studio Preview: Always use relative path ('' -> /api/...)
  // This routes requests to the active EBS Express server running on the same origin
  return '';
}

/**
 * Push pending queue to Server API
 */
export async function pushSyncQueueToServer(
  businessId?: string,
  deviceId: string = getLocalDeviceIdentity()?.id || 'DEV-WEB-DEFAULT',
  token?: string
): Promise<{
  success: boolean;
  syncedCount: number;
  remainingCount: number;
  results?: { localId: string; globalId?: string; status: 'synced' | 'failed'; error?: string }[];
  error?: string;
}> {
  const activeBizId =
    businessId ||
    (typeof window !== 'undefined' ? localStorage.getItem('ebs_business_id') || undefined : undefined);

  if (!activeBizId || activeBizId.trim() === '' || activeBizId === 'biz_default' || activeBizId === 'Local') {
    return { success: false, syncedCount: 0, remainingCount: 0, error: 'Valid business ID is required' };
  }

  if (!isSystemOnline()) {
    return { success: false, syncedCount: 0, remainingCount: getOfflineQueue(activeBizId).length, error: 'Offline' };
  }

  const queue = getOfflineQueue(activeBizId);
  if (queue.length === 0) {
    return { success: true, syncedCount: 0, remainingCount: 0, results: [] };
  }

  try {
    // Transition pending items to 'syncing' state
    const queueWithSyncing = queue.map((item) => ({
      ...item,
      syncStatus: (item.syncStatus === 'synced' ? 'synced' : 'syncing') as SyncStatus,
      attemptCount: (item.attemptCount || 0) + 1,
      updatedAt: new Date().toISOString()
    }));
    saveOfflineQueue(activeBizId, queueWithSyncing);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-device-id': deviceId,
      'x-business-id': activeBizId
    };
    const activeToken = token || (typeof window !== 'undefined' ? localStorage.getItem('ebs_session_token') || undefined : undefined);
    if (activeToken) headers['Authorization'] = `Bearer ${activeToken}`;

    const baseUrl = getApiBaseUrl();
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
    const failedMap = new Map<string, string>(
      data.results?.filter((r: any) => r.status === 'failed').map((r: any) => [r.localId, r.error || 'Failed'])
    );

    // Keep only non-synced items in queue with updated failure status
    const remainingQueue = queue
      .filter(item => !successfulLocalIds.has(item.localId))
      .map(item => {
        if (failedMap.has(item.localId)) {
          return {
            ...item,
            syncStatus: 'failed' as const,
            lastError: failedMap.get(item.localId),
            updatedAt: new Date().toISOString()
          };
        }
        return item;
      });
    saveOfflineQueue(activeBizId, remainingQueue);

    return {
      success: true,
      syncedCount: successfulLocalIds.size,
      remainingCount: remainingQueue.length,
      results: data.results || []
    };
  } catch (err: any) {
    console.warn('[Sync Engine] Push failed:', err?.message);
    // Revert 'syncing' items back to 'pending' so next sync cycle safely retries
    const currentQueue = getOfflineQueue(activeBizId);
    const revertedQueue = currentQueue.map((item) => ({
      ...item,
      syncStatus: (item.syncStatus === 'syncing' ? 'pending' : item.syncStatus) as SyncStatus,
      updatedAt: new Date().toISOString()
    }));
    saveOfflineQueue(activeBizId, revertedQueue);

    return {
      success: false,
      syncedCount: 0,
      remainingCount: revertedQueue.length,
      error: err?.message || 'Push sync failed'
    };
  }
}

/**
 * Pull delta from server
 */
export async function pullDeltaFromServer(
  businessId?: string,
  deviceId: string = getLocalDeviceIdentity()?.id || 'DEV-WEB-DEFAULT',
  sinceTimestamp?: string,
  token?: string
): Promise<any> {
  const activeBizId =
    businessId ||
    (typeof window !== 'undefined' ? localStorage.getItem('ebs_business_id') || undefined : undefined);

  if (!activeBizId || activeBizId.trim() === '' || activeBizId === 'biz_default' || activeBizId === 'Local') {
    return null;
  }

  if (!isSystemOnline()) return null;

  try {
    const headers: Record<string, string> = {
      'x-device-id': deviceId,
      'x-business-id': activeBizId
    };
    const activeToken = token || (typeof window !== 'undefined' ? localStorage.getItem('ebs_session_token') || undefined : undefined);
    if (activeToken) headers['Authorization'] = `Bearer ${activeToken}`;

    const query = sinceTimestamp ? `?since=${encodeURIComponent(sinceTimestamp)}` : '';
    const baseUrl = getApiBaseUrl();
    const res = await fetch(`${baseUrl}/api/sync/pull${query}`, { headers });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.warn('[Sync Engine] Pull failed:', e);
    return null;
  }
}

/**
 * Fetch Boss Remote Live Overview from Server (/api/live/overview)
 * - Guarantees strict business isolation
 * - Non-blocking: returns null or safe object on network failure
 * - Supports token authorization and device identity headers
 */
export async function fetchRemoteLiveOverview(
  businessId?: string,
  token?: string,
  userRole?: string,
  userId?: string
): Promise<LiveOverviewResponse | null> {
  const activeBizId =
    businessId ||
    (typeof window !== 'undefined' ? localStorage.getItem('ebs_business_id') || undefined : undefined);

  if (!activeBizId || activeBizId.trim() === '' || activeBizId === 'biz_default' || activeBizId === 'Local') {
    return {
      businessId: '',
      timestamp: new Date().toISOString(),
      error: 'Business haijapatikana. Tafadhali hakikisha biashara halali imechaguliwa.',
      businessNotFound: true,
      metrics: {
        salesRevenue: 0,
        yesterdayRevenue: 0,
        monthRevenue: 0,
        grossProfit: 0,
        expensesTotal: 0,
        netProfit: 0,
        cashTotal: 0,
        mobileMoneyTotal: 0,
        cardBankTotal: 0,
        debtTotal: 0,
        transactionsCount: 0,
        yesterdayTransactionsCount: 0,
        monthTransactionsCount: 0,
        totalProducts: 0,
        lowStockCount: 0,
        outOfStockCount: 0,
        totalCustomers: 0,
        totalDebtsCount: 0,
        totalDebtBalance: 0,
        canViewProfit: false
      },
      activeDevicesCount: 0,
      totalDevicesCount: 0,
      devices: [],
      recentSales: []
    };
  }

  if (!isSystemOnline()) return null;

  try {
    const device = getLocalDeviceIdentity();
    const deviceId = device?.id || 'DEV-WEB-DEFAULT';
    const activeToken = token || (typeof window !== 'undefined' ? localStorage.getItem('ebs_session_token') || undefined : undefined);

    const headers: Record<string, string> = {
      'x-device-id': deviceId,
      'x-business-id': activeBizId
    };
    if (activeToken) headers['Authorization'] = `Bearer ${activeToken}`;

    let activeRole = userRole;
    let activeUserId = userId;
    if (typeof window !== 'undefined') {
      try {
        const storedUser = localStorage.getItem('ebs_user');
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          if (!activeRole) activeRole = parsed.role;
          if (!activeUserId) activeUserId = parsed.id;
        }
      } catch {}
    }
    if (activeRole) headers['x-user-role'] = activeRole;
    if (activeUserId) headers['x-user-id'] = activeUserId;

    const baseUrl = getApiBaseUrl();
    const res = await fetch(`${baseUrl}/api/live/overview`, { headers });
    
    if (!res.ok) {
      if (res.status === 404 || res.status === 403) {
        const errJson = await res.json().catch(() => ({}));
        return {
          businessId: activeBizId,
          timestamp: new Date().toISOString(),
          error: errJson.error || 'Biashara haijapatikana au huna idhini.',
          businessNotFound: true,
          metrics: {
            salesRevenue: 0,
            yesterdayRevenue: 0,
            monthRevenue: 0,
            grossProfit: 0,
            expensesTotal: 0,
            netProfit: 0,
            cashTotal: 0,
            mobileMoneyTotal: 0,
            cardBankTotal: 0,
            debtTotal: 0,
            transactionsCount: 0,
            yesterdayTransactionsCount: 0,
            monthTransactionsCount: 0,
            totalProducts: 0,
            lowStockCount: 0,
            outOfStockCount: 0,
            totalCustomers: 0,
            totalDebtsCount: 0,
            totalDebtBalance: 0,
            canViewProfit: false
          },
          activeDevicesCount: 0,
          totalDevicesCount: 0,
          devices: [],
          recentSales: []
        };
      }
      return null;
    }

    return await res.json();
  } catch (err: any) {
    console.warn('[Sync Engine] fetchRemoteLiveOverview warning:', err?.message || err);
    return null;
  }
}

/**
 * Register or upsert the current device on the server idempotently
 */
export async function registerCurrentDeviceOnServer(
  businessId?: string,
  user?: { id?: string; name?: string; role?: string },
  token?: string
): Promise<boolean> {
  const activeBizId =
    businessId ||
    (typeof window !== 'undefined' ? localStorage.getItem('ebs_business_id') || undefined : undefined);

  if (!activeBizId || activeBizId.trim() === '' || activeBizId === 'biz_default' || activeBizId === 'Local') {
    return false;
  }

  if (!isSystemOnline() || isSimulatedOffline()) {
    return false;
  }

  try {
    const device = getLocalDeviceIdentity();
    const baseUrl = getApiBaseUrl();
    const activeToken = token || (typeof window !== 'undefined' ? localStorage.getItem('ebs_session_token') || undefined : undefined);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-business-id': activeBizId,
      'x-device-id': device.id
    };
    if (activeToken) headers['Authorization'] = `Bearer ${activeToken}`;
    if (user?.role) headers['x-user-role'] = user.role;
    if (user?.id) headers['x-user-id'] = user.id;

    const res = await fetch(`${baseUrl}/api/devices/register`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        id: device.id,
        name: device.name,
        platform: device.platform,
        assignedUserId: user?.id,
        assignedUserName: user?.name ? `${user.name} (${user.role || 'staff'})` : undefined,
        assignedRole: user?.role
      })
    });

    return res.ok;
  } catch (err) {
    console.warn('[Sync Engine] Device auto-registration notice:', err);
    return false;
  }
}

/**
 * Send lightweight device heartbeat
 */
export async function sendDeviceHeartbeat(
  businessId?: string,
  user?: { id?: string; name?: string; role?: string },
  token?: string
): Promise<boolean> {
  const activeBizId =
    businessId ||
    (typeof window !== 'undefined' ? localStorage.getItem('ebs_business_id') || undefined : undefined);

  if (!activeBizId || activeBizId.trim() === '' || activeBizId === 'biz_default' || activeBizId === 'Local') {
    return false;
  }

  if (!isSystemOnline() || isSimulatedOffline()) {
    return false;
  }

  try {
    const device = getLocalDeviceIdentity();
    const baseUrl = getApiBaseUrl();
    const activeToken = token || (typeof window !== 'undefined' ? localStorage.getItem('ebs_session_token') || undefined : undefined);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-business-id': activeBizId,
      'x-device-id': device.id
    };
    if (activeToken) headers['Authorization'] = `Bearer ${activeToken}`;
    if (user?.role) headers['x-user-role'] = user.role;
    if (user?.id) headers['x-user-id'] = user.id;

    const res = await fetch(`${baseUrl}/api/devices/heartbeat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        deviceId: device.id,
        name: device.name,
        platform: device.platform,
        assignedUserId: user?.id,
        assignedUserName: user?.name ? `${user.name} (${user.role || 'staff'})` : undefined,
        assignedRole: user?.role
      })
    });

    return res.ok;
  } catch (err) {
    // Non-blocking
    return false;
  }
}

