import React, { useState, useEffect, useRef } from 'react';
import { useMind } from '../../context/MindContext';
import { Sparkles, Play, Send, CheckCircle2, RefreshCw, Cpu, MessageSquare, Terminal } from 'lucide-react';

interface MultiverseMessage {
  id: string;
  agentId: string;
  agentName: string;
  keySlot: number;
  avatar: string;
  color: string;
  role: string;
  badgeLabel: string;
  content: string;
  actionExecuted?: {
    type: string;
    description: string;
    affectedCount: number;
  };
  timestamp: string;
}

interface AgentConfig {
  id: string;
  name: string;
  keySlot: number;
  role: string;
  avatar: string;
  color: string;
  modelName: string;
  badgeLabel: string;
}

export const MultiverseCouncilView: React.FC = () => {
  const { showToast, fetchMemories, fetchCategories, fetchConcepts } = useMind();
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [messages, setMessages] = useState<MultiverseMessage[]>([]);
  const [isMeetingRunning, setIsMeetingRunning] = useState(false);
  const [typingAgent, setTypingAgent] = useState<{ name: string; avatar: string; status: string } | null>(null);
  const [topicInput, setTopicInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Load Agents metadata
  useEffect(() => {
    fetch('/api/multiverse/agents')
      .then((res) => res.json())
      .then((data) => {
        if (data.agents) setAgents(data.agents);
      })
      .catch((e) => console.error('Failed to load multiverse agents:', e));
  }, []);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingAgent]);

  // Stream messages one by one with live typing animation
  const streamAgentMessages = async (rawMessages: MultiverseMessage[]) => {
    const typingSteps = [
      { status: 'Architect Alpha is analyzing topic & graph topology...' },
      { status: 'Classifier Beta is verifying category alignment...' },
      { status: 'Vector Gamma is computing semantic concept links...' },
      { status: 'Auditor Delta is executing live DB maintenance...' },
    ];

    for (let i = 0; i < rawMessages.length; i++) {
      const msg = rawMessages[i];
      setTypingAgent({
        name: msg.agentName,
        avatar: msg.avatar,
        status: typingSteps[i]?.status || `${msg.agentName} is speaking...`,
      });

      await new Promise((resolve) => setTimeout(resolve, 800));

      setMessages((prev) => [...prev, msg]);
      setTypingAgent(null);

      await new Promise((resolve) => setTimeout(resolve, 400));
    }
  };

  // Run live council meeting round
  const runLiveRound = async (customTopic?: string) => {
    setIsMeetingRunning(true);
    showToast('Multiverse Council active! 4 Gemini Key Agents collaborating live...', 'info');

    try {
      const res = await fetch('/api/multiverse/round', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: customTopic || undefined }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.messages && Array.isArray(data.messages)) {
          await streamAgentMessages(data.messages);

          // Refresh database states if any agent executed live fixes
          fetchMemories();
          fetchCategories();
          fetchConcepts();

          showToast('Multiverse live discussion complete! Database synchronized.', 'success');
        }
      } else {
        showToast('Multiverse council round encountered an issue.', 'error');
      }
    } catch (e) {
      console.error('Multiverse round failed:', e);
      showToast('Multiverse council connection error.', 'error');
    } finally {
      setIsMeetingRunning(false);
      setTypingAgent(null);
    }
  };

  const handleSendTopic = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topicInput.trim() || isMeetingRunning) return;
    const topic = topicInput.trim();
    setTopicInput('');
    runLiveRound(topic);
  };

  return (
    <div className="flex flex-col h-full bg-[#07080c] text-slate-100 overflow-hidden select-none">
      {/* Multiverse Header */}
      <div className="p-4 border-b border-slate-800/80 bg-[#0c0e17]/90 backdrop-blur-md flex flex-col gap-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-950/80 border border-indigo-500/40 text-indigo-400 shadow-lg shadow-indigo-500/20">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Multiverse AI Council</span>
                <span className="px-2 py-0.5 text-[10px] font-mono font-semibold bg-indigo-950 text-indigo-300 border border-indigo-500/40 rounded-full">
                  4 Gemini Keys Multi-Agent Arena
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                4 distinct Gemini Key AI Agents managing your brain live, debating category health & fixing the DB in real-time.
              </p>
            </div>
          </div>

          <button
            onClick={() => runLiveRound()}
            disabled={isMeetingRunning}
            className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white rounded-xl text-xs font-mono font-bold border border-indigo-400/40 shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2"
          >
            {isMeetingRunning ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                <span>Agents Discussion Live...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current text-white" />
                <span>Start Live Brain Sync Meeting</span>
              </>
            )}
          </button>
        </div>

        {/* 4 Agent Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {agents.map((agent) => (
            <div
              key={agent.id}
              className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all flex items-start gap-3 shadow-md"
              style={{ borderLeft: `3px solid ${agent.color}` }}
            >
              <div className="text-xl p-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60">
                {agent.avatar}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white truncate">{agent.name}</h4>
                  <span className="px-1.5 py-0.2 text-[9px] font-mono bg-slate-800 text-slate-300 rounded border border-slate-700">
                    Key #{agent.keySlot}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 truncate mt-0.5">{agent.role}</p>
                <div className="flex items-center gap-1 mt-1.5 text-[9px] font-mono text-emerald-400">
                  <Cpu className="w-2.5 h-2.5" />
                  <span>{agent.modelName || 'models/gemini-3.8-flash'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Transcript Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {messages.length === 0 && !typingAgent ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500 space-y-3">
            <div className="w-16 h-16 rounded-full bg-slate-900/80 border border-slate-800 flex items-center justify-center text-2xl">
              🌌
            </div>
            <div className="max-w-md space-y-1">
              <h3 className="text-sm font-bold text-slate-300">No Multiverse Council Logs Yet</h3>
              <p className="text-xs text-slate-400">
                Click <span className="text-indigo-400 font-semibold">"Start Live Brain Sync Meeting"</span> or share a topic below to watch all 4 Gemini Key Agents debate opinions, connect memories, and fix your database live!
              </p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/90 shadow-lg flex flex-col gap-2.5 animate-fade-in"
                style={{ borderLeft: `4px solid ${msg.color}` }}
              >
                {/* Agent Header & Badge */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{msg.avatar}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{msg.agentName}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          (Gemini Key Slot #{msg.keySlot})
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400">{msg.role}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold border"
                      style={{
                        backgroundColor: `${msg.color}15`,
                        borderColor: `${msg.color}40`,
                        color: msg.color,
                      }}
                    >
                      {msg.badgeLabel}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>

                {/* Message Content */}
                <p className="text-xs text-slate-200 leading-relaxed pl-7 font-sans">{msg.content}</p>

                {/* Action Executed Badge (if any DB fix was done) */}
                {msg.actionExecuted && (
                  <div className="ml-7 p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center gap-2 shadow-inner">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <div>
                      <span className="font-bold text-emerald-200">
                        LIVE DB ACTION EXECUTED: [{msg.actionExecuted.type}]
                      </span>
                      <p className="text-[11px] text-emerald-400/90">{msg.actionExecuted.description}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Live Typing Indicator */}
            {typingAgent && (
              <div className="p-3.5 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 flex items-center gap-3 animate-pulse">
                <span className="text-xl">{typingAgent.avatar}</span>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-indigo-300">{typingAgent.name}</span>
                    <span className="flex items-center gap-1 text-[10px] font-mono text-indigo-400">
                      <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                      Live Thinking...
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono">{typingAgent.status}</p>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input Control Bar to Ask Council */}
      <div className="p-3 border-t border-slate-800/80 bg-[#0c0e17]/90 backdrop-blur-md">
        <form onSubmit={handleSendTopic} className="flex items-center gap-2">
          <input
            type="text"
            value={topicInput}
            onChange={(e) => setTopicInput(e.target.value)}
            disabled={isMeetingRunning}
            placeholder="Share a topic with Multiverse Council... (e.g., 'How to connect Gujarati memories with Android Kotlin notes')"
            className="flex-1 px-4 py-2.5 bg-slate-900/90 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 shadow-inner"
          />
          <button
            type="submit"
            disabled={!topicInput.trim() || isMeetingRunning}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-mono font-bold border border-indigo-500 transition-all flex items-center gap-1.5 shadow-md"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send Topic</span>
          </button>
        </form>
      </div>
    </div>
  );
};
