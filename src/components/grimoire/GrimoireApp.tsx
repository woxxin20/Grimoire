import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowRight, ArrowUpRight, AudioLines, BookOpen, BrainCircuit, Check, ChevronRight, CircleDot, Command, Focus, Hexagon, Maximize2, Mic, Pause, Play, Plus, Search, Settings2, ShieldCheck, Square, Volume2, X } from 'lucide-react';
import { useMind } from '../../context/MindContext';
import { Atmosphere } from './Atmosphere';
import { ConsciousnessCore, Rune } from './ConsciousnessCore';
import { HiveGraph, useHiveData } from './HiveGraph';
import { CaptureDialog, MemoryDetail } from './MemoryDialogs';
import { GrimoirePages, MemoryTile, chapters } from './GrimoirePages';
import { SealDialog } from './SealDialog';
import { useConsciousness, useMotionPreference } from './useConsciousness';
import './grimoire.css';

const navigation = [
  { id: 'core', label: 'Core', icon: CircleDot }, { id: 'grimoire', label: 'Grimoire', icon: BookOpen },
  { id: 'hive', label: 'Hive', icon: Hexagon }, { id: 'memory', label: 'Memory', icon: Rune },
  { id: 'agents', label: 'Agents', icon: BrainCircuit }, { id: 'system', label: 'System', icon: Settings2 },
];
const pageCopy: Record<string, [string, string]> = {
  grimoire: ['The Grimoire', 'Your abilities, bound in one living artifact.'],
  hive: ['The neural Hive', 'Follow the threads that turn information into understanding.'],
  memory: ['The Hive remembers.', 'A living archive of your thoughts, discoveries, and connections.'],
  favorites: ['Sealed in memory.', 'The knowledge you have marked as important.'], recent: ['Recent memories', 'The latest pages in your living archive.'],
  knowledge: ['Threads of knowledge', 'Many fragments. An ever-expanding understanding.'],
  agents: ['The collective', 'Independent perspectives, connected through the Hive.'],
  tools: ['An extension of thought.', 'The instruments of your digital Grimoire.'],
  system: ['Within the system', 'A quieter interface. A clearer connection.'],
};

