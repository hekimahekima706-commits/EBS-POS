import React, { useState, useMemo } from 'react';
import {
  speakTextSwahili,
  stopSpeaking,
  getActiveAiPersona,
} from '../utils/audioVoiceService';
import {
  X,
  Search,
  Mic,
  Volume2,
  Copy,
  Check,
  Play,
  Square,
  Sparkles,
  ShoppingBag,
  Package,
  Users,
  CreditCard,
  FileText,
  Wine,
  UserCheck,
  Radio,
  ArrowRight,
  HelpCircle,
  Zap,
} from 'lucide-react';

export interface VoiceCommandItem {
  id: string;
  category: 'sales' | 'inventory' | 'customers' | 'reports' | 'staff' | 'bar' | 'system';
  categoryLabelSw: string;
  categoryLabelEn: string;
  textSw: string;
  textEn: string;
  descriptionSw: string;
  descriptionEn: string;
  exampleSpoken: string;
  requiresExecutive?: boolean;
  targetView?: string;
  quickActionPrompt?: string;
}

export const VOICE_COMMANDS_CATALOG: VoiceCommandItem[] = [
  // 1. Sales & POS
  {
    id: 'cmd-sales-today',
    category: 'sales',
    categoryLabelSw: 'Mauzo & Kaunta',
    categoryLabelEn: 'Sales & POS',
    textSw: 'Onyesha mauzo ya leo',
    textEn: "Show today's sales",
    descriptionSw: 'Inakupa muhtasari kamili wa mauzo ya leo, idadi ya risiti zilizotolewa na wastani wa ununuzi.',
    descriptionEn: "Displays total sales revenue, transactions count, and today's average ticket size.",
    exampleSpoken: 'Hey EBS, onyesha mauzo ya leo',
    quickActionPrompt: 'Nionyeshe muhtasari wa mauzo yote ya leo, idadi ya risiti zilizotolewa na miamala mikubwa.',
    targetView: 'pos',
  },
  {
    id: 'cmd-sales-voice-order',
    category: 'sales',
    categoryLabelSw: 'Mauzo & Kaunta',
    categoryLabelEn: 'Sales & POS',
    textSw: 'Uza Serengeti tatu na Heineken mbili',
    textEn: 'Sell 3 Serengeti and 2 Heineken',
    descriptionSw: 'Inanasa bidhaa na idadi yake mara moja kwa sauti kwenye kaunta ya mauzo ya POS.',
    descriptionEn: 'Adds requested products and quantities directly into the active POS cart via voice.',
    exampleSpoken: 'Hey EBS, uza Serengeti tatu na Heineken mbili',
    quickActionPrompt: 'Uza Serengeti tatu na Heineken mbili',
    targetView: 'pos',
  },
  {
    id: 'cmd-sales-confirm',
    category: 'sales',
    categoryLabelSw: 'Mauzo & Kaunta',
    categoryLabelEn: 'Sales & POS',
    textSw: 'Thibitisha mauzo',
    textEn: 'Confirm sale',
    descriptionSw: 'Inakamilisha oda ya mauzo iliyoandaliwa na kupunguza stoo mara moja.',
    descriptionEn: 'Confirms the pending voice draft and finalizes the sale in the database.',
    exampleSpoken: 'Sawa, thibitisha mauzo',
    quickActionPrompt: 'Thibitisha mauzo',
    targetView: 'pos',
  },
  {
    id: 'cmd-sales-receipt',
    category: 'sales',
    categoryLabelSw: 'Mauzo & Kaunta',
    categoryLabelEn: 'Sales & POS',
    textSw: 'Toa risiti',
    textEn: 'Print receipt',
    descriptionSw: 'Inafungua dirisha la kuchapisha au kutoa risiti ya muamala uliokamilika.',
    descriptionEn: 'Triggers thermal receipt generation or print modal for the customer.',
    exampleSpoken: 'Toa risiti sasa',
    quickActionPrompt: 'Toa risiti ya mauzo',
    targetView: 'pos',
  },
  {
    id: 'cmd-sales-cancel',
    category: 'sales',
    categoryLabelSw: 'Mauzo & Kaunta',
    categoryLabelEn: 'Sales & POS',
    textSw: 'Ghairi mauzo',
    textEn: 'Cancel sale',
    descriptionSw: 'Inasitisha na kufuta bidhaa zilizotajwa kwenye oda ya sasa kabla ya uthibitisho.',
    descriptionEn: 'Cancels the active voice sale draft safely without recording to database.',
    exampleSpoken: 'Sitisha mauzo haya',
    quickActionPrompt: 'Ghairi mauzo haya',
    targetView: 'pos',
  },

  // 2. Inventory & Stock
  {
    id: 'cmd-inv-add-item',
    category: 'inventory',
    categoryLabelSw: 'Stoo & Bidhaa',
    categoryLabelEn: 'Inventory & Products',
    textSw: 'Ongeza bidhaa mpya stoo',
    textEn: 'Add inventory item',
    descriptionSw: 'Inafungua fomu ya kusajili bidhaa mpya stoo yenye bei ya ununuzi na kuuza.',
    descriptionEn: 'Opens the product registration modal or guides you through adding new inventory items.',
    exampleSpoken: 'Hey EBS, ongeza bidhaa mpya stoo',
    quickActionPrompt: 'Nielekeze jinsi ya kuongeza bidhaa mpya stoo na nifungulie fomu ya usajili wa bidhaa.',
    targetView: 'inventory',
  },
  {
    id: 'cmd-inv-low-stock',
    category: 'inventory',
    categoryLabelSw: 'Stoo & Bidhaa',
    categoryLabelEn: 'Inventory & Products',
    textSw: 'Bidhaa zipi zimebaki chache stoo?',
    textEn: 'Which items are low in stock?',
    descriptionSw: 'Inakupa orodha ya bidhaa zote zilizofikia au kushuka chini ya kiwango cha usalama (Reorder Level).',
    descriptionEn: 'Provides a real-time list of all products below safety threshold needing restock.',
    exampleSpoken: 'Hey EBS, niambie bidhaa gani zimebaki chache stoo?',
    quickActionPrompt: 'Ni bidhaa zipi zimebaki chache sana stoo leo ambazo zinatakiwa kuagizwa haraka?',
    targetView: 'inventory',
  },
  {
    id: 'cmd-inv-check-qty',
    category: 'inventory',
    categoryLabelSw: 'Stoo & Bidhaa',
    categoryLabelEn: 'Inventory & Products',
    textSw: 'Kuna idadi gani ya Kilimanjaro stoo?',
    textEn: 'Check Kilimanjaro stock quantity',
    descriptionSw: 'Inakagua hesabu kamili ya stoo iliyobaki ya bidhaa yoyote unayotaja kwa jina.',
    descriptionEn: 'Queries the current on-hand stock quantity for any specific requested item.',
    exampleSpoken: 'Kuna kreti ngapi za Kilimanjaro zilizobaki?',
    quickActionPrompt: 'Kuna bidhaa ngapi za Kilimanjaro Lager zilizobaki stoo kwa sasa?',
    targetView: 'inventory',
  },
  {
    id: 'cmd-inv-prices',
    category: 'inventory',
    categoryLabelSw: 'Stoo & Bidhaa',
    categoryLabelEn: 'Inventory & Products',
    textSw: 'Bei za bidhaa maarufu ni ngapi?',
    textEn: 'What are the prices of popular items?',
    descriptionSw: 'Inataja bei rasmi za rejareja na jumla zilizowekwa kwenye mfumo kwa wateja.',
    descriptionEn: 'Speaks retail and wholesale selling prices of your top-selling products.',
    exampleSpoken: 'Niambie bei rasmi za bidhaa zetu',
    quickActionPrompt: 'Niambie bei za rejareja za bidhaa zinazonunuliwa zaidi leo.',
    targetView: 'inventory',
  },

  // 3. Customers & Debts
  {
    id: 'cmd-cust-register',
    category: 'customers',
    categoryLabelSw: 'Wateja & Madeni',
    categoryLabelEn: 'Customers & Debts',
    textSw: 'Sajili mteja mpya',
    textEn: 'Register new customer',
    descriptionSw: 'Inafungua orodha na fomu ya kumsajili mteja mpya, namba ya simu na kikomo cha kukopa.',
    descriptionEn: 'Opens customer management and registration modal with credit limits.',
    exampleSpoken: 'Hey EBS, sajili mteja mpya',
    quickActionPrompt: 'Nisaidie kusajili mteja mpya kwenye orodha ya wateja na madeni.',
    targetView: 'debts',
  },
  {
    id: 'cmd-cust-debts-list',
    category: 'customers',
    categoryLabelSw: 'Wateja & Madeni',
    categoryLabelEn: 'Customers & Debts',
    textSw: 'Nani anadaiwa zaidi?',
    textEn: 'Who owes the most debt?',
    descriptionSw: 'Inatoa orodha ya wateja wenye madeni makubwa na madeni yaliyochelewa kulipwa.',
    descriptionEn: 'Analyzes outstanding accounts receivable and ranks debtors by overdue balance.',
    exampleSpoken: 'Onyesha wateja wanaodaiwa zaidi',
    quickActionPrompt: 'Ni wateja gani wanaodaiwa fedha nyingi zaidi na ni nani wamechelewa kulipa?',
    targetView: 'debts',
  },
  {
    id: 'cmd-cust-debt-whatsapp',
    category: 'customers',
    categoryLabelSw: 'Wateja & Madeni',
    categoryLabelEn: 'Customers & Debts',
    textSw: 'Kumbusho la deni kwa WhatsApp',
    textEn: 'Send debt reminder via WhatsApp',
    descriptionSw: 'Inaandaa ujumbe wa heshima na staha wa kumtumia mteja mwenye deni kupitia WhatsApp.',
    descriptionEn: 'Drafts a courteous, professional Swahili debt reminder message for WhatsApp.',
    exampleSpoken: 'Tuma kumbusho la deni kwa mteja anayedaiwa',
    quickActionPrompt: 'Niandikie ujumbe mzuri na wa heshima wa WhatsApp wa kumkumbusha mteja anayedaiwa afanye malipo.',
    targetView: 'debts',
  },

  // 4. Reports & Financials (Executive / Owner)
  {
    id: 'cmd-rep-net-profit',
    category: 'reports',
    categoryLabelSw: 'Ripoti & Faida',
    categoryLabelEn: 'Reports & Profit',
    textSw: 'Faida halisi ya leo ni ngapi?',
    textEn: "What is today's net profit?",
    descriptionSw: 'Inachambua mapato, gharama za manunuzi na matumizi ili kutoa faida halisi (Net Profit).',
    descriptionEn: 'Calculates Gross Margin minus operational expenses for true net bottom line.',
    requiresExecutive: true,
    exampleSpoken: 'Hey EBS, faida yangu halisi ya leo ni ngapi?',
    quickActionPrompt: 'Nipe ripoti ya faida ghafi (Gross Profit), matumizi na faida halisi (Net Profit) ya leo.',
    targetView: 'reports',
  },
  {
    id: 'cmd-rep-expenses',
    category: 'reports',
    categoryLabelSw: 'Ripoti & Faida',
    categoryLabelEn: 'Reports & Profit',
    textSw: 'Matumizi makubwa ya mwezi huu ni yapi?',
    textEn: 'What are this month major expenses?',
    descriptionSw: 'Inatoa mchanganuo wa gharama za uendeshaji (kodi, umeme, mishahara, usafiri) na ushauri.',
    descriptionEn: 'Summarizes top business overhead expenses and suggestions for cost optimization.',
    requiresExecutive: true,
    exampleSpoken: 'Ni matumizi yapi makubwa yanayokata faida yangu?',
    quickActionPrompt: 'Ni matumizi yapi makubwa zaidi ya biashara mwezi huu na ninawezaje kuyadhibiti?',
    targetView: 'expenses',
  },
  {
    id: 'cmd-rep-compare',
    category: 'reports',
    categoryLabelSw: 'Ripoti & Faida',
    categoryLabelEn: 'Reports & Profit',
    textSw: 'Linganisha mauzo ya jana na leo',
    textEn: 'Compare yesterday and today sales',
    descriptionSw: 'Inalinganisha mapato na kiwango cha mauzo cha siku zilizopita na viashiria vya ukuaji.',
    descriptionEn: 'Compares revenue metrics and sales volume trends across days or weeks.',
    requiresExecutive: true,
    exampleSpoken: 'Linganisha mauzo ya leo na ya jana',
    quickActionPrompt: 'Linganisha mwenendo wa mauzo ya leo ukilinganisha na siku ya jana, je yanapanda au kushuka?',
    targetView: 'reports',
  },

  // 5. Staff & Productivity
  {
    id: 'cmd-staff-top-performer',
    category: 'staff',
    categoryLabelSw: 'Wafanyakazi & Tija',
    categoryLabelEn: 'Staff & Productivity',
    textSw: 'Ni mfanyakazi yupi anayeongoza kwa mauzo?',
    textEn: 'Who is the top performing staff member?',
    descriptionSw: 'Inakagua chati za Recharts za ufanisi wa kila keshia na mhudumu kwa mapato na wingi wa bidhaa.',
    descriptionEn: 'Queries the staff productivity leaderboard for revenue, volume, and commission metrics.',
    requiresExecutive: true,
    exampleSpoken: 'Ni nani anayeongoza kwa mauzo kati ya wafanyakazi?',
    quickActionPrompt: 'Ni mfanyakazi au keshia yupi anayeongoza kwa kuuza zaidi na kuingiza mapato makubwa leo?',
    targetView: 'employees',
  },
  {
    id: 'cmd-staff-shift-close',
    category: 'staff',
    categoryLabelSw: 'Wafanyakazi & Tija',
    categoryLabelEn: 'Staff & Productivity',
    textSw: 'Funga mahesabu ya siku (Shift Closing)',
    textEn: 'Close cashier shift and reconcile',
    descriptionSw: 'Inatoa muongozo wa kulinganisha fedha taslimu kwenye droo na risiti zilizorekodiwa mfumoni.',
    descriptionEn: 'Guides through end-of-shift reconciliation and cash drawer handover.',
    exampleSpoken: 'Nielekeze jinsi ya kufunga shift ya leo',
    quickActionPrompt: 'Nielekeze hatua kwa hatua namna ya kufunga shift ya kaunta na kukabidhi hesabu za siku.',
    targetView: 'pos',
  },

  // 6. Bar Mode & Drinks
  {
    id: 'cmd-bar-open-bottle',
    category: 'bar',
    categoryLabelSw: 'Bar & Vinywaji',
    categoryLabelEn: 'Bar Mode & Spirits',
    textSw: 'Fungua chupa mpya ya kinywaji kikali',
    textEn: 'Open new spirits bottle',
    descriptionSw: 'Inarekodi ufunguaji wa chupa na kuweka hesabu ya shots 25 au 30 bila kupoteza tone.',
    descriptionEn: 'Records opening a liquor bottle into active bar inventory and converts to shot counts.',
    exampleSpoken: 'Fungua chupa ya Johnnie Walker Black',
    quickActionPrompt: 'Nielekeze namna ya kurekodi chupa iliyofunguliwa kwenye moduli ya Bar Mode kwa ajili ya shoti.',
    targetView: 'barmode',
  },
  {
    id: 'cmd-bar-variance',
    category: 'bar',
    categoryLabelSw: 'Bar & Vinywaji',
    categoryLabelEn: 'Bar Mode & Spirits',
    textSw: 'Kagua tofauti ya shoti za baa (Variance)',
    textEn: 'Check bar shot variances',
    descriptionSw: 'Inachambua idadi ya shoti zilizouzwa dhidi ya kiasi kilichobaki kwenye chupa kuzuia wizi.',
    descriptionEn: 'Audits poured shots against POS sales receipts to prevent bartender shrinkage.',
    requiresExecutive: true,
    exampleSpoken: 'Kagua ripoti ya tofauti ya shoti za baa',
    quickActionPrompt: 'Nipe mchanganuo wa udhibiti wa shoti za vinywaji vikali na utatuzi wa variance ya baa.',
    targetView: 'barmode',
  },

  // 7. System & Navigation
  {
    id: 'cmd-sys-voice-persona',
    category: 'system',
    categoryLabelSw: 'Mfumo & Sauti',
    categoryLabelEn: 'System & Voice',
    textSw: 'Badilisha haiba au sauti ya AI',
    textEn: 'Change AI Voice or Persona',
    descriptionSw: 'Inabadilisha sauti na mtindo kati ya Orbit, Capella, Vega, Ursa, Pegasus, na Flare.',
    descriptionEn: 'Switches between Gemini voice personas and custom tone configurations.',
    exampleSpoken: 'Weka sauti ya Capella',
    quickActionPrompt: 'Nionyeshe jinsi ya kubadilisha haiba ya AI au sauti ya Orbit, Capella, Vega, Ursa, Pegasus au Flare.',
  },
  {
    id: 'cmd-sys-wake-word',
    category: 'system',
    categoryLabelSw: 'Mfumo & Sauti',
    categoryLabelEn: 'System & Voice',
    textSw: 'Washa mfumo wa kuitikia (Hey EBS)',
    textEn: "Turn on hands-free wake word ('Hey EBS')",
    descriptionSw: 'Inaeleza jinsi ya kutumia Wake Word kutoa amri zote bila kugusa skrini ya simu au kompyuta.',
    descriptionEn: 'Enables automatic hands-free microphone trigger when saying "Hey EBS".',
    exampleSpoken: 'Hey EBS',
    quickActionPrompt: 'Nielekeze jinsi ya kuwasha Wake Word ya "Hey EBS" ili niweze kuongea bila kugusa kifaa.',
  },
];

