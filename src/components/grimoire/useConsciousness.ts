import { useCallback, useEffect, useRef, useState } from 'react';

export type CoreState = 'awakening' | 'aware' | 'listening' | 'reasoning' | 'speaking' | 'fault';
interface RecognitionResult { results: ArrayLike<ArrayLike<{ transcript: string }>> }
interface Recognition {
  lang: string;
  interimResults: boolean;
  onresult: ((event: RecognitionResult) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  abort: () => void;
}
type VoiceWindow = Window & { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };

export function useMotionPreference() {
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [paused, setPaused] = useState(() => localStorage.getItem('grimoire-motion') === 'paused');
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => setReduced(query.matches);
    query.addEventListener('change', change);
    return () => query.removeEventListener('change', change);
  }, []);
  const toggle = () => setPaused(previous => {
    localStorage.setItem('grimoire-motion', previous ? 'active' : 'paused');
    return !previous;
  });
  return { motion: !reduced && !paused, reduced, toggle };
}

export function useConsciousness(isSearching: boolean, searchError: string | null, onTranscript: (text: string) => void) {
  const [awakened, setAwakened] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const recognition = useRef<Recognition | null>(null);
  const transcriptHandler = useRef(onTranscript);
  transcriptHandler.current = onTranscript;
  // The constructor still exists on an insecure origin (e.g. reaching the Vite
  // host:0.0.0.0 server over a LAN IP), but start() then fails with 'not-allowed'
  // and the browser refuses to grant microphone access at all. Requiring a secure
  // context keeps the UI honest instead of offering a button that cannot work.
  const hasRecognition = Boolean(
    (window as VoiceWindow).SpeechRecognition || (window as VoiceWindow).webkitSpeechRecognition
  );
  const voiceSupported = hasRecognition && window.isSecureContext;
  const voiceUnavailableReason = voiceSupported
    ? null
    : hasRecognition
      ? `Voice needs a secure connection. Open this page at http://localhost:${window.location.port || '3000'} rather than ${window.location.hostname}, or serve it over HTTPS.`
      : 'Voice recognition is not supported by this browser. Text commands are ready.';

  useEffect(() => {
    const timer = window.setTimeout(() => setAwakened(true), 900);
    return () => {
      window.clearTimeout(timer);
      if (recognition.current) {
        recognition.current.onend = null;
        recognition.current.onerror = null;
        recognition.current.onresult = null;
        recognition.current.abort();
      }
      window.speechSynthesis?.cancel();
    };
  }, []);

  const stop = useCallback(() => {
    if (recognition.current) {
      recognition.current.onend = null;
      recognition.current.onerror = null;
      recognition.current.onresult = null;
      recognition.current.abort();
    }
    recognition.current = null;
    window.speechSynthesis?.cancel();
    setListening(false);
    setSpeaking(false);
  }, []);

  const startListening = () => {
    stop();
    setVoiceError(null);
    const Constructor = (window as VoiceWindow).SpeechRecognition || (window as VoiceWindow).webkitSpeechRecognition;
    if (!Constructor) {
      setVoiceError('Voice recognition is unavailable in this browser. Type your command below.');
      return;
    }
    if (!window.isSecureContext) {
      setVoiceError(`Voice needs a secure connection. Open this page at http://localhost:${window.location.port || '3000'} instead of ${window.location.hostname}, or serve it over HTTPS.`);
      return;
    }
    const instance = new Constructor();
    recognition.current = instance;
    instance.lang = navigator.language || 'en-US';
    instance.interimResults = false;
    instance.onresult = event => {
      const text = Array.from(event.results).map(result => result[0].transcript).join(' ');
      setListening(false);
      transcriptHandler.current(text);
    };
    instance.onerror = event => {
      setListening(false);
      if (event.error !== 'aborted') setVoiceError(event.error === 'not-allowed'
        ? 'Microphone access was denied. You can allow it in browser settings or type a command.'
        : 'I could not hear you. Try again, or type your command.');
    };
    instance.onend = () => setListening(false);
    try { instance.start(); setListening(true); }
    catch { setVoiceError('Voice could not start. Type your command instead.'); }
  };

  const speak = (text: string) => {
    stop();
    if (!window.speechSynthesis) { setVoiceError('Speech playback is unavailable in this browser.'); return; }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.92;
    utterance.pitch = 0.85;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const state: CoreState = !awakened ? 'awakening' : searchError ? 'fault' : isSearching ? 'reasoning' : listening ? 'listening' : speaking ? 'speaking' : 'aware';
  return { state, listening, speaking, voiceError, voiceSupported, voiceUnavailableReason, startListening, speak, stop, clearVoiceError: () => setVoiceError(null) };
}
