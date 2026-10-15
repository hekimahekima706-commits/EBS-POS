/**
 * Audio & Voice Service for EBS
 * Integrates Web Audio API, Gemini Voice / TTS, and Speech Recognition in Swahili (Kiswahili)
 */
import { getApiBaseUrl } from './syncEngine';

// LocalStorage key for AI Voice Volume (0.0 to 2.0; 1.0 is 100%, 2.0 is 200% Bar Boost)
export const AI_VOICE_VOLUME_STORAGE_KEY = 'ebs_ai_voice_volume';

export function getAiVoiceVolume(): number {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(AI_VOICE_VOLUME_STORAGE_KEY);
    if (saved !== null) {
      const parsed = parseFloat(saved);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 2.5) {
        return parsed;
      }
    }
  }
  return 1.0; // 100% default
}

export function setAiVoiceVolume(volume: number): void {
  const clamped = Math.max(0, Math.min(2.0, volume));
  if (typeof window !== 'undefined') {
    localStorage.setItem(AI_VOICE_VOLUME_STORAGE_KEY, clamped.toString());
    window.dispatchEvent(new CustomEvent('ebs-ai-volume-change', { detail: { volume: clamped } }));
  }
}

// LocalStorage key for AI Voice Speed (0.5x to 2.0x; 1.0x is Normal)
export const AI_VOICE_SPEED_STORAGE_KEY = 'ebs_ai_voice_speed';

export function getAiVoiceSpeed(): number {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(AI_VOICE_SPEED_STORAGE_KEY);
    if (saved !== null) {
      const parsed = parseFloat(saved);
      if (!isNaN(parsed) && parsed >= 0.5 && parsed <= 2.0) {
        return parsed;
      }
    }
  }
  return 1.0; // 1.0x default
}

export function setAiVoiceSpeed(speed: number): void {
  const clamped = Math.max(0.5, Math.min(2.0, speed));
  if (typeof window !== 'undefined') {
    localStorage.setItem(AI_VOICE_SPEED_STORAGE_KEY, clamped.toString());
    window.dispatchEvent(new CustomEvent('ebs-ai-speed-change', { detail: { speed: clamped } }));
  }
}

export const AI_VOICE_CHANGE_EVENT = 'ebs-ai-voice-change';

export function setSelectedAiVoice(voiceId: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('ebs_ai_selected_voice', voiceId);
    localStorage.setItem('ebs_ai_selected_persona', voiceId);
    window.dispatchEvent(new CustomEvent(AI_VOICE_CHANGE_EVENT, { detail: { voiceId } }));
  }
}

let activeAudioCtx: AudioContext | null = null;
let activeAudioSource: AudioBufferSourceNode | null = null;
let activeGainNode: GainNode | null = null;

// Decode 16-bit PCM or WAV base64 audio and play via AudioContext with independent GainNode volume, speed, and acoustic EQ
export async function playPcmAudio(
  base64Data: string,
  sampleRate = 24000,
  volume?: number,
  mimeType?: string,
  speed?: number,
  voiceId?: string
): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      stopSpeaking();

      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) {
        throw new Error('AudioContext haipatikani kwenye kivinjari hiki');
      }

      const audioCtx = new AudioCtxClass();
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }
      activeAudioCtx = audioCtx;

      // Clean base64 string
      const cleanBase64 = base64Data.replace(/\s/g, '');
      const binaryStr = window.atob(cleanBase64);
      const len = binaryStr.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }

      let audioBuffer: AudioBuffer;

      // Detect if WAV/RIFF container format
      const isWav =
        (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) ||
        mimeType?.includes('wav');

      if (isWav) {
        try {
          audioBuffer = await audioCtx.decodeAudioData(bytes.buffer.slice(0));
        } catch {
          // If native decode fails, fallback to 16-bit PCM (skip 44 bytes header)
          const pcmOffset = 44;
          const pcmBytes = bytes.subarray(pcmOffset);
          const int16 = new Int16Array(pcmBytes.buffer, pcmBytes.byteOffset, Math.floor(pcmBytes.byteLength / 2));
          const float32 = new Float32Array(int16.length);
          for (let i = 0; i < int16.length; i++) {
            float32[i] = int16[i] / 32768.0;
          }
          audioBuffer = audioCtx.createBuffer(1, float32.length, sampleRate);
          audioBuffer.copyToChannel(float32, 0);
        }
      } else {
        // Convert 16-bit signed PCM to 32-bit float audio buffer
        const int16 = new Int16Array(bytes.buffer, bytes.byteOffset, Math.floor(bytes.byteLength / 2));
        const float32 = new Float32Array(int16.length);
        for (let i = 0; i < int16.length; i++) {
          float32[i] = int16[i] / 32768.0;
        }
        audioBuffer = audioCtx.createBuffer(1, float32.length, sampleRate);
        audioBuffer.copyToChannel(float32, 0);
      }

      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      activeAudioSource = source;

      // Speed adjustment (playbackRate 0.5x to 2.0x)
      const effectiveSpeed = typeof speed === 'number' ? speed : getAiVoiceSpeed();
      source.playbackRate.value = Math.max(0.5, Math.min(2.0, effectiveSpeed));

      // Independent AI Voice Volume Control via GainNode (supports Bar Boost up to 200%)
      const gainNode = audioCtx.createGain();
      const effectiveVol = typeof volume === 'number' ? volume : getAiVoiceVolume();
      gainNode.gain.value = Math.max(0, effectiveVol);
      activeGainNode = gainNode;

      // Connect audio source directly to GainNode to maintain pure, authentic Gemini studio fidelity
      source.connect(gainNode);

      gainNode.connect(audioCtx.destination);

      source.onended = () => {
        try {
          audioCtx.close();
        } catch {}
        if (activeAudioCtx === audioCtx) activeAudioCtx = null;
        if (activeAudioSource === source) activeAudioSource = null;
        resolve();
      };

      source.start(0);
    } catch (err) {
      console.warn('PCM/WAV Playback error, falling back:', err);
      reject(err);
    }
  });
}

