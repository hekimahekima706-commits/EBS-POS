import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { BusinessDevice, DevicePlatform, SyncTransaction } from '../types';
import {
  Smartphone,
  Laptop,
  Monitor,
  Tablet,
  Globe,
  Wifi,
  WifiOff,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  Trash2,
  Plus,
  Edit2,
  CheckCircle2,
  Clock,
  ArrowRightLeft,
  Server,
  Zap,
  HardDrive,
  UserCheck,
  AlertTriangle,
  QrCode,
  Radio
} from 'lucide-react';
import {
  getLocalDeviceIdentity,
  setLocalDeviceIdentity,
  isSimulatedOffline,
  setSimulatedOffline,
  getOfflineQueue,
  pushSyncQueueToServer,
  pullDeltaFromServer
} from '../utils/syncEngine';

interface DevicesViewProps {
  onNavigate?: (view: string) => void;
}

export const DevicesView: React.FC<DevicesViewProps> = ({ onNavigate }) => {
  const {
    currentUser,
    users,
    logAction,
    profile
  } = useApp();

  const [devices, setDevices] = useState<BusinessDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [offlineSimulated, setOfflineSimulatedState] = useState<boolean>(isSimulatedOffline());
  const [syncQueue, setSyncQueue] = useState<SyncTransaction[]>([]);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Local device state
  const [currentDevice, setCurrentDevice] = useState(() => getLocalDeviceIdentity());

  // Modal states
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<BusinessDevice | null>(null);

  // New device form
  const [newDeviceName, setNewDeviceName] = useState('');
  const [newDevicePlatform, setNewDevicePlatform] = useState<DevicePlatform>('android');
  const [newDeviceAssignedUser, setNewDeviceAssignedUser] = useState<string>('');

  // Edit device form
  const [editDeviceName, setEditDeviceName] = useState('');
  const [editDevicePlatform, setEditDevicePlatform] = useState<DevicePlatform>('android');

  const businessId = (profile as any).id || 'EBS-BIZ-000001';

  // Load devices from server
  const fetchDevices = async () => {
    try {
      setLoading(true);
      const baseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
      const res = await fetch(`${baseUrl}/api/devices`, {
        headers: {
          'x-business-id': businessId,
          'x-device-id': currentDevice.id
        }
      });
      if (res.ok) {
        const data = await res.json();
        setDevices(data);
      }
    } catch (e) {
      console.warn('Failed fetching devices from server:', e);
    } finally {
      setLoading(false);
    }
  };

  // Refresh sync queue count
  const refreshQueue = () => {
    const queue = getOfflineQueue(businessId);
    setSyncQueue(queue);
  };

  useEffect(() => {
    fetchDevices();
    refreshQueue();
    const interval = setInterval(() => {
      refreshQueue();
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Handle Manual Sync
  const handleManualSync = async () => {
    setSyncing(true);
    setSyncFeedback(null);
    try {
      const pushRes = await pushSyncQueueToServer(businessId, currentDevice.id);
      const pullRes = await pullDeltaFromServer(businessId, currentDevice.id);

      refreshQueue();
      await fetchDevices();

      if (pushRes.success) {
        setSyncFeedback(`Sawazisho limekamilika: Miamala ${pushRes.syncedCount} imetumwa, mfumo umesasishwa.`);
      } else {
        setSyncFeedback(pushRes.error === 'Offline' ? 'Kifaa kiko Offline — miamala imehifadhiwa kwenye stoo ya ndani.' : `Hitilafu ya kusawazisha: ${pushRes.error}`);
      }
    } catch (err: any) {
      setSyncFeedback(`Hitilafu ya muunganisho: ${err?.message || 'Server haipatikani'}`);
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncFeedback(null), 5000);
    }
  };

  // Toggle Simulated Offline Mode
  const handleToggleOffline = () => {
    const nextState = !offlineSimulated;
    setSimulatedOffline(nextState);
    setOfflineSimulatedState(nextState);
    logAction('SYSTEM_CONNECTIVITY_TOGGLE', `Hali ya mtandao imebadilishwa kuwa: ${nextState ? 'SIMULATED OFFLINE' : 'ONLINE'}`, 'setting');
  };

  // Revoke device
  const handleRevokeDevice = async (device: BusinessDevice) => {
    if (!window.confirm(`Una uhakika unataka KUFUTA IDHINI ya kifaa "${device.name}" (${device.id})? Mtumiaji hataweza tena kuingia au kufanya mauzo kupitia kifaa hiki.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/devices/${device.id}/revoke`, {
        method: 'POST',
        headers: {
          'x-business-id': businessId,
          'x-device-id': currentDevice.id
        }
      });
      if (res.ok) {
        logAction('DEVICE_REVOKED', `Idhini ya kifaa ${device.name} (${device.id}) imefutwa`, 'device', device.id);
        await fetchDevices();
      }
    } catch (err) {
      alert('Hitilafu wakati wa kuzuia kifaa.');
    }
  };

  // Switch Active Simulated Device
  const handleSwitchSimulatorDevice = (device: BusinessDevice) => {
    setLocalDeviceIdentity(device.id, device.name, device.platform);
    setCurrentDevice({
      id: device.id,
      name: device.name,
      platform: device.platform
    });
    logAction('DEVICE_SWITCHED_SIMULATOR', `Kifaa cha majaribio kimebadilishwa kuwa: ${device.name} (${device.platform})`, 'setting');
  };

  // Register New Device
  const handleRegisterDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeviceName.trim()) return;

    const assignedUserObj = users.find(u => u.id === newDeviceAssignedUser);

    try {
      const baseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
      const res = await fetch(`${baseUrl}/api/devices/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-business-id': businessId,
          'x-device-id': currentDevice.id
        },
        body: JSON.stringify({
          name: newDeviceName,
          platform: newDevicePlatform,
          assignedUserId: assignedUserObj?.id,
          assignedUserName: assignedUserObj ? `${assignedUserObj.name} (${assignedUserObj.role})` : undefined,
          assignedRole: assignedUserObj?.role
        })
      });

      if (res.ok) {
        setShowRegisterModal(false);
        setNewDeviceName('');
        setNewDeviceAssignedUser('');
        await fetchDevices();
      }
    } catch (err) {
      alert('Hitilafu wakati wa kusajili kifaa.');
    }
  };

  // Update Device
  const handleUpdateDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDevice || !editDeviceName.trim()) return;

    try {
      const res = await fetch(`/api/devices/${selectedDevice.id}/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-business-id': businessId,
          'x-device-id': currentDevice.id
        },
        body: JSON.stringify({
          name: editDeviceName,
          platform: editDevicePlatform
        })
      });

      if (res.ok) {
        setShowEditModal(false);
        setSelectedDevice(null);
        await fetchDevices();
      }
    } catch (err) {
      alert('Hitilafu wakati wa kubadilisha kifaa.');
    }
  };

  const getPlatformIcon = (platform: DevicePlatform) => {
    switch (platform) {
      case 'android':
        return <Smartphone className="w-4 h-4 text-emerald-400" />;
      case 'windows':
        return <Laptop className="w-4 h-4 text-blue-400" />;
      case 'ios':
        return <Smartphone className="w-4 h-4 text-slate-300" />;
      case 'macos':
        return <Laptop className="w-4 h-4 text-slate-300" />;
      case 'pos':
        return <Monitor className="w-4 h-4 text-amber-400" />;
      default:
        return <Globe className="w-4 h-4 text-purple-400" />;
    }
  };

  const activeDevicesCount = devices.filter(d => !d.isRevoked && d.status === 'online').length;
  const isOwnerOrManager = currentUser.role === 'owner' || currentUser.role === 'manager' || currentUser.role === 'admin';

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                Usimamizi wa Vifaa & Sync
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-400 font-mono font-bold border border-emerald-800">
                  EBS V1.3.0
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Simu za Android, Windows POS, Kompyuta kibao na Muunganisho wa Kati wa Biashara
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Simulate Offline Button */}
          <button
            onClick={handleToggleOffline}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition border ${
              offlineSimulated
                ? 'bg-amber-950/80 text-amber-300 border-amber-800 hover:bg-amber-900/80'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            {offlineSimulated ? (
              <>
                <WifiOff className="w-4 h-4 text-amber-400" />
                <span>Simulated Offline (WASHA)</span>
              </>
            ) : (
              <>
                <Wifi className="w-4 h-4 text-emerald-400" />
                <span>Mtandao Uko LIVE</span>
              </>
            )}
          </button>

          {/* Manual Sync Button */}
          <button
            onClick={handleManualSync}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/20 transition active:scale-95"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Inasawazisha...' : 'Sawazisha Sasa (Sync)'}</span>
          </button>

          {isOwnerOrManager && (
            <button
              onClick={() => setShowRegisterModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/20 transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Sajili Kifaa Kipya</span>
            </button>
          )}
        </div>
      </div>

      {/* Sync Feedback Toast */}
      {syncFeedback && (
        <div className="p-3.5 bg-slate-900 border border-emerald-500/40 rounded-2xl flex items-center justify-between text-xs text-emerald-300 animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{syncFeedback}</span>
          </div>
          <button onClick={() => setSyncFeedback(null)} className="text-slate-400 hover:text-white">
            &times;
          </button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Vifaa Vilivyosajiliwa</div>
            <div className="text-2xl font-black text-white mt-1">{devices.length}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Katika biashara nzima</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-950/60 border border-blue-800 text-blue-400 flex items-center justify-center">
            <Laptop className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Vifaa Vilivyo Hewani</div>
            <div className="text-2xl font-black text-emerald-400 mt-1">{activeDevicesCount}</div>
            <div className="text-[11px] text-emerald-500/90 mt-0.5">Live heartbeat connection</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-400 flex items-center justify-center">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Miamala ya Offline Queue</div>
            <div className="text-2xl font-black text-amber-400 mt-1">{syncQueue.length}</div>
            <div className="text-[11px] text-amber-500/90 mt-0.5">Inasubiri kutumwa server</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-950/60 border border-amber-800 text-amber-400 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Kifaa Hiki (Current)</div>
            <div className="text-sm font-bold text-white mt-1 truncate max-w-[130px]">{currentDevice.name}</div>
            <div className="text-[11px] text-slate-400 font-mono mt-0.5">{currentDevice.id}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-950/60 border border-purple-800 text-purple-400 flex items-center justify-center">
            {getPlatformIcon(currentDevice.platform)}
          </div>
        </div>
      </div>

      {/* Multi-Device Testing Simulator Switcher */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">
              Kijaribu cha Vifaa Vingi (Multi-Device Simulator Switcher)
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">
            Bofya kifaa chochote hapa chini kuiga utendaji wake mara moja:
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {devices.map(dev => {
            const isCurrent = dev.id === currentDevice.id;
            return (
              <button
                key={dev.id}
                onClick={() => handleSwitchSimulatorDevice(dev)}
                className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between ${
                  isCurrent
                    ? 'bg-emerald-950/60 border-emerald-500 text-white shadow-md shadow-emerald-950'
                    : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/80 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    {getPlatformIcon(dev.platform)}
                    <span className="truncate">{dev.platform.toUpperCase()}</span>
                  </div>
                  {isCurrent && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-black">
                      ACTIVE
                    </span>
                  )}
                </div>
                <div className="text-xs font-semibold text-white truncate leading-tight">
                  {dev.name}
                </div>
                <div className="text-[10px] text-slate-400 mt-1 truncate">
                  {dev.assignedUserName || 'Hajapangiwa'}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Registered Devices List Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>Orodha ya Vifaa Vyote Vilivyosajiliwa</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                {devices.length}
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Usimamizi wa usalama, idhini za kufanya mauzo na kumbukumbu za kuingia
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchDevices}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
              title="Pakia upya vifaa"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Kifaa & Namba ya Kitambulisho</th>
                <th className="py-3.5 px-4">Aina ya Kifaa (OS)</th>
                <th className="py-3.5 px-4">Mtumiaji Aliyepangiwa</th>
                <th className="py-3.5 px-4">Toleo (App/DB)</th>
                <th className="py-3.5 px-4">Hali (Status)</th>
                <th className="py-3.5 px-4">Mwisho Kuonekana</th>
                <th className="py-3.5 px-4 text-right">Vitendo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {devices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Hakuna vifaa vilivyosajiliwa kwa sasa.
                  </td>
                </tr>
              ) : (
                devices.map((device) => {
                  const isCurrent = device.id === currentDevice.id;
                  const isRevoked = device.isRevoked;

                  return (
                    <tr
                      key={device.id}
                      className={`hover:bg-slate-800/40 transition ${
                        isCurrent ? 'bg-emerald-950/20' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center shrink-0">
                            {getPlatformIcon(device.platform)}
                          </div>
                          <div>
                            <div className="font-bold text-white flex items-center gap-1.5">
                              <span>{device.name}</span>
                              {isCurrent && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-600 text-white font-bold">
                                  Hiki
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                              {device.id} • IP: {device.ipAddress || '192.168.1.1xx'}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="capitalize text-slate-200 font-medium">
                          {device.platform}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        {device.assignedUserName ? (
                          <div>
                            <div className="font-semibold text-slate-200">{device.assignedUserName}</div>
                            <div className="text-[10px] text-slate-400 capitalize">{device.assignedRole || 'Cashier'}</div>
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">Hajapangiwa</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-300">
                        {device.appVersion || 'v1.3.0'} / {device.databaseVersion || 'v1.3.0'}
                      </td>

                      <td className="py-3.5 px-4">
                        {isRevoked ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-950 text-red-400 border border-red-800">
                            <ShieldAlert className="w-3 h-3" />
                            Kimezuiwa (Revoked)
                          </span>
                        ) : device.status === 'online' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                            Hewani (Online)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                            Offline
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                        {device.lastActive ? new Date(device.lastActive).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                        <div className="text-[10px] text-slate-500">
                          {device.lastSync ? `Sync: ${new Date(device.lastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Edit device button */}
                          <button
                            onClick={() => {
                              setSelectedDevice(device);
                              setEditDeviceName(device.name);
                              setEditDevicePlatform(device.platform);
                              setShowEditModal(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                            title="Hariri Jina / Aina"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Revoke button */}
                          {isOwnerOrManager && !isRevoked && (
                            <button
                              onClick={() => handleRevokeDevice(device)}
                              className="p-1.5 text-red-400 hover:text-red-300 rounded-lg hover:bg-red-950/40 transition"
                              title="Futa Idhini ya Kifaa Hiki (Revoke Access)"
                            >
                              <ShieldAlert className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Offline Sync Queue Inspector */}
      {syncQueue.length > 0 && (
        <div className="bg-slate-900 border border-amber-800/40 rounded-3xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white">
                Miamala Inayosubiri Kwenye Stoo ya Ndani ({syncQueue.length})
              </h3>
            </div>
            <button
              onClick={handleManualSync}
              className="text-xs text-amber-400 hover:underline font-bold"
            >
              Tuma Zote Sasa
            </button>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto">
            {syncQueue.map((tx) => (
              <div
                key={tx.localId}
                className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800 text-xs flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <span className="font-mono text-amber-400">{tx.localId}</span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 uppercase">
                      {tx.entityType}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Imerekodiwa: {new Date(tx.createdAt).toLocaleTimeString()} na {tx.userName}
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800 font-semibold">
                  Inasubiri Sync
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Register New Device Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-emerald-400" />
                Sajili Kifaa Kipya
              </h3>
              <button
                onClick={() => setShowRegisterModal(false)}
                className="text-slate-400 hover:text-white"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleRegisterDevice} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Jina la Kifaa (Device Name)
                </label>
                <input
                  type="text"
                  required
                  placeholder="mfano: Simu ya Kaunta (Samsung A15)"
                  value={newDeviceName}
                  onChange={(e) => setNewDeviceName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Mfumo Endeshi (Platform)
                </label>
                <select
                  value={newDevicePlatform}
                  onChange={(e) => setNewDevicePlatform(e.target.value as DevicePlatform)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs"
                >
                  <option value="android">Android (Smartphone / Tablet)</option>
                  <option value="windows">Windows 10 / 11 (Kaunta POS)</option>
                  <option value="ios">iOS (iPhone / iPad)</option>
                  <option value="web">Web Browser / Desktop</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Mtumiaji Aliyepangiwa (Si lazima)
                </label>
                <select
                  value={newDeviceAssignedUser}
                  onChange={(e) => setNewDeviceAssignedUser(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs"
                >
                  <option value="">-- Hakuna (Kifaa cha Pamoja) --</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
                >
                  Ghairi
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold"
                >
                  Hifadhi Kifaa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Device Modal */}
      {showEditModal && selectedDevice && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-blue-400" />
                Hariri Kifaa ({selectedDevice.id})
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-white"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleUpdateDevice} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Jina la Kifaa
                </label>
                <input
                  type="text"
                  required
                  value={editDeviceName}
                  onChange={(e) => setEditDeviceName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Platform
                </label>
                <select
                  value={editDevicePlatform}
                  onChange={(e) => setEditDevicePlatform(e.target.value as DevicePlatform)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs"
                >
                  <option value="android">Android</option>
                  <option value="windows">Windows</option>
                  <option value="ios">iOS</option>
                  <option value="web">Web</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
                >
                  Ghairi
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold"
                >
                  Sasisha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
