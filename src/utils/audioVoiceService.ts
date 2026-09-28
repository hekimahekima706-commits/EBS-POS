/**
 * Audio & Voice Service for EBS
 * Integrates Web Audio API, Gemini Voice / TTS, and Speech Recognition in Swahili (Kiswahili)
 */

// Decode 16-bit PCM base64 audio and play via AudioContext (24000 Hz for Gemini TTS)
export async function playPcmAudio(base64Data: string, sampleRate = 24000): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) {
        throw new Error('AudioContext haipatikani kwenye kivinjari hiki');
      }

      const audioCtx = new AudioCtxClass({ sampleRate });

      // Clean base64 string
      const cleanBase64 = base64Data.replace(/\s/g, '');
      const binaryStr = window.atob(cleanBase64);
      const len = binaryStr.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }

      // Convert 16-bit signed PCM to 32-bit float audio buffer
      const int16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) {
        float32[i] = int16[i] / 32768.0;
      }

      const audioBuffer = audioCtx.createBuffer(1, float32.length, sampleRate);
      audioBuffer.copyToChannel(float32, 0);

      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioCtx.destination);

      source.onended = () => {
        try {
          audioCtx.close();
        } catch {}
        resolve();
      };

      source.start(0);
    } catch (err) {
      console.warn('PCM Playback error, falling back:', err);
      reject(err);
    }
  });
}

/**
 * Text-to-Speech in Swahili using Gemini TTS with automatic browser speech synthesis fallback
 */
export async function speakTextSwahili(text: string): Promise<void> {
  if (!text || !text.trim()) return;

  try {
    const savedServer = typeof window !== 'undefined' ? localStorage.getItem('ebs_server_url') || '' : '';
    const apiBase = (savedServer || (import.meta as any).env?.VITE_API_BASE_URL || '').trim().replace(/\/$/, '');
    const apiUrl = `${apiBase}/api/ai/tts`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.audioBase64) {
        await playPcmAudio(data.audioBase64, data.sampleRate || 24000);
        return;
      }
    }
  } catch (err) {
    console.warn('Gemini TTS fetch failed, switching to browser voice:', err);
  }

  // Fallback to browser SpeechSynthesis
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'sw-TZ';
      utterance.rate = 0.95;
      utterance.pitch = 1.0;

      // Try finding a Swahili or African English voice
      const voices = window.speechSynthesis.getVoices();
      const swVoice = voices.find((v) => v.lang.startsWith('sw') || v.name.toLowerCase().includes('swahili'));
      if (swVoice) {
        utterance.voice = swVoice;
      }

      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      window.speechSynthesis.speak(utterance);
    } else {
      resolve();
    }
  });
}

/**
 * Interface for Voice Sales Response
 */
export interface VoiceCommandResult {
  action: 'CREATE_SALE' | 'CONFIRM_SALE' | 'PRINT_RECEIPT' | 'CANCEL_SALE' | 'QUERY';
  items?: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  totalAmount?: number;
  spokenResponse?: string;
  message?: string;
  error?: string;
}

/**
 * Send speech transcript to backend for Gemini parsing into structured sale items
 */
export async function sendVoiceCommand(
  speechText: string,
  products: any[],
  hasPendingDraft = false
): Promise<VoiceCommandResult> {
  const savedServer = typeof window !== 'undefined' ? localStorage.getItem('ebs_server_url') || '' : '';
  const apiBase = (savedServer || (import.meta as any).env?.VITE_API_BASE_URL || '').trim().replace(/\/$/, '');
  const apiUrl = `${apiBase}/api/ai/voice-command`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      speechText,
      products: products.map((p) => ({
        id: p.id,
        name: p.name,
        sellingPrice: p.sellingPrice,
        category: p.category,
        stockQty: p.stockQty,
      })),
      hasPendingDraft,
    }),
  });

  if (!response.ok) {
    throw new Error(`Voice command error: ${response.statusText}`);
  }

  return response.json();
}
