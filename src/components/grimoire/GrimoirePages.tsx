import { lazy, Suspense, useState } from 'react';
import { ArrowUpRight, BookOpen, BrainCircuit, CircleDot, Code2, FileText, Layers3, Plus, Search, Settings2, Star, Upload } from 'lucide-react';
import { useMind } from '../../context/MindContext';
import { Rune } from './ConsciousnessCore';
import type { MemoryNode } from '../../types/memory';
import { AgentCouncil } from './AgentCouncil';

const SettingsView = lazy(() => import('../SettingsView').then(module => ({ default: module.SettingsView })));

export const chapters = [
  { id: 'commands', name: 'Commands', description: 'An intention becomes an action.', icon: CircleDot, folio: 'I' },
  { id: 'memory', name: 'Memory', description: 'Everything worth remembering.', icon: Star, folio: 'II' },
  { id: 'knowledge', name: 'Knowledge', description: 'Discover what connects your world.', icon: BookOpen, folio: 'III' },
  { id: 'agents', name: 'Agents', description: 'Many perspectives. One intelligence.', icon: BrainCircuit, folio: 'IV' },
  { id: 'tools', name: 'Tools', description: 'Extend the reach of your mind.', icon: Code2, folio: 'V' },
  { id: 'system', name: 'System', description: 'Tune your connection to the Hive.', icon: Settings2, folio: 'VI' },
];

