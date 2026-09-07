import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowRight, BrainCircuit, Check, Triangle } from 'lucide-react';
import { Rune } from './ConsciousnessCore';
import { useMind } from '../../context/MindContext';

interface Agent { id: string; name: string; role: string; modelName: string }
interface Message { id: string; agentId: string; agentName: string; role: string; content: string; timestamp: string }

export function AgentCouncil() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [topic, setTopic] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const request = useRef<AbortController | null>(null);
  const { fetchMemories, fetchCategories, fetchConcepts } = useMind();
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/multiverse/agents', { signal: controller.signal }).then(response => {
      if (!response.ok) throw new Error('The agent network is currently unavailable.');
      return response.json();
    }).then(data => setAgents(data.agents || [])).catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'The agent network is unavailable.'); });
    return () => { controller.abort(); request.current?.abort(); };
  }, []);
  const begin = async (event: FormEvent) => {
    event.preventDefault();
    if (running || !topic.trim()) return;
    const controller = new AbortController();
    request.current = controller;
    setRunning(true); setError(''); setMessages([]);
    try {
      const response = await fetch('/api/multiverse/round', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ topic }), signal: controller.signal });
      if (!response.ok) throw new Error('The council could not complete this round. Your topic is still here.');
      const data = await response.json();
      if (controller.signal.aborted) return;
      setMessages(data.messages || []);
      void Promise.all([fetchMemories(), fetchCategories(), fetchConcepts()]);
    } catch (cause) { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Connection interrupted. Try again.'); }
    finally { if (!controller.signal.aborted) setRunning(false); }
  };
  return <section className={`agent-council ${running ? 'council-active' : ''}`}>
    <div className="agent-root"><Rune/><span>JARVIS</span><div/></div>
    <div className="agent-nodes">{agents.map(agent => <div className="agent-node" key={agent.id}><div className="agent-node-seal"><BrainCircuit size={25} strokeWidth={1}/></div><span className="eyebrow">{running ? 'AWAITING RESPONSE' : messages.some(message => message.agentId === agent.id) ? 'RESPONSE RECEIVED' : 'STANDBY'}</span><h3>{agent.name}</h3><p>{agent.role}</p></div>)}</div>
    {error && <p className="inline-error" role="alert">{error}</p>}
    <form className="council-command" onSubmit={begin}><label htmlFor="council-topic">A question for the collective</label><div><input id="council-topic" value={topic} onChange={event => setTopic(event.target.value)} placeholder="What should the council consider?" required disabled={running}/><button className="primary-button" disabled={running || !agents.length || !topic.trim()}><Triangle size={15}/>{running ? 'Council in progress…' : 'Convene council'}<ArrowRight size={15}/></button></div><p>This uses your configured AI providers. The existing council may reclassify uncategorized memories. Results appear when the request completes.</p></form>
    {running && <div className="working-label" role="status">Consulting the collective <span className="thought-dots">· · ·</span></div>}
    {messages.length > 0 && <div className="council-responses"><div className="section-label"><span><Check size={14}/>COUNCIL RESPONSES</span><span>{messages.length} PERSPECTIVES</span></div>{messages.map(message => <article key={message.id}><div><Rune kind="hive"/><span>{message.agentName}</span></div><p>{message.content}</p><small>{message.role}</small></article>)}</div>}
  </section>;
}
