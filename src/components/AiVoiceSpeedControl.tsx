import React, { useState, useEffect } from 'react';
import {
  getAiVoiceSpeed,
  setAiVoiceSpeed,
  speakTextSwahili,
  stopSpeaking,
} from '../utils/audioVoiceService';
import {
  Gauge,
  Play,
  RotateCcw,
  FastForward,
  Timer,
  Check,
  ChevronRight,
} from 'lucide-react';

interface AiVoiceSpeedControlProps {
  variant?: 'compact' | 'expanded' | 'card';
  activeVoiceId?: string;
  onSpeedChange?: (spd: number) => void;
}

export const AiVoiceSpeedControl: React.FC<AiVoiceSpeedControlProps> = ({
  variant = 'compact',
  activeVoiceId,
  onSpeedChange,
}) => {
  const [speed, setSpeedState] = useState<number>(() => getAiVoiceSpeed());
  const [isOpenPopover, setIsOpenPopover] = useState<boolean>(false);
  const [isPlayingTest, setIsPlayingTest] = useState<boolean>(false);

  useEffect(() => {
    const handleSpeedEvent = (e: any) => {
      if (typeof e.detail?.speed === 'number') {
        setSpeedState(e.detail.speed);
      }
    };

    window.addEventListener('ebs-ai-speed-change', handleSpeedEvent);
    return () => {
      window.removeEventListener('ebs-ai-speed-change', handleSpeedEvent);
    };
  }, []);

  const handleSliderChange = (newVal: number) => {
    const clamped = Math.round(newVal * 20) / 20; // 0.05 increments
    setSpeedState(clamped);
    setAiVoiceSpeed(clamped);
    if (onSpeedChange) {
      onSpeedChange(clamped);
    }
  };

  const handleTestSpeed = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    stopSpeaking();
    setIsPlayingTest(true);
    try {
      const phrase =
        speed < 0.9
          ? 'Huu ni mwendo wa polepole wa EBS AI, unaofaa kwa maelezo ya kina na utulivu.'
          : speed > 1.2
          ? 'Huu ni mwendo wa haraka wa EBS AI kwa ajili ya kupata ripoti na majibu kwa wepesi!'
          : 'Huu ni mwendo wa kawaida wa maongezi ya EBS AI. Je, unakufaa?';
      await speakTextSwahili(phrase, activeVoiceId, undefined, speed);
    } catch {
      // ignore
    } finally {
      setIsPlayingTest(false);
    }
  };

  const getSpeedLabel = (spd: number): string => {
    if (spd <= 0.75) return 'Polepole';
    if (spd >= 1.4) return 'Kasi Sana';
    if (spd >= 1.2) return 'Haraka';
    return 'Kawaida';
  };

  // Card Variant (for Settings / Personas)
  if (variant === 'card') {
    return (
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center justify-center shrink-0">
              <Gauge className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  Kasi ya Maongezi ya AI (Speech Speed)
                </h4>
                <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full border border-indigo-500/20">
                  {speed.toFixed(2)}x · {getSpeedLabel(speed)}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Dhibiti jinsi EBS AI inavyoongea: polepole kwa utulivu au haraka kwa wepesi wa kaunta (0.5x - 2.0x)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={handleTestSpeed}
              disabled={isPlayingTest}
              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold transition flex items-center gap-1 active:scale-95"
            >
              <Play className="w-3 h-3" />
              <span>{isPlayingTest ? 'Inajaribu...' : 'Sikiliza Kasi'}</span>
            </button>
          </div>
        </div>

        {/* Slider */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-slate-400 shrink-0">0.5x</span>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.05"
              value={speed}
              onChange={(e) => handleSliderChange(parseFloat(e.target.value))}
              className="w-full accent-indigo-600 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
            />
            <span className="text-xs font-mono text-slate-400 shrink-0">2.0x</span>
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex items-center justify-between gap-1.5 pt-1">
            {[
              { val: 0.75, label: '0.75x (Polepole)' },
              { val: 1.0, label: '1.0x (Kawaida)' },
              { val: 1.25, label: '1.25x (Haraka)' },
              { val: 1.5, label: '1.5x (Kasi)' },
            ].map((preset) => {
              const isSelected = Math.abs(speed - preset.val) < 0.04;
              return (
                <button
                  key={preset.val}
                  type="button"
                  onClick={() => handleSliderChange(preset.val)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-semibold transition border ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
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

  // Expanded Variant (for Live Voice Orb or Modals)
  if (variant === 'expanded') {
    return (
      <div className="w-full max-w-md p-4 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-sm space-y-3 text-white">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
              <Gauge className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold">Kasi ya Sauti ({speed.toFixed(2)}x)</span>
              <span className="text-[10px] ml-2 text-indigo-300">
                ({getSpeedLabel(speed)})
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleTestSpeed}
            className="text-[11px] font-bold text-indigo-300 hover:text-indigo-200 flex items-center gap-1 bg-indigo-950/60 px-2 py-1 rounded-lg border border-indigo-500/30"
          >
            <Play className="w-3 h-3" />
            <span>Jaribu Kasi</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[10px] text-slate-400 font-mono">0.5x</span>
          <input
            type="range"
            min="0.5"
            max="2.0"
            step="0.05"
            value={speed}
            onChange={(e) => handleSliderChange(parseFloat(e.target.value))}
            className="flex-1 accent-indigo-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
          />
          <span className="text-[10px] text-slate-400 font-mono">2.0x</span>
        </div>

        <div className="flex items-center justify-between gap-1 text-[10px]">
          <button
            type="button"
            onClick={() => handleSliderChange(0.75)}
            className="text-slate-400 hover:text-white"
          >
            Polepole (0.75x)
          </button>
          <button
            type="button"
            onClick={() => handleSliderChange(1.0)}
            className="text-indigo-400 hover:text-indigo-300 font-medium"
          >
            Kawaida (1.0x)
          </button>
          <button
            type="button"
            onClick={() => handleSliderChange(1.25)}
            className="text-slate-400 hover:text-white"
          >
            Haraka (1.25x)
          </button>
        </div>
      </div>
    );
  }

  // Compact Variant (Header Toolbar Popover / Dropdown)
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpenPopover(!isOpenPopover)}
        className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition active:scale-95 shrink-0"
        title={`Kasi ya AI: ${speed.toFixed(2)}x (${getSpeedLabel(speed)})`}
      >
        <Gauge className="w-3.5 h-3.5 text-indigo-500" />
        <span className="font-mono text-[11px]">{speed.toFixed(2)}x</span>
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
                <Gauge className="w-4 h-4 text-indigo-500" />
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Kasi ya Maongezi (Speed)
                </span>
              </div>
              <span className="font-mono text-xs font-black px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                {speed.toFixed(2)}x ({getSpeedLabel(speed)})
              </span>
            </div>

            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
              Kasi ya kusoma na kuongea ya EBS AI. Weka polepole kwa uelewa tulivu au haraka kwa kasi ya kaunta.
            </p>

            {/* Slider */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-slate-400">0.5x</span>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.05"
                  value={speed}
                  onChange={(e) => handleSliderChange(parseFloat(e.target.value))}
                  className="w-full accent-indigo-600 h-2 bg-slate-100 dark:bg-slate-800 rounded-lg cursor-pointer"
                />
                <span className="text-[10px] font-mono text-slate-400">2.0x</span>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="grid grid-cols-4 gap-1 pt-1">
              {[
                { val: 0.75, label: '0.75x' },
                { val: 1.0, label: '1.0x' },
                { val: 1.25, label: '1.25x' },
                { val: 1.5, label: '1.5x' },
              ].map((p) => (
                <button
                  key={p.val}
                  type="button"
                  onClick={() => handleSliderChange(p.val)}
                  className={`py-1 text-[11px] font-bold rounded-lg transition border ${
                    Math.abs(speed - p.val) < 0.04
                      ? 'bg-indigo-600 text-white border-indigo-700'
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
                onClick={handleTestSpeed}
                disabled={isPlayingTest}
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                <Play className="w-3 h-3" />
                <span>{isPlayingTest ? 'Inasikika...' : 'Jaribu Kasi'}</span>
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

export default AiVoiceSpeedControl;