interface VoiceCommandsHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCommand?: (command: VoiceCommandItem) => void;
  onExecuteCommandPrompt?: (promptText: string, targetView?: string) => void;
  activePersonaId?: string;
  isExecutiveUser?: boolean;
}

export const VoiceCommandsHelpModal: React.FC<VoiceCommandsHelpModalProps> = ({
  isOpen,
  onClose,
  onSelectCommand,
  onExecuteCommandPrompt,
  activePersonaId = 'Orbit',
  isExecutiveUser = true,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [playingCommandId, setPlayingCommandId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const activePersona = getActiveAiPersona(activePersonaId);

  // Filter commands by role, search, and category
  const filteredCommands = useMemo(() => {
    return VOICE_COMMANDS_CATALOG.filter((cmd) => {
      // If non-executive, hide commands that expose confidential owner data
      if (!isExecutiveUser && cmd.requiresExecutive) {
        return false;
      }

      // Filter by category
      if (selectedCategory !== 'all' && cmd.category !== selectedCategory) {
        return false;
      }

      // Filter by search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesSw = cmd.textSw.toLowerCase().includes(q);
        const matchesEn = cmd.textEn.toLowerCase().includes(q);
        const matchesDesc = cmd.descriptionSw.toLowerCase().includes(q);
        const matchesCat = cmd.categoryLabelSw.toLowerCase().includes(q);
        return matchesSw || matchesEn || matchesDesc || matchesCat;
      }

      return true;
    });
  }, [searchQuery, selectedCategory, isExecutiveUser]);

  // Audio preview handler
  const handlePlayVoiceSample = async (cmd: VoiceCommandItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    if (playingCommandId === cmd.id) {
      stopSpeaking();
      setPlayingCommandId(null);
      return;
    }

    stopSpeaking();
    setPlayingCommandId(cmd.id);

    try {
      // Speak the Swahili vocal command with the user's active persona
      await speakTextSwahili(cmd.exampleSpoken || cmd.textSw, activePersona.id);
    } catch (err) {
      console.warn('Voice command sample playback error:', err);
    } finally {
      setPlayingCommandId(null);
    }
  };

  // Copy to clipboard handler
  const handleCopyText = (text: string, id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // ignore clipboard error
    }
  };

  // Execute / Try command in AI Assistant
  const handleTryCommand = (cmd: VoiceCommandItem) => {
    stopSpeaking();
    if (onSelectCommand) {
      onSelectCommand(cmd);
    }
    if (onExecuteCommandPrompt) {
      onExecuteCommandPrompt(cmd.quickActionPrompt || cmd.textSw, cmd.targetView);
    }
    onClose();
  };

  if (!isOpen) return null;

  const categories = [
    { id: 'all', label: 'Amri Zote (All)', count: VOICE_COMMANDS_CATALOG.length },
    { id: 'sales', label: 'Mauzo & POS', count: VOICE_COMMANDS_CATALOG.filter((c) => c.category === 'sales').length },
    { id: 'inventory', label: 'Stoo & Bidhaa', count: VOICE_COMMANDS_CATALOG.filter((c) => c.category === 'inventory').length },
    { id: 'customers', label: 'Wateja & Madeni', count: VOICE_COMMANDS_CATALOG.filter((c) => c.category === 'customers').length },
    { id: 'reports', label: 'Ripoti & Faida', count: VOICE_COMMANDS_CATALOG.filter((c) => c.category === 'reports').length },
    { id: 'staff', label: 'Wafanyakazi', count: VOICE_COMMANDS_CATALOG.filter((c) => c.category === 'staff').length },
    { id: 'bar', label: 'Bar & Shoti', count: VOICE_COMMANDS_CATALOG.filter((c) => c.category === 'bar').length },
    { id: 'system', label: 'Mfumo & Sauti', count: VOICE_COMMANDS_CATALOG.filter((c) => c.category === 'system').length },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Mic className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">
                  Mwongozo wa Amri za Sauti (Voice Commands)
                </h2>
                <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-500/20">
                  Cheat Sheet
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                Amri fasaha za Kiswahili na Kiingereza unazoweza kusema kwa maiki au Wake Word "Hey EBS"
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition shrink-0"
            title="Funga Dirisha"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Tip Banner for Hands-Free Wake Word */}
        <div className="px-4 sm:px-6 py-3 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-sky-500/10 border-b border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-emerald-500/30">
              <Radio className="w-4 h-4 animate-pulse" />
            </div>
            <div className="text-xs">
              <span className="font-bold text-slate-900 dark:text-white">
                Mawasiliano Bila Kugusa Simu (Hands-Free):
              </span>{' '}
              <span className="text-slate-600 dark:text-slate-300">
                Sema tu <strong className="text-emerald-700 dark:text-emerald-400 font-mono">"Hey EBS"</strong> au <strong className="text-emerald-700 dark:text-emerald-400 font-mono">"Habari EBS"</strong> kisha utaje amri yoyote hapa chini!
              </span>
            </div>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 shrink-0">
            <span>Haiba Inayotumika:</span>
            <span className="font-bold text-slate-700 dark:text-slate-200">
              {activePersona.name} ({activePersona.toneStyleSw})
            </span>
          </div>
        </div>

        {/* Search & Category Filter Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 space-y-3 bg-white dark:bg-slate-900 shrink-0">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tafuta amri (mfano: mauzo, stoo, mteja, faida, sales, inventory, register)..."
              className="w-full pl-10 pr-9 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Tabs (Segmented Buttons) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                  selectedCategory === cat.id
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                <span>{cat.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    selectedCategory === cat.id
                      ? 'bg-emerald-700/60 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {cat.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Commands List Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5 scrollbar-thin">
          {filteredCommands.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">
                Hakuna amri inayolingana na "{searchQuery}"
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Jaribu neno lingine au badilisha kichujio cha makundi ya amri hapo juu.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-500/20"
              >
                Onyesha Amri Zote
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredCommands.map((cmd) => {
                const isPlaying = playingCommandId === cmd.id;
                const isCopied = copiedId === cmd.id;

                return (
                  <div
                    key={cmd.id}
                    className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 hover:border-emerald-500/40 hover:shadow-md transition flex flex-col justify-between group"
                  >
                    <div>
                      {/* Category and Badges */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[11px] font-bold text-slate-400 dark:text-slate-400 flex items-center gap-1">
                          {cmd.category === 'sales' && <ShoppingBag className="w-3 h-3 text-emerald-500" />}
                          {cmd.category === 'inventory' && <Package className="w-3 h-3 text-sky-500" />}
                          {cmd.category === 'customers' && <Users className="w-3 h-3 text-violet-500" />}
                          {cmd.category === 'reports' && <FileText className="w-3 h-3 text-amber-500" />}
                          {cmd.category === 'staff' && <UserCheck className="w-3 h-3 text-teal-500" />}
                          {cmd.category === 'bar' && <Wine className="w-3 h-3 text-rose-500" />}
                          {cmd.category === 'system' && <Zap className="w-3 h-3 text-indigo-500" />}
                          <span>{cmd.categoryLabelSw}</span>
                        </span>

                        <div className="flex items-center gap-1.5">
                          {cmd.requiresExecutive && (
                            <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded border border-amber-500/20">
                              Mmiliki / Meneja
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400">
                            {cmd.categoryLabelEn}
                          </span>
                        </div>
                      </div>

                      {/* Primary Vocal Command in Bold Quotation */}
                      <div className="bg-slate-50 dark:bg-slate-900/80 rounded-xl p-3 border border-slate-100 dark:border-slate-800 mb-2.5">
                        <div className="text-xs font-mono font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span className="text-emerald-500 font-bold text-sm">“</span>
                          <span>{cmd.textSw}</span>
                          <span className="text-emerald-500 font-bold text-sm">”</span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 italic mt-0.5">
                          Kiingereza: <span className="font-medium text-slate-600 dark:text-slate-300">"{cmd.textEn}"</span>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
                        {cmd.descriptionSw}
                      </p>
                    </div>

                    {/* Bottom Action Buttons */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        {/* Audio Pronunciation Sample */}
                        <button
                          type="button"
                          onClick={(e) => handlePlayVoiceSample(cmd, e)}
                          className={`p-1.5 rounded-lg border text-xs font-medium flex items-center gap-1 transition ${
                            isPlaying
                              ? 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-900 animate-pulse'
                              : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                          }`}
                          title="Sikiliza jinsi ya kusema amri hii kwa sauti"
                        >
                          {isPlaying ? (
                            <>
                              <Square className="w-3.5 h-3.5 fill-current" />
                              <span className="text-[11px]">Simamisha</span>
                            </>
                          ) : (
                            <>
                              <Volume2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              <span className="text-[11px] hidden sm:inline">Tamka</span>
                            </>
                          )}
                        </button>

                        {/* Copy Command Button */}
                        <button
                          type="button"
                          onClick={(e) => handleCopyText(cmd.textSw, cmd.id, e)}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs transition"
                          title="Nakili maneno ya amri hii"
                        >
                          {isCopied ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      {/* Try Command / Jaribu Amri */}
                      <button
                        type="button"
                        onClick={() => handleTryCommand(cmd)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm shadow-emerald-600/30"
                      >
                        <span>Jaribu Amri</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Notes */}
        <div className="p-3.5 sm:p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>
              EBS AI inatumia <strong>Gemini 3.8</strong> kuelewa lafudhi mbalimbali na sentensi huru za Kiswahili na Kiingereza.
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold transition self-end sm:self-auto"
          >
            Funga
          </button>
        </div>
      </div>
    </div>
  );
};

export default VoiceCommandsHelpModal;
