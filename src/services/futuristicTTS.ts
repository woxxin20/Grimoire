// Futuristic Female Voice TTS Engine using Web Speech API + Gemini Key Rotator Backend

export interface SpeakOptions {
  text?: string;
  matchScore?: number;
  title?: string;
  summary?: string;
}

export interface TTSStatusState {
  isPlaying: boolean;
  isPaused: boolean;
  autoRead: boolean;
  currentText: string;
  matchScore: number;
  keyIndex: number;
  model: string;
}

type StatusChangeListener = (status: TTSStatusState) => void;

class FuturisticTTSEngine {
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private listeners: Set<StatusChangeListener> = new Set();

  private state: TTSStatusState = {
    isPlaying: false,
    isPaused: false,
    autoRead: true,
    currentText: '',
    matchScore: 69,
    keyIndex: 1,
    model: 'gemini-3.1-flash-tts',
  };

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      window.speechSynthesis.onvoiceschanged = () => {
        this.getFuturisticFemaleVoice();
      };
    }
  }

  public subscribe(listener: StatusChangeListener) {
    this.listeners.add(listener);
    listener({ ...this.state });
    return () => { this.listeners.delete(listener); };
  }

  private notify() {
    const copy = { ...this.state };
    this.listeners.forEach((l) => l(copy));
  }

  public setAutoRead(enabled: boolean) {
    this.state.autoRead = enabled;
    this.notify();
  }

  public getFuturisticFemaleVoice(): SpeechSynthesisVoice | null {
    if (!this.synth) return null;
    const voices = this.synth.getVoices();
    if (!voices || voices.length === 0) return null;

    const preferredNames = [
      'Google US English',
      'Microsoft Zira',
      'Microsoft Eva',
      'Microsoft Jenny Online (Natural)',
      'Microsoft Aria Online (Natural)',
      'Samantha',
      'Karen',
      'Victoria',
      'Fiona',
    ];

    for (const name of preferredNames) {
      const v = voices.find(
        (voice) => voice.name.includes(name) || (voice.name.toLowerCase().includes('female') && voice.lang.startsWith('en'))
      );
      if (v) return v;
    }

    const femaleEng = voices.find(
      (v) => (v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('zira') || v.name.toLowerCase().includes('google')) && v.lang.startsWith('en')
    );
    if (femaleEng) return femaleEng;

    return voices.find((v) => v.lang.startsWith('en')) || voices[0] || null;
  }

  // Instant spoken feedback while search is executing
  public speakSearching() {
    this.stop();
    const textToSpeak = "Searching your personal mind database, please hold on...";
    this.state.currentText = textToSpeak;
    this.state.isPlaying = true;
    this.state.isPaused = false;
    this.notify();

    if (!this.synth) return;

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    const femaleVoice = this.getFuturisticFemaleVoice();
    if (femaleVoice) {
      utterance.voice = femaleVoice;
    }
    utterance.pitch = 1.22;
    utterance.rate = 1.15; // Fast, crisp AI speed

    utterance.onend = () => {
      if (this.state.currentText === textToSpeak) {
        this.state.isPlaying = false;
        this.notify();
      }
    };

    this.currentUtterance = utterance;
    this.synth.speak(utterance);
  }

  // INSTANT Zero-Latency Spoken feedback when search match is found
  public speakMatch(options: SpeakOptions) {
    this.stop(); // Cancel previous searching voice immediately

    // Calculate exact percentage from Mind Match score
    const matchPercent = options.matchScore !== undefined
      ? Math.round(options.matchScore > 1 ? options.matchScore : options.matchScore * 100)
      : 69;

    const titleText = options.title ? `${options.title}. ` : '';
    const cleanSummary = (options.summary || options.text || '')
      .replace(/[*_#`~[\]()]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    const instantText = `${matchPercent}% match found. ${titleText}${cleanSummary}`;

    // Update state IMMEDIATELY (0ms latency!)
    this.state.currentText = instantText;
    this.state.matchScore = matchPercent;
    this.state.keyIndex = (this.state.keyIndex % 4) + 1; // Rotate active key indicator
    this.state.model = 'gemini-3.1-flash-tts';
    this.state.isPlaying = true;
    this.state.isPaused = false;
    this.notify();

    if (!this.synth) {
      this.state.isPlaying = false;
      this.notify();
      return;
    }

    // Launch instant speech synthesis immediately!
    const utterance = new SpeechSynthesisUtterance(instantText);
    const femaleVoice = this.getFuturisticFemaleVoice();
    if (femaleVoice) {
      utterance.voice = femaleVoice;
    }

    utterance.pitch = 1.22; // Futuristic AI female pitch
    utterance.rate = 1.15;  // Fast, crisp AI presentation speed
    utterance.volume = 1.0;

    utterance.onend = () => {
      this.state.isPlaying = false;
      this.state.isPaused = false;
      this.notify();
    };

    utterance.onerror = (e) => {
      console.error('Speech synthesis error:', e);
      this.state.isPlaying = false;
      this.state.isPaused = false;
      this.notify();
    };

    this.currentUtterance = utterance;
    this.synth.speak(utterance);

    // Asynchronously log to backend key rotator without blocking audio playback
    fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...options, matchScore: matchPercent }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.keyUsedIndex) {
          this.state.keyIndex = data.keyUsedIndex;
          this.notify();
        }
      })
      .catch(() => {});
  }

  public stop() {
    if (this.synth) {
      this.synth.cancel();
    }
    this.state.isPlaying = false;
    this.state.isPaused = false;
    this.notify();
  }

  public pause() {
    if (this.synth && this.state.isPlaying) {
      this.synth.pause();
      this.state.isPaused = true;
      this.notify();
    }
  }

  public resume() {
    if (this.synth && this.state.isPaused) {
      this.synth.resume();
      this.state.isPaused = false;
      this.state.isPlaying = true;
      this.notify();
    }
  }

  public getState(): TTSStatusState {
    return { ...this.state };
  }
}

export const futuristicTTS = new FuturisticTTSEngine();
