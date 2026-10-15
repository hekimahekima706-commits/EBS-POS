import React, { useState, useEffect } from 'react';
import {
  AI_PERSONAS,
  AiPersona,
  getActiveAiPersona,
  speakTextSwahili,
  stopSpeaking,
  AI_VOICE_CHANGE_EVENT,
  setSelectedAiVoice,
} from '../utils/audioVoiceService';
import {
  Sparkles,
  Play,
  Square,
  Check,
  Volume2,
  VolumeX,
  SlidersHorizontal,
  Bot,
  Flame,
  Zap,
  ShieldAlert,
  HeartHandshake,
  Crown,
  CheckCircle2,
  RefreshCw,
  Mic,
  Radio,
  HelpCircle,
} from 'lucide-react';
import { useWakeWord } from '../hooks/useWakeWord';
import { VoiceCommandsHelpModal } from './VoiceCommandsHelpModal';
import { AiVoiceVolumeControl } from './AiVoiceVolumeControl';
import { AiVoiceSpeedControl } from './AiVoiceSpeedControl';

interface AiPersonaSettingsSectionProps {
  onPersonaChanged?: (persona: AiPersona) => void;
  standalone?: boolean;
}

export const AiPersonaSettingsSection: React.FC<AiPersonaSettingsSectionProps> = ({
  onPersonaChanged,
  standalone = false,
}) => {
  const [activePersonaId, setActivePersonaId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return (
        localStorage.getItem('ebs_ai_selected_voice') ||
        localStorage.getItem('ebs_ai_selected_persona') ||
        'Orbit'
      );
    }
    return 'Orbit';
  });

  const [testingPersonaId, setTestingPersonaId] = useState<string | null>(null);

  // Sync with global voice change events from anywhere in the app
  useEffect(() => {
    const handleVoiceChange = (e: any) => {
      if (e.detail?.voiceId) {
        setActivePersonaId(e.detail.voiceId);
      }
    };
    window.addEventListener(AI_VOICE_CHANGE_EVENT, handleVoiceChange);
    return () => {
      window.removeEventListener(AI_VOICE_CHANGE_EVENT, handleVoiceChange);
    };
  }, []);

  const [autoSpeak, setAutoSpeak] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('ebs_ai_auto_speak') !== 'false';
    }
    return true;
  });

  const [verbosity, setVerbosity] = useState<'concise' | 'detailed'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('ebs_ai_verbosity') as any) || 'detailed';
    }
    return 'detailed';
  });

  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [showCommandsModal, setShowCommandsModal] = useState<boolean>(false);

  // Wake Word ('Hey EBS') Detection Hook
  const {
    isWakeWordEnabled,
    toggleWakeWord,
    isListeningForWakeWord,
    isTriggered: isWakeWordTriggered,
    isSupported: isWakeSupported,
  } = useWakeWord();

  const currentPersona = getActiveAiPersona(activePersonaId);

  const handleSelectPersona = (persona: AiPersona) => {
    setActivePersonaId(persona.id);
    setSelectedAiVoice(persona.id);
    if (onPersonaChanged) {
      onPersonaChanged(persona);
    }
    setSaveToast(`Haiba ya AI imebadilishwa kuwa "${persona.name}"!`);
    setTimeout(() => setSaveToast(null), 2500);

    // Provide immediate spoken greeting in the chosen persona voice
    speakTextSwahili(`Habari! Naitwa ${persona.name}. Nipo tayari kukuongoza.`, persona.id).catch(() => {});
  };

  const handleTestAudioSample = async (persona: AiPersona, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    if (testingPersonaId === persona.id) {
      stopSpeaking();
      setTestingPersonaId(null);
      return;
    }

    stopSpeaking();
    setTestingPersonaId(persona.id);

    try {
      await speakTextSwahili(persona.sampleTextSw, persona.id);
    } catch (err) {
      console.warn('Audio sample preview error:', err);
    } finally {
      setTestingPersonaId(null);
    }
  };

  const handleToggleAutoSpeak = () => {
    setAutoSpeak((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('ebs_ai_auto_speak', String(next));
      }
      return next;
    });
  };

  const handleSetVerbosity = (val: 'concise' | 'detailed') => {
    setVerbosity(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('ebs_ai_verbosity', val);
    }
  };

  const getPersonaIcon = (id: string) => {
    switch (id.toLowerCase()) {
      case 'orbit':
        return <Crown className="w-5 h-5 text-emerald-500" />;
      case 'capella':
        return <Sparkles className="w-5 h-5 text-pink-500" />;
      case 'vega':
        return <HeartHandshake className="w-5 h-5 text-sky-500" />;
      case 'ursa':
        return <ShieldAlert className="w-5 h-5 text-amber-500" />;
      case 'pegasus':
        return <Zap className="w-5 h-5 text-indigo-500" />;
      case 'flare':
        return <Flame className="w-5 h-5 text-violet-500" />;
      default:
        return <Bot className="w-5 h-5 text-emerald-500" />;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {saveToast && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold animate-in slide-in-from-top-4">
          <CheckCircle2 className="w-4 h-4" />
          <span>{saveToast}</span>
        </div>
      )}

      {/* Section Header */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-500/30">
                ✨ TONE & VOICE CUSTOMIZATION
              </span>
            </div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white mt-1 flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5 text-emerald-600" />
              <span>Haiba za AI (AI Personas) & Mtindo wa Mazungumzo</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              Chagua mtindo, toni ya maneno na sauti itakayotumiwa na EBS AI wakati wa kujadili mahesabu ya biashara, kutoa ushauri na kusoma majibu.
            </p>
          </div>

          {/* Currently Active Banner */}
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shrink-0">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white text-base shadow-sm"
              style={{ backgroundColor: currentPersona.accentColor }}
            >
              {currentPersona.avatarLetter}
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Haiba Inayotumika Sasa
              </div>
              <div className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>{currentPersona.name}</span>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                  ({currentPersona.gender === 'male' ? 'Kiume' : 'Kike'})
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid of 6 AI Personas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {AI_PERSONAS.map((persona) => {
          const isActive = activePersonaId.toLowerCase() === persona.id.toLowerCase();
          const isTesting = testingPersonaId === persona.id;

          return (
            <div
              key={persona.id}
              onClick={() => handleSelectPersona(persona)}
              className={`rounded-3xl border transition-all duration-200 p-5 flex flex-col justify-between space-y-4 cursor-pointer relative overflow-hidden group ${
                isActive
                  ? 'bg-white dark:bg-slate-900 border-emerald-500 ring-2 ring-emerald-500/20 shadow-lg'
                  : 'bg-white dark:bg-slate-900 hover:bg-slate-50/80 dark:hover:bg-slate-850 border-slate-200 dark:border-slate-800 shadow-xs'
              }`}
            >
              {/* Persona Header */}
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-11 h-11 rounded-2xl flex items-center justify-center font-black text-white text-base shadow-md shrink-0 transition-transform group-hover:scale-105"
                      style={{ backgroundColor: persona.accentColor }}
                    >
                      {getPersonaIcon(persona.id)}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-black text-base text-slate-900 dark:text-white">
                          {persona.name}
                        </h3>
                        <span className="text-[11px] font-semibold text-slate-400">
                          · {persona.gender === 'male' ? 'Kiume' : 'Kike'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-semibold line-clamp-1">
                        {persona.roleTitleSw}
                      </div>
                    </div>
                  </div>

                  {/* Toggle Switch */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectPersona(persona);
                    }}
                    className={`w-12 h-6 rounded-full transition-colors p-1 flex items-center shrink-0 ${
                      isActive ? 'bg-emerald-600 justify-end' : 'bg-slate-200 dark:bg-slate-700 justify-start'
                    }`}
                    title={isActive ? 'Haiba hii imewashwa' : 'Bofya kuwasha haiba hii'}
                  >
                    <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
                  </button>
                </div>

                {/* Tone Style Description */}
                <div className="mt-3.5 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      Mtindo wa Toni:
                    </span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {persona.toneStyleSw}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {persona.descriptionSw}
                  </p>
                </div>
              </div>

              {/* Action Buttons: Audio Preview & Activation */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={(e) => handleTestAudioSample(persona, e)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition active:scale-95 ${
                    isTesting
                      ? 'bg-emerald-600 text-white animate-pulse'
                      : 'bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-300 hover:text-emerald-600'
                  }`}
                  title="Sikiliza mfano wa sauti na mtindo wa lugha"
                >
                  {isTesting ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{isTesting ? 'Inasikika...' : 'Sikiliza Sauti'}</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectPersona(persona);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 active:scale-95 ${
                    isActive
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                      : 'bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700'
                  }`}
                >
                  {isActive && <Check className="w-3.5 h-3.5" />}
                  <span>{isActive ? 'Inatumika' : 'Washa Haiba Hii'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Voice & Behavior Preferences Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
        <div>
          <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-emerald-600" />
            <span>Mipangilio ya Ziada ya Sauti na Majibu (Voice & Speech Preferences)</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Dhibiti jinsi EBS AI inavyojibu na kusoma maandishi kwenye simu au kompyuta yako
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Auto-speak Toggle */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
            <div className="space-y-0.5 pr-4">
              <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                {autoSpeak ? <Volume2 className="w-4 h-4 text-emerald-600" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
                <span>Soma Majibu kwa Sauti Kiotomatiki (Auto-speak)</span>
              </div>
              <p className="text-[11px] text-slate-500">
                AI itasoma majibu yake yote kwa sauti ya haiba uliyochagua papo hapo.
              </p>
            </div>

            <button
              type="button"
              onClick={handleToggleAutoSpeak}
              className={`w-12 h-6 rounded-full transition-colors p-1 flex items-center shrink-0 ${
                autoSpeak ? 'bg-emerald-600 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
              }`}
            >
              <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
            </button>
          </div>

          {/* Verbosity / Detail Preference */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
            <div className="space-y-0.5 pr-4">
              <div className="text-xs font-bold text-slate-900 dark:text-white">
                Kiwango cha Ufafanuzi wa Majibu
              </div>
              <p className="text-[11px] text-slate-500">
                Chagua ikiwa unataka majibu mafupi ya haraka au uchambuzi wa kina wa kibiashara.
              </p>
            </div>

            <div className="flex items-center gap-1 p-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0">
              <button
                type="button"
                onClick={() => handleSetVerbosity('concise')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                  verbosity === 'concise'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Mafupi
              </button>
              <button
                type="button"
                onClick={() => handleSetVerbosity('detailed')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                  verbosity === 'detailed'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Ya Kina
              </button>
            </div>
          </div>

          {/* Dedicated AI Voice Volume Card with Bar Boost */}
          <div className="md:col-span-2">
            <AiVoiceVolumeControl variant="card" activeVoiceId={activePersonaId} />
          </div>

          {/* Dedicated AI Voice Speed Slider Card */}
          <div className="md:col-span-2">
            <AiVoiceSpeedControl variant="card" activeVoiceId={activePersonaId} />
          </div>

          {/* Wake Word ('Hey EBS') Detection Card */}
          <div className="md:col-span-2 p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-indigo-950/30 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div
                  className={`p-1.5 rounded-lg ${
                    isListeningForWakeWord
                      ? 'bg-emerald-500 text-white animate-pulse'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <Radio className="w-4 h-4" />
                </div>
                <div className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Kuanzisha kwa Sauti Bila Kushika Simu (Wake Word: "Hey EBS")</span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded-full">
                    Web Speech API
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
                Mfumo unasikiliza chinichini maneno ya kuamsha: <strong className="text-emerald-600 dark:text-emerald-400">"Hey EBS"</strong>, <strong className="text-emerald-600 dark:text-emerald-400">"Habari EBS"</strong>, au <strong className="text-emerald-600 dark:text-emerald-400">"Ok EBS"</strong>. Ukisema neno hilo, maikrofoni inawashwa kiotomatiki na kupokea agizo lako papo hapo bila kugusa kifaa.
              </p>
              {isListeningForWakeWord && (
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-bold pt-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span>Inasikiliza sasa hivi... sema "Hey EBS"!</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={toggleWakeWord}
                className={`w-14 h-7 rounded-full transition-colors p-1 flex items-center shrink-0 ${
                  isWakeWordEnabled ? 'bg-emerald-600 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
                }`}
                title={isWakeWordEnabled ? 'Wake Word imewashwa' : 'Wake Word imezimwa'}
              >
                <div className="w-5 h-5 rounded-full bg-white shadow-md" />
              </button>
            </div>
          </div>

          {/* Voice Commands Cheat Sheet Quick Link */}
          <div className="md:col-span-2 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <HelpCircle className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  Orodha Kamili ya Amri za Sauti (Voice Commands Cheat Sheet)
                </h4>
                <p className="text-[11px] text-slate-500">
                  Tazama amri zote zilizothibitishwa za kuuza, kuangalia stoo, kusajili wateja na ripoti za biashara.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowCommandsModal(true)}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold transition flex items-center gap-1.5 shrink-0 shadow-xs"
            >
              <span>Fungua Mwongozo wa Amri</span>
            </button>
          </div>
        </div>
      </div>

      {/* Voice Commands Help Modal */}
      <VoiceCommandsHelpModal
        isOpen={showCommandsModal}
        onClose={() => setShowCommandsModal(false)}
        activePersonaId={activePersonaId}
      />
    </div>
  );
};

export default AiPersonaSettingsSection;