export interface AiPersona {
  id: 'Orbit' | 'Capella' | 'Vega' | 'Ursa' | 'Pegasus' | 'Flare' | string;
  name: string;
  roleTitleSw: string;
  gender: 'male' | 'female';
  toneStyleSw: string;
  systemInstructionSw: string;
  descriptionSw: string;
  badge: string;
  sampleTextSw: string;
  accentColor: string;
  avatarLetter: string;
}

export const AI_PERSONAS: AiPersona[] = [
  {
    id: 'Orbit',
    name: 'Orbit',
    roleTitleSw: 'Kiongozi Mkuu wa Kibiashara (Executive Leader)',
    gender: 'male',
    toneStyleSw: 'Rasmi, Yenye Mamlaka & Maamuzi Thabiti',
    systemInstructionSw: 'Wewe una haiba ya ORBIT. Jibu kwa heshima ya kiuongozi, sauti imara, iliyonyooka na yenye mamlaka ya kibiashara. Zingatia maamuzi thabiti ya kimkakati, takwimu sahihi za fedha na ukuaji wa faida.',
    descriptionSw: 'Kiongozi rasmi wa kibiashara, anayezingatia maamuzi ya kimkakati, takwimu na ukuaji wa faida.',
    badge: 'Chaguo Kuu · Kiongozi',
    sampleTextSw: 'Habari za kazi! Mimi ni EBS AI kwa haiba ya Orbit. Nipo tayari kukuongoza katika maamuzi na uongozi wa biashara yako.',
    accentColor: '#10b981', // emerald
    avatarLetter: 'O',
  },
  {
    id: 'Capella',
    name: 'Capella',
    roleTitleSw: 'Mhamasishaji Changamfu wa Mauzo (Energetic Motivator)',
    gender: 'female',
    toneStyleSw: 'Changamfu, Yenye Nishati & Maneno ya Kutia Moyo',
    systemInstructionSw: 'Wewe una haiba ya CAPELLA. Jibu kwa uchangamfu mkubwa, nishati chanya, maneno ya kutia moyo, na msisitizo wa kuongeza morali ya mauzo na wateja.',
    descriptionSw: 'Mchangamfu na mwenye nishati chanya, anayehamasisha timu ya mauzo na kuongeza kasi ya biashara.',
    badge: 'Maarufu · Changamfu',
    sampleTextSw: 'Habari yako! Naitwa Capella, sauti changamfu ya EBS AI. Mauzo yako leo yanaendelea vizuri sana, tuendelee kupambana!',
    accentColor: '#ec4899', // pink
    avatarLetter: 'C',
  },
  {
    id: 'Vega',
    name: 'Vega',
    roleTitleSw: 'Mshauri Tulivu & Mwenye Subira (Calm & Patient Advisor)',
    gender: 'female',
    toneStyleSw: 'Tulivu, Laini & Maelezo ya Subira',
    systemInstructionSw: 'Wewe una haiba ya VEGA. Jibu kwa utulivu wa hali ya juu, upole, staha na maelezo ya kina ya hatua kwa hatua kwa subira.',
    descriptionSw: 'Mshauri mtulivu mwenye subira na staha ya kipekee, anayefaa kwa huduma kwa wateja na utatuzi wa changamoto.',
    badge: 'Tulivu · Huduma',
    sampleTextSw: 'Karibu sana. Hapa ni EBS AI kwa haiba ya Vega. Ninaweza kukusaidia kupanga stoo au kuangalia ripoti kwa utulivu.',
    accentColor: '#0ea5e9', // sky
    avatarLetter: 'V',
  },
  {
    id: 'Ursa',
    name: 'Ursa',
    roleTitleSw: 'Msimamizi Makini wa Fedha & Stoo (Strict Financial Auditor)',
    gender: 'male',
    toneStyleSw: 'Nzito, Makini & Udhibiti Mkali wa Hasara',
    systemInstructionSw: 'Wewe una haiba ya URSA. Jibu kwa sauti nzito, umakini mkubwa kwenye takwimu za fedha, kudhibiti hasara, kuzuia upotevu wa stoo, na kutoruhusu uzembe.',
    descriptionSw: 'Msimamizi makini wa fedha, stoo na udhibiti wa hasara asiyevumilia ubadhirifu wowote.',
    badge: 'Ukaguzi · Fedha',
    sampleTextSw: 'Habari Boss! Naitwa Ursa. Nimekagua faida halisi na gharama za leo, nipo tayari kuhakikisha hakuna senti inayopotea.',
    accentColor: '#f59e0b', // amber
    avatarLetter: 'U',
  },
  {
    id: 'Pegasus',
    name: 'Pegasus',
    roleTitleSw: 'Mchambuzi wa Haraka wa Mauzo (Fast Agile Analyst)',
    gender: 'male',
    toneStyleSw: 'Fasaha, Yenye Kasi & Majibu Mafupi ya Moja kwa Moja',
    systemInstructionSw: 'Wewe una haiba ya PEGASUS. Jibu kwa ufasaha wa hali ya juu, wepesi na kasi, ukitoa majibu mafupi, yaliyonyooka moja kwa moja kwenye shabaha ya kuuza zaidi.',
    descriptionSw: 'Mchambuzi mwepesi na fasaha anayetoa ripoti za haraka na mbinu za kuuza zaidi kwa wakati mfupi.',
    badge: 'Mchambuzi · Kasi',
    sampleTextSw: 'Jambo! Mimi ni Pegasus. Nina orodha kamili ya bidhaa zinazoisha na madeni yaliyofikia tarehe.',
    accentColor: '#6366f1', // indigo
    avatarLetter: 'P',
  },
  {
    id: 'Flare',
    name: 'Flare',
    roleTitleSw: 'Msaidizi wa Kisasa & Mbunifu (Modern Creative Assistant)',
    gender: 'female',
    toneStyleSw: 'Kisasa, Angavu & Mawazo Mapya ya Masoko',
    systemInstructionSw: 'Wewe una haiba ya FLARE. Jibu kwa mtindo wa kisasa na ubunifu, ukitumia mawazo mapya ya kidijitali, ofa za kisasa, na njia bunifu za kuvutia wateja.',
    descriptionSw: 'Msaidizi wa kisasa na mbunifu, anayeleta mbinu mpya za kuvutia wateja na kuboresha huduma.',
    badge: 'Mbunifu · Kisasa',
    sampleTextSw: 'Mambo vipi! Mimi ni Flare wa EBS AI. Hebu tuangalie mwenendo wa mauzo na tuweke mbinu mpya za kuvutia wateja leo.',
    accentColor: '#8b5cf6', // violet
    avatarLetter: 'F',
  },
];

