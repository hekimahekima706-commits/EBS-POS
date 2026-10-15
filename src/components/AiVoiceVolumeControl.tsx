import React, { useState, useEffect } from 'react';
import {
  getAiVoiceVolume,
  setAiVoiceVolume,
  speakTextSwahili,
  stopSpeaking,
} from '../utils/audioVoiceService';
import {
  Volume2,
  VolumeX,
  Volume1,
  Flame,
  Check,
  Play,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

interface AiVoiceVolumeControlProps {
  variant?: 'compact' | 'expanded' | 'card';
  activeVoiceId?: string;
  onVolumeChange?: (vol: number) => void;
}

export const AiVoiceVolumeControl: React.FC<AiVoiceVolumeControlProps> = ({
  variant = 'compact',
  activeVoiceId,
  onVolumeChange,
}) => {
  const [volume, setVolumeState] = useState<number>(() => getAiVoiceVolume());
  const [isOpenPopover, setIsOpenPopover] = useState<boolean>(false);
  const [isPlayingTest, setIsPlayingTest] = useState<boolean>(false);

  useEffect(() => {
    const handleVolumeEvent = (e: any) => {
      if (typeof e.detail?.volume === 'number') {
        setVolumeState(e.detail.volume);
      }
    };

    window.addEventListener('ebs-ai-volume-change', handleVolumeEvent);
    return () => {
      window.removeEventListener('ebs-ai-volume-change', handleVolumeEvent);
    };
  }, []);

  const handleSliderChange = (newVal: number) => {
    setVolumeState(newVal);
    setAiVoiceVolume(newVal);
    if (onVolumeChange) {
      onVolumeChange(newVal);
    }
  };

  const handleTestVolume = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    stopSpeaking();
    setIsPlayingTest(true);
    try {
      const phrase =
        volume > 1.2
          ? 'Hii ni sauti ya Bar Boost ya EBS AI. Inasikika kwa ukubwa na uwazi hata kukiwa na kelele!'
          : 'Hii ni sauti ya kawaida ya EBS AI. Je, inasikika vizuri?';
      await speakTextSwahili(phrase, activeVoiceId, volume);
    } catch {
      // ignore
    } finally {
      setIsPlayingTest(false);
    }
  };

  const percentage = Math.round(volume * 100);
  const isBoost = volume > 1.0;

  const renderIcon = () => {
    if (volume <= 0.05) return <VolumeX className="w-4 h-4 text-slate-400" />;
    if (volume < 0.6) return <Volume1 className="w-4 h-4 text-emerald-500" />;
    if (isBoost) return <Flame className="w-4 h-4 text-amber-500 animate-pulse" />;
    return <Volume2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
  };

  // Card Variant (for Settings / Personas)
  if (variant === 'card') {
    return (
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                isBoost
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
              }`}
            >
              {renderIcon()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  Kiwango cha Sauti ya AI (Independent AI Voice Volume)
                </h4>
                {isBoost && (
                  <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1">
                    <Flame className="w-3 h-3 fill-current" />
                    Bar Boost Active
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Inajitegemea ndani ya mfumo bila kubadili sauti kuu ya kifaa (0% - 200% kwa ajili ya mazingira ya kelele za baa)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <span
              className={`font-mono text-xs font-black px-2.5 py-1 rounded-lg border ${
                isBoost
                  ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-500/30 text-amber-600 dark:text-amber-400'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {percentage}%
            </span>
            <button
              type="button"
              onClick={handleTestVolume}
              disabled={isPlayingTest}
              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold transition flex items-center gap-1 active:scale-95"
            >
              <Play className="w-3 h-3" />
              <span>{isPlayingTest ? 'Inajaribu...' : 'Jaribu'}</span>
            </button>
          </div>
        </div>

        {/* Slider */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleSliderChange(0)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              title="Kimya (0%)"
            >
              <VolumeX className="w-4 h-4" />
            </button>
            <input
              type="range"
              min="0"
              max="2"
              step="0.05"
              value={volume}
              onChange={(e) => handleSliderChange(parseFloat(e.target.value))}
              className="w-full accent-emerald-600 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
            />
            <button
              type="button"
              onClick={() => handleSliderChange(2.0)}
              className="text-amber-500 hover:text-amber-600"
              title="Bar Boost 200%"
            >
              <Flame className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex items-center justify-between gap-1.5 pt-1">
            {[
              { val: 0.0, label: 'Kimya (0%)' },
              { val: 0.5, label: '50% (Chini)' },
              { val: 1.0, label: '100% (Kawaida)' },
              { val: 1.5, label: '150% (Kubwa)' },
              { val: 2.0, label: '200% (Baa Boost 🔥)' },
            ].map((preset) => {
              const isSelected = Math.abs(volume - preset.val) < 0.04;
              return (
                <button
                  key={preset.val}
                  type="button"
                  onClick={() => handleSliderChange(preset.val)}
                  className={`px-2 py-1 rounded-lg text-[10px] sm:text-xs font-semibold transition border ${
                    isSelected
                      ? preset.val > 1.0
                        ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                        : 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Expanded Variant (for Live Voice Orb screen)
  if (variant === 'expanded') {
    return (
      <div className="w-full max-w-md p-4 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-sm space-y-3 text-white">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${isBoost ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
              {renderIcon()}
            </div>
            <div>
              <span className="text-xs font-bold">Sauti ya AI ({percentage}%)</span>
              {isBoost && (
                <span className="text-[10px] ml-2 text-amber-400 font-semibold">
                  (Bar Boost 🔥)
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleTestVolume}
            className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 bg-emerald-950/60 px-2 py-1 rounded-lg border border-emerald-500/30"
          >
            <Play className="w-3 h-3" />
            <span>Jaribu Sauti</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[10px] text-slate-400 font-mono">0%</span>
          <input
            type="range"
            min="0"
            max="2"
            step="0.05"
            value={volume}
            onChange={(e) => handleSliderChange(parseFloat(e.target.value))}
            className="flex-1 accent-emerald-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
          />
          <span className="text-[10px] text-amber-400 font-mono font-bold">200%</span>
        </div>

        <div className="flex items-center justify-between gap-1 text-[10px]">
          <button
            type="button"
            onClick={() => handleSliderChange(1.0)}
            className="text-slate-400 hover:text-white"
          >
            Kawaida (100%)
          </button>
          <button
            type="button"
            onClick={() => handleSliderChange(1.5)}
            className="text-amber-400/80 hover:text-amber-300 font-medium"
          >
            Sauti ya Baa (150%)
          </button>
          <button
            type="button"
            onClick={() => handleSliderChange(2.0)}
            className="text-amber-400 font-bold hover:text-amber-300"
          >
            Boost ya Juu (200% 🔥)
          </button>
        </div>
      </div>
    );
  }

  // Compact Variant (Header Toolbar Popover / Slider)
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpenPopover(!isOpenPopover)}
        className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition active:scale-95 shrink-0 ${
          isBoost
            ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500/40 text-amber-700 dark:text-amber-400 ring-2 ring-amber-500/20'
            : volume <= 0.05
            ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
            : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
        }`}
        title={`Sauti ya AI: ${percentage}% (Inajitegemea)`}
      >
        {renderIcon()}
        <span className="font-mono text-[11px]">{percentage}%</span>
        {isBoost && <span className="text-[10px] hidden sm:inline">Boost</span>}
      </button>

      {/* Popover Slider Dropdown */}
      {isOpenPopover && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpenPopover(false)}
          />
          <div className="absolute right-0 sm:right-auto sm:left-0 top-full mt-2 w-72 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 animate-in fade-in zoom-in-95 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1.5">
                {renderIcon()}
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Sauti ya EBS AI
                </span>
              </div>
              <span
                className={`font-mono text-xs font-black px-2 py-0.5 rounded-md ${
                  isBoost
                    ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
                    : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {percentage}%
              </span>
            </div>

            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
              Dhibiti sauti ya AI kando na sauti ya simu au kompyuta, inafaa sana mazingira yenye kelele za baa.
            </p>

            {/* Slider */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSliderChange(0)}
                  className="text-slate-400 hover:text-slate-600"
                  title="Kimya (0%)"
                >
                  <VolumeX className="w-3.5 h-3.5" />
                </button>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.05"
                  value={volume}
                  onChange={(e) => handleSliderChange(parseFloat(e.target.value))}
                  className="w-full accent-emerald-600 h-2 bg-slate-100 dark:bg-slate-800 rounded-lg cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => handleSliderChange(2.0)}
                  className="text-amber-500 hover:text-amber-600"
                  title="200% Bar Boost"
                >
                  <Flame className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="grid grid-cols-4 gap-1 pt-1">
              {[
                { val: 0.5, label: '50%' },
                { val: 1.0, label: '100%' },
                { val: 1.5, label: '150%' },
                { val: 2.0, label: '200% 🔥' },
              ].map((p) => (
                <button
                  key={p.val}
                  type="button"
                  onClick={() => handleSliderChange(p.val)}
                  className={`py-1 text-[11px] font-bold rounded-lg transition border ${
                    Math.abs(volume - p.val) < 0.04
                      ? p.val > 1.0
                        ? 'bg-amber-500 text-white border-amber-600'
                        : 'bg-emerald-600 text-white border-emerald-700'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Test Action */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={handleTestVolume}
                disabled={isPlayingTest}
                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
              >
                <Play className="w-3 h-3" />
                <span>{isPlayingTest ? 'Inasikika...' : 'Jaribu Kusikiliza'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsOpenPopover(false)}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-semibold"
              >
                Imekamilika
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AiVoiceVolumeControl;
