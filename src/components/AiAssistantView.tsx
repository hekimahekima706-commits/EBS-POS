import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { formatTZS, formatNumber } from '../utils/formatters';
import { isProductActive } from '../utils/productUtils';
import { useVoicePos } from '../hooks/useVoicePos';
import { useWakeWord } from '../hooks/useWakeWord';
import { getApiBaseUrl } from '../utils/syncEngine';
import {
  GEMINI_VOICES,
  GeminiVoiceOption,
  speakTextSwahili,
  stopSpeaking,
  getActiveAiPersona,
  AI_VOICE_CHANGE_EVENT,
  setSelectedAiVoice,
  getSwahiliCompatibleVoice,
  prepareSwahiliSpeechText,
  getBrowserSpeechVoices,
} from '../utils/audioVoiceService';
import { AiPersonaSettingsSection } from './AiPersonaSettingsSection';
import {
  Sparkles,
  Send,
  Bot,
  User,
  RefreshCw,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Radio,
  SlidersHorizontal,
  ChevronRight,
  Play,
  Square,
  Check,
  Zap,
  ShoppingBag,
  Package,
  FileText,
  CreditCard,
  Users,
  Wine,
  ArrowRight,
  X,
  MessageSquare,
  Waves,
  HelpCircle,
  History,
  Clock,
  Trash2,
  Copy,
  Search,
} from 'lucide-react';
import { VoiceCommandsHelpModal, VoiceCommandItem } from './VoiceCommandsHelpModal';
import { AiVoiceVolumeControl } from './AiVoiceVolumeControl';
import { AiVoiceSpeedControl } from './AiVoiceSpeedControl';

export interface AiInteractionRecord {
  id: string;
  timestamp: string;
  timeFormatted: string;
  dateFormatted: string;
  userPrompt: string;
  aiReply: string;
  voiceId: string;
  userRole: string;
}

export const AI_SESSION_HISTORY_STORAGE_KEY = 'ebs_ai_interaction_history';

export function getLocalInteractionHistory(): AiInteractionRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(AI_SESSION_HISTORY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalInteractionRecord(record: AiInteractionRecord): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getLocalInteractionHistory();
    const updated = [record, ...current.filter((item) => item.id !== record.id).slice(0, 99)];
    localStorage.setItem(AI_SESSION_HISTORY_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Failed to save AI session history:', e);
  }
}

export function clearLocalInteractionHistory(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(AI_SESSION_HISTORY_STORAGE_KEY);
  } catch {}
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  suggestedAction?: {
    label: string;
    view: string;
    icon?: string;
  };
}

interface AiAssistantViewProps {
  onNavigate?: (view: string) => void;
}