export function MemoryTile({ memory, compact = false }: { memory: MemoryNode; compact?: boolean }) {
  const { setSelectedMemory, selectMemoryById } = useMind();
  return <button className={`memory-tile ${compact ? 'small' : ''}`} onClick={() => { setSelectedMemory(memory); void selectMemoryById(memory.id); }}>
    <div className="memory-tile-heading"><Rune kind="memory"/><span>{memory.category}</span>{memory.favorite && <Star size={12} fill="currentColor" aria-label="Important memory"/>}<ArrowUpRight size={14} className="memory-open" aria-hidden="true"/></div>
    <h3>{memory.title}</h3>{!compact && <p>{memory.summary || memory.original_content}</p>}
    <div className="memory-tile-footer"><span>{new Date(memory.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span><span>{compact ? 'MEMORY' : `${memory.concepts.length} concepts`}</span></div>
  </button>;
}

export function MemoryLibrary({ favoritesOnly = false }: { favoritesOnly?: boolean }) {
  const { memories, categories, isLoading, memoryError, fetchMemories, setIsQuickCaptureOpen, activeCategory, setActiveCategory } = useMind();
  const [filter, setFilter] = useState('');
  const [important, setImportant] = useState(favoritesOnly);
  const filtered = memories.filter(memory => (!important || memory.favorite) && (!activeCategory || memory.category === activeCategory) && `${memory.title} ${memory.summary} ${memory.original_content}`.toLowerCase().includes(filter.toLowerCase()));
  return <><div className="library-toolbar"><label className="hive-filter"><Search size={16}/><input aria-label="Search saved memories" placeholder="Find something you remember…" value={filter} onChange={event => setFilter(event.target.value)}/></label><button className={`quiet-button ${important ? 'gold' : ''}`} aria-pressed={important} onClick={() => setImportant(value => !value)}><Star size={15}/>Important</button><button className="primary-button" onClick={() => setIsQuickCaptureOpen(true)}><Plus size={16}/>New memory</button></div>
    <div className="category-tabs"><button aria-pressed={!activeCategory} onClick={() => setActiveCategory(null)}>All memories <span>{memories.length}</span></button>{categories.map(category => <button key={category.category} aria-pressed={activeCategory === category.category} onClick={() => setActiveCategory(category.category)}>{category.category}<span>{category.count}</span></button>)}</div>
    {memoryError ? <div className="empty-page"><Rune kind="memory"/><h3>The archive is out of reach.</h3><p>{memoryError}</p><button className="quiet-button" onClick={() => void fetchMemories()}>Reconnect</button></div> : isLoading ? <div className="empty-page" role="status"><Rune kind="memory"/><p>Summoning knowledge · · ·</p></div> : filtered.length ? <div className="memory-grid">{filtered.map(memory => <MemoryTile key={memory.id} memory={memory}/>)}</div> : <div className="empty-page"><Rune kind="memory"/><h3>{memories.length ? 'No memories match this connection.' : 'Every great mind begins with a thought.'}</h3><p>{memories.length ? 'Try another phrase or clear your filters.' : 'This region contains no known memories. Give your Grimoire its first page.'}</p><button className="quiet-button" onClick={() => memories.length ? (setFilter(''), setActiveCategory(null), setImportant(false)) : setIsQuickCaptureOpen(true)}>{memories.length ? 'Clear filters' : 'Create a memory'}<Plus size={15}/></button></div>}
  </>;
}

export function GrimoirePages({ page, navigate, motion, toggleMotion, reduced, contrast, toggleContrast, connected }: {
  page: string; navigate: (page: string) => void; motion: boolean; toggleMotion: () => void; reduced: boolean; contrast: boolean; toggleContrast: () => void; connected: boolean | null;
}) {
  const { categories, concepts, setActiveCategory, setIsQuickCaptureOpen, setIsImportModalOpen } = useMind();
  const [advanced, setAdvanced] = useState(false);
  if (page === 'memory' || page === 'favorites' || page === 'recent') return <MemoryLibrary key={page} favoritesOnly={page === 'favorites'}/>;
  if (page === 'grimoire') return <div className="folio-spread"><div className="folio-intro"><span className="eyebrow gold">THE LIVING CODEX</span><Rune/><h2>Knowledge is the<br/>oldest kind of magic.</h2><p>Open a chapter. Follow a connection.<br/>Give a thought somewhere to live.</p><span className="folio-mark">GRIMOIRE · VOLUME I</span></div><div className="folio-chapters">{chapters.map(chapter => <button key={chapter.id} onClick={() => navigate(chapter.id)}><span className="chapter-number">{chapter.folio}</span><div><h3>{chapter.name}</h3><p>{chapter.description}</p></div><ArrowUpRight size={17}/></button>)}</div></div>;
  if (page === 'knowledge') return <><div className="section-label"><span>KNOWLEDGE CLUSTERS</span><span>{categories.length} CHAPTERS</span></div><div className="capability-grid">{categories.map(category => <button className="capability-card" key={category.category} onClick={() => { setActiveCategory(category.category); navigate('memory'); }}><Layers3 size={25}/><h3>{category.category}</h3><p>{category.count} preserved memories</p><ArrowUpRight size={17}/></button>)}</div>{!categories.length && <div className="empty-page"><BookOpen size={40}/><h3>Knowledge grows from memory.</h3><p>Save your first thought to begin forming categories and concepts.</p><button className="primary-button" onClick={() => setIsQuickCaptureOpen(true)}>Begin a chapter</button></div>}{concepts.length > 0 && <><div className="section-label"><span>THREADS OF THOUGHT</span></div><div className="concept-cloud">{concepts.slice(0, 40).map(concept => <span key={concept.concept}>{concept.concept}<small>{concept.count}</small></span>)}</div></>}</>;
  if (page === 'tools') return <div className="capability-grid"><button className="capability-card" onClick={() => setIsQuickCaptureOpen(true)}><FileText size={28}/><span className="eyebrow">PRESERVATION</span><h3>Inscribe a memory</h3><p>Preserve text, links, code, or a file in its original form.</p><span className="text-action">Open capture <ArrowUpRight size={16}/></span></button><button className="capability-card gold" onClick={() => setIsImportModalOpen(true)}><Upload size={28}/><span className="eyebrow">RESTORATION</span><h3>Import a Grimoire</h3><p>Bring an existing JSON collection into your neural library.</p><span className="text-action">Import memories <ArrowUpRight size={16}/></span></button></div>;
  if (page === 'agents') return <><div className="agent-intro"><Rune kind="hive"/><div><span className="eyebrow">COLLECTIVE INTELLIGENCE</span><h2>Different minds. A shared purpose.</h2><p>Independent consciousness nodes. A council begins only when you start a round.</p></div></div><AgentCouncil/></>;
  if (page === 'system') return <><div className="system-grid"><section className="system-panel"><span className="eyebrow">YOUR INTERFACE</span><h3>Presence, on your terms.</h3><div className="setting-row"><div><span>Living motion</span><small>{reduced ? 'Reduced motion is enabled on your device.' : 'Breathing geometry and quiet neural energy.'}</small></div><button role="switch" aria-label="Living motion" aria-checked={motion} disabled={reduced} className="toggle" onClick={toggleMotion}><span/></button></div><div className="setting-row"><div><span>High contrast</span><small>Stronger text, boundaries, and focus indicators.</small></div><button role="switch" aria-label="High contrast" aria-checked={contrast} className="toggle" onClick={toggleContrast}><span/></button></div></section><section className="system-panel"><span className="eyebrow">CONNECTION</span><h3>Behind the consciousness.</h3><div className="system-line"><span>Memory service</span><strong className={connected ? 'emerald' : 'gold'}>{connected === null ? 'Connecting' : connected ? 'Connected' : 'Unavailable'}</strong></div><div className="system-line"><span>Voice activation</span><strong>On request</strong></div><div className="system-line"><span>Background listening</span><strong>Off</strong></div><div className="system-line"><span>Interface</span><strong>GRIMOIRE // HIVE</strong></div></section></div><button className="quiet-button advanced-toggle" aria-expanded={advanced} onClick={() => setAdvanced(value => !value)}><Settings2 size={16}/>{advanced ? 'Close engine configuration' : 'Open engine configuration'}</button>{advanced && <div className="legacy-surface"><Suspense fallback={<p>Connecting to engine settings…</p>}><SettingsView/></Suspense></div>}</>;
  return null;
}
