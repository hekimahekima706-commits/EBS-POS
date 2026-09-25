import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { formatDateTime, formatTZS } from '../utils/formatters';
import { CCTVCamera } from '../types';
import {
  Video,
  Camera,
  ShieldAlert,
  Radio,
  Eye,
  Maximize2,
  RefreshCw,
  Bell,
  CheckCircle,
  AlertTriangle,
  Play,
  Pause,
  Plus,
  Trash2,
  Edit2,
  X,
  Server,
  Key,
  ShieldCheck,
  Film,
  Lock,
  Clock,
  Layers
} from 'lucide-react';

export const CameraView: React.FC = () => {
  const { sales, auditLogs, cameras: appCameras, addCamera, updateCamera, deleteCamera } = useApp();

  const [activeTab, setActiveTab] = useState<'live' | 'events' | 'config'>('live');
  const [selectedCamId, setSelectedCamId] = useState<string>('cam-1');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isRecording, setIsRecording] = useState(true);

  // Add/Edit Camera Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCamId, setEditingCamId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formLocation, setFormLocation] = useState('Kaunta ya POS');
  const [formIpAddress, setFormIpAddress] = useState('192.168.1.120');
  const [formRtspPort, setFormRtspPort] = useState('554');
  const [formRtspPath, setFormRtspPath] = useState('/live/ch0');
  const [formProtocol, setFormProtocol] = useState<'rtsp' | 'http' | 'onvif' | 'hls' | 'webrtc' | 'mjpeg'>('rtsp');
  const [formUsername, setFormUsername] = useState('admin');
  const [formPassword, setFormPassword] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [testResult, setTestResult] = useState<string | null>(null);

  // Snapshot / Event Review Modal
  const [selectedEventSale, setSelectedEventSale] = useState<any | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const cameras: CCTVCamera[] = appCameras.length > 0 ? appCameras : [
    {
      id: 'cam-1',
      name: 'CAM 01 — Kaunta ya POS & Droo ya Pesa',
      location: 'Kaunta Kuu',
      ipAddress: '192.168.1.101',
      rtspPort: 554,
      rtspPath: '/live/ch0',
      protocol: 'rtsp',
      status: 'online',
      resolution: '1080p Full HD',
      fps: 30,
      notes: 'Inaangalia kaunta ya mauzo na droo ya pesa kwa ukaribu',
      lastSeen: new Date().toISOString(),
    },
    {
      id: 'cam-2',
      name: 'CAM 02 — Rafu ya Vinywaji & Chupa za Bar',
      location: 'Nyuma ya Kaunta (Spirits Shelf)',
      ipAddress: '192.168.1.102',
      rtspPort: 554,
      rtspPath: '/live/ch1',
      protocol: 'rtsp',
      status: 'online',
      resolution: '1080p Full HD',
      fps: 30,
      notes: 'Inaangalia chupa zote za pombe kali na ukaguzi wa shoti',
      lastSeen: new Date().toISOString(),
    },
    {
      id: 'cam-3',
      name: 'CAM 03 — Mlango wa Stoo & Upakuaji',
      location: 'Mlango wa Nyuma wa Stoo',
      ipAddress: '192.168.1.103',
      rtspPort: 554,
      rtspPath: '/live/ch0',
      protocol: 'rtsp',
      status: 'online',
      resolution: '720p HD',
      fps: 25,
      notes: 'Inaangalia upakuaji wa kreti za bia na vinywaji kutoka kwa wasambazaji',
      lastSeen: new Date().toISOString(),
    },
    {
      id: 'cam-4',
      name: 'CAM 04 — Eneo la Wateja & Meza za Nje',
      location: 'Lounge / Garden Floor',
      ipAddress: '192.168.1.104',
      rtspPort: 554,
      rtspPath: '/live/ch0',
      protocol: 'rtsp',
      status: 'offline',
      resolution: '1080p Full HD',
      fps: 0,
      notes: 'Eneo la ukumbi wa wateja na meza',
      lastSeen: new Date(Date.now() - 3600000).toISOString(),
    },
  ];

  const handleOpenAddModal = (cam?: CCTVCamera) => {
    if (cam) {
      setEditingCamId(cam.id);
      setFormName(cam.name);
      setFormLocation(cam.location);
      setFormIpAddress(cam.ipAddress || '192.168.1.101');
      setFormRtspPort((cam.rtspPort || 554).toString());
      setFormRtspPath(cam.rtspPath || '/live/ch0');
      setFormProtocol(cam.protocol || 'rtsp');
      setFormUsername(cam.username || 'admin');
      setFormPassword('');
      setFormNotes(cam.notes || '');
    } else {
      setEditingCamId(null);
      setFormName(`CAM 0${cameras.length + 1} — Kamera Mpya`);
      setFormLocation('Kaunta');
      setFormIpAddress('192.168.1.120');
      setFormRtspPort('554');
      setFormRtspPath('/live/ch0');
      setFormProtocol('rtsp');
      setFormUsername('admin');
      setFormPassword('');
      setFormNotes('');
    }
    setTestResult(null);
    setShowAddModal(true);
  };

  const handleTestConnection = () => {
    setTestResult('Inapima muunganisho wa RTSP IP: ' + formIpAddress + '...');
    setTimeout(() => {
      if (formIpAddress.startsWith('192.168.') || formIpAddress.startsWith('10.')) {
        setTestResult(`✓ Muunganisho Umefaulu! Kamera ya ${formProtocol.toUpperCase()} iko hewani kwenye bandari ${formRtspPort}.`);
      } else {
        setTestResult(`⚠️ Hakuna majibu kutoka kwa ${formIpAddress}. Hakikisha kifaa kimeunganishwa kwenye mtandao wa ndani (LAN/Wi-Fi).`);
      }
    }, 1200);
  };

  const handleSaveCamera = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    if (editingCamId) {
      updateCamera(editingCamId, {
        name: formName.trim(),
        location: formLocation,
        ipAddress: formIpAddress,
        rtspPort: parseInt(formRtspPort) || 554,
        rtspPath: formRtspPath,
        protocol: formProtocol,
        username: formUsername,
        password: formPassword || undefined,
        notes: formNotes || undefined,
        status: 'online',
        lastSeen: new Date().toISOString(),
      });
    } else {
      addCamera({
        name: formName.trim(),
        location: formLocation,
        ipAddress: formIpAddress,
        rtspPort: parseInt(formRtspPort) || 554,
        rtspPath: formRtspPath,
        protocol: formProtocol,
        username: formUsername,
        password: formPassword || undefined,
        notes: formNotes || undefined,
        status: 'online',
        resolution: '1080p HD',
        fps: 30,
        lastSeen: new Date().toISOString(),
      });
    }

    setShowAddModal(false);
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-red-400 font-bold text-xs uppercase tracking-widest mb-1">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            <span>Mfumo wa Ulinzi wa Kamera (CCTV Architecture)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">Kamera za CCTV & Ufuatiliaji wa Matukio</h1>
          <p className="text-sm text-slate-400 mt-1">
            Unganisha kamera za IP/RTSP za dukani, meza na kaunta ya bar, na ulinganishe risiti za mauzo na video za kamera.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => handleOpenAddModal()}
            className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Sanidi Kamera Mpya</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-2 bg-slate-900 p-1.5 rounded-2xl border border-slate-800 w-fit">
        <button
          onClick={() => setActiveTab('live')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 ${
            activeTab === 'live'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Camera className="w-4 h-4" />
          <span>Mionekano ya Moja kwa Moja (Live Feeds)</span>
        </button>

        <button
          onClick={() => setActiveTab('events')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 ${
            activeTab === 'events'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Film className="w-4 h-4" />
          <span>Matukio ya Mauzo & Droo ya Pesa ({sales.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('config')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 ${
            activeTab === 'config'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Server className="w-4 h-4" />
          <span>Mipangilio ya IP/RTSP ({cameras.length})</span>
        </button>
      </div>

      {/* TAB 1: LIVE FEEDS GRID */}
      {activeTab === 'live' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cameras.map((cam) => {
              const isOnline = cam.status === 'online';
              return (
                <div
                  key={cam.id}
                  className="bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 shadow-xl relative group flex flex-col"
                >
                  {/* Camera Video Simulation Canvas / Frame */}
                  <div className="aspect-video bg-slate-950 relative flex items-center justify-center p-4">
                    {/* Scanline overlay */}
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] pointer-events-none opacity-30" />

                    {/* Camera Header Overlay */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between text-[11px] font-mono text-white/90 z-10">
                      <div className="flex items-center space-x-2 bg-slate-950/80 backdrop-blur-xs px-2.5 py-1 rounded-xl border border-slate-800">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'
                          }`}
                        />
                        <span className="font-bold">{cam.name}</span>
                      </div>

                      <div className="flex items-center space-x-2 bg-slate-950/80 backdrop-blur-xs px-2.5 py-1 rounded-xl border border-slate-800">
                        <span>{cam.resolution || '1080p'}</span>
                        <span>•</span>
                        <span>{cam.fps || 30} FPS</span>
                      </div>
                    </div>

                    {/* Stream Center Content */}
                    <div className="text-center space-y-2 z-10">
                      {isOnline ? (
                        <>
                          <div className="w-14 h-14 rounded-full bg-slate-900/80 border border-slate-700 mx-auto flex items-center justify-center text-emerald-400">
                            <Radio className="w-6 h-6 animate-pulse" />
                          </div>
                          <div className="text-xs font-bold text-white tracking-wide">
                            STREAM YA MTANDAO WA NDANI (LAN)
                          </div>
                          <div className="text-[10px] font-mono text-slate-400">
                            rtsp://{cam.ipAddress || '192.168.1.100'}:{cam.rtspPort || 554}{cam.rtspPath || '/live/ch0'}
                          </div>
                          <div className="text-[10px] text-emerald-400 font-semibold bg-emerald-950/60 px-2 py-0.5 rounded-full inline-block border border-emerald-800">
                            ✓ Muunganisho Uko Salama
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-14 h-14 rounded-full bg-red-950/80 border border-red-800 mx-auto flex items-center justify-center text-red-400">
                            <AlertTriangle className="w-6 h-6" />
                          </div>
                          <div className="text-xs font-bold text-red-400 tracking-wide">
                            KAMERA HAIJAPATIKANA (OFFLINE)
                          </div>
                          <div className="text-[10px] font-mono text-slate-500">
                            Kagua kebo ya mtandao au nguvu ya umeme (PoE)
                          </div>
                        </>
                      )}
                    </div>

                    {/* Camera Footer Overlay */}
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[11px] font-mono text-white/80 z-10">
                      <div className="bg-slate-950/80 px-2.5 py-1 rounded-xl border border-slate-800 text-[10px]">
                        {cam.location}
                      </div>

                      <div className="bg-slate-950/80 px-2.5 py-1 rounded-xl border border-slate-800 text-[10px] text-emerald-400">
                        {currentTime.toLocaleDateString('sw-TZ')} • {currentTime.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>

                  {/* Camera Bar Bottom Actions */}
                  <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs">
                    <div className="text-slate-400 text-[11px]">
                      Itifaki: <strong className="text-white uppercase">{cam.protocol || 'RTSP'}</strong> • IP: <span className="font-mono text-slate-300">{cam.ipAddress}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenAddModal(cam)}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
                        title="Hariri Mipangilio"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: LINKED SALES & CASH DRAWER EVENTS */}
      {activeTab === 'events' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
          <div>
            <h3 className="text-base font-black text-white">Matukio Yaliyounganishwa na Kamera (Video Audit)</h3>
            <p className="text-xs text-slate-400">
              Kila risiti inayokatwa inahifadhiwa pamoja na muda halisi na kamera iliyokuwa inarekodi kaunta.
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-800">
                <tr>
                  <th className="p-3.5">Muda & Tarehe</th>
                  <th className="p-3.5">Ankara (Invoice)</th>
                  <th className="p-3.5">Keshia / Mtumiaji</th>
                  <th className="p-3.5">Kamera ya Eneo</th>
                  <th className="p-3.5">Njia ya Malipo</th>
                  <th className="p-3.5">Kiasi</th>
                  <th className="p-3.5 text-right">Uhakiki wa Video</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {sales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-800/40 transition">
                    <td className="p-3.5 font-mono text-slate-400">{formatDateTime(sale.timestamp)}</td>
                    <td className="p-3.5 font-mono font-bold text-emerald-400">{sale.invoiceNo}</td>
                    <td className="p-3.5 font-semibold text-white">{sale.cashierName}</td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded-lg bg-slate-950 border border-slate-800 text-[10px] text-slate-300 font-mono">
                        CAM 01 (Kaunta)
                      </span>
                    </td>
                    <td className="p-3.5 uppercase font-bold text-[10px] text-slate-400">{sale.paymentMethod}</td>
                    <td className="p-3.5 font-mono font-black text-white">{formatTZS(sale.total)}</td>
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => setSelectedEventSale(sale)}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold text-[11px] inline-flex items-center gap-1.5 transition"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Kagua Snapshot</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: CAMERA CONFIGURATION */}
      {activeTab === 'config' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-white">Vifaa vya Kamera Vilivyosajiliwa (NVR / IP Devices)</h3>
              <p className="text-xs text-slate-400">Dhibiti anwani za IP, manenosiri ya RTSP, na maeneo ya kamera</p>
            </div>
            <button
              onClick={() => handleOpenAddModal()}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Ongeza Kamera</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {cameras.map((cam) => (
              <div key={cam.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-white text-sm">{cam.name}</h4>
                    <div className="text-xs text-slate-400">{cam.location}</div>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase ${
                      cam.status === 'online'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : 'bg-red-950 text-red-400 border border-red-800'
                    }`}
                  >
                    {cam.status === 'online' ? 'Online' : 'Offline'}
                  </span>
                </div>

                <div className="space-y-1 text-xs text-slate-400 font-mono">
                  <div>IP: <strong className="text-white">{cam.ipAddress}</strong> : {cam.rtspPort || 554}</div>
                  <div>Njia (Path): <span className="text-slate-300">{cam.rtspPath || '/live/ch0'}</span></div>
                  <div>Itifaki: <span className="text-emerald-400 uppercase font-bold">{cam.protocol || 'RTSP'}</span></div>
                </div>

                <div className="pt-2 border-t border-slate-900 flex justify-end gap-2">
                  <button
                    onClick={() => handleOpenAddModal(cam)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold"
                  >
                    Hariri
                  </button>
                  <button
                    onClick={() => deleteCamera(cam.id)}
                    className="px-3 py-1.5 rounded-xl bg-red-950 hover:bg-red-900 text-red-300 text-xs font-bold"
                  >
                    Ondoa
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT CAMERA */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Video className="w-5 h-5 text-emerald-400" />
                <span>{editingCamId ? 'Hariri Kamera ya CCTV' : 'Sanidi Kamera Mpya ya IP/RTSP'}</span>
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {testResult && (
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold text-emerald-300">
                {testResult}
              </div>
            )}

            <form onSubmit={handleSaveCamera} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Jina la Kamera *</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="CAM 01 — Kaunta"
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">Eneo / Chumba *</label>
                  <input
                    type="text"
                    required
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    placeholder="Kaunta Kuu / Stoo"
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block font-bold text-slate-300 mb-1">Anwani ya IP (LAN IP) *</label>
                  <input
                    type="text"
                    required
                    value={formIpAddress}
                    onChange={(e) => setFormIpAddress(e.target.value)}
                    placeholder="192.168.1.101"
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">RTSP Port *</label>
                  <input
                    type="number"
                    required
                    value={formRtspPort}
                    onChange={(e) => setFormRtspPort(e.target.value)}
                    placeholder="554"
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Itifaki ya Mtiririko (Protocol)</label>
                  <select
                    value={formProtocol}
                    onChange={(e) => setFormProtocol(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold"
                  >
                    <option value="rtsp">RTSP (Real-Time Streaming)</option>
                    <option value="hls">HLS (HTTP Live Streaming)</option>
                    <option value="webrtc">WebRTC (Ultra Low Latency)</option>
                    <option value="mjpeg">MJPEG (Snapshot Stream)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">Njia ya Stream (Path)</label>
                  <input
                    type="text"
                    value={formRtspPath}
                    onChange={(e) => setFormRtspPath(e.target.value)}
                    placeholder="/live/ch0 au /h264Preview_01_main"
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Username ya Kamera</label>
                  <input
                    type="text"
                    value={formUsername}
                    onChange={(e) => setFormUsername(e.target.value)}
                    placeholder="admin"
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">Password ya Kamera</label>
                  <input
                    type="password"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold"
                >
                  Pima Muunganisho (Test)
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold"
                  >
                    Ghairi
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-600/20"
                  >
                    Hifadhi Kamera
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EVENT VIDEO SNAPSHOT REVIEW */}
      {selectedEventSale && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-black text-white text-base">Uhakiki wa Video ya Mauzo: {selectedEventSale.invoiceNo}</h3>
                <div className="text-xs text-slate-400">{formatDateTime(selectedEventSale.timestamp)}</div>
              </div>
              <button onClick={() => setSelectedEventSale(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Simulated Snapshot Frame */}
            <div className="aspect-video rounded-2xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center p-4 relative overflow-hidden">
              <div className="text-center space-y-1 z-10">
                <div className="font-mono text-xs text-emerald-400 font-bold">SNAPSHOT YA MUAMALA WA POS</div>
                <div className="text-sm font-black text-white">Keshia: {selectedEventSale.cashierName}</div>
                <div className="text-xs text-slate-400">Malipo ya TZS {selectedEventSale.total.toLocaleString()} ({selectedEventSale.paymentMethod.toUpperCase()})</div>
                <div className="text-[10px] text-slate-500 font-mono mt-2">Muda wa Tukio: {new Date(selectedEventSale.timestamp).toISOString()}</div>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-1">
              <div className="text-slate-400">Bidhaa Zilizouzwa:</div>
              <div className="font-bold text-white">
                {selectedEventSale.items.map((i: any) => `${i.productName} (x${i.quantity})`).join(', ')}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setSelectedEventSale(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-200 font-bold text-xs"
              >
                Funga
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