export const AiAssistantView: React.FC<AiAssistantViewProps> = ({ onNavigate }) => {
  const {
    products,
    sales,
    expenses,
    debts,
    suppliers,
    barVariances,
    todayStats,
    businessProfile,
    currentUser,
  } = useApp();

  const userRole = (currentUser?.role || 'cashier').toLowerCase();
  const userName = currentUser?.name || 'Mtumiaji';
  const isExecutive = ['owner', 'boss', 'admin', 'manager'].includes(userRole);

  // Selected Gemini Voice State (Defaults to Orbit, persists in localStorage)
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return (
        localStorage.getItem('ebs_ai_selected_voice') ||
        localStorage.getItem('ebs_ai_selected_persona') ||
        'Orbit'
      );
    }
    return 'Orbit';
  });

  const [voiceToast, setVoiceToast] = useState<string | null>(null);
  const [showVoiceModal, setShowVoiceModal] = useState<boolean>(false);
  const [showCommandsModal, setShowCommandsModal] = useState<boolean>(false);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [historyList, setHistoryList] = useState<AiInteractionRecord[]>(() => getLocalInteractionHistory());
  const [historySearchQuery, setHistorySearchQuery] = useState<string>('');
  const [historyCopiedId, setHistoryCopiedId] = useState<string | null>(null);
  const [historyPlayingId, setHistoryPlayingId] = useState<string | null>(null);

  const [testingVoiceId, setTestingVoiceId] = useState<string | null>(null);
  const [autoSpeakReplies, setAutoSpeakReplies] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('ebs_ai_auto_speak') !== 'false';
    }
    return true;
  });

  // Global voice change listener to keep all components perfectly in sync
  useEffect(() => {
    const handleVoiceChange = (e: any) => {
      if (e.detail?.voiceId) {
        setSelectedVoiceId(e.detail.voiceId);
      }
    };
    window.addEventListener(AI_VOICE_CHANGE_EVENT, handleVoiceChange);
    return () => {
      window.removeEventListener(AI_VOICE_CHANGE_EVENT, handleVoiceChange);
    };
  }, []);

  // Interface Mode: 'chat' (Standard Text & Voice Chat), 'live_orb' (Full Conversational Voice Orb), or 'personas' (AI Personas Settings)
  const [interfaceMode, setInterfaceMode] = useState<'chat' | 'live_orb' | 'personas'>('chat');
  const [currentlySpeakingMsgId, setCurrentlySpeakingMsgId] = useState<string | null>(null);

  // Input & Chat State
  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef<boolean>(true);

  // Voice POS / Microphone Hook
  const {
    isListening,
    transcript,
    startListening,
    stopListening,
    cancelListening,
    resetTranscript,
    hasMicPermission,
    requestMicPermission,
    permissionError,
  } = useVoicePos({
    lang: 'sw-TZ',
  });

  const selectedVoiceObj =
    GEMINI_VOICES.find((v) => v.id.toLowerCase() === selectedVoiceId.toLowerCase()) ||
    GEMINI_VOICES[0];

  // Browser Speech Synthesis Swahili Voice State (preferring 'sw-TZ' or 'sw')
  const [swahiliBrowserVoice, setSwahiliBrowserVoice] = useState<SpeechSynthesisVoice | null>(null);
  const swahiliVoiceRef = useRef<SpeechSynthesisVoice | null>(null);

  /**
   * Refactored Voice Search Algorithm:
   * Explicitly iterates through 'window.speechSynthesis.getVoices()' and prioritizes finding a voice
   * with 'sw' or 'sw-TZ' in its name/lang property, falling back to a neutral voice if no Swahili voice is found.
   */
  const findSwahiliOrNeutralVoice = useCallback((): SpeechSynthesisVoice | null => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;

    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;

    // 1. First priority: Iterate searching for 'sw-TZ' in lang or name (authentic Tanzanian Swahili)
    for (let i = 0; i < voices.length; i++) {
      const v = voices[i];
      const lang = (v.lang || '').toLowerCase();
      const name = (v.name || '').toLowerCase();
      if (lang === 'sw-tz' || lang === 'sw_tz' || name.includes('sw-tz') || name.includes('sw_tz')) {
        return v;
      }
    }

    // 2. Second priority: Iterate searching for 'sw' in lang or name (East African Swahili)
    for (let i = 0; i < voices.length; i++) {
      const v = voices[i];
      const lang = (v.lang || '').toLowerCase();
      const name = (v.name || '').toLowerCase();
      if (
        lang === 'sw' ||
        lang.startsWith('sw-') ||
        lang.startsWith('sw_') ||
        name.includes('swahili') ||
        name.includes('kiswahili')
      ) {
        return v;
      }
    }

    // 3. Third priority: Fallback to a neutral, articulate voice (natural, google, or neutral voices)
    for (let i = 0; i < voices.length; i++) {
      const v = voices[i];
      const name = (v.name || '').toLowerCase();
      if (name.includes('natural') || name.includes('google') || name.includes('neutral')) {
        return v;
      }
    }

    // 4. Default fallback: Default browser voice
    return voices.find((v) => v.default) || voices[0] || null;
  }, []);

  // Explicitly fetch and set the browser's speech synthesis voice to a Swahili-compatible one before speaking
  const fetchAndSetSwahiliVoice = useCallback(async (): Promise<SpeechSynthesisVoice | undefined> => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return undefined;

    let found = findSwahiliOrNeutralVoice();
    if (!found) {
      const voices = await getBrowserSpeechVoices();
      if (voices && voices.length > 0) {
        found = findSwahiliOrNeutralVoice();
      }
    }

    if (found) {
      setSwahiliBrowserVoice(found);
      swahiliVoiceRef.current = found;
      return found;
    }
    return undefined;
  }, [findSwahiliOrNeutralVoice]);

  useEffect(() => {
    fetchAndSetSwahiliVoice();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.addEventListener('voiceschanged', fetchAndSetSwahiliVoice);
      return () => {
        window.speechSynthesis.removeEventListener('voiceschanged', fetchAndSetSwahiliVoice);
      };
    }
  }, [fetchAndSetSwahiliVoice]);

  // Save selected voice across both voice and persona keys with real-time audio confirmation
  const handleSelectVoice = async (voiceId: string) => {
    setSelectedVoiceId(voiceId);
    setSelectedAiVoice(voiceId);
    const matched = GEMINI_VOICES.find((v) => v.id.toLowerCase() === voiceId.toLowerCase());
    setVoiceToast(`Sauti ya "${matched?.name || voiceId}" imeteuliwa!`);
    setTimeout(() => setVoiceToast(null), 2500);

    // Explicitly fetch and set the browser's Swahili voice before speaking preview
    const swVoice = await fetchAndSetSwahiliVoice();
    const previewText = prepareSwahiliSpeechText(`Habari! Sauti ya ${matched?.name || voiceId} imeteuliwa.`);
    speakTextSwahili(previewText, voiceId, undefined, undefined, swVoice).catch(() => {});
  };

  // Toggle Auto-speak
  const handleToggleAutoSpeak = () => {
    setAutoSpeakReplies((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('ebs_ai_auto_speak', String(next));
      }
      return next;
    });
  };

  // Test / Preview a voice with natural Swahili sample
  const handleTestVoicePreview = async (voice: GeminiVoiceOption) => {
    stopSpeaking();
    setTestingVoiceId(voice.id);
    try {
      // Explicitly fetch and set Swahili-compatible voice before preview
      const swVoice = await fetchAndSetSwahiliVoice();
      const previewText = prepareSwahiliSpeechText(voice.sampleTextSw);
      await speakTextSwahili(previewText, voice.id, undefined, undefined, swVoice);
    } catch (e) {
      console.warn('Voice preview error:', e);
    } finally {
      if (isMountedRef.current) {
        setTestingVoiceId(null);
      }
    }
  };

  // Initial welcome message with full Swahili leadership persona
  const initialWelcomeText = isExecutive
    ? `Habari za kazi Boss ${userName}! Mimi ni **EBS AI**, kiongozi na msaidizi wako mkuu wa biashara.\n\nNina uwezo kamili wa kukuongoza na kusimamia mfumo mzima wa biashara yako ya **${businessProfile?.name || 'EBS'}**:\n• **Mauzo ya Leo:** ${formatTZS(todayStats.salesRevenue)} (${todayStats.transactionsCount} risiti)\n• **Faida Halisi:** ${formatTZS(todayStats.netProfit)} (Faida Ghafi: ${formatTZS(todayStats.grossProfit)})\n• **Stoo na Bidhaa:** Bidhaa ${products.filter(isProductActive).length} zimesajiliwa, ${products.filter((p) => isProductActive(p) && p.stockQty <= p.minStock).length} zimepungua chini ya kiwango.\n• **Madeni ya Wateja:** ${debts.filter((d) => d.status !== 'paid').length} wateja wanadaiwa.\n\nUliza swali lolote kwa maandishi au bonyeza maikrofoni tuzungumze moja kwa moja!`
    : `Habari za kazi ${userName}! Mimi ni **EBS AI**, msaidizi wako mwerevu wa shughuli za kila siku za kaunta na huduma (${currentUser?.role === 'waiter' ? 'Mhudumu' : currentUser?.role === 'storekeeper' ? 'Mweka Stoo' : 'Keshia'}).\n\nNinaweza kukusaidia papo hapo kuhusu:\n• Bei za bidhaa na kiasi kilichopo stoo sasa hivi\n• Madeni ya wateja na orodha ya kulipwa\n• Utoaji wa risiti na miongozo ya mauzo ya haraka\n• Kufunga shift na kuhesabu fedha za siku (Shift Closing)\n\n*(Kumbuka: Ripoti za faida ya biashara zimehifadhiwa kwa Boss pekee).*`;

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'ai',
      text: initialWelcomeText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      stopSpeaking();
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, transcript]);

  // Sync speech transcript into input in real-time
  useEffect(() => {
    if (transcript && isListening) {
      setInputPrompt(transcript);
    }
  }, [transcript, isListening]);

  // Role-specific smart prompts that guide the business
  const quickPrompts = isExecutive
    ? [
        { label: '📊 Mauzo & Faida ya Leo', query: 'Nipe uchambuzi kamili wa mauzo na faida halisi ya leo, na ushauri wa kuboresha.' },
        { label: '⚠️ Bidhaa Zinazoisha Stoo', query: 'Ni bidhaa gani zimebaki chache stoo na zinahitaji kuagizwa mara moja?' },
        { label: '💳 Orodha ya Madeni Sugu', query: 'Nani anadaiwa zaidi na ni hatua gani za kuchukua kuwakumbusha kwa heshima?' },
        { label: '👥 Ufanisi wa Wafanyakazi', query: 'Ni mfanyakazi yupi anayeongoza kwa mauzo na kiasi cha bidhaa zilizouzwa?' },
        { label: '💡 Mbinu za Kubana Gharama', query: 'Ni matumizi gani makubwa yanayokata faida yangu mwezi huu na namna ya kuyadhibiti?' },
        { label: '🍸 Udhibiti wa Bar & Shoti', query: 'Niambie jinsi ya kudhibiti upotevu wa vinywaji vikali na kuongeza faida ya Bar Mode.' },
      ]
    : [
        { label: '📦 Bidhaa Zilizobaki Chache', query: 'Ni bidhaa zipi zimebaki chache stoo leo ambazo wateja wanaweza kukosa?' },
        { label: '💳 Madeni ya Wateja', query: 'Jumla ya madeni ya wateja na orodha ya wanaotakiwa kulipa leo.' },
        { label: '🏷️ Bei za Bidhaa Maarufu', query: 'Niambie bei rasmi za bidhaa zinazonunuliwa zaidi na ofa zilizopo.' },
        { label: '🧾 Kufunga Hesabu za Shift', query: 'Miongozo ya kufunga hesabu za siku (Shift Closing) na kukabidhi fedha.' },
        { label: '⚡ Kurekodi Mauzo kwa Sauti', query: 'Nielekeze jinsi ya kutumia maikrofoni ya EBS kuuza bidhaa kwa sauti kwenye POS.' },
      ];

  // Helper to determine smart system navigation from query
  const getActionForQuery = (query: string): ChatMessage['suggestedAction'] | undefined => {
    const q = query.toLowerCase();
    if (q.includes('stoo') || q.includes('bidhaa') || q.includes('stock')) {
      return { label: 'Fungua Stoo (Inventory)', view: 'inventory', icon: 'package' };
    }
    if (q.includes('pos') || q.includes('uza') || q.includes('risiti') || q.includes('kaunta')) {
      return { label: 'Fungua Kaunta ya Mauzo (POS)', view: 'pos', icon: 'shopping-bag' };
    }
    if (q.includes('ripoti') || q.includes('faida') || q.includes('uchambuzi')) {
      return { label: 'Tazama Ripoti za Fedha', view: 'reports', icon: 'file-text' };
    }
    if (q.includes('deni') || q.includes('madeni') || q.includes('mteja')) {
      return { label: 'Tazama Orodha ya Madeni', view: 'debts', icon: 'credit-card' };
    }
    if (q.includes('mfanyakazi') || q.includes('wafanyakazi') || q.includes('tija')) {
      return { label: 'Ufanisi wa Wafanyakazi', view: 'employees', icon: 'users' };
    }
    if (q.includes('bar') || q.includes('shoti') || q.includes('pombe')) {
      return { label: 'Moduli ya Bar & Shoti', view: 'barmode', icon: 'wine' };
    }
    if (q.includes('matumizi') || q.includes('gharama')) {
      return { label: 'Rekodi Matumizi (Expenses)', view: 'expenses', icon: 'file-text' };
    }
    return undefined;
  };

  // Send message and get Gemini response in fluent Swahili
  const handleSendMessage = async (customPrompt?: string) => {
    const promptToSend = (customPrompt || inputPrompt).trim();
    if (!promptToSend || isLoading) return;

    // Stop listening if user was speaking
    if (isListening) {
      stopListening();
    }

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: promptToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputPrompt('');
    resetTranscript();
    setIsLoading(true);

    // Business Data Context to inject into AI prompt (Strict RBAC filtering)
    const businessContext = isExecutive
      ? {
          businessName: businessProfile?.name || 'Biashara',
          currency: businessProfile?.currency || 'TZS',
          todaySalesCount: todayStats.transactionsCount,
          todayRevenue: todayStats.salesRevenue,
          todayProfit: todayStats.grossProfit,
          todayExpenses: todayStats.expensesTotal,
          todayNetProfit: todayStats.netProfit,
          totalProducts: products.filter(isProductActive).length,
          lowStockProducts: products
            .filter((p) => isProductActive(p) && p.stockQty <= p.minStock)
            .map((p) => ({
              name: p.name,
              stock: p.stockQty,
              minStock: p.minStock,
            })),
          totalOutstandingDebts: debts
            .filter((d) => d.status !== 'paid')
            .reduce((s, d) => s + d.remainingAmount, 0),
          unpaidDebtsCount: debts.filter((d) => d.status !== 'paid').length,
          barItemsVarianceCount: barVariances.length,
          currentUserRole: userRole,
          currentUserName: userName,
        }
      : {
          businessName: businessProfile?.name || 'Biashara',
          currency: businessProfile?.currency || 'TZS',
          todaySalesCount: todayStats.transactionsCount,
          todayRevenue: todayStats.salesRevenue,
          totalProducts: products.filter(isProductActive).length,
          lowStockProducts: products
            .filter((p) => isProductActive(p) && p.stockQty <= p.minStock)
            .map((p) => ({
              name: p.name,
              stock: p.stockQty,
              minStock: p.minStock,
            })),
          totalOutstandingDebts: debts
            .filter((d) => d.status !== 'paid')
            .reduce((s, d) => s + d.remainingAmount, 0),
          unpaidDebtsCount: debts.filter((d) => d.status !== 'paid').length,
          currentUserRole: userRole,
          currentUserName: userName,
        };

    try {
      const apiBase = getApiBaseUrl();
      const apiUrl = `${apiBase}/api/ai/chat`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          message: promptToSend,
          prompt: promptToSend,
          userRole,
          role: userRole,
          userName,
          persona: selectedVoiceId,
          aiPersona: selectedVoiceId,
          businessContext,
          businessData: businessContext,
        }),
      });

      clearTimeout(timeoutId);

      let replyText = '';
      if (response.ok) {
        const raw = await response.text();
        if (!raw.trim().startsWith('<') && !raw.trim().startsWith('<!doctype')) {
          const data = JSON.parse(raw);
          replyText = data?.reply || '';
        }
      }

      if (!replyText) {
        replyText = getLocalSwahiliAdvisorResponse(promptToSend, businessContext);
      }

      const suggestedAction = getActionForQuery(promptToSend);

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedAction,
      };

      setMessages((prev) => [...prev, aiMsg]);

      // Record interaction in local history log
      const now = new Date();
      const record: AiInteractionRecord = {
        id: Date.now().toString(),
        timestamp: now.toISOString(),
        timeFormatted: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        dateFormatted: now.toLocaleDateString('sw-TZ', { day: 'numeric', month: 'short', year: 'numeric' }),
        userPrompt: promptToSend,
        aiReply: replyText,
        voiceId: selectedVoiceId,
        userRole,
      };
      saveLocalInteractionRecord(record);
      setHistoryList((prev) => [record, ...prev.filter((r) => r.id !== record.id).slice(0, 99)]);

      // If Auto-speak is on, speak response with selected Gemini voice
      if (autoSpeakReplies) {
        playMessageAudio(aiMsg.id, replyText);
      }
    } catch (error) {
      console.warn('AI remote call switched to local intelligent advisor:', error);
      const localAnalysis = getLocalSwahiliAdvisorResponse(promptToSend, businessContext);
      const fallbackMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: localAnalysis,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedAction: getActionForQuery(promptToSend),
      };
      setMessages((prev) => [...prev, fallbackMsg]);

      // Record fallback interaction in local history log
      const now = new Date();
      const fallbackRecord: AiInteractionRecord = {
        id: Date.now().toString(),
        timestamp: now.toISOString(),
        timeFormatted: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        dateFormatted: now.toLocaleDateString('sw-TZ', { day: 'numeric', month: 'short', year: 'numeric' }),
        userPrompt: promptToSend,
        aiReply: localAnalysis,
        voiceId: selectedVoiceId,
        userRole,
      };
      saveLocalInteractionRecord(fallbackRecord);
      setHistoryList((prev) => [fallbackRecord, ...prev.filter((r) => r.id !== fallbackRecord.id).slice(0, 99)]);

      if (autoSpeakReplies) {
        playMessageAudio(fallbackMsg.id, localAnalysis);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Refactored TTS playback: explicitly fetches and sets the browser Swahili voice before speaking,
  // normalizing business figures, currency (TZS), and AI responses for natural, crystal-clear Swahili pronunciation.
  const playMessageAudio = async (msgId: string, text: string) => {
    if (currentlySpeakingMsgId === msgId) {
      stopSpeaking();
      setCurrentlySpeakingMsgId(null);
      return;
    }

    stopSpeaking();
    setCurrentlySpeakingMsgId(msgId);

    try {
      // 1. Explicitly fetch and set the browser's speech synthesis voice to a Swahili-compatible one ('sw-TZ' or 'sw')
      const targetSwahiliVoice = await fetchAndSetSwahiliVoice();

      // 2. Prepare and normalize text (expanding TZS currency, business acronyms, stripping markdown)
      const cleanSpeechText = prepareSwahiliSpeechText(text);

      // 3. Execute TTS with genuine Gemini voice (e.g. Ursa, Vega, Aoede) and pre-set Swahili browser fallback
      await speakTextSwahili(
        cleanSpeechText,
        selectedVoiceId,
        undefined,
        undefined,
        targetSwahiliVoice || swahiliVoiceRef.current || undefined
      );
    } catch (e) {
      console.warn('Audio playback error:', e);
    } finally {
      if (isMountedRef.current) {
        setCurrentlySpeakingMsgId(null);
      }
    }
  };

  // Interactive Live Microphone Trigger
  const handleToggleMic = async () => {
    if (isListening) {
      const captured = await stopListening();
      if (captured?.transcript && captured.transcript.trim()) {
        handleSendMessage(captured.transcript);
      }
    } else {
      stopSpeaking();
      setCurrentlySpeakingMsgId(null);
      resetTranscript();
      setInputPrompt('');
      await startListening();
    }
  };

  // Wake Word ('Hey EBS') Detection Hook
  const handleWakeWordDetected = useCallback(
    (command?: string) => {
      if (command && command.trim().length > 2) {
        // User spoke the full command along with the wake word, e.g. "Hey EBS mauzo ya leo"
        handleSendMessage(command);
      } else {
        // User spoke only the wake word ("Hey EBS")
        // Automatically activate microphone for hands-free speech!
        stopSpeaking();
        setCurrentlySpeakingMsgId(null);
        resetTranscript();
        setInputPrompt('');
        startListening();
      }
    },
    [handleSendMessage, resetTranscript, startListening]
  );

  const {
    isWakeWordEnabled,
    isListeningForWakeWord,
    isTriggered: isWakeTriggered,
    toggleWakeWord,
    pauseWakeWord,
    resumeWakeWord,
  } = useWakeWord({
    onWakeWordDetected: handleWakeWordDetected,
    lang: 'sw-TZ',
  });

  // Temporarily pause wake word scanning when AI is speaking or actively processing
  useEffect(() => {
    if (currentlySpeakingMsgId || isLoading || isListening) {
      pauseWakeWord();
    } else {
      resumeWakeWord();
    }
  }, [currentlySpeakingMsgId, isLoading, isListening, pauseWakeWord, resumeWakeWord]);

  // Local fallback with pristine, natural Tanzanian Swahili
  function getLocalSwahiliAdvisorResponse(query: string, ctx: any): string {
    const q = (query || '').toLowerCase();

    // Section B: Absolute Prohibition for Cashier / Waiter / Storekeeper on profit queries
    if (
      !isExecutive &&
      (q.includes('faida') ||
        q.includes('profit') ||
        q.includes('margin') ||
        q.includes('mapato ya biashara') ||
        q.includes('gharama'))
    ) {
      const roleTitle =
        userRole === 'waiter' ? 'mhudumu' : userRole === 'storekeeper' ? 'mweka stoo' : 'keshia';
      return `🔒 **Ulinzi wa Taarifa za Biashara:**\n\nSamahani ndugu ${userName}, kama **${roleTitle}**, mamlaka yako yamepangwa kwa ajili ya mauzo na huduma za kaunta. Taarifa za faida ghafi na gharama za umiliki zimehifadhiwa kwa Boss pekee.\n\nNinaweza kukusaidia kuhusu:\n• Bei za bidhaa kwa wateja\n• Idadi ya bidhaa zilizopo stoo\n• Madeni ya wateja na kutoa risiti\n• Kufunga mahesabu ya siku (Shift Closing)`;
    }

    const rev = ctx.todayRevenue || 0;
    const profit = ctx.todayProfit || 0;
    const exp = ctx.todayExpenses || 0;
    const net = ctx.todayNetProfit || 0;
    const lowStock = ctx.lowStockProducts || [];
    const debtsTotal = ctx.totalOutstandingDebts || 0;

    if (q.includes('mauzo') || q.includes('faida') || q.includes('uchambuzi')) {
      if (isExecutive) {
        return `📊 **Uchambuzi Mahiri wa Mauzo na Faida ya Leo (${ctx.businessName || 'EBS'}):**\n\n• **Jumla ya Mauzo:** ${formatTZS(rev)} (${ctx.todaySalesCount} risiti zimetolewa leo)\n• **Faida Ghafi ya Mauzo (Gross Profit):** ${formatTZS(profit)}\n• **Gharama za Leo (Expenses):** ${formatTZS(exp)}\n• **Faida Halisi Mfukoni (Net Profit):** ${formatTZS(net)}\n\n💡 *Ushauri wa EBS AI:* ${
          net > 0
            ? 'Mwenendo wa leo ni mzuri sana na faida ipo chanya. Hakikisha fedha taslimu kwenye droo zinalingana na ripoti ya mfumo kabla ya kubadili shift.'
            : 'Mauzo ya leo yanahitaji msukumo ili kufidia gharama za uendeshaji. Zingatia kuweka ofa ya haraka au kuwahimiza wahudumu kupendekeza bidhaa za ziada.'
        }`;
      } else {
        return `📊 **Muhtasari wa Mauzo ya Leo (${ctx.businessName || 'Duka'}):**\n\n• **Mauzo Yaliyorekodiwa:** ${formatTZS(rev)}\n• **Idadi ya Miamala:** ${ctx.todaySalesCount || 0}\n\n💡 *Ushauri wa Keshia:* Hakikisha unatoa risiti kwa kila muamala na kupanga fedha za benki/lipa namba kando.`;
      }
    }

    if (q.includes('stoo') || q.includes('chini') || q.includes('kiwango') || q.includes('isha')) {
      if (lowStock.length === 0) {
        return `📦 **Hali ya Stoo na Bidhaa:**\n\n✅ Bidhaa zote ${ctx.totalProducts} zipo katika kiwango salama kabisa. Hakuna bidhaa iliyo chini ya Minimum Stock hivi sasa.`;
      }
      const list = lowStock
        .slice(0, 6)
        .map(
          (p: any, i: number) =>
            `${i + 1}. **${p.name}** — Zimebaki stoo: **${p.stock}** (Kiwango cha chini: ${p.minStock})`
        )
        .join('\n');
      return `⚠️ **Bidhaa Zilizopungua Stoo (${lowStock.length}):**\n\n${list}\n\n💡 *Ushauri wa EBS AI:* Wasiliana na wasambazaji (Suppliers) sasa hivi ili kuagiza mzigo mpya kabla wateja hawajakosa bidhaa hizi.`;
    }

    if (q.includes('deni') || q.includes('madeni') || q.includes('wateja')) {
      return `💳 **Hali ya Madeni ya Wateja:**\n\n• **Jumla ya Madeni Nje:** ${formatTZS(debtsTotal)}\n• **Wateja Wanaodaiwa:** ${ctx.unpaidDebtsCount || 0}\n\n💡 *Ushauri wa EBS AI:* Tumia ujumbe wa heshima wa WhatsApp kuwakumbusha wateja waliopitisha tarehe ya makubaliano ili kurejesha mzunguko wa fedha (Cash Flow).`;
    }

    if (q.includes('bar') || q.includes('shoti') || q.includes('pombe') || q.includes('spirits')) {
      return `🍸 **Mbinu za Kuongeza Faida kwenye Bar Mode (Shots & Bottles):**\n\n1. **Uza kwa Shoti badala ya Chupa Pekee:** Chupa ya 750ml inatoa shoti 25 za ml 30. Faida ya shoti ni kubwa kwa zaidi ya 35% ikilinganishwa na kuuza chupa nzima.\n2. **Kagua Stock Variance Kila Shift:** Tumia moduli ya *Bar & Shoti* kulinganisha shoti zilizouzwa na ujazo uliobaki.\n3. **Dhibiti Upotevu (Spillage):** Hakikisha wahudumu wanatumia kipimo rasmi cha *jigger* badala ya kumwaga kwa macho.`;
    }

    return `Habari ndugu yangu! Mimi ni **EBS AI**, msaidizi wako mkuu anayeongoza mfumo mzima wa biashara.\n\n• Mauzo ya Leo: **${formatTZS(rev)}**\n• Bidhaa zilizopo Stoo: **${ctx.totalProducts}**\n• Madeni ya Wateja: **${formatTZS(debtsTotal)}**\n\nUnaweza kuniuliza ushauri kuhusu namna ya kuongeza mauzo, kubana matumizi, kusimamia stoo, au kutoa taarifa yoyote ya biashara!`;
  }

  return (
    <div className="p-3 sm:p-5 max-w-6xl mx-auto h-[calc(100vh-4.5rem)] flex flex-col space-y-3">
      {/* Top Header & Voice Status Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3 sm:p-4 shadow-xs flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 via-teal-600 to-sky-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5">
                <span>EBS AI</span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  Live Swahili
                </span>
              </h1>
            </div>
            <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Kiongozi Mkuu wa Mfumo mzima wa Biashara</span>
            </div>
          </div>
        </div>

        {/* Right Controls: Mode Toggle, Voice Selector, Auto-speak */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Interface Mode Switcher */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-x-auto max-w-full">
            <button
              onClick={() => setInterfaceMode('chat')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shrink-0 ${
                interfaceMode === 'chat'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Chat</span>
            </button>
            <button
              onClick={() => setInterfaceMode('live_orb')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shrink-0 ${
                interfaceMode === 'live_orb'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span>Live Voice Orb</span>
            </button>
            <button
              onClick={() => setInterfaceMode('personas')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shrink-0 ${
                interfaceMode === 'personas'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Haiba za AI (Personas)</span>
            </button>
          </div>

          {/* Hands-Free Wake Word ('Hey EBS') Toggle Button */}
          <button
            type="button"
            onClick={toggleWakeWord}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition active:scale-95 shrink-0 ${
              isWakeTriggered
                ? 'bg-amber-500 text-white border-amber-600 animate-bounce'
                : isWakeWordEnabled && isListeningForWakeWord
                ? 'bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                : isWakeWordEnabled
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
            }`}
            title={
              isWakeWordEnabled
                ? "Wake Word 'Hey EBS' Ipo Wazi! Sema 'Hey EBS' wakati wowote bila kugusa simu"
                : "Washa Wake Word: Sema 'Hey EBS' kuamsha maikrofoni bila kugusa simu"
            }
          >
            <Radio
              className={`w-3.5 h-3.5 ${
                isWakeWordEnabled && isListeningForWakeWord ? 'text-emerald-500 animate-pulse' : ''
              }`}
            />
            <span className="hidden sm:inline">Wake Word:</span>
            <span>
              {isWakeTriggered
                ? '⚡ Nilisikia!'
                : isWakeWordEnabled
                ? '"Hey EBS" (Wazi)'
                : '"Hey EBS" (Zima)'}
            </span>
          </button>

          {/* Voice Commands Cheat Sheet Button */}
          <button
            onClick={() => setShowCommandsModal(true)}
            className="px-3 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-50/70 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-1.5 transition active:scale-95 shrink-0"
            title="Mwongozo wa Amri za Sauti (Voice Commands Cheat Sheet)"
          >
            <HelpCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Amri za Sauti</span>
          </button>

          {/* Voice Selector Button */}
          <button
            onClick={() => setShowVoiceModal(true)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition active:scale-95"
            title="Chagua Sauti ya AI"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Sauti: {selectedVoiceObj.name}</span>
            {swahiliBrowserVoice && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-semibold" title={`Voice: ${swahiliBrowserVoice.name} (${swahiliBrowserVoice.lang})`}>
                sw-TZ
              </span>
            )}
          </button>

          {/* Auto-speak Toggle */}
          <button
            onClick={handleToggleAutoSpeak}
            className={`p-2 rounded-xl border transition flex items-center justify-center ${
              autoSpeakReplies
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
            }`}
            title={autoSpeakReplies ? 'Sauti Ipo Wazi (Inasoma majibu)' : 'Sauti Imezimwa (Kimya)'}
          >
            {autoSpeakReplies ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Dedicated AI Assistant Voice Volume Slider (with Bar Boost) */}
          <AiVoiceVolumeControl activeVoiceId={selectedVoiceId} />

          {/* Dedicated AI Assistant Voice Speed Slider */}
          <AiVoiceSpeedControl activeVoiceId={selectedVoiceId} />

          {/* AI Sessions History Log Button */}
          <button
            onClick={() => {
              setHistoryList(getLocalInteractionHistory());
              setShowHistoryModal(true);
            }}
            className="px-3 py-1.5 rounded-xl border border-indigo-500/30 bg-indigo-50/70 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 text-indigo-800 dark:text-indigo-300 text-xs font-bold flex items-center gap-1.5 transition active:scale-95 shrink-0"
            title="Historia ya Mazungumzo ya AI (Interaction History Log)"
          >
            <History className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span className="hidden sm:inline">Historia</span>
            {historyList.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-200/80 dark:bg-indigo-800 text-indigo-900 dark:text-indigo-200 font-mono font-bold">
                {historyList.length}
              </span>
            )}
          </button>

          {/* Clear Chat */}
          <button
            onClick={() => {
              stopSpeaking();
              setMessages([
                {
                  id: '1',
                  sender: 'ai',
                  text: `Habari! Nipo tayari kukuongoza katika biashara yako leo. Una swali au agizo gani?`,
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                },
              ]);
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Futa Mazungumzo"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Voice Change Toast Feedback */}
      {voiceToast && (
        <div className="mb-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-md flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span>{voiceToast}</span>
          </div>
          <button onClick={() => setVoiceToast(null)} className="text-white/80 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Body: Either AI Personas Settings Mode, Live Voice Orb Mode or Chat Mode */}
      {interfaceMode === 'personas' ? (
        <div className="flex-1 overflow-y-auto pr-1 sm:pr-2 scrollbar-thin">
          <AiPersonaSettingsSection
            onPersonaChanged={(persona) => {
              setSelectedVoiceId(persona.id);
            }}
          />
        </div>
      ) : interfaceMode === 'live_orb' ? (
        /* LIVE VOICE ORB CONVERSATION MODE */
        <div className="flex-1 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 rounded-3xl border border-slate-800 p-6 flex flex-col items-center justify-between text-white shadow-2xl relative overflow-hidden">
          {/* Background Ambient Glows */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Orb Top Status */}
          <div className="text-center z-10 space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>
                {isListening
                  ? 'EBS Inakusikiliza... Zungumza'
                  : currentlySpeakingMsgId
                  ? `EBS Inazungumza (${selectedVoiceObj.name})...`
                  : isLoading
                  ? 'EBS Inachakata jibu lako...'
                  : 'EBS AI Ipo Tayari Kusikiliza'}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Mazungumzo ya Moja kwa Moja ya Sauti kwa Kiswahili Fasaha
            </p>
          </div>

          {/* Central Pulsing Animated AI Orb */}
          <div className="relative z-10 flex flex-col items-center justify-center my-auto">
            {/* Outer Ripple Rings */}
            <div
              className={`w-64 h-64 sm:w-80 sm:h-80 rounded-full border border-emerald-500/20 absolute animate-ping duration-1000 ${
                isListening || currentlySpeakingMsgId ? 'opacity-40' : 'opacity-10'
              }`}
            />
            <div
              className={`w-52 h-52 sm:w-64 sm:h-64 rounded-full border border-teal-500/30 absolute transition-all duration-500 ${
                isListening || currentlySpeakingMsgId ? 'scale-110 opacity-60' : 'scale-100 opacity-20'
              }`}
            />

            {/* Glowing 3D Orb Center */}
            <button
              onClick={handleToggleMic}
              className={`w-40 h-40 sm:w-48 sm:h-48 rounded-full flex flex-col items-center justify-center transition-all duration-300 relative shadow-2xl active:scale-95 cursor-pointer ${
                isListening
                  ? 'bg-gradient-to-tr from-rose-600 via-rose-500 to-amber-500 shadow-rose-500/40 ring-4 ring-rose-400/50 scale-105'
                  : currentlySpeakingMsgId
                  ? 'bg-gradient-to-tr from-emerald-500 via-teal-500 to-sky-400 shadow-emerald-500/40 ring-4 ring-emerald-400/50 animate-pulse'
                  : 'bg-gradient-to-tr from-emerald-600 via-teal-600 to-indigo-600 shadow-emerald-500/30 hover:scale-105'
              }`}
            >
              {isListening ? (
                <div className="flex flex-col items-center space-y-1">
                  <MicOff className="w-12 h-12 text-white animate-bounce" />
                  <span className="text-[11px] font-black tracking-wider uppercase">Simamisha</span>
                </div>
              ) : currentlySpeakingMsgId ? (
                <div className="flex flex-col items-center space-y-1">
                  <Waves className="w-12 h-12 text-white animate-pulse" />
                  <span className="text-[11px] font-black tracking-wider uppercase">Inaongea</span>
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-1">
                  <Mic className="w-12 h-12 text-white" />
                  <span className="text-[11px] font-black tracking-wider uppercase">Bofya Uongee</span>
                </div>
              )}
            </button>

            {/* Active Transcript Preview */}
            <div className="mt-8 text-center max-w-lg min-h-[50px] px-4">
              {isListening && transcript ? (
                <p className="text-base font-semibold text-emerald-300 italic animate-in fade-in">
                  "{transcript}"
                </p>
              ) : currentlySpeakingMsgId ? (
                <p className="text-xs text-slate-300 line-clamp-2">
                  {messages[messages.length - 1]?.text}
                </p>
              ) : (
                <p className="text-xs text-slate-400">
                  {isWakeWordEnabled ? (
                    <span className="text-emerald-300 font-medium">
                      💡 Wake Word inasikiliza: Sema <strong className="text-white underline">"Hey EBS"</strong> au gusa orb hapo juu kuanzisha maongezi bila kugusa kifaa!
                    </span>
                  ) : (
                    <span>Gusa orb hapo juu kuanzisha maongezi, au washa Wake Word ya "Hey EBS" hapo juu.</span>
                  )}
                </p>
              )}
            </div>
          </div>

          {/* Dedicated Live Voice Orb Volume & Speed Sliders */}
          <div className="w-full max-w-lg z-10 my-2 space-y-2.5">
            <AiVoiceVolumeControl variant="expanded" activeVoiceId={selectedVoiceId} />
            <AiVoiceSpeedControl variant="expanded" activeVoiceId={selectedVoiceId} />
          </div>

          {/* Orb Bottom Actions */}
          <div className="w-full max-w-lg z-10 flex items-center justify-between gap-2.5 pt-4 border-t border-slate-800 flex-wrap">
            <button
              onClick={() => setShowCommandsModal(true)}
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 transition px-3 py-1.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30"
            >
              <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>Mwongozo wa Amri za Sauti</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowVoiceModal(true)}
                className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1.5 transition"
              >
                <SlidersHorizontal className="w-4 h-4 text-emerald-400" />
                <span>Sauti: {selectedVoiceObj.name}</span>
              </button>

              <button
                onClick={() => setInterfaceMode('chat')}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              >
                <span>Maandishi (Chat)</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* STANDARD CHAT & VOICE INTERFACE */
        <div className="flex-1 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-3 sm:p-5 shadow-xs flex flex-col justify-between overflow-hidden">
          {/* Chat Messages Scrollable Body */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-1 sm:pr-2 scrollbar-thin">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex items-start gap-2.5 sm:gap-3.5 ${
                  m.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                {/* Avatar */}
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-bold text-xs ${
                    m.sender === 'user'
                      ? 'bg-slate-900 text-white dark:bg-emerald-600'
                      : 'bg-gradient-to-br from-emerald-500 via-teal-600 to-sky-600 text-white shadow-md shadow-emerald-500/20'
                  }`}
                >
                  {m.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                {/* Message Bubble */}
                <div
                  className={`max-w-[88%] sm:max-w-[80%] rounded-2xl p-3.5 sm:p-4 text-xs leading-relaxed shadow-xs relative ${
                    m.sender === 'user'
                      ? 'bg-slate-900 text-white rounded-tr-none'
                      : 'bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 rounded-tl-none'
                  }`}
                >
                  {/* Bubble Header */}
                  <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-slate-200/60 dark:border-slate-700/60 text-[11px]">
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <span>{m.sender === 'user' ? userName : 'EBS AI'}</span>
                      {m.sender === 'ai' && (
                        <span className="text-[10px] text-slate-400 font-normal">
                          · Sauti: {selectedVoiceObj.name}
                        </span>
                      )}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">{m.timestamp}</span>
                      {/* Audio Play/Stop Button on each AI message */}
                      {m.sender === 'ai' && (
                        <button
                          onClick={() => playMessageAudio(m.id, m.text)}
                          className={`p-1 rounded-md transition ${
                            currentlySpeakingMsgId === m.id
                              ? 'bg-emerald-500 text-white'
                              : 'text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400'
                          }`}
                          title={
                            currentlySpeakingMsgId === m.id
                              ? 'Simamisha Sauti'
                              : 'Sikiliza jibu hili kwa Kiswahili'
                          }
                        >
                          {currentlySpeakingMsgId === m.id ? (
                            <Square className="w-3 h-3 fill-current" />
                          ) : (
                            <Volume2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Message Text with formatting */}
                  <div className="whitespace-pre-wrap">{m.text}</div>

                  {/* Suggested System Action Shortcut if applicable */}
                  {m.suggestedAction && onNavigate && (
                    <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
                      <span className="text-[11px] text-slate-500">Kitendo kinachopendekezwa:</span>
                      <button
                        onClick={() => onNavigate(m.suggestedAction!.view)}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 transition shadow-xs active:scale-95"
                      >
                        <span>{m.suggestedAction.label}</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 animate-spin" />
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-2xl rounded-tl-none p-3.5 text-xs text-slate-500 shadow-xs flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>EBS AI inachambua mfumo wako kwa Kiswahili fasaha...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts Carousel */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2 shrink-0">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <span className="text-[11px] font-bold text-slate-400 shrink-0 flex items-center gap-1 mr-1">
                <Zap className="w-3 h-3 text-amber-500" />
                <span>Uliza Haraka:</span>
              </span>
              <button
                type="button"
                onClick={() => setShowCommandsModal(true)}
                className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold whitespace-nowrap transition border border-emerald-500/30 flex items-center gap-1 shrink-0 active:scale-95"
              >
                <HelpCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Amri za Sauti</span>
              </button>
              {quickPrompts.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(p.query)}
                  disabled={isLoading}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-300 text-xs font-semibold whitespace-nowrap transition border border-slate-200 dark:border-slate-700 active:scale-95"
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Input Bar with Microphone & Text */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              {/* Voice Microphone Button */}
              <button
                type="button"
                onClick={handleToggleMic}
                className={`p-3 rounded-2xl font-bold transition flex items-center justify-center shrink-0 active:scale-95 shadow-md ${
                  isListening
                    ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/30 animate-pulse ring-2 ring-rose-400'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30'
                }`}
                title={isListening ? 'Simamisha Kurekodi' : 'Zungumza kwa Sauti (Microphone)'}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              {/* Text Input */}
              <div className="relative flex-1">
                <input
                  type="text"
                  value={inputPrompt}
                  onChange={(e) => setInputPrompt(e.target.value)}
                  disabled={isLoading}
                  placeholder={
                    isListening
                      ? 'Inasikiliza sauti yako... zungumza sasa hivi'
                      : 'Uliza kuhusu mauzo, bidhaa zinazoisha, faida, au kuongoza mfumo...'
                  }
                  className="w-full py-3 px-4 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              {/* Send Button */}
              <button
                type="submit"
                disabled={isLoading || !inputPrompt.trim()}
                className="p-3 bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 disabled:opacity-40 text-white rounded-2xl font-bold transition shadow-md flex items-center justify-center shrink-0 active:scale-95"
                title="Tuma Ujumbe"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>

            {/* Permission / Listening Indicator */}
            {isListening && (
              <div className="flex items-center justify-between text-[11px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-xl border border-emerald-500/20 animate-in fade-in">
                <span className="flex items-center gap-1.5 font-bold">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  <span>Maikrofoni inasikiliza... Ukimaliza bonyeza tena kitufe au tuma.</span>
                </span>
                <button
                  type="button"
                  onClick={cancelListening}
                  className="text-slate-400 hover:text-rose-600 font-semibold"
                >
                  Ghairi
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Voice Selection Modal / Drawer */}
      {showVoiceModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
                  <span>Chagua Sauti ya EBS AI (Gemini Voices)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Chagua sauti ya kiasili itakayotumika kusoma majibu na kuendesha mazungumzo
                </p>
              </div>
              <button
                onClick={() => {
                  stopSpeaking();
                  setShowVoiceModal(false);
                }}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1.5 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Voices Grid */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-2.5 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {GEMINI_VOICES.map((voice) => {
                  const isSelected = selectedVoiceId.toLowerCase() === voice.id.toLowerCase();
                  const isTesting = testingVoiceId === voice.id;

                  return (
                    <div
                      key={voice.id}
                      onClick={() => handleSelectVoice(voice.id)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-2.5 ${
                        isSelected
                          ? 'bg-emerald-500/10 border-emerald-500 ring-2 ring-emerald-500/20'
                          : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-black text-sm text-slate-900 dark:text-white">
                              {voice.name}
                            </span>
                            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                              · {voice.gender === 'male' ? 'Kiume' : 'Kike'}
                            </span>
                          </div>
                          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                            {voice.toneSw}
                          </p>
                        </div>

                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug line-clamp-2">
                        {voice.descriptionSw}
                      </p>

                      {/* Preview Button */}
                      <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTestVoicePreview(voice);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition ${
                            isTesting
                              ? 'bg-emerald-600 text-white animate-pulse'
                              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-emerald-600'
                          }`}
                        >
                          {isTesting ? <Volume2 className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                          <span>{isTesting ? 'Inasikika...' : 'Sikiliza Sauti'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSelectVoice(voice.id)}
                          className={`text-[11px] font-bold ${
                            isSelected
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-slate-400 hover:text-slate-700'
                          }`}
                        >
                          {isSelected ? 'Imeteuliwa' : 'Chagua Hii'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  stopSpeaking();
                  setShowVoiceModal(false);
                  setInterfaceMode('personas');
                }}
                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1.5 self-start sm:self-auto"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Mipangilio ya Haiba (Personas & Tone)</span>
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
                <AiVoiceVolumeControl activeVoiceId={selectedVoiceId} />
                <AiVoiceSpeedControl activeVoiceId={selectedVoiceId} />

                <button
                  onClick={() => {
                    stopSpeaking();
                    setShowVoiceModal(false);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs shrink-0"
                >
                  Hifadhi & Funga
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Voice Commands Help Modal (Cheat Sheet) */}
      <VoiceCommandsHelpModal
        isOpen={showCommandsModal}
        onClose={() => setShowCommandsModal(false)}
        activePersonaId={selectedVoiceId}
        isExecutiveUser={isExecutive}
        onExecuteCommandPrompt={(promptText, targetView) => {
          if (interfaceMode !== 'chat') {
            setInterfaceMode('chat');
          }
          handleSendMessage(promptText);
        }}
      />

      {/* AI Assistant Sessions History Log Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Historia ya Mazungumzo ya EBS AI</span>
                    <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full border border-indigo-500/20">
                      {historyList.length} Rekodi
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Tazama maswali, maagizo na majibu yaliyotolewa hivi karibuni na EBS AI
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  stopSpeaking();
                  setShowHistoryModal(false);
                }}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search and Filter / Clear History Toolbar */}
            <div className="p-3 sm:px-5 sm:py-3 bg-slate-50 dark:bg-slate-850/60 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2.5">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={historySearchQuery}
                  onChange={(e) => setHistorySearchQuery(e.target.value)}
                  placeholder="Tafuta swali au jibu katika historia..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {historyList.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Je, una uhakika unataka kufuta historia yote ya mazungumzo?')) {
                      clearLocalInteractionHistory();
                      setHistoryList([]);
                    }
                  }}
                  className="px-2.5 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 text-xs font-bold hover:bg-rose-100 transition flex items-center gap-1.5 shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Futa Historia</span>
                </button>
              )}
            </div>

            {/* History List Content */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 flex-1 scrollbar-thin">
              {historyList
                .filter((item) => {
                  if (!historySearchQuery.trim()) return true;
                  const q = historySearchQuery.toLowerCase();
                  return (
                    item.userPrompt.toLowerCase().includes(q) ||
                    item.aiReply.toLowerCase().includes(q) ||
                    item.voiceId.toLowerCase().includes(q)
                  );
                })
                .length === 0 ? (
                <div className="text-center py-12 space-y-2">
                  <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                    <History className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    {historySearchQuery ? 'Hakuna matokeo yaliyopatikana' : 'Hakuna Historia ya Mazungumzo Bado'}
                  </h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    {historySearchQuery
                      ? 'Jaribu kutafuta neno lingine au futa utafutaji kuona rekodi zote.'
                      : 'Unapouliza maswali au kutoa maagizo ya sauti na maandishi, EBS AI itahifadhi kumbukumbu zake hapa.'}
                  </p>
                </div>
              ) : (
                historyList
                  .filter((item) => {
                    if (!historySearchQuery.trim()) return true;
                    const q = historySearchQuery.toLowerCase();
                    return (
                      item.userPrompt.toLowerCase().includes(q) ||
                      item.aiReply.toLowerCase().includes(q) ||
                      item.voiceId.toLowerCase().includes(q)
                    );
                  })
                  .map((item) => {
                    const isPlaying = historyPlayingId === item.id;
                    const isCopied = historyCopiedId === item.id;

                    return (
                      <div
                        key={item.id}
                        className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 shadow-xs space-y-3 transition hover:border-indigo-400/50"
                      >
                        {/* Interaction Meta Header */}
                        <div className="flex items-center justify-between text-[11px] pb-2 border-b border-slate-100 dark:border-slate-800">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-500 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>{item.dateFormatted} · {item.timeFormatted}</span>
                            </span>
                            <span className="px-2 py-0.5 rounded-full font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px]">
                              {item.userRole}
                            </span>
                          </div>
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            Sauti: {item.voiceId}
                          </span>
                        </div>

                        {/* User Query */}
                        <div className="flex items-start gap-2.5">
                          <div className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0 mt-0.5">
                            <User className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex-1">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              Swali / Agizo:
                            </div>
                            <p className="text-xs font-semibold text-slate-900 dark:text-white leading-relaxed">
                              {item.userPrompt}
                            </p>
                          </div>
                        </div>

                        {/* AI Response */}
                        <div className="flex items-start gap-2.5 pt-1">
                          <div className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                            <Bot className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex-1">
                            <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                              Jibu la EBS AI:
                            </div>
                            <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line font-normal">
                              {item.aiReply}
                            </div>
                          </div>
                        </div>

                        {/* Card Actions Footer */}
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => {
                              setMessages((prev) => [
                                ...prev,
                                {
                                  id: Date.now().toString(),
                                  sender: 'user',
                                  text: item.userPrompt,
                                  timestamp: item.timeFormatted,
                                },
                                {
                                  id: (Date.now() + 1).toString(),
                                  sender: 'ai',
                                  text: item.aiReply,
                                  timestamp: item.timeFormatted,
                                },
                              ]);
                              if (interfaceMode !== 'chat') {
                                setInterfaceMode('chat');
                              }
                              setShowHistoryModal(false);
                            }}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition flex items-center gap-1"
                          >
                            <MessageSquare className="w-3 h-3" />
                            <span>Pakia kwenye Chat</span>
                          </button>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={async () => {
                                if (isPlaying) {
                                  stopSpeaking();
                                  setHistoryPlayingId(null);
                                  return;
                                }
                                stopSpeaking();
                                setHistoryPlayingId(item.id);
                                try {
                                  const swVoice = await fetchAndSetSwahiliVoice();
                                  const cleanText = prepareSwahiliSpeechText(item.aiReply);
                                  await speakTextSwahili(cleanText, item.voiceId, undefined, undefined, swVoice);
                                } finally {
                                  setHistoryPlayingId(null);
                                }
                              }}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 ${
                                isPlaying
                                  ? 'bg-emerald-600 text-white animate-pulse'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-emerald-600'
                              }`}
                            >
                              <Volume2 className="w-3 h-3" />
                              <span>{isPlaying ? 'Inasikika...' : 'Sikiliza'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                const fullText = `Swali: ${item.userPrompt}\n\nJibu la EBS AI:\n${item.aiReply}`;
                                navigator.clipboard?.writeText(fullText);
                                setHistoryCopiedId(item.id);
                                setTimeout(() => setHistoryCopiedId(null), 2000);
                              }}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-indigo-600 transition flex items-center gap-1"
                            >
                              {isCopied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                              <span>{isCopied ? 'Imenakiliwa' : 'Nakili'}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 sm:p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Inahifadhiwa kwenye kifaa hiki (Local Storage)
              </span>
              <button
                type="button"
                onClick={() => {
                  stopSpeaking();
                  setShowHistoryModal(false);
                }}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-xl text-xs font-bold transition"
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

export default AiAssistantView;
