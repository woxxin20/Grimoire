import { useEffect, useMemo, useRef, useState } from 'react';
import { Minus, Plus, RotateCcw, Network } from 'lucide-react';
import type { GraphVisualizationData } from '../../types/memory';

export function useHiveData(revision: number) {
  const [graph, setGraph] = useState<GraphVisualizationData>({ nodes: [], edges: [] });
  const [connected, setConnected] = useState<boolean | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    const refresh = async () => {
      try {
        const response = await fetch('/api/graph?limit=500', { signal: controller.signal });
        if (!response.ok) throw new Error('Hive unavailable');
        const data: GraphVisualizationData = await response.json();
        if (!Array.isArray(data.nodes) || !Array.isArray(data.edges)) throw new Error('Invalid graph');
        setGraph(data);
        setConnected(true);
      } catch { if (!controller.signal.aborted) setConnected(false); }
    };
    void refresh();
    const timer = window.setInterval(() => { if (!document.hidden) void refresh(); }, 30000);
    return () => { controller.abort(); window.clearInterval(timer); };
  }, [revision]);
  return { graph, connected };
}

const hash = (text: string) => Array.from(text).reduce((value, character) => Math.imul(value ^ character.charCodeAt(0), 16777619) >>> 0, 2166136261);

export function HiveGraph({ graph, motion, active = false, compact = false, onSelect }: {
  graph: GraphVisualizationData; motion: boolean; active?: boolean; compact?: boolean; onSelect?: (id: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointsRef = useRef<Array<{ id: string; x: number; y: number; type: string }>>([]);
  const [zoom, setZoom] = useState(1);
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const visible = useMemo(() => graph.nodes.filter(node => !filter || node.label.toLowerCase().includes(filter.toLowerCase())), [graph.nodes, filter]);
  const selectedNode = graph.nodes.find(node => node.id === selected);
  const selectedEdges = graph.edges.filter(edge => edge.source === selected || edge.target === selected);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    let frame = 0;
    let width = 0;
    let height = 0;
    let last = 0;
    const categories = [...new Set(graph.nodes.map(node => node.category || node.type))];
    const positions = graph.nodes.slice(0, compact ? 120 : 500).map(node => {
      const seed = hash(node.id);
      const cluster = categories.indexOf(node.category || node.type);
      const angle = cluster / Math.max(categories.length, 1) * Math.PI * 2;
      const offset = (seed % 628) / 100;
      const radius = node.type === 'category' ? .015 : .06 + Math.sqrt(((seed >>> 8) % 100) / 100) * .21;
      return { ...node, px: Math.cos(angle) * .21 + Math.cos(offset) * radius, py: Math.sin(angle) * .19 + Math.sin(offset) * radius };
    });
    const matching = new Set(visible.map(node => node.id));
    const draw = (time: number) => {
      if (time - last >= 32 || !motion) {
        ctx.clearRect(0, 0, width, height);
        const bounds = positions.reduce((range, point) => ({ minX: Math.min(range.minX, point.px), maxX: Math.max(range.maxX, point.px), minY: Math.min(range.minY, point.py), maxY: Math.max(range.maxY, point.py) }), { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });
        const padding = compact ? 28 : 90;
        const scale = Math.min((width - padding) / Math.max(bounds.maxX - bounds.minX, .2), (height - padding) / Math.max(bounds.maxY - bounds.minY, .2)) * zoom;
        const centerX = (bounds.minX + bounds.maxX) / 2;
        const centerY = (bounds.minY + bounds.maxY) / 2;
        const points = positions.map(node => ({ ...node, x: width / 2 + (node.px - centerX) * scale, y: height / 2 + (node.py - centerY) * scale }));
        pointsRef.current = points;
        const byId = new Map(points.map(node => [node.id, node]));
        graph.edges.forEach((edge, i) => {
          const source = byId.get(edge.source);
          const target = byId.get(edge.target);
          if (!source || !target) return;
          const emphasized = edge.source === selected || edge.target === selected;
          ctx.strokeStyle = emphasized ? 'rgba(215,180,106,.75)' : 'rgba(83,255,176,.15)';
          ctx.lineWidth = emphasized ? 1 : .65;
          ctx.beginPath(); ctx.moveTo(source.x, source.y); ctx.lineTo(target.x, target.y); ctx.stroke();
          if (active && motion && i % 3 === 0) {
            const progress = (time / 2500 + i * .137) % 1;
            ctx.fillStyle = '#9C7CFF';
            ctx.beginPath(); ctx.arc(source.x + (target.x - source.x) * progress, source.y + (target.y - source.y) * progress, 1.5, 0, Math.PI * 2); ctx.fill();
          }
        });
        points.forEach((node, i) => {
          const isSelected = selected === node.id;
          const color = node.type === 'memory' ? '#D7B46A' : '#53FFB0';
          ctx.globalAlpha = matching.has(node.id) ? 1 : .13;
          const radius = (node.type === 'category' ? 3.5 : 2) * (compact ? .8 : 1);
          ctx.fillStyle = color;
          ctx.beginPath(); ctx.arc(node.x, node.y, radius, 0, Math.PI * 2); ctx.fill();
          if (isSelected || node.type === 'category') {
            ctx.strokeStyle = color;
            ctx.globalAlpha *= .3;
            ctx.beginPath(); ctx.arc(node.x, node.y, radius + 5 + (motion ? Math.sin(time / 2000 + i) : 0), 0, Math.PI * 2); ctx.stroke();
            ctx.globalAlpha = 1;
          }
          if (!compact && (isSelected || (node.type === 'category' && zoom > .8))) {
            ctx.fillStyle = '#c3d9cf';
            ctx.font = '11px "IBM Plex Mono", monospace';
            ctx.fillText(node.label.slice(0, 28), node.x + 10, node.y + 4);
          }
        });
        ctx.globalAlpha = 1;
        last = time;
      }
      if (motion && !document.hidden) frame = requestAnimationFrame(draw);
    };
    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      width = bounds.width; height = bounds.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * dpr; canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cancelAnimationFrame(frame); draw(0);
    };
    const visibility = () => { cancelAnimationFrame(frame); if (!document.hidden) draw(0); };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    document.addEventListener('visibilitychange', visibility);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); document.removeEventListener('visibilitychange', visibility); };
  }, [graph, motion, active, compact, selected, zoom, visible]);

  return <div className={`hive-graph ${compact ? 'compact' : ''}`}>
    {!compact && <div className="hive-toolbar"><label className="hive-filter"><Network size={15} aria-hidden="true"/><input aria-label="Search knowledge graph nodes" placeholder="Find a connection…" value={filter} onChange={event => setFilter(event.target.value)}/></label>
      <div className="graph-zoom"><button aria-label="Zoom out" disabled={zoom <= .5} onClick={() => setZoom(z => Math.max(.5, z - .25))}><Minus size={16}/></button><span>{Math.round(zoom * 100)}%</span><button aria-label="Zoom in" disabled={zoom >= 3} onClick={() => setZoom(z => Math.min(3, z + .25))}><Plus size={16}/></button><button aria-label="Reset graph view" onClick={() => { setZoom(1); setSelected(null); setFilter(''); }}><RotateCcw size={15}/></button></div>
    </div>}
    <div className="hive-canvas-wrap">
      <canvas ref={canvasRef} aria-hidden="true" onClick={compact ? undefined : event => {
        const bounds = event.currentTarget.getBoundingClientRect();
        const nearest = pointsRef.current.map(point => ({ ...point, distance: Math.hypot(point.x - (event.clientX - bounds.left), point.y - (event.clientY - bounds.top)) })).sort((a, b) => a.distance - b.distance)[0];
        if (nearest && nearest.distance < 22) setSelected(nearest.id);
      }}/>
      {graph.nodes.length === 0 && <div className="hive-empty"><Network size={compact ? 36 : 56} strokeWidth={.8} aria-hidden="true"/><span>A universe waiting to connect.</span>{!compact && <p>Save a memory to create your first knowledge node.</p>}</div>}
      <span className="graph-corner corner-tl"/><span className="graph-corner corner-br"/>
    </div>
    {!compact && <div className="graph-inspector">
      <div><span className="eyebrow">{selectedNode ? selectedNode.type : 'EXPLORER'}</span><h3>{selectedNode?.label || 'Every thought has a connection.'}</h3><p>{selectedNode ? `${selectedEdges.length} relationships in this view` : `${visible.length} nodes · Select a node to inspect its relationships.`}</p>
        {selectedNode?.type === 'memory' && <button className="text-action gold" onClick={() => onSelect?.(selectedNode.id)}>Open memory ↗</button>}
        {selectedNode && selectedEdges.slice(0, 8).map(edge => <p className="relationship" key={edge.id}>{edge.label.replaceAll('_', ' ').toLowerCase()} → {graph.nodes.find(node => node.id === (edge.source === selected ? edge.target : edge.source))?.label || 'Unknown node'}</p>)}
      </div>
      <label className="node-picker">Explore nodes with your keyboard<select aria-label="Select a knowledge graph node" value={selected || ''} onChange={event => setSelected(event.target.value || null)}><option value="">Select a node</option>{visible.map(node => <option key={node.id} value={node.id}>{node.label}</option>)}</select></label>
    </div>}
  </div>;
}
