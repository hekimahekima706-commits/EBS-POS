import { useState, useEffect, useRef, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { VoiceRecorder } from 'capacitor-voice-recorder';
import { playWakeChime, playConfirmChime } from '../utils/audioChime';

export interface UseWakeWordOptions {
  wakeWords?: string[];
  lang?: string;
  onWakeWordDetected?: (command?: string) => void;
  playChimeOnWake?: boolean;
  enabledByDefault?: boolean;
}

export interface UseWakeWordReturn {
  isWakeWordEnabled: boolean;
  isListeningForWakeWord: boolean;
  isTriggered: boolean;
  detectedPhrase: string | null;
  lastDetectedAt: number | null;
  isSupported: boolean;
  hasPermission: boolean | null;
  errorMessage: string | null;
  enableWakeWord: () => Promise<boolean>;
  disableWakeWord: () => void;
  toggleWakeWord: () => Promise<boolean>;
  pauseWakeWord: () => void;
  resumeWakeWord: () => void;
}

const DEFAULT_WAKE_WORDS = [
  'hey ebs',
  'habari ebs',
  'ok ebs',
  'ebs',
  'sema ebs',
  'hujambo ebs',
  'mambo ebs',
  'he ebs',
];

export function useWakeWord(options: UseWakeWordOptions = {}): UseWakeWordReturn {
  const {
    wakeWords = DEFAULT_WAKE_WORDS,
    lang = 'sw-TZ',
    onWakeWordDetected,
    playChimeOnWake = true,
  } = options;

  // Stored preference
  const [isWakeWordEnabled, setIsWakeWordEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('ebs_wake_word_enabled') === 'true';
    }
    return false;
  });

  const [isListeningForWakeWord, setIsListeningForWakeWord] = useState<boolean>(false);
  const [isTriggered, setIsTriggered] = useState<boolean>(false);
  const [detectedPhrase, setDetectedPhrase] = useState<string | null>(null);
  const [lastDetectedAt, setLastDetectedAt] = useState<number | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const isEnabledRef = useRef<boolean>(isWakeWordEnabled);
  const isPausedRef = useRef<boolean>(false);
  const restartTimeoutRef = useRef<any>(null);
  const isMountedRef = useRef<boolean>(true);
  const isProcessingTriggerRef = useRef<boolean>(false);

  isEnabledRef.current = isWakeWordEnabled;

  const isSupported =
    typeof window !== 'undefined' &&
    !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  /**
   * Request microphone permission explicitly
   */
  const requestMicPermission = useCallback(async (): Promise<boolean> => {
    try {
      if (Capacitor.isPluginAvailable('VoiceRecorder')) {
        const perm = await VoiceRecorder.requestAudioRecordingPermission();
        if (perm.value) {
          setHasPermission(true);
          return true;
        }
      }

      if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
        setHasPermission(true);
        return true;
      }
      return true;
    } catch (err: any) {
      console.warn('[useWakeWord] Mic permission denied:', err);
      setHasPermission(false);
      setErrorMessage('Ruhusa ya maikrofoni inahitajika ili kutumia Wake Word (Hey EBS).');
      return false;
    }
  }, []);

  /**
   * Stop speech recognition engine safely
   */
  const stopEngine = useCallback(() => {
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    if (isMountedRef.current) {
      setIsListeningForWakeWord(false);
    }
  }, []);

  /**
   * Start speech recognition engine for wake word scanning
   */
  const startEngine = useCallback(() => {
    if (!isSupported || !isEnabledRef.current || isPausedRef.current) return;

    stopEngine();

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = lang;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        if (!isMountedRef.current) return;
        setIsListeningForWakeWord(true);
        setErrorMessage(null);
      };

      recognition.onresult = (event: any) => {
        if (!isMountedRef.current || isPausedRef.current || isProcessingTriggerRef.current) return;

        let fullTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const item = event.results[i];
          if (item && item[0]) {
            fullTranscript += ' ' + item[0].transcript;
          }
        }

        const lower = fullTranscript.toLowerCase().trim();
        if (!lower) return;

        // Check if any wake word phrase is present in speech
        for (const phrase of wakeWords) {
          const phraseIndex = lower.indexOf(phrase);
          if (phraseIndex !== -1) {
            isProcessingTriggerRef.current = true;
            const now = Date.now();
            setDetectedPhrase(phrase);
            setLastDetectedAt(now);
            setIsTriggered(true);

            // Extract any trailing command spoken immediately after the wake word
            // Example: "hey ebs nionyeshe mauzo ya leo" -> "nionyeshe mauzo ya leo"
            const afterWakeWord = lower.substring(phraseIndex + phrase.length).replace(/^[,\s.!?-]+/, '').trim();

            if (playChimeOnWake) {
              playWakeChime();
            }

            // Temporarily pause recognition loop to avoid recursive triggers
            try {
              recognition.stop();
            } catch {}

            if (onWakeWordDetected) {
              onWakeWordDetected(afterWakeWord || undefined);
            }

            // Reset triggered visual state after 2 seconds
            setTimeout(() => {
              if (isMountedRef.current) {
                setIsTriggered(false);
                isProcessingTriggerRef.current = false;
              }
            }, 2000);

            break;
          }
        }
      };

      recognition.onerror = (event: any) => {
        // Silently recover from ordinary speech timeouts
        if (event.error === 'no-speech' || event.error === 'aborted') {
          return;
        }

        if (event.error === 'not-allowed') {
          setHasPermission(false);
          setErrorMessage('Ruhusa ya maikrofoni imezuiwa kwenye kifaa hiki.');
          return;
        }

        console.warn('[useWakeWord] Recognition error:', event.error);
      };

      recognition.onend = () => {
        if (!isMountedRef.current) return;
        setIsListeningForWakeWord(false);

        // Auto restart loop if still enabled and not explicitly paused
        if (isEnabledRef.current && !isPausedRef.current) {
          restartTimeoutRef.current = setTimeout(() => {
            if (isMountedRef.current && isEnabledRef.current && !isPausedRef.current) {
              startEngine();
            }
          }, 350);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.warn('[useWakeWord] startEngine error:', err);
    }
  }, [isSupported, lang, onWakeWordDetected, playChimeOnWake, stopEngine, wakeWords]);

  /**
   * Enable wake word detection
   */
  const enableWakeWord = useCallback(async (): Promise<boolean> => {
    const granted = await requestMicPermission();
    if (!granted) {
      return false;
    }

    setIsWakeWordEnabled(true);
    isEnabledRef.current = true;
    isPausedRef.current = false;

    if (typeof window !== 'undefined') {
      localStorage.setItem('ebs_wake_word_enabled', 'true');
    }

    startEngine();
    return true;
  }, [requestMicPermission, startEngine]);

  /**
   * Disable wake word detection
   */
  const disableWakeWord = useCallback(() => {
    setIsWakeWordEnabled(false);
    isEnabledRef.current = false;
    isPausedRef.current = true;

    if (typeof window !== 'undefined') {
      localStorage.setItem('ebs_wake_word_enabled', 'false');
    }

    stopEngine();
  }, [stopEngine]);

  /**
   * Toggle wake word on / off
   */
  const toggleWakeWord = useCallback(async (): Promise<boolean> => {
    if (isWakeWordEnabled) {
      disableWakeWord();
      return false;
    } else {
      return await enableWakeWord();
    }
  }, [disableWakeWord, enableWakeWord, isWakeWordEnabled]);

  /**
   * Temporarily pause listening (e.g. while AI is speaking or active conversation is taking place)
   */
  const pauseWakeWord = useCallback(() => {
    isPausedRef.current = true;
    stopEngine();
  }, [stopEngine]);

  /**
   * Resume listening after interaction finishes
   */
  const resumeWakeWord = useCallback(() => {
    isPausedRef.current = false;
    if (isEnabledRef.current) {
      setTimeout(() => {
        if (isMountedRef.current && isEnabledRef.current && !isPausedRef.current) {
          startEngine();
        }
      }, 500);
    }
  }, [startEngine]);

  // Initial auto-start if previously enabled
  useEffect(() => {
    isMountedRef.current = true;

    if (isWakeWordEnabled && isSupported) {
      startEngine();
    }

    return () => {
      isMountedRef.current = false;
      stopEngine();
    };
  }, [isSupported, isWakeWordEnabled, startEngine, stopEngine]);

  return {
    isWakeWordEnabled,
    isListeningForWakeWord,
    isTriggered,
    detectedPhrase,
    lastDetectedAt,
    isSupported,
    hasPermission,
    errorMessage,
    enableWakeWord,
    disableWakeWord,
    toggleWakeWord,
    pauseWakeWord,
    resumeWakeWord,
  };
}

export default useWakeWord;