export function GrimoireApp() {
  const mind = useMind();
  const { memories, searchResponse, searchQuery, searchError, isSearching, activeTab, setActiveTab, setSearchQuery, executeSearch, cancelSearch, setIsQuickCaptureOpen, setIsImportModalOpen, isQuickCaptureOpen, isImportModalOpen, selectedMemory, setSelectedMemory, isCommandPaletteOpen, setIsCommandPaletteOpen, categories, isLoading, memoryError } = mind;
  const [input, setInput] = useState('');
  const [clock, setClock] = useState(new Date());
  const [permission, setPermission] = useState(false);
  const [voiceAllowed, setVoiceAllowed] = useState(false);
  const [focusStarted, setFocusStarted] = useState<number | null>(null);
  const [commandFilter, setCommandFilter] = useState('');
  const [contrast, setContrast] = useState(() => localStorage.getItem('grimoire-contrast') === 'high');
  const inputRef = useRef<HTMLInputElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const { motion, reduced, toggle: toggleMotion } = useMotionPreference();
  const { graph, connected } = useHiveData(memories.length);
  const page = activeTab === 'mind' ? 'core' : activeTab === 'graph' ? 'hive' : activeTab === 'settings' ? 'system' : activeTab === 'multiverse' ? 'agents' : activeTab;

  const navigate = (destination: string) => {
    setIsCommandPaletteOpen(false);
    setFocusStarted(null);
    if (destination === 'commands') { setActiveTab('mind'); requestAnimationFrame(() => inputRef.current?.focus()); return; }
    setActiveTab(destination === 'core' ? 'mind' : destination);
    requestAnimationFrame(() => headingRef.current?.focus());
  };
  const submitCommand = (text: string) => {
    const clean = text.trim();
    if (!clean) return;
    const direct: Record<string, string> = { 'open memory': 'memory', 'show memory': 'memory', 'open hive': 'hive', 'show hive': 'hive', 'open grimoire': 'grimoire', 'open agents': 'agents', 'open system': 'system' };
    if (direct[clean.toLowerCase()]) { navigate(direct[clean.toLowerCase()]); setInput(''); return; }
    if (/^(new memory|add memory|remember)$/i.test(clean)) { setIsQuickCaptureOpen(true); return; }
    if (/^(focus|focus mode)$/i.test(clean)) { setFocusStarted(Date.now()); return; }
    setSearchQuery(clean);
    void executeSearch(clean);
  };
  const voice = useConsciousness(isSearching, searchError, text => { setInput(text); submitCommand(text); });
  const interrupt = () => { voice.stop(); cancelSearch(); };
  const activateVoice = () => {
    if (voice.listening || voice.speaking) { voice.stop(); return; }
    if (isSearching) { cancelSearch(); return; }
    if (voiceAllowed) voice.startListening(); else setPermission(true);
  };
  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setIsCommandPaletteOpen(true); }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'n') { event.preventDefault(); setIsQuickCaptureOpen(true); }
      if (event.key === 'Escape') { voice.stop(); cancelSearch(); setFocusStarted(null); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [voice.stop, cancelSearch, setIsCommandPaletteOpen, setIsQuickCaptureOpen]);
  useEffect(() => {
    const hidden = () => document.documentElement.classList.toggle('grimoire-hidden', document.hidden);
    document.addEventListener('visibilitychange', hidden);
    return () => { document.removeEventListener('visibilitychange', hidden); document.documentElement.classList.remove('grimoire-hidden'); };
  }, []);
  const toggleContrast = () => setContrast(previous => { localStorage.setItem('grimoire-contrast', previous ? 'normal' : 'high'); return !previous; });
  const onSubmit = (event: FormEvent) => { event.preventDefault(); voice.stop(); submitCommand(input); };
  const resultCount = searchResponse?.total_results || 0;
  const resultMemories = searchResponse ? Array.from(new Map([...(searchResponse.primary_match ? [searchResponse.primary_match] : []), ...searchResponse.strong_matches, ...searchResponse.connected_memories, ...searchResponse.possible_matches].map(memory => [memory.id, memory])).values()) : [];
  const stateLabel = { awakening: 'AWAKENING', aware: 'AWARE', listening: 'LISTENING', reasoning: 'REASONING', speaking: 'SPEAKING', fault: 'COGNITIVE FAULT' }[voice.state];
  const primaryResponse = searchError ? 'A connection was interrupted.' : isSearching ? 'Following the threads of your thought.' : voice.listening ? 'I’m listening.' : voice.speaking ? 'A thought, given a voice.' : searchResponse ? resultCount ? `${resultCount} ${resultCount === 1 ? 'memory' : 'memories'} brought to light.` : 'This thought is not yet in the archive.' : 'A quiet mind. Infinite possibilities.';
  const focusSeconds = focusStarted ? Math.max(0, Math.floor((clock.getTime() - focusStarted) / 1000)) : 0;
  const paletteActions = [{ label: 'Return to consciousness', detail: 'Core', action: () => navigate('core') }, ...chapters.map(chapter => ({ label: chapter.name, detail: chapter.description, action: () => navigate(chapter.id) })), { label: 'Explore the neural Hive', detail: 'Knowledge graph', action: () => navigate('hive') }, { label: 'Preserve a new memory', detail: '⌘ N', action: () => setIsQuickCaptureOpen(true) }, { label: 'Import memories', detail: 'JSON collection', action: () => setIsImportModalOpen(true) }, { label: 'Enter focus mode', detail: 'A quieter space', action: () => { navigate('core'); setFocusStarted(Date.now()); } }];

  return <div className={`grimoire-app ${motion ? '' : 'motion-paused'} ${contrast ? 'high-contrast' : ''} ${focusStarted ? 'focus-mode' : ''}`}>
    <a className="skip-link" href="#main-content">Skip to main content</a>
    <Atmosphere motion={motion}/>
    <header className="app-header">
      <button className="wordmark" aria-label="Grimoire Hive home" onClick={() => navigate('core')}><Rune/><span>GRIMOIRE <i>//</i> <strong>HIVE</strong><small>A SENTIENT COMPUTATIONAL GRIMOIRE</small></span></button>
      <div className={`header-status ${connected === false ? 'is-local' : ''}`}><span className="status-dot"/>{connected === null ? 'ESTABLISHING CONNECTION' : connected ? 'NEURAL LINK ESTABLISHED' : 'LOCAL INTERFACE ACTIVE'}</div>
      <div className="header-actions"><time className="system-clock">{clock.toLocaleTimeString('en-GB')}<span>LOCAL TIME</span></time><div className="header-divider"/><button className="icon-button motion-button" aria-label={motion ? 'Pause ambient motion' : 'Resume ambient motion'} disabled={reduced} onClick={toggleMotion}>{motion ? <Pause size={16}/> : <Play size={16}/>}</button><button className="profile-seal" onClick={() => navigate('system')} aria-label="Open system preferences">G</button></div>
    </header>

    <div className="app-workspace">
      <aside className="grimoire-rail" aria-label="Grimoire chapters"><div className="rail-heading"><span className="eyebrow">THE GRIMOIRE</span><span className="folio-index">01 — 06</span></div>
        <nav className="chapter-navigation">{chapters.map(chapter => { const Icon = chapter.icon; return <button key={chapter.id} aria-current={(page === chapter.id || (chapter.id === 'commands' && page === 'core')) ? 'page' : undefined} onClick={() => navigate(chapter.id)}><Icon size={18} strokeWidth={1.25} aria-hidden="true"/><span>{chapter.name}</span>{chapter.id === 'memory' ? <small>{memories.length.toString().padStart(2, '0')}</small> : <span className="chapter-arrow"><ChevronRight size={13}/></span>}</button>; })}</nav>
        <button className="open-grimoire" onClick={() => navigate('grimoire')}><BookOpen size={15}/>Open the Grimoire<ArrowUpRight size={13}/></button>
        <div className="rail-divider"><span/>◇<span/></div>
        <div className="inscription-card"><Rune kind="memory"/><span className="eyebrow gold">LEAVE A TRACE</span><h3>Every thought<br/>is a beginning.</h3><p>Give it a place<br/>in your Grimoire.</p><button onClick={() => setIsQuickCaptureOpen(true)}><Plus size={14}/>New memory</button></div>
        <div className="rail-bottom"><div className="seal-illustration" aria-hidden="true"><Rune/><span/></div><p>Ancient wisdom.<br/><span>Evolving intelligence.</span></p><span className="edition-label">GRIMOIRE OS · VOL. 01</span></div>
      </aside>

      <main id="main-content" className={`main-content ${page === 'core' ? 'core-view' : 'page-view'}`} tabIndex={-1}>
        {page === 'core' ? <>
          <div className="core-heading"><div><span className="eyebrow">CONSCIOUSNESS / 001</span><h1 ref={headingRef} tabIndex={-1}>The intelligence within.</h1></div><button className="focus-control" aria-pressed={Boolean(focusStarted)} onClick={() => setFocusStarted(previous => previous ? null : Date.now())}><Focus size={15}/>{focusStarted ? 'Exit focus' : 'Focus mode'}</button></div>
          <div className="core-stage"><div className="stage-topline"><span className="tiny-diamond"/><span>NEURO-GRIMOIRE CORE</span><span className="tiny-diamond"/></div><ConsciousnessCore state={voice.state} onActivate={activateVoice} onCommands={() => setIsCommandPaletteOpen(true)} onInterrupt={interrupt}/>
            <div className={`core-identity state-${voice.state}`}><span className="entity-name">JARVIS</span><div className="awareness-label" role="status"><span/>{stateLabel}<span/></div><p>{primaryResponse}</p>{focusStarted && <time className="focus-timer">{String(Math.floor(focusSeconds / 60)).padStart(2, '0')}:{String(focusSeconds % 60).padStart(2, '0')}</time>}</div>
            {isSearching && <div className="reasoning-path" role="status"><span><Check size={12}/>Command received</span><i/><span className="violet">Retrieving knowledge</span><i/><button onClick={cancelSearch}>Cancel <X size={12}/></button></div>}
            {searchError && <div className="core-error" role="alert">{searchError}<button onClick={() => submitCommand(input)}>Retry</button><button onClick={() => setSearchQuery('')}>Dismiss</button></div>}
            {voice.voiceError && <div className="core-error" role="alert">{voice.voiceError}<button onClick={voice.clearVoiceError}>Dismiss</button></div>}
          </div>
          <div className="command-area"><form className={`command-rune ${voice.listening ? 'is-listening' : ''}`} onSubmit={onSubmit}><Rune kind="command"/><label className="sr-only" htmlFor="command-input">Search memories or enter a command</label><input ref={inputRef} id="command-input" autoComplete="off" placeholder={voice.listening ? 'Listening to your intention…' : 'Speak an intention. Or write one.'} value={input} onChange={event => setInput(event.target.value)}/>{input && <button type="button" className="clear-command" aria-label="Clear command and results" onClick={() => { setInput(''); setSearchQuery(''); }}><X size={15}/></button>}<span className="command-divider"/><button type="button" className={`voice-button ${voice.listening ? 'active' : ''}`} aria-label={voice.listening ? 'Stop listening' : 'Start voice command'} onClick={activateVoice}>{voice.listening ? <Square size={16}/> : <Mic size={18}/>}</button><button className="send-command" type="submit" disabled={!input.trim() || isSearching} aria-label="Send command"><ArrowRight size={17}/></button></form>
            <div className="command-hint"><span><span className="status-dot"/> {voice.listening ? 'RECEIVING YOUR VOICE' : 'READY WHEN YOU ARE'}</span><button onClick={() => setIsCommandPaletteOpen(true)}><kbd>⌘ K</kbd> All commands</button></div>
            {!searchResponse && !isSearching && <div className="suggestion-chips"><button onClick={() => navigate('memory')}><Rune kind="memory"/>Recall a memory</button><button onClick={() => navigate('hive')}><Hexagon size={13}/>Explore the Hive</button><button onClick={() => setIsQuickCaptureOpen(true)}><Plus size={14}/>Preserve a thought</button></div>}
            {searchResponse && <section className="command-results" aria-label="Search results"><div className="section-label"><span>DIVINATION COMPLETE · {resultCount} FOUND</span><button className="text-action" aria-label="Read search result aloud" onClick={() => voice.speak(searchResponse.primary_match?.summary || primaryResponse)}><Volume2 size={15}/>Read aloud</button></div>{resultMemories.slice(0, 8).map(memory => <MemoryTile key={memory.id} memory={memory} compact/>)}{!resultCount && <p>Try a different phrase, or preserve this thought as a new memory.</p>}{resultMemories.length > 8 && <p>{resultMemories.length - 8} more related memories. Refine your command to narrow the results.</p>}</section>}
          </div>
          <div className="core-footnote"><span/> <Rune kind="command"/> YOUR THOUGHTS, CONNECTED. YOUR WORLD, UNDERSTOOD. <span/></div>
        </> : <><header className="page-heading"><span className="eyebrow">GRIMOIRE / {page.toUpperCase()}</span><div><h1 ref={headingRef} tabIndex={-1}>{pageCopy[page]?.[0] || 'The Grimoire'}</h1><button className="icon-button" aria-label="Return to core" onClick={() => navigate('core')}><X size={20}/></button></div><p>{pageCopy[page]?.[1]}</p></header>{page === 'hive' ? <HiveGraph graph={graph} motion={motion} active={isSearching} onSelect={mind.selectMemoryById}/> : <GrimoirePages page={page} navigate={navigate} motion={motion} toggleMotion={toggleMotion} reduced={reduced} contrast={contrast} toggleContrast={toggleContrast} connected={connected}/>}</>}
      </main>

      {page === 'core' && <aside className="context-rail" aria-label="Hive activity and recent memories"><section className="hive-preview"><div className="section-label"><span><Hexagon size={14}/>NEURAL HIVE</span><span className={`live-label ${connected ? '' : 'gold'}`}><span className="status-dot"/>{connected === null ? 'LINKING' : connected ? 'CONNECTED' : 'OFFLINE'}</span></div><button className="hive-preview-link" aria-label="Explore the neural Hive" onClick={() => navigate('hive')}><HiveGraph graph={graph} motion={motion} active={isSearching} compact/><Maximize2 className="expand-hive" size={14}/></button><div className="hive-counts"><div><strong>{connected === false ? '—' : graph.nodes.length.toLocaleString()}</strong><span>MAPPED NODES</span></div><div><strong>{connected === false ? '—' : graph.edges.length.toLocaleString()}</strong><span>CONNECTIONS</span></div></div><div className="hive-caption"><span className="status-dot"/>{connected ? 'A shared, evolving understanding.' : 'Awaiting a connection to the archive.'}</div></section>
        <section className="recent-memories"><div className="section-label"><span><Rune kind="memory"/>MEMORY ECHOES</span><button aria-label="View all memories" onClick={() => navigate('memory')}><ArrowUpRight size={16}/></button></div>{isLoading ? <p className="quiet-status">Reaching into the archive…</p> : memories.length ? memories.slice(0, 3).map(memory => <MemoryTile key={memory.id} memory={memory} compact/>) : <div className="empty-echo"><Rune kind="memory"/><h3>{memoryError ? 'The archive is out of reach.' : 'The first page is yours.'}</h3><p>{memoryError ? 'Your memories will appear when the service reconnects.' : 'Ideas become memories. Memories become understanding.'}</p><button className="text-action gold" onClick={() => memoryError ? mind.fetchMemories() : setIsQuickCaptureOpen(true)}>{memoryError ? 'Try reconnecting' : 'Inscribe a memory'}<ArrowUpRight size={14}/></button></div>}</section>
        <div className="context-footer"><ShieldCheck size={15}/><span>YOUR KNOWLEDGE. YOUR CONTROL.</span></div>
      </aside>}
    </div>

    <footer className="bottom-bar"><div className={`bottom-awareness state-${voice.state}`}><span className="status-dot"/>{stateLabel}<span className="bottom-divider"/> <span className="muted">{connected ? 'HIVE CONNECTED' : 'LOCAL INTERFACE'}</span></div><nav className="bottom-navigation" aria-label="Main navigation">{navigation.map(item => { const Icon = item.icon; return <button key={item.id} onClick={() => navigate(item.id)} aria-current={page === item.id ? 'page' : undefined}><Icon className="nav-icon"/><span>{item.label}</span></button>; })}</nav><button className="shortcut-button" aria-label="Open command palette" onClick={() => setIsCommandPaletteOpen(true)}><Command size={13}/><span>K</span></button></footer>

    {isQuickCaptureOpen && <CaptureDialog onClose={() => setIsQuickCaptureOpen(false)}/>}
    {isImportModalOpen && <CaptureDialog importing onClose={() => setIsImportModalOpen(false)}/>}
    {selectedMemory && <MemoryDetail key={selectedMemory.id} onClose={() => setSelectedMemory(null)}/>}
    {permission && <SealDialog title="Give your intention a voice." label="MICROPHONE PERMISSION SEAL" onClose={() => setPermission(false)}><div className="permission-art"><Mic size={35}/></div><p className="dialog-description">JARVIS uses your microphone only when you activate it. Your browser may send audio to its speech recognition service. You can always type instead.</p>{!voice.voiceSupported && <p className="inline-error">{voice.voiceUnavailableReason}</p>}<div className="dialog-actions"><button className="quiet-button" onClick={() => { setPermission(false); requestAnimationFrame(() => inputRef.current?.focus()); }}>Use text</button><button className="primary-button" disabled={!voice.voiceSupported} onClick={() => { setVoiceAllowed(true); setPermission(false); voice.startListening(); }}><Mic size={16}/>Allow microphone</button></div></SealDialog>}
    {isCommandPaletteOpen && <SealDialog title="What is your intention?" label="COMMAND GRIMOIRE" onClose={() => setIsCommandPaletteOpen(false)}><label className="palette-search"><Search size={18}/><input aria-label="Search commands" autoFocus placeholder="Find a command…" value={commandFilter} onChange={event => setCommandFilter(event.target.value)}/><kbd>ESC</kbd></label><div className="palette-actions">{paletteActions.filter(action => `${action.label} ${action.detail}`.toLowerCase().includes(commandFilter.toLowerCase())).map(action => <button key={action.label} onClick={() => { setIsCommandPaletteOpen(false); setCommandFilter(''); action.action(); }}><Rune kind="command"/><span>{action.label}<small>{action.detail}</small></span><ArrowUpRight size={15}/></button>)}{!paletteActions.some(action => `${action.label} ${action.detail}`.toLowerCase().includes(commandFilter.toLowerCase())) && <p className="quiet-status">No matching command. Try “memory” or “Hive”.</p>}</div></SealDialog>}
  </div>;
}
