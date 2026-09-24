import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { formatTZS, formatDateTime } from '../utils/formatters';
import {
  Calendar as CalendarIcon,
  Plus,
  Clock,
  Truck,
  Users,
  AlertCircle,
  FileCheck,
  ExternalLink,
  CheckCircle,
  CalendarDays,
  X,
  RefreshCw,
  Trash2,
  Lock,
  LogOut,
  Sparkles,
  Check
} from 'lucide-react';
import {
  initAuth,
  googleSignIn,
  googleSignOut,
  getAccessToken,
  fetchGoogleCalendarEvents,
  insertGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
  GoogleCalendarEventItem,
  WORKSPACE_SCOPES
} from '../utils/googleWorkspaceAuth';
import { User } from 'firebase/auth';

interface BusinessEvent {
  id: string;
  title: string;
  type: 'supplier' | 'debt_due' | 'staff_shift' | 'tax_compliance';
  date: string;
  time: string;
  description: string;
  assignedTo?: string;
  status: 'upcoming' | 'completed';
  googleEventId?: string;
  syncedToGoogle?: boolean;
}

export const GoogleCalendarView: React.FC = () => {
  const { suppliers, debts, users } = useApp();

  // Authentication State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Calendar sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [googleCalendarEvents, setGoogleCalendarEvents] = useState<GoogleCalendarEventItem[]>([]);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);

  // Business events state
  const [events, setEvents] = useState<BusinessEvent[]>([
    {
      id: '1',
      title: 'Kupokea Mzigo wa Serengeti Breweries Ltd (Crates 30)',
      type: 'supplier',
      date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
      time: '10:30',
      description: 'Kupokea bia za Serengeti Lite & Safari Lager. Kagua risiti na kuweka stoo.',
      assignedTo: 'Mweka Hazina / Stoo',
      status: 'upcoming',
    },
    {
      id: '2',
      title: 'Mwisho wa Kulipa Deni — Dkt. Mwakyoma',
      type: 'debt_due',
      date: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
      time: '16:00',
      description: 'Deni la TZS 140,000 (Ankara RIS-2026-003). Tuma ukumbusho wa WhatsApp asubuhi.',
      assignedTo: 'Keshia Mkuu',
      status: 'upcoming',
    },
    {
      id: '3',
      title: 'Zamu ya Usiku ya Bar & Kaunta (Night Shift)',
      type: 'staff_shift',
      date: new Date().toISOString().split('T')[0],
      time: '18:00',
      description: 'Zamu ya Ijumaa jioni: John Mallya & Bar Staff. Ukaguzi wa chupa zilizofunguliwa saa 7:30 usiku.',
      assignedTo: 'John Mallya',
      status: 'upcoming',
    },
    {
      id: '4',
      title: 'Kukamilisha Marejesho ya Kodi TRA (Monthly Returns)',
      type: 'tax_compliance',
      date: new Date(Date.now() + 86400000 * 6).toISOString().split('T')[0],
      time: '14:00',
      description: 'Kuwasilisha taarifa za mauzo na kodi ya mwezi kwenye portal ya TRA.',
      assignedTo: 'Mhasibu',
      status: 'upcoming',
    },
  ]);

  const [filterType, setFilterType] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  // Confirm Dialog State for Workspace operations (MANDATORY per Workspace guidelines)
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    isDestructive?: boolean;
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    description: '',
    confirmLabel: 'Thibitisha',
    onConfirm: async () => {}
  });

  // Form State
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<'supplier' | 'debt_due' | 'staff_shift' | 'tax_compliance'>('supplier');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newTime, setNewTime] = useState('09:00');
  const [newDesc, setNewDesc] = useState('');
  const [newAssignee, setNewAssignee] = useState('');
  const [autoPushToGoogle, setAutoPushToGoogle] = useState(true);

  // Initialize auth state
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setCurrentUser(user);
        setAccessToken(token);
        loadGoogleCalendar(token);
      },
      () => {
        setCurrentUser(null);
        setAccessToken(null);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    setAuthError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setCurrentUser(result.user);
        setAccessToken(result.accessToken);
        await loadGoogleCalendar(result.accessToken);
      }
    } catch (err: any) {
      console.error(err);
      setAuthError(err.message || 'Kushindwa kuingia na akaunti ya Google');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    await googleSignOut();
    setCurrentUser(null);
    setAccessToken(null);
    setGoogleCalendarEvents([]);
    setSyncStatusMsg(null);
  };

  const loadGoogleCalendar = async (token: string) => {
    setIsSyncing(true);
    try {
      const items = await fetchGoogleCalendarEvents(token);
      setGoogleCalendarEvents(items);
      setSyncStatusMsg(`Kalenda imesawazishwa: Matukio ${items.length} yamepatikana.`);
    } catch (err: any) {
      console.error('Error fetching calendar events:', err);
      setSyncStatusMsg('Imeshindwa kusoma kalenda ya Google. Tafadhali jaribu tena.');
    } finally {
      setIsSyncing(false);
    }
  };

  const filteredEvents = events.filter((e) => filterType === 'all' || e.type === filterType);

  const triggerAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    if (accessToken && autoPushToGoogle) {
      // Require user confirmation before mutating Google Calendar
      setConfirmDialog({
        isOpen: true,
        title: 'Hifadhi Tukio Kwenye Google Calendar?',
        description: `Unakaribia kuweka tukio: "${newTitle.trim()}" tarehe ${newDate} saa ${newTime} moja kwa moja kwenye akaunti yako ya Google Calendar (${currentUser?.email}).`,
        confirmLabel: 'Weka Kwenye Google Calendar',
        onConfirm: async () => {
          await executeAddEvent(true);
        }
      });
    } else {
      executeAddEvent(false);
    }
  };

  const executeAddEvent = async (pushToGoogle: boolean) => {
    let googleId: string | undefined = undefined;

    if (pushToGoogle && accessToken) {
      try {
        const startISO = new Date(`${newDate}T${newTime}:00`).toISOString();
        const endISO = new Date(new Date(`${newDate}T${newTime}:00`).getTime() + 3600000).toISOString();

        const created = await insertGoogleCalendarEvent(accessToken, {
          summary: `[EBS] ${newTitle.trim()}`,
          description: `${newDesc.trim() || 'Ratiba ya EBS'}\n\nMsimamizi: ${newAssignee || 'EBS Business'}\nAina: ${newType}`,
          startDateTime: startISO,
          endDateTime: endISO,
          location: 'Dar es Salaam, Tanzania'
        });
        googleId = created.id;
        setSyncStatusMsg(`Tukio "${newTitle.trim()}" limehifadhiwa kwenye Google Calendar kikamilifu!`);
      } catch (err: any) {
        console.error('Google calendar error:', err);
        setSyncStatusMsg(`Hitilafu ya Google: ${err.message}`);
      }
    }

    const newEvt: BusinessEvent = {
      id: Date.now().toString(),
      title: newTitle.trim(),
      type: newType,
      date: newDate,
      time: newTime,
      description: newDesc.trim() || 'Ratiba ya biashara',
      assignedTo: newAssignee.trim() || 'Wafanyakazi wote',
      status: 'upcoming',
      googleEventId: googleId,
      syncedToGoogle: !!googleId
    };

    setEvents((prev) => [newEvt, ...prev]);
    setShowAddModal(false);
    setNewTitle('');
    setNewDesc('');
    setNewAssignee('');
    setConfirmDialog({ ...confirmDialog, isOpen: false });

    if (accessToken) {
      loadGoogleCalendar(accessToken);
    }
  };

  const handlePushSingleEventToGoogle = (evt: BusinessEvent) => {
    if (!accessToken) {
      // Prompt user to sign in or use direct link
      handleOpenGoogleCalendarLink(evt);
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: 'Sawazisha kwenye Google Calendar',
      description: `Je, una uhakika unataka kuweka tukio "${evt.title}" (${evt.date} @ ${evt.time}) kwenye akaunti yako ya Google Calendar (${currentUser?.email})?`,
      confirmLabel: 'Sawazisha Sasa',
      onConfirm: async () => {
        try {
          const startISO = new Date(`${evt.date}T${evt.time}:00`).toISOString();
          const endISO = new Date(new Date(`${evt.date}T${evt.time}:00`).getTime() + 3600000).toISOString();

          const created = await insertGoogleCalendarEvent(accessToken, {
            summary: `[EBS] ${evt.title}`,
            description: `${evt.description}\n\nMsimamizi: ${evt.assignedTo || 'EBS Business'}`,
            startDateTime: startISO,
            endDateTime: endISO,
            location: 'Dar es Salaam, Tanzania'
          });

          setEvents(prev =>
            prev.map(item =>
              item.id === evt.id ? { ...item, googleEventId: created.id, syncedToGoogle: true } : item
            )
          );

          setSyncStatusMsg(`Tukio limewekwa kikamilifu kwenye Google Calendar!`);
          loadGoogleCalendar(accessToken);
        } catch (err: any) {
          setSyncStatusMsg(`Hitilafu: ${err.message}`);
        } finally {
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleDeleteEvent = (evt: BusinessEvent) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Futa Ratiba?',
      description: `Je, una uhakika unataka kufuta "${evt.title}"?${
        evt.googleEventId && accessToken ? ' Pia litafutwa kwenye Google Calendar yako.' : ''
      }`,
      confirmLabel: 'Futa Ratiba',
      isDestructive: true,
      onConfirm: async () => {
        if (evt.googleEventId && accessToken) {
          try {
            await deleteGoogleCalendarEvent(accessToken, evt.googleEventId);
          } catch (err) {
            console.error('Error deleting from google calendar:', err);
          }
        }
        setEvents(prev => prev.filter(item => item.id !== evt.id));
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        if (accessToken) {
          loadGoogleCalendar(accessToken);
        }
      }
    });
  };

  const handleOpenGoogleCalendarLink = (evt: BusinessEvent) => {
    const startDateTime = new Date(`${evt.date}T${evt.time}:00`).toISOString().replace(/-|:|\.\d\d\d/g, '');
    const endDateTime = new Date(new Date(`${evt.date}T${evt.time}:00`).getTime() + 3600000).toISOString().replace(/-|:|\.\d\d\d/g, '');
    
    const googleCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
      `[EBS] ${evt.title}`
    )}&dates=${startDateTime}/${endDateTime}&details=${encodeURIComponent(
      `${evt.description}\n\nMsimamizi: ${evt.assignedTo || 'EBS Business'}`
    )}&location=${encodeURIComponent('Dar es Salaam, Tanzania')}`;

    window.open(googleCalUrl, '_blank');
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5">
      {/* Header & Google Auth Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-300 font-bold flex items-center gap-1">
              <CalendarDays className="w-3.5 h-3.5" />
              <span>GOOGLE WORKSPACE CALENDAR LIVE SYNC</span>
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white mt-1 flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-blue-600" />
            <span>Ratiba za Biashara & Kalenda ya Google</span>
          </h1>
          <p className="text-xs text-slate-500">
            Kufuatilia na kusawazisha tarehe za mizigo ya wasambazaji, madeni ya wateja, zamu za wafanyakazi, na tarehe za TRA
          </p>
        </div>

        {/* Google Workspace Connection Card */}
        <div className="flex flex-wrap items-center gap-2">
          {currentUser ? (
            <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 px-3 py-1.5 rounded-xl text-xs">
              <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[10px]">
                {currentUser.displayName?.charAt(0) || currentUser.email?.charAt(0) || 'G'}
              </div>
              <div>
                <div className="font-bold text-emerald-950 dark:text-emerald-200 truncate max-w-[150px]">
                  {currentUser.displayName || currentUser.email}
                </div>
                <div className="text-[10px] text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Google Calendar Imeshikamana</span>
                </div>
              </div>
              <button
                onClick={() => accessToken && loadGoogleCalendar(accessToken)}
                disabled={isSyncing}
                title="Sasisha Kalenda"
                className="p-1.5 hover:bg-emerald-100 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 rounded-lg transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={handleSignOut}
                title="Toka Google"
                className="p-1.5 hover:bg-red-100 dark:hover:bg-red-950/60 text-red-600 dark:text-red-400 rounded-lg transition"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleSignIn}
              disabled={isSigningIn}
              className="flex items-center space-x-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:border-blue-500 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 shadow-sm transition active:scale-95"
            >
              <svg className="w-4 h-4" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              <span>{isSigningIn ? 'Inaunganisha...' : 'Unganisha Google Calendar'}</span>
            </button>
          )}

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-600/30 transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Weka Ratiba Mpya</span>
          </button>
        </div>
      </div>

      {/* Sync Status Banner */}
      {syncStatusMsg && (
        <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 p-3 rounded-xl flex items-center justify-between text-xs text-blue-800 dark:text-blue-300">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-blue-600 animate-pulse" />
            <span>{syncStatusMsg}</span>
          </div>
          <button onClick={() => setSyncStatusMsg(null)} className="text-blue-500 hover:text-blue-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: 'all', label: 'Ratiba Zote', count: events.length },
          { id: 'supplier', label: '🚚 Mizigo ya Wasambazaji', count: events.filter((e) => e.type === 'supplier').length },
          { id: 'debt_due', label: '💳 Tarehe za Madeni', count: events.filter((e) => e.type === 'debt_due').length },
          { id: 'staff_shift', label: '👨‍💼 Zamu za Wafanyakazi (Roster)', count: events.filter((e) => e.type === 'staff_shift').length },
          { id: 'tax_compliance', label: '🏛️ Kodi & TRA Deadlines', count: events.filter((e) => e.type === 'tax_compliance').length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterType(tab.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
              filterType === tab.id
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
            }`}
          >
            <span>{tab.label}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/10 dark:bg-white/10 font-black">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredEvents.map((evt) => (
          <div
            key={evt.id}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-blue-300 dark:hover:border-blue-800 transition"
          >
            <div className="space-y-2.5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${
                      evt.type === 'supplier'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        : evt.type === 'debt_due'
                        ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                        : evt.type === 'staff_shift'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                    }`}
                  >
                    {evt.type === 'supplier'
                      ? 'Msambazaji'
                      : evt.type === 'debt_due'
                      ? 'Deni la Mteja'
                      : evt.type === 'staff_shift'
                      ? 'Zamu ya Kazi'
                      : 'Kodi & TRA'}
                  </span>

                  {evt.syncedToGoogle && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-semibold flex items-center gap-1">
                      <Check className="w-3 h-3 text-blue-600" />
                      Google Calendar
                    </span>
                  )}
                </div>

                <div className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-blue-500" />
                  <span>{evt.date} @ {evt.time}</span>
                </div>
              </div>

              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                {evt.title}
              </h3>

              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {evt.description}
              </p>

              {evt.assignedTo && (
                <div className="text-[11px] text-slate-500 flex items-center gap-1 pt-1">
                  <Users className="w-3 h-3 text-slate-400" />
                  <span>Msimamizi: <strong className="text-slate-700 dark:text-slate-300">{evt.assignedTo}</strong></span>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    setEvents((prev) =>
                      prev.map((item) =>
                        item.id === evt.id ? { ...item, status: item.status === 'completed' ? 'upcoming' : 'completed' } : item
                      )
                    );
                  }}
                  className={`text-xs font-bold flex items-center gap-1 transition ${
                    evt.status === 'completed' ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-700'
                  }`}
                >
                  <CheckCircle className="w-4 h-4" />
                  <span className="hidden sm:inline">{evt.status === 'completed' ? 'Imekamilika' : 'Weka Alama'}</span>
                </button>

                <button
                  onClick={() => handleDeleteEvent(evt)}
                  className="text-xs text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                  title="Futa ratiba"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center space-x-1.5">
                {accessToken ? (
                  <button
                    onClick={() => handlePushSingleEventToGoogle(evt)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition active:scale-95 ${
                      evt.syncedToGoogle
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    <span>{evt.syncedToGoogle ? 'Imesawazishwa' : 'Sawazisha Google'}</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleOpenGoogleCalendarLink(evt)}
                    className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-bold flex items-center gap-1 transition active:scale-95"
                  >
                    <span>Google Calendar</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Live Google Calendar Events Section if authenticated */}
      {accessToken && googleCalendarEvents.length > 0 && (
        <div className="mt-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
            <div className="flex items-center space-x-2">
              <CalendarIcon className="w-4 h-4 text-blue-600" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Matukio Yote Kwenye Akaunti Yako ya Google Calendar ({googleCalendarEvents.length})
              </h3>
            </div>
            <a
              href="https://calendar.google.com"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-semibold"
            >
              <span>Fungua Google Calendar Kamili</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-60 overflow-y-auto">
            {googleCalendarEvents.map((gevt) => (
              <div key={gevt.id} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-slate-800 dark:text-slate-200">{gevt.summary}</div>
                  <div className="text-[11px] text-slate-500">
                    {gevt.start.dateTime
                      ? new Date(gevt.start.dateTime).toLocaleString('sw-TZ', { dateStyle: 'medium', timeStyle: 'short' })
                      : gevt.start.date}
                    {gevt.location && ` • ${gevt.location}`}
                  </div>
                </div>

                {gevt.htmlLink && (
                  <a
                    href={gevt.htmlLink}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Event Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <form
            onSubmit={triggerAddEvent}
            className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 p-6"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-black text-sm text-slate-900 dark:text-white">
                Weka Ratiba Mpya kwenye Kalenda
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Kichwa cha Tukio / Ratiba:
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Mfano: Kupokea vinywaji kutoka TBL"
                  className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Aina ya Ratiba:
                </label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as any)}
                  className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
                >
                  <option value="supplier">🚚 Mzigo wa Msambazaji</option>
                  <option value="debt_due">💳 Marejesho ya Deni la Mteja</option>
                  <option value="staff_shift">👨‍💼 Zamu ya Mfanyakazi (Roster)</option>
                  <option value="tax_compliance">🏛️ Kodi, TRA & Leseni</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tarehe:
                  </label>
                  <input
                    type="date"
                    required
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Saa:
                  </label>
                  <input
                    type="time"
                    required
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Msimamizi / Mfanyakazi Anayehusika:
                </label>
                <input
                  type="text"
                  value={newAssignee}
                  onChange={(e) => setNewAssignee(e.target.value)}
                  placeholder="Mfano: Meneja au Mweka Stoo"
                  className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Maelezo ya Ziada:
                </label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Maelezo..."
                  rows={2}
                  className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>

              {accessToken && (
                <div className="pt-2">
                  <label className="flex items-center space-x-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoPushToGoogle}
                      onChange={(e) => setAutoPushToGoogle(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <span>Weka pia moja kwa moja kwenye Google Calendar</span>
                  </label>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400"
              >
                Ghairi
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/30 transition active:scale-95"
              >
                Hifadhi Ratiba
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Workspace Confirmation Dialog (Mandatory for destructive / mutating workspace actions) */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center space-x-3">
              <div
                className={`p-2.5 rounded-xl ${
                  confirmDialog.isDestructive
                    ? 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-300'
                    : 'bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-300'
                }`}
              >
                <AlertCircle className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                {confirmDialog.title}
              </h3>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              {confirmDialog.description}
            </p>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
              >
                Ghairi
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                className={`px-5 py-2 text-white text-xs font-bold rounded-xl shadow-md transition active:scale-95 ${
                  confirmDialog.isDestructive
                    ? 'bg-red-600 hover:bg-red-700 shadow-red-600/30'
                    : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/30'
                }`}
              >
                {confirmDialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