export function getActiveAiPersona(personaId?: string): AiPersona {
  const targetId =
    personaId ||
    (typeof window !== 'undefined'
      ? localStorage.getItem('ebs_ai_selected_voice') ||
        localStorage.getItem('ebs_ai_selected_persona') ||
        'Orbit'
      : 'Orbit');
  return AI_PERSONAS.find((p) => p.id.toLowerCase() === targetId.toLowerCase()) || AI_PERSONAS[0];
}

export interface GeminiVoiceOption {
  id: string; // e.g. "Orbit"
  name: string;
  gender: 'male' | 'female';
  toneSw: string;
  descriptionSw: string;
  badge: string;
  sampleTextSw: string;
}

export const GEMINI_VOICES: GeminiVoiceOption[] = [
  {
    id: 'Orbit',
    name: 'Orbit',
    gender: 'male',
    toneSw: 'Kiume · Imara na Yenye Mamlaka',
    descriptionSw: 'Sauti thabiti na rasmi ya mamlaka, inafaa kwa maamuzi ya kibiashara',
    badge: 'Chaguo Kuu',
    sampleTextSw: 'Habari za kazi! Mimi ni EBS AI kwa sauti ya Orbit. Nipo tayari kukuongoza katika biashara yako.',
  },
  {
    id: 'Capella',
    name: 'Capella',
    gender: 'female',
    toneSw: 'Kike · Changamfu na Yenye Nishati',
    descriptionSw: 'Sauti changamfu na ya kisasa, inavutia na inaeleweka kwa urahisi',
    badge: 'Popular',
    sampleTextSw: 'Habari yako! Naitwa Capella, sauti changamfu ya EBS AI. Mauzo yako leo yanaendelea vizuri sana!',
  },
  {
    id: 'Vega',
    name: 'Vega',
    gender: 'female',
    toneSw: 'Kike · Tulivu na Laini',
    descriptionSw: 'Sauti ya upole na staha ya hali ya juu, inafaa kwa huduma kwa wateja',
    badge: 'Tulivu',
    sampleTextSw: 'Karibu sana. Hapa ni EBS AI kwa sauti ya Vega. Ninaweza kukusaidia kupanga stoo au kuangalia ripoti.',
  },
  {
    id: 'Ursa',
    name: 'Ursa',
    gender: 'male',
    toneSw: 'Kiume · Nzito na Ya Kujiamini',
    descriptionSw: 'Sauti nzito yenye hadhi na uzoefu wa kusimamia fedha na stoo',
    badge: 'Nzito',
    sampleTextSw: 'Habari Boss! Naitwa Ursa. Nimekagua faida halisi na gharama za leo, nipo tayari kukushauri.',
  },
  {
    id: 'Pegasus',
    name: 'Pegasus',
    gender: 'male',
    toneSw: 'Kiume · Fasaha na Ya Kasi Wastani',
    descriptionSw: 'Sauti ya mwerevu anayechanganua mahesabu ya mauzo haraka',
    badge: 'Fasaha',
    sampleTextSw: 'Jambo! Mimi ni Pegasus. Nina orodha kamili ya bidhaa zinazoisha na madeni yaliyofikia tarehe.',
  },
  {
    id: 'Flare',
    name: 'Flare',
    gender: 'female',
    toneSw: 'Kike · Angavu na Ya Kisasa',
    descriptionSw: 'Sauti ya kisasa na nyepesi ya msaidizi mwenye weledi wa kisasa',
    badge: 'Mpya',
    sampleTextSw: 'Mambo vipi! Mimi ni Flare wa EBS AI. Hebu tuangalie mwenendo wa mauzo ya kaunta leo.',
  },
  {
    id: 'Aoede',
    name: 'Aoede',
    gender: 'female',
    toneSw: 'Kike · Asili na Ya Karibu',
    descriptionSw: 'Sauti ya asili na ya kirafiki sana kwa shughuli za kila siku za duka',
    badge: 'Asili',
    sampleTextSw: 'Habari za leo! Mimi ni Aoede. Nipo hapa kurahisisha kazi zako za kuuza na kutoa risiti.',
  },
  {
    id: 'Kore',
    name: 'Kore',
    gender: 'female',
    toneSw: 'Kike · Rasmi na Ya Kazi',
    descriptionSw: 'Sauti sanifu ya ripoti, ukaguzi na mahesabu ya mwisho wa siku',
    badge: 'Rasmi',
    sampleTextSw: 'Karibu. Hii ni ripoti ya mfumo wa EBS. Miamala yote imehakikiwa kikamilifu.',
  },
  {
    id: 'Puck',
    name: 'Puck',
    gender: 'male',
    toneSw: 'Kiume · Rafiki na Ya Wazi',
    descriptionSw: 'Sauti angavu, nyepesi na ya kirafiki kwa keshia na wateja',
    badge: 'Angavu',
    sampleTextSw: 'Habari ndugu yangu! Puck hapa, nisaidie nikusaidie kurekodi mauzo ya haraka.',
  },
  {
    id: 'Charon',
    name: 'Charon',
    gender: 'male',
    toneSw: 'Kiume · Nzito na Ya Kina',
    descriptionSw: 'Sauti ya utulivu wa kina kwa uchambuzi wa takwimu na udhibiti wa hasara',
    badge: 'Kina',
    sampleTextSw: 'Habari. Naitwa Charon. Ninachambua matumizi yako na kukupa njia za kubana gharama.',
  },
  {
    id: 'Fenrir',
    name: 'Fenrir',
    gender: 'male',
    toneSw: 'Kiume · Yenye Nguvu',
    descriptionSw: 'Sauti yenye msisitizo mkubwa na ukakamavu wa kiutendaji',
    badge: 'Nguvu',
    sampleTextSw: 'Hujambo! Fenrir yupo tayari. Tuanze kazi ya kusimamia hesabu na kuzuia wizi au upotevu.',
  },
];

