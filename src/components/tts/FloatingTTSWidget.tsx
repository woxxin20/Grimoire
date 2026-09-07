import React, { useEffect, useState } from 'react';
import { futuristicTTS, TTSStatusState } from '../../services/futuristicTTS';
import { useMind } from '../../context/MindContext';
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  Square,
  Sparkles,
  Radio,
  Sliders,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export const FloatingTTSWidget: React.FC = () => {
  const { searchResponse, selectedMemory } = useMind();
  const [ttsState, setTtsState] = useState<TTSStatusState>(futuristicTTS.getState());
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    const unsubscribe = futuristicTTS.subscribe((newState) => {
      setTtsState(newState);
    });
    return unsubscribe;
  }, []);

  // Handle Automatic TTS readout on Search Completion
  useEffect(() => {
    if (ttsState.autoRead && searchResponse && searchResponse.primary_match) {
      const matchScore = searchResponse.primary_match.mind_match_score ?? 69;
      futuristicTTS.speakMatch({
        matchScore,
        title: searchResponse.primary_match.title,
        summary: searchResponse.primary_match.summary || searchResponse.primary_match.user_notes || searchResponse.primary_match.original_content,
      });
    }
  }, [searchResponse]);

  const handleManualPlay = () => {
    if (ttsState.isPaused) {
      futuristicTTS.resume();
      return;
    }

    if (searchResponse && searchResponse.primary_match) {
      const matchScore = searchResponse.primary_match.mind_match_score ?? 69;
      futuristicTTS.speakMatch({
        matchScore,
        title: searchResponse.primary_match.title,
        summary: searchResponse.primary_match.summary || searchResponse.primary_match.user_notes || searchResponse.primary_match.original_content,
      });
    } else if (selectedMemory) {
      const matchScore = (selectedMemory as any).mind_match_score ?? 95;
      futuristicTTS.speakMatch({
        matchScore,
        title: selectedMemory.title,
        summary: selectedMemory.summary || selectedMemory.user_notes || selectedMemory.original_content,
      });
    } else {
      futuristicTTS.speakMatch({
        matchScore: 69,
        title: 'MIND Knowledge Hub',
        summary: 'Your Personal AI Second Brain is ready. Perform a search to hear live top match readouts.',
      });
    }
  };

  const handlePause = () => {
    futuristicTTS.pause();
  };

  const handleStop = () => {
    futuristicTTS.stop();
  };

  const toggleAutoRead = () => {
    futuristicTTS.setAutoRead(!ttsState.autoRead);
  };

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2 font-sans select-none">
      {/* Expanded Cyber Floating Control Panel */}
      {isExpanded && (
        <div className="w-80 bg-[#0c0d14]/95 dark:bg-[#0c0d14]/95 border border-cyan-500/30 rounded-2xl p-4 shadow-2xl backdrop-blur-xl transition-all duration-300 animate-in slide-in-from-bottom-3 border-glow">
          {/* Panel Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Radio className={`w-4 h-4 ${ttsState.isPlaying ? 'text-cyan-400 animate-pulse' : 'text-slate-400'}`} />
                {ttsState.isPlaying && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                )}
              </div>
              <span className="text-xs font-mono font-bold tracking-wide text-cyan-300 uppercase">
                Gemini 3.1 Flash TTS
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/40 text-cyan-400">
                KEY #{ttsState.keyIndex}
              </span>
              <button
                onClick={() => setIsExpanded(false)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Futuristic Voice & Equalizer Frequency Animation */}
          <div className="bg-slate-950/70 border border-cyan-900/40 rounded-xl p-3 mb-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-300 font-medium">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Futuristic Female AI Accent</span>
              </div>
              <span className="text-[11px] font-mono font-bold text-emerald-400">
                {ttsState.matchScore}% MATCH
              </span>
            </div>

            {/* Audio Waveform Equalizer */}
            <div className="h-8 flex items-center justify-center gap-1 bg-slate-900/60 rounded-lg px-3 py-1">
              {[0.4, 0.9, 0.6, 1.0, 0.7, 0.5, 0.8, 0.3].map((height, i) => (
                <div
                  key={i}
                  className={`w-1 rounded-full transition-all duration-150 ${
                    ttsState.isPlaying && !ttsState.isPaused
                      ? 'bg-gradient-to-t from-cyan-500 to-indigo-400 animate-pulse'
                      : 'bg-slate-700 h-1.5'
                  }`}
                  style={{
                    height: ttsState.isPlaying && !ttsState.isPaused
                      ? `${Math.max(20, height * 100 * (0.6 + Math.sin(Date.now() / 200 + i) * 0.4))}%`
                      : '6px',
                  }}
                />
              ))}
            </div>

            {/* Spoken Text Preview */}
            <p className="text-[11px] text-slate-400 mt-2 line-clamp-2 italic font-mono leading-relaxed">
              {ttsState.currentText ? `"${ttsState.currentText}"` : '"89% match found. Standing by for search input..."'}
            </p>
          </div>

          {/* Control Action Buttons */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              {/* Play / Pause Button */}
              {ttsState.isPlaying && !ttsState.isPaused ? (
                <button
                  onClick={handlePause}
                  title="Pause TTS Speech"
                  className="p-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-900/30 transition-all flex items-center gap-1.5 text-xs font-bold"
                >
                  <Pause className="w-4 h-4" />
                  <span>Pause</span>
                </button>
              ) : (
                <button
                  onClick={handleManualPlay}
                  title="Play / Run TTS Speech Readout"
                  className="p-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white shadow-lg shadow-cyan-900/30 transition-all flex items-center gap-1.5 text-xs font-bold"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>{ttsState.isPaused ? 'Resume' : 'Run TTS'}</span>
                </button>
              )}

              {/* Stop / Silence Button */}
              <button
                onClick={handleStop}
                disabled={!ttsState.isPlaying && !ttsState.isPaused}
                title="Stop / Mute TTS Speech"
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-rose-950 border border-slate-700 hover:border-rose-500/40 text-slate-300 hover:text-rose-200 transition-all disabled:opacity-40 disabled:hover:bg-slate-800 disabled:hover:text-slate-300 flex items-center gap-1 text-xs font-medium"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Stop</span>
              </button>
            </div>

            {/* Auto Read Switch */}
            <button
              onClick={toggleAutoRead}
              title={ttsState.autoRead ? 'Auto-Read Search Results ON' : 'Auto-Read Search Results OFF'}
              className={`px-2.5 py-1.5 rounded-xl text-[11px] font-mono border transition-all flex items-center gap-1.5 ${
                ttsState.autoRead
                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                  : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
              }`}
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>{ttsState.autoRead ? 'AUTO' : 'OFF'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Floating Launcher Button (when collapsed or standing) */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className={`p-3.5 rounded-2xl shadow-2xl backdrop-blur-xl border transition-all duration-300 flex items-center gap-2 font-mono text-xs font-bold ${
            ttsState.isPlaying
              ? 'bg-cyan-950 border-cyan-400 text-cyan-300 shadow-cyan-500/20 animate-pulse'
              : 'bg-[#0c0d14]/90 border-slate-700 text-slate-300 hover:border-cyan-400 hover:text-cyan-300'
          }`}
        >
          <Volume2 className="w-5 h-5 text-cyan-400" />
          <span>TTS READOUT</span>
          {ttsState.isPlaying && <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />}
        </button>
      )}
    </div>
  );
};
