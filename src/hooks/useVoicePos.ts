import { useState, useEffect, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { VoiceRecorder } from 'capacitor-voice-recorder';
import { sendVoiceCommand, VoiceCommandResult } from '../utils/audioVoiceService';

export interface UseVoicePosOptions {
  lang?: string;
  autoProcessOnEnd?: boolean;
  onCommandResult?: (result: VoiceCommandResult) => void;
  onError?: (error: string) => void;
}

export interface UseVoicePosReturn {
  // Permission states
  hasMicPermission: boolean | null;
  isCheckingPermission: boolean;
  isRequestingPermission: boolean;
  permissionError: string | null;
  requestMicPermission: () => Promise<boolean>;
  checkMicPermission: () => Promise<boolean>;

  // Audio capture / Listening states
  isListening: boolean;
  isRecording: boolean;
  isProcessing: boolean;
  transcript: string;
  audioBase64: string | null;
  audioDurationMs: number;
  lastResult: VoiceCommandResult | null;

  // Actions
  startListening: () => Promise<boolean>;
  stopListening: () => Promise<{ transcript: string; audioBase64?: string | null } | null>;
  cancelListening: () => void;
  resetTranscript: () => void;
  clearError: () => void;
  processCommand: (
    overrideText?: string,
    productsList?: any[],
    hasPendingDraft?: boolean
  ) => Promise<VoiceCommandResult | null>;

  // Platform info
  isNative: boolean;
  canRecordDevice: boolean;
}

export function useVoicePos(options: UseVoicePosOptions = {}): UseVoicePosReturn {
  const {
    lang = 'sw-TZ',
    autoProcessOnEnd = false,
    onCommandResult,
    onError,
  } = options;

  const isNative = Capacitor.isNativePlatform();

  // Permission states
  const [hasMicPermission, setHasMicPermission] = useState<boolean | null>(null);
  const [isCheckingPermission, setIsCheckingPermission] = useState<boolean>(false);
  const [isRequestingPermission, setIsRequestingPermission] = useState<boolean>(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [canRecordDevice, setCanRecordDevice] = useState<boolean>(true);

  // Audio / Speech states
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [audioDurationMs, setAudioDurationMs] = useState<number>(0);
  const [lastResult, setLastResult] = useState<VoiceCommandResult | null>(null);

  // Internal refs
  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef<boolean>(false);
  const currentTranscriptRef = useRef<string>('');
  const isMountedRef = useRef<boolean>(true);

  isListeningRef.current = isListening;
  currentTranscriptRef.current = transcript;

  /**
   * Check microphone permission on device / browser
   */
  const checkMicPermission = useCallback(async (): Promise<boolean> => {
    setIsCheckingPermission(true);
    try {
      // 1. Try Capacitor VoiceRecorder plugin
      if (Capacitor.isPluginAvailable('VoiceRecorder')) {
        const canRecord = await VoiceRecorder.canDeviceVoiceRecord().catch(() => ({ value: true }));
        setCanRecordDevice(canRecord.value);

        const perm = await VoiceRecorder.hasAudioRecordingPermission();
        if (isMountedRef.current) {
          setHasMicPermission(perm.value);
        }
        return perm.value;
      }

      // 2. Browser permissions API fallback
      if (typeof navigator !== 'undefined' && (navigator as any).permissions?.query) {
        try {
          const status = await (navigator as any).permissions.query({ name: 'microphone' });
          const granted = status.state === 'granted';
          if (isMountedRef.current) {
            setHasMicPermission(granted);
          }
          return granted;
        } catch {
          // Some browsers don't support { name: 'microphone' } query
        }
      }

      return hasMicPermission ?? false;
    } catch (err: any) {
      console.warn('[useVoicePos] checkMicPermission error:', err);
      return false;
    } finally {
      if (isMountedRef.current) {
        setIsCheckingPermission(false);
      }
    }
  }, [hasMicPermission]);

  /**
   * Explicitly request runtime microphone permission using Capacitor Permissions API
   * or Web MediaDevices fallback.
   */
  const requestMicPermission = useCallback(async (): Promise<boolean> => {
    setIsRequestingPermission(true);
    setPermissionError(null);

    try {
      // 1. Primary: Use Capacitor VoiceRecorder Permissions API for Android / iOS runtime dialog
      if (Capacitor.isPluginAvailable('VoiceRecorder')) {
        const result = await VoiceRecorder.requestAudioRecordingPermission();
        if (result.value) {
          if (isMountedRef.current) {
            setHasMicPermission(true);
            setPermissionError(null);
          }
          return true;
        }
      }

      // 2. Web / Browser fallback using getUserMedia to trigger browser permission prompt
      if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
        if (isMountedRef.current) {
          setHasMicPermission(true);
          setPermissionError(null);
        }
        return true;
      }

      throw new Error('Ruhusa ya maikrofoni ilikataliwa au haipatikani.');
    } catch (err: any) {
      console.warn('[useVoicePos] requestMicPermission failed:', err);
      const friendlyError =
        'Ruhusa ya maikrofoni inahitajika ili kutumia EBS Voice POS. Tafadhali ruhusu maikrofoni kwenye mipangilio ya kifaa hiki.';
      if (isMountedRef.current) {
        setHasMicPermission(false);
        setPermissionError(friendlyError);
      }
      if (onError) onError(friendlyError);
      return false;
    } finally {
      if (isMountedRef.current) {
        setIsRequestingPermission(false);
      }
    }
  }, [onError]);

  // Initial check on mount
  useEffect(() => {
    isMountedRef.current = true;
    checkMicPermission();

    return () => {
      isMountedRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, [checkMicPermission]);

  // Initialize Web Speech Recognition if available in the environment
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = lang;

      recognition.onstart = () => {
        if (!isMountedRef.current) return;
        setIsListening(true);
        setPermissionError(null);
      };

      recognition.onresult = (event: any) => {
        if (!isMountedRef.current) return;
        let current = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          current += event.results[i][0].transcript;
        }
        setTranscript(current);
        currentTranscriptRef.current = current;
      };

      recognition.onerror = (event: any) => {
        console.warn('[useVoicePos] Speech recognition error:', event.error);
        if (!isMountedRef.current) return;
        setIsListening(false);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setHasMicPermission(false);
          const msg = 'Ruhusa ya maikrofoni imezuiwa. Tafadhali ruhusu maikrofoni kwenye kifaa au kivinjari.';
          setPermissionError(msg);
          if (onError) onError(msg);
        }
      };

      recognition.onend = () => {
        if (!isMountedRef.current) return;
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, [lang, onError]);

  /**
   * Start listening for voice commands:
   * 1. Confirms/requests runtime microphone permissions.
   * 2. Starts native audio recording (via Capacitor VoiceRecorder) if available.
   * 3. Starts Speech Recognition for live transcription.
   */
  const startListening = useCallback(async (): Promise<boolean> => {
    setPermissionError(null);
    setTranscript('');
    currentTranscriptRef.current = '';
    setAudioBase64(null);
    setAudioDurationMs(0);

    // 1. Ensure permission is granted
    let granted = hasMicPermission;
    if (granted !== true) {
      granted = await requestMicPermission();
    }

    if (!granted) {
      return false;
    }

    // 2. Start Capacitor audio recording if plugin is available
    if (Capacitor.isPluginAvailable('VoiceRecorder')) {
      try {
        const recStatus = await VoiceRecorder.getCurrentStatus().catch(() => ({ status: 'NONE' }));
        if (recStatus.status === 'NONE') {
          await VoiceRecorder.startRecording();
          if (isMountedRef.current) {
            setIsRecording(true);
          }
        }
      } catch (err) {
        console.warn('[useVoicePos] VoiceRecorder startRecording error:', err);
      }
    }

    // 3. Start speech recognition engine
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        return true;
      } catch (err) {
        try {
          recognitionRef.current.stop();
          setTimeout(() => {
            try {
              recognitionRef.current.start();
              setIsListening(true);
            } catch {}
          }, 150);
          return true;
        } catch {}
      }
    } else {
      // If Web Speech API is not supported (e.g. some native webviews),
      // we still maintain isListening flag for audio recording
      setIsListening(true);
      return true;
    }

    return true;
  }, [hasMicPermission, requestMicPermission]);

  /**
   * Stop listening and finalize audio recording & transcription
   */
  const stopListening = useCallback(async (): Promise<{
    transcript: string;
    audioBase64?: string | null;
  } | null> => {
    let capturedBase64: string | null = null;
    let duration = 0;

    // Stop speech recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    if (isMountedRef.current) {
      setIsListening(false);
    }

    // Stop Capacitor VoiceRecorder
    if (Capacitor.isPluginAvailable('VoiceRecorder')) {
      try {
        const recStatus = await VoiceRecorder.getCurrentStatus().catch(() => ({ status: 'NONE' }));
        if (recStatus.status === 'RECORDING') {
          const recData = await VoiceRecorder.stopRecording();
          if (recData?.value?.recordDataBase64) {
            capturedBase64 = recData.value.recordDataBase64;
            duration = recData.value.msDuration || 0;
            if (isMountedRef.current) {
              setAudioBase64(capturedBase64);
              setAudioDurationMs(duration);
              setIsRecording(false);
            }
          }
        }
      } catch (err) {
        console.warn('[useVoicePos] VoiceRecorder stopRecording error:', err);
        if (isMountedRef.current) {
          setIsRecording(false);
        }
      }
    }

    const finalTranscript = currentTranscriptRef.current;
    return {
      transcript: finalTranscript,
      audioBase64: capturedBase64,
    };
  }, []);

  /**
   * Cancel ongoing listening session
   */
  const cancelListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    if (Capacitor.isPluginAvailable('VoiceRecorder')) {
      VoiceRecorder.stopRecording().catch(() => {});
    }
    if (isMountedRef.current) {
      setIsListening(false);
      setIsRecording(false);
      setTranscript('');
      currentTranscriptRef.current = '';
    }
  }, []);

  /**
   * Clear error message
   */
  const clearError = useCallback(() => {
    setPermissionError(null);
  }, []);

  /**
   * Reset transcript
   */
  const resetTranscript = useCallback(() => {
    setTranscript('');
    currentTranscriptRef.current = '';
  }, []);

  /**
   * Process voice command with resilience and Swahili fallback
   */
  const processCommand = useCallback(
    async (
      overrideText?: string,
      productsList: any[] = [],
      hasPendingDraft = false
    ): Promise<VoiceCommandResult | null> => {
      const textToProcess = (overrideText ?? currentTranscriptRef.current).trim();
      if (!textToProcess) {
        return null;
      }

      setIsProcessing(true);
      try {
        const result = await sendVoiceCommand(textToProcess, productsList, hasPendingDraft);
        if (isMountedRef.current) {
          setLastResult(result);
        }
        if (onCommandResult) {
          onCommandResult(result);
        }
        return result;
      } catch (err: any) {
        console.warn('[useVoicePos] processCommand error:', err);
        const errMsg = err?.message || 'Hitilafu ya kuchakata agizo la sauti.';
        if (onError) onError(errMsg);
        return null;
      } finally {
        if (isMountedRef.current) {
          setIsProcessing(false);
        }
      }
    },
    [onCommandResult, onError]
  );

  return {
    hasMicPermission,
    isCheckingPermission,
    isRequestingPermission,
    permissionError,
    requestMicPermission,
    checkMicPermission,

    isListening,
    isRecording,
    isProcessing,
    transcript,
    audioBase64,
    audioDurationMs,
    lastResult,

    startListening,
    stopListening,
    cancelListening,
    resetTranscript,
    clearError,
    processCommand,

    isNative,
    canRecordDevice,
  };
}

export default useVoicePos;