// Acoustic profiles for distinct voices during speech synthesis fallback so every persona sounds unique
export const VOICE_ACOUSTIC_PROFILES: Record<string, { gender: 'male' | 'female'; pitch: number; rate: number }> = {
  orbit: { gender: 'male', pitch: 0.82, rate: 0.95 },     // Executive leader, deep resonance
  capella: { gender: 'female', pitch: 1.55, rate: 1.10 }, // Energetic motivator, bright & high female
  vega: { gender: 'female', pitch: 1.35, rate: 0.85 },    // Calm advisor, gentle & soft patient female pace
  ursa: { gender: 'male', pitch: 0.50, rate: 0.85 },      // Strict financial auditor, heavy deep bass male
  pegasus: { gender: 'male', pitch: 1.05, rate: 1.20 },   // Fast agile analyst, crisp rapid pace
  flare: { gender: 'female', pitch: 1.40, rate: 1.00 },   // Modern creative, expressive & clear
  aoede: { gender: 'female', pitch: 1.30, rate: 0.95 },   // Natural breezy female
  kore: { gender: 'female', pitch: 1.25, rate: 0.90 },    // Firm articulate professional female
  puck: { gender: 'male', pitch: 1.15, rate: 1.05 },      // Upbeat friendly male
  charon: { gender: 'male', pitch: 0.48, rate: 0.80 },    // Deep resonant masculine
  fenrir: { gender: 'male', pitch: 0.65, rate: 0.98 },    // Powerful commanding male
};

/**
 * Normalizes text for clear, natural Swahili pronunciation:
 * - Expands Tanzanian currency (TZS 10,000 -> Shilingi 10,000)
 * - Expands business acronyms (POS, VAT, TIN, VRN, kg, n.k.)
 * - Strips markdown symbols, asterisks, bullet hashes, and code blocks
 */
export function prepareSwahiliSpeechText(raw: string): string {
  if (!raw) return '';
  let s = raw;
  // Remove code blocks and markdown styling
  s = s.replace(/```[\s\S]*?```/g, ' ');
  s = s.replace(/`([^`]+)`/g, '$1');
  s = s.replace(/\*\*([^*]+)\*\*/g, '$1');
  s = s.replace(/\*([^*]+)\*/g, '$1');
  s = s.replace(/#+\s+/g, '');
  s = s.replace(/^[-*+]\s+/gm, '');
  s = s.replace(/\|/g, ' ');

  // Normalize currency to natural Swahili phrasing
  s = s.replace(/\b(?:TZS|TSh|TSH|Tsh)\.?\s*([0-9,.]+)/gi, 'shilingi $1');
  s = s.replace(/([0-9,.]+)\s*(?:TZS|TSh|TSH|Tsh)\b/gi, 'shilingi $1');

  // Common business abbreviations & units
  s = s.replace(/\bPOS\b/gi, 'P-O-S');
  s = s.replace(/\bVAT\b/gi, 'kodi ya V-A-T');
  s = s.replace(/\bTIN\b/gi, 'T-I-N');
  s = s.replace(/\bVRN\b/gi, 'V-R-N');
  s = s.replace(/\bkg\b/gi, 'kilo');
  s = s.replace(/\bltr\b/gi, 'lita');
  s = s.replace(/\bpcs\b/gi, 'vipande');
  s = s.replace(/\bpkts\b/gi, 'pakiti');
  s = s.replace(/\bn\.?k\.?\b/gi, 'na kadhalika');
  s = s.replace(/%/g, ' asilimia');
  s = s.replace(/&/g, ' na ');

  // Clean extra whitespace
  return s.replace(/\s+/g, ' ').trim();
}

/**
 * Asynchronously retrieves available browser SpeechSynthesis voices,
 * explicitly awaiting the 'voiceschanged' event if voices haven't loaded yet.
 */
export async function getBrowserSpeechVoices(): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return [];
  }
  let voices = window.speechSynthesis.getVoices();
  if (voices && voices.length > 0) {
    return voices;
  }
  return new Promise((resolve) => {
    let resolved = false;
    const onVoicesChanged = () => {
      if (resolved) return;
      resolved = true;
      window.speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged);
      resolve(window.speechSynthesis.getVoices());
    };
    window.speechSynthesis.addEventListener('voiceschanged', onVoicesChanged);
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        window.speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged);
        resolve(window.speechSynthesis.getVoices());
      }
    }, 350);
  });
}

/**
 * Explicitly searches and finds a Swahili-compatible speech voice,
 * strictly prioritizing 'sw-TZ' (Swahili, Tanzania) and 'sw' (Swahili, East Africa).
 */
export async function getSwahiliCompatibleVoice(
  gender?: 'male' | 'female'
): Promise<SpeechSynthesisVoice | undefined> {
  const voices = await getBrowserSpeechVoices();
  if (!voices || voices.length === 0) return undefined;

  // 1. Exact 'sw-TZ' (Swahili, Tanzania)
  const exactSwTzVoices = voices.filter(
    (v) => v.lang.toLowerCase() === 'sw-tz' || v.lang.toLowerCase() === 'sw_tz'
  );

  // 2. Generic Swahili ('sw', 'sw-KE', or voices containing 'swahili' or 'kiswahili')
  const allSwVoices = voices.filter(
    (v) =>
      v.lang.toLowerCase().startsWith('sw') ||
      v.name.toLowerCase().includes('swahili') ||
      v.name.toLowerCase().includes('kiswahili')
  );

  if (gender === 'female') {
    const fTz = exactSwTzVoices.find((v) => /female|woman|kike/i.test(v.name));
    if (fTz) return fTz;
    if (exactSwTzVoices.length > 0) return exactSwTzVoices[0];

    const fSw = allSwVoices.find((v) => /female|woman|kike/i.test(v.name));
    if (fSw) return fSw;
    if (allSwVoices.length > 0) return allSwVoices[0];
  } else if (gender === 'male') {
    const mTz = exactSwTzVoices.find((v) => /male|man|kiume/i.test(v.name));
    if (mTz) return mTz;
    if (exactSwTzVoices.length > 0) return exactSwTzVoices[0];

    const mSw = allSwVoices.find((v) => /male|man|kiume/i.test(v.name));
    if (mSw) return mSw;
    if (allSwVoices.length > 0) return allSwVoices[0];
  } else {
    if (exactSwTzVoices.length > 0) return exactSwTzVoices[0];
    if (allSwVoices.length > 0) return allSwVoices[0];
  }

  // Fallback to articulate natural voice if no native Swahili voice exists in OS
  return (
    voices.find((v) => /natural|google/i.test(v.name) && (gender === 'female' ? /female/i.test(v.name) : /male/i.test(v.name))) ||
    voices.find((v) => /natural|google/i.test(v.name)) ||
    voices[0]
  );
}

/**
 * Text-to-Speech in Swahili using Gemini TTS with multi-voice support, volume control, speed adjustment, and distinct fallback acoustics
 */
export async function speakTextSwahili(
  text: string,
  voiceName?: string,
  customVolume?: number,
  customSpeed?: number,
  preloadedVoice?: SpeechSynthesisVoice
): Promise<void> {
  if (!text || !text.trim()) return;

  const normalizedText = prepareSwahiliSpeechText(text);
  if (!normalizedText) return;

  const chosenVoice =
    voiceName ||
    (typeof window !== 'undefined'
      ? localStorage.getItem('ebs_ai_selected_voice') ||
        localStorage.getItem('ebs_ai_selected_persona') ||
        'Orbit'
      : 'Orbit');

  const volume = typeof customVolume === 'number' ? customVolume : getAiVoiceVolume();
  if (volume <= 0.01) {
    // Muted
    return;
  }

  const speed = typeof customSpeed === 'number' ? customSpeed : getAiVoiceSpeed();

  // Ensure persistent sync across all storage keys
  if (typeof window !== 'undefined' && chosenVoice) {
    localStorage.setItem('ebs_ai_selected_voice', chosenVoice);
    localStorage.setItem('ebs_ai_selected_persona', chosenVoice);
  }

  try {
    const apiBase = getApiBaseUrl();
    const apiUrl = `${apiBase}/api/ai/tts`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: normalizedText, voiceName: chosenVoice }),
    });

    if (response.ok) {
      const rawText = await response.text();
      if (!rawText.trim().startsWith('<') && !rawText.trim().startsWith('<!doctype')) {
        const data = JSON.parse(rawText);
        if (data.audioBase64) {
          await playPcmAudio(data.audioBase64, data.sampleRate || 24000, volume, data.mimeType, speed, chosenVoice);
          return;
        }
      }
    }
  } catch (err) {
    console.warn('Gemini TTS fetch failed, switching to browser voice:', err);
  }

  // Fallback to browser SpeechSynthesis: specifically prioritize 'sw-TZ' and 'sw' voices
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      stopSpeaking();
      const utterance = new SpeechSynthesisUtterance(normalizedText);
      utterance.lang = 'sw-TZ';

      // Look up distinct acoustic profile
      const profile =
        VOICE_ACOUSTIC_PROFILES[chosenVoice.toLowerCase()] ||
        VOICE_ACOUSTIC_PROFILES.orbit;

      utterance.pitch = profile.pitch;
      utterance.rate = Math.max(0.5, Math.min(2.0, profile.rate * speed));
      utterance.volume = Math.min(1.0, volume);

      const allVoices = window.speechSynthesis.getVoices();

      // Specifically prioritize:
      // 1. Exact 'sw-TZ' (Swahili, Tanzania)
      // 2. Generic 'sw' or 'sw-KE' (Swahili, East Africa)
      // 3. Voices containing 'swahili' or 'kiswahili'
      const exactSwTzVoices = allVoices.filter(
        (v) => v.lang.toLowerCase() === 'sw-tz' || v.lang.toLowerCase() === 'sw_tz'
      );
      const allSwVoices = allVoices.filter(
        (v) => v.lang.toLowerCase().startsWith('sw') || v.name.toLowerCase().includes('swahili') || v.name.toLowerCase().includes('kiswahili')
      );

      let matchedVoice: SpeechSynthesisVoice | undefined = preloadedVoice;

      if (!matchedVoice) {
        if (profile.gender === 'female') {
        // Female persona: search within sw-TZ / sw voices first
        matchedVoice =
          exactSwTzVoices.find((v) => {
            const n = v.name.toLowerCase();
            return n.includes('female') || n.includes('woman') || n.includes('kike');
          }) ||
          exactSwTzVoices[0] ||
          allSwVoices.find((v) => {
            const n = v.name.toLowerCase();
            return n.includes('female') || n.includes('woman') || n.includes('kike');
          }) ||
          allSwVoices[0];

        // If device has no Swahili voice installed, pick clear articulate natural voice
        if (!matchedVoice) {
          matchedVoice = allVoices.find((v) => {
            const n = v.name.toLowerCase();
            return (
              n.includes('natural') ||
              n.includes('google') ||
              n.includes('female') ||
              n.includes('samantha') ||
              n.includes('jenny')
            );
          });
        }
      } else {
        // Male persona: search within sw-TZ / sw voices first
        matchedVoice =
          exactSwTzVoices.find((v) => {
            const n = v.name.toLowerCase();
            return n.includes('male') || n.includes('man') || n.includes('kiume');
          }) ||
          exactSwTzVoices[0] ||
          allSwVoices.find((v) => {
            const n = v.name.toLowerCase();
            return n.includes('male') || n.includes('man') || n.includes('kiume');
          }) ||
          allSwVoices[0];

        if (!matchedVoice) {
          matchedVoice = allVoices.find((v) => {
            const n = v.name.toLowerCase();
            return (
              n.includes('natural') ||
              n.includes('google') ||
              n.includes('male') ||
              n.includes('david') ||
              n.includes('guy')
            );
          });
        }
      }
    }

      if (matchedVoice) {
        utterance.voice = matchedVoice;
        // If an exact Swahili voice was found, set its language code
        if (matchedVoice.lang) {
          utterance.lang = matchedVoice.lang;
        }
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
 * Stop any ongoing speech playback (both Web Audio and SpeechSynthesis)
 */
export function stopSpeaking(): void {
  // Stop Web Audio playback
  if (activeAudioSource) {
    try {
      activeAudioSource.stop();
    } catch {}
    activeAudioSource = null;
  }
  if (activeAudioCtx) {
    try {
      activeAudioCtx.close();
    } catch {}
    activeAudioCtx = null;
  }
  activeGainNode = null;

  // Stop Web Speech Synthesis
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {}
  }
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
 * Intelligent local Swahili Voice Parser fallback for offline / HTML error resilience
 */
export function parseVoiceCommandLocally(
  speechText: string,
  products: any[],
  hasPendingDraft = false
): VoiceCommandResult {
  const lower = (speechText || '').toLowerCase().trim();

  // 1. Confirmation Intent
  const isConfirm =
    lower === 'sawa' ||
    lower.includes('thibitisha') ||
    lower.includes('kamilisha') ||
    lower.includes('ndiyo') ||
    lower.includes('maliza') ||
    lower.includes('sawa sawa') ||
    lower.includes('endelea') ||
    lower.includes('kamili');

  if (isConfirm && hasPendingDraft) {
    return {
      action: 'CONFIRM_SALE',
      spokenResponse: 'Mauzo yamethibitishwa na kukamilika. Je, ungependa kutoa risiti?',
      message: 'Mauzo yamethibitishwa!',
    };
  }

  // 2. Print Receipt Intent
  const isReceipt =
    lower.includes('toa risiti') ||
    lower.includes('chapa risiti') ||
    lower.includes('onyesha risiti') ||
    lower.includes('print risiti') ||
    lower.includes('chapisha') ||
    lower.includes('risiti');

  if (isReceipt) {
    return {
      action: 'PRINT_RECEIPT',
      spokenResponse: 'Nafungua risiti yako sasa hivi.',
      message: 'Risiti inachapishwa...',
    };
  }

  // 3. Cancel Sale Intent
  const isCancel =
    lower.includes('futa') ||
    lower.includes('sitisha') ||
    lower.includes('ghairi') ||
    lower.includes('acha') ||
    lower.includes('ondoa');

  if (isCancel && hasPendingDraft) {
    return {
      action: 'CANCEL_SALE',
      spokenResponse: 'Mauzo yameghairiwa.',
      message: 'Mauzo yamesitishwa.',
    };
  }

  // 4. Parse Items from Swahili speech
  const detectedItems: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }> = [];

  const swahiliNumbers: Record<string, number> = {
    moja: 1, mojaa: 1, mmoja: 1, kimoja: 1,
    mbili: 2, wawili: 2, viwili: 2, pili: 2,
    tatu: 3, watatu: 3, vitatu: 3,
    nne: 4, wanne: 4, vinne: 4,
    tano: 5, watano: 5, vitano: 5,
    sita: 6,
    saba: 7,
    nane: 8,
    tisa: 9,
    kumi: 10,
    kumi_na_moja: 11, kumi_na_mbili: 12,
  };

  const words = lower.split(/[\s,]+/);

  for (const prod of products) {
    const prodNameLower = prod.name.toLowerCase();
    const nameKeywords = prodNameLower.split(/[\s-]+/).filter((w: string) => w.length > 2);
    const match = nameKeywords.some((kw: string) => lower.includes(kw));

    if (match) {
      let qty = 1;
      for (let i = 0; i < words.length; i++) {
        const w = words[i];
        if (nameKeywords.some((kw: string) => w.includes(kw))) {
          const prev = words[i - 1];
          const next = words[i + 1];
          if (prev && swahiliNumbers[prev]) qty = swahiliNumbers[prev];
          else if (next && swahiliNumbers[next]) qty = swahiliNumbers[next];
          else if (prev && !isNaN(Number(prev)) && Number(prev) > 0) qty = Number(prev);
          else if (next && !isNaN(Number(next)) && Number(next) > 0) qty = Number(next);
          break;
        }
      }

      // Check if already detected to avoid duplicates
      if (!detectedItems.some((d) => d.productId === prod.id)) {
        const price = prod.sellingPrice || prod.price || 0;
        detectedItems.push({
          productId: prod.id,
          productName: prod.name,
          quantity: qty,
          unitPrice: price,
          total: price * qty,
        });
      }
    }
  }

  if (detectedItems.length > 0) {
    const total = detectedItems.reduce((s, i) => s + i.total, 0);
    const summaryText = detectedItems.map((i) => `${i.productName} ${i.quantity}`).join(' na ');
    return {
      action: 'CREATE_SALE',
      items: detectedItems,
      totalAmount: total,
      spokenResponse: `Nimeandaa mauzo ya ${summaryText}, jumla ni Shilingi ${total.toLocaleString()}. Je, nithibitishe mauzo?`,
      message: `Mauzo ya ${summaryText} yameandaliwa. Thibitisha kukamilisha.`,
    };
  }

  return {
    action: 'QUERY',
    items: [],
    totalAmount: 0,
    spokenResponse: `Nimekuelewa: "${speechText}". Sema kwa mfano: "EBS niuzie Kilimanjaro mbili, Konyagi moja".`,
    message: `Sema bidhaa unazotaka kuuza...`,
  };
}

/**
 * Send speech transcript to backend or direct fallback for Gemini parsing
 * Guarantees NO "Unexpected token <" HTML crashes
 */
export async function sendVoiceCommand(
  speechText: string,
  products: any[],
  hasPendingDraft = false
): Promise<VoiceCommandResult> {
  const cleanSpeech = (speechText || '').trim();
  if (!cleanSpeech) {
    return {
      action: 'QUERY',
      items: [],
      totalAmount: 0,
      spokenResponse: 'Tafadhali zungumza ili nikusikie.',
    };
  }

  // 1. If navigator is offline, immediately parse locally
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return parseVoiceCommandLocally(cleanSpeech, products, hasPendingDraft);
  }

  try {
    const apiBase = getApiBaseUrl();
    const apiUrl = `${apiBase}/api/ai/voice-command`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        speechText: cleanSpeech,
        products: products.map((p) => ({
          id: p.id,
          name: p.name,
          sellingPrice: p.sellingPrice || p.price || 0,
          category: p.category,
          stockQty: p.stockQty || 0,
        })),
        hasPendingDraft,
      }),
    });

    clearTimeout(timeoutId);

    // Read as text first to prevent "Unexpected token <" when server returns 404/500 HTML
    const responseText = await response.text();

    // Check if the response is an HTML page (Vite fallback, Nginx/proxy error, 404, etc.)
    const trimmed = responseText.trim();
    if (trimmed.startsWith('<') || trimmed.startsWith('<!doctype') || !response.ok) {
      console.warn('[EBS Voice] Backend returned non-JSON / HTML page. Falling back to local Swahili parser.');
      return parseVoiceCommandLocally(cleanSpeech, products, hasPendingDraft);
    }

    try {
      const data = JSON.parse(responseText);
      return data;
    } catch {
      return parseVoiceCommandLocally(cleanSpeech, products, hasPendingDraft);
    }
  } catch (err) {
    console.warn('[EBS Voice] Network failure during voice command. Falling back to local Swahili parser:', err);
    return parseVoiceCommandLocally(cleanSpeech, products, hasPendingDraft);
  }
}
