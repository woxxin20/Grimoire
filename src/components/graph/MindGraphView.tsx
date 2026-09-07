import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useMind } from '../../context/MindContext.js';
import { ZoomIn, ZoomOut, RotateCcw, Search, Zap, Maximize2, Sparkles, ChevronRight, ChevronLeft, Target } from 'lucide-react';

interface NodeData {
  id: string;
  label: string;
  type: string;
  category?: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  vx: number;
  vy: number;
  radius: number;
}

interface EdgeData {
  id: string;
  source: string;
  target: string;
  label: string;
  weight: number;
}

export const MindGraphView: React.FC = () => {
  const { searchQuery: globalSearchQuery, searchResponse, selectMemoryById, showToast } = useMind();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [filterQuery, setFilterQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [nodes, setNodes] = useState<NodeData[]>([]);
  const [edges, setEdges] = useState<EdgeData[]>([]);
  const [fps, setFps] = useState(120);
  const [focusIndex, setFocusIndex] = useState(0);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  // Dragging state
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [isDraggingNode, setIsDraggingNode] = useState(false);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const dragNodeStartRef = useRef<{
    mouseX: number;
    mouseY: number;
    dragMovedDist: number;
    initialPositions: Map<string, { x: number; y: number; weight: number }>;
  } | null>(null);

  // Sync global search query if set
  useEffect(() => {
    if (globalSearchQuery && !filterQuery) {
      setFilterQuery(globalSearchQuery);
    }
  }, [globalSearchQuery]);

  // Compute matched nodes based on filterQuery or global search
  const effectiveSearch = (filterQuery || globalSearchQuery || '').trim().toLowerCase();

  const matchedNodes = useMemo(() => {
    if (!effectiveSearch) return [];
    const matched = nodes.filter(
      (n) =>
        n.label.toLowerCase().includes(effectiveSearch) ||
        (n.category && n.category.toLowerCase().includes(effectiveSearch)) ||
        n.type.toLowerCase().includes(effectiveSearch)
    );

    if (searchResponse && searchResponse.primary_match) {
      const pmNode = nodes.find((n) => n.id === searchResponse.primary_match!.id);
      if (pmNode && !matched.some((m) => m.id === pmNode.id)) {
        matched.unshift(pmNode);
      }
    }
    return matched;
  }, [nodes, effectiveSearch, searchResponse]);

  const matchedNodeIds = useMemo(() => new Set(matchedNodes.map((n) => n.id)), [matchedNodes]);

  // Resize canvas dynamically
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleResize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = parent.clientWidth * dpr;
      canvas.height = parent.clientHeight * dpr;
    };

    handleResize();
    const observer = new ResizeObserver(handleResize);
    if (canvas.parentElement) observer.observe(canvas.parentElement);
    return () => observer.disconnect();
  }, []);

  // Compute BFS connected weights for organic cluster dragging
  const getConnectedWeights = useCallback(
    (targetId: string) => {
      const adj = new Map<string, string[]>();
      edges.forEach((e) => {
        if (!adj.has(e.source)) adj.set(e.source, []);
        if (!adj.has(e.target)) adj.set(e.target, []);
        adj.get(e.source)!.push(e.target);
        adj.get(e.target)!.push(e.source);
      });

      const weights = new Map<string, number>();
      weights.set(targetId, 1.0);

      const queue: { id: string; depth: number }[] = [{ id: targetId, depth: 0 }];
      const visited = new Set<string>([targetId]);

      while (queue.length > 0) {
        const { id, depth } = queue.shift()!;
        if (depth >= 2) continue;

        const neighbors = adj.get(id) || [];
        for (const nbr of neighbors) {
          if (!visited.has(nbr)) {
            visited.add(nbr);
            const weight = depth === 0 ? 0.70 : 0.35;
            weights.set(nbr, weight);
            queue.push({ id: nbr, depth: depth + 1 });
          }
        }
      }

      return weights;
    },
    [edges]
  );

  // Fit Graph Perfectly to Viewport
  const fitToView = useCallback(() => {
    if (nodes.length === 0 || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const dpr = window.devicePixelRatio || 1;
    const viewWidth = canvas.width / dpr;
    const viewHeight = canvas.height / dpr;

    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    nodes.forEach((n) => {
      if (n.targetX < minX) minX = n.targetX;
      if (n.targetX > maxX) maxX = n.targetX;
      if (n.targetY < minY) minY = n.targetY;
      if (n.targetY > maxY) maxY = n.targetY;
    });

    const graphWidth = maxX - minX || 600;
    const graphHeight = maxY - minY || 500;
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const newZoom = Math.min(
      1.3,
      Math.max(0.45, Math.min((viewWidth - 180) / graphWidth, (viewHeight - 180) / graphHeight))
    );

    const newPanX = viewWidth / 2 - centerX * newZoom;
    const newPanY = viewHeight / 2 - centerY * newZoom;

    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  }, [nodes]);

  // Zoom and Focus smoothly on a specific node or matched cluster
  const focusOnNode = useCallback(
    (targetNode: NodeData) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      const viewWidth = canvas.width / dpr;
      const viewHeight = canvas.height / dpr;

      const targetZoom = 1.35;
      const targetPanX = viewWidth / 2 - targetNode.targetX * targetZoom;
      const targetPanY = viewHeight / 2 - targetNode.targetY * targetZoom;

      setZoom(targetZoom);
      setPan({ x: targetPanX, y: targetPanY });
    },
    []
  );

  // Auto-Focus when search returns matches
  useEffect(() => {
    if (matchedNodes.length > 0) {
      const idx = focusIndex % matchedNodes.length;
      focusOnNode(matchedNodes[idx]);
    }
  }, [matchedNodes, focusIndex, focusOnNode]);

  // Load Graph Data
  const loadGraphData = useCallback((category?: string | null) => {
    const query = category ? `?category=${encodeURIComponent(category)}&limit=200` : `?limit=200`;
    fetch(`/api/graph${query}`)
      .then((res) => res.json())
      .then((data) => {
        const rawNodes = data.nodes || [];
        const rawEdges = data.edges || [];

        const categories = Array.from(new Set(rawNodes.map((n: any) => n.category || 'General')));
        const clusterCenters: Record<string, { x: number; y: number }> = {};
        const width = 1000;
        const height = 700;

        categories.forEach((cat, idx) => {
          const angle = (idx / Math.max(1, categories.length)) * 2 * Math.PI;
          clusterCenters[cat as string] = {
            x: width / 2 + Math.cos(angle) * 280,
            y: height / 2 + Math.sin(angle) * 200,
          };
        });

        const processedNodes: NodeData[] = rawNodes.map((n: any, idx: number) => {
          const cat = n.category || 'General';
          const center = clusterCenters[cat] || { x: width / 2, y: height / 2 };
          const offsetAngle = (idx % 12) * (Math.PI / 6);
          const offsetDist = 40 + (idx % 4) * 25;
          const initialX = center.x + Math.cos(offsetAngle) * offsetDist;
          const initialY = center.y + Math.sin(offsetAngle) * offsetDist;

          return {
            id: n.id,
            label: n.label || 'Node',
            type: n.type || 'memory',
            category: cat,
            x: initialX,
            y: initialY,
            targetX: initialX,
            targetY: initialY,
            vx: 0,
            vy: 0,
            radius: n.type === 'category' ? 22 : n.type === 'concept' ? 15 : 12,
          };
        });

        setNodes(processedNodes);
        setEdges(rawEdges);
      })
      .catch((e) => console.error('Graph fetch error:', e));
  }, []);

  useEffect(() => {
    loadGraphData(selectedCategory);
  }, [selectedCategory, loadGraphData]);

  // Fast initial physics settlement
  useEffect(() => {
    if (nodes.length === 0 || isDraggingNode) return;

    let stepCount = 0;
    let animId: number;

    const updatePhysics = () => {
      if (stepCount > 50) {
        if (!effectiveSearch) fitToView();
        return;
      }

      setNodes((prevNodes) => {
        const updated = prevNodes.map((n) => ({ ...n }));
        const categories = Array.from(new Set(updated.map((n) => n.category || 'General')));
        const clusterCenters: Record<string, { x: number; y: number }> = {};
        categories.forEach((cat, idx) => {
          const angle = (idx / Math.max(1, categories.length)) * 2 * Math.PI;
          clusterCenters[cat as string] = {
            x: 500 + Math.cos(angle) * 260,
            y: 350 + Math.sin(angle) * 180,
          };
        });

        for (const node of updated) {
          const center = clusterCenters[node.category || 'General'];
          if (center) {
            node.vx += (center.x - node.targetX) * 0.003;
            node.vy += (center.y - node.targetY) * 0.003;
          }
        }

        for (let i = 0; i < updated.length; i++) {
          for (let j = i + 1; j < updated.length; j++) {
            const dx = updated[j].targetX - updated[i].targetX;
            const dy = updated[j].targetY - updated[i].targetY;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const minDist = updated[i].radius + updated[j].radius + 50;
            if (dist < minDist) {
              const force = ((minDist - dist) / dist) * 0.1;
              updated[i].vx -= dx * force;
              updated[i].vy -= dy * force;
              updated[j].vx += dx * force;
              updated[j].vy += dy * force;
            }
          }
        }

        return updated.map((n) => {
          const nextTargetX = n.targetX + n.vx * 0.1;
          const nextTargetY = n.targetY + n.vy * 0.1;
          return {
            ...n,
            targetX: nextTargetX,
            targetY: nextTargetY,
            x: n.x + (nextTargetX - n.x) * 0.25,
            y: n.y + (nextTargetY - n.y) * 0.25,
            vx: n.vx * 0.8,
            vy: n.vy * 0.8,
          };
        });
      });

      stepCount++;
      animId = requestAnimationFrame(updatePhysics);
    };

    animId = requestAnimationFrame(updatePhysics);
    return () => cancelAnimationFrame(animId);
  }, [edges, nodes.length, isDraggingNode, fitToView, effectiveSearch]);

  const getNodeColor = (type: string, category?: string) => {
    if (type === 'category') return '#f59e0b';
    if (category === 'Artificial Intelligence') return '#10b981';
    if (category === 'Information Security') return '#f43f5e';
    if (category === 'Culture & Language') return '#8b5cf6';
    if (type === 'concept') return '#06b6d4';
    return '#6366f1';
  };

  // Main 120 FPS Rendering Loop with Radar Beacons & Energy Beams
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frameCount = 0;
    let lastTime = performance.now();
    let animId: number;

    const activeNodeId = draggedNodeId || hoveredNodeId;
    const isSearchActive = matchedNodeIds.size > 0;

    const render = () => {
      const now = performance.now();
      frameCount++;
      if (now - lastTime >= 1000) {
        setFps(Math.round((frameCount * 1000) / (now - lastTime)));
        frameCount = 0;
        lastTime = now;
      }

      // Smooth position Lerp for all nodes
      nodes.forEach((n) => {
        n.x += (n.targetX - n.x) * 0.3;
        n.y += (n.targetY - n.y) * 0.3;
      });

      const dpr = window.devicePixelRatio || 1;
      const width = canvas.width / dpr;
      const height = canvas.height / dpr;

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      // Background Cyber Grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
      ctx.lineWidth = 1;
      const gridSize = 60 * zoom;
      const startX = (pan.x % gridSize);
      const startY = (pan.y % gridSize);
      for (let x = startX; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = startY; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Apply Pan & Zoom
      ctx.translate(pan.x, pan.y);
      ctx.scale(zoom, zoom);

      // Viewport Culling Bounds
      const viewportLeft = -pan.x / zoom - 100;
      const viewportTop = -pan.y / zoom - 100;
      const viewportRight = (width - pan.x) / zoom + 100;
      const viewportBottom = (height - pan.y) / zoom + 100;

      const visibleNodes = nodes.filter(
        (n) =>
          n.x >= viewportLeft &&
          n.x <= viewportRight &&
          n.y >= viewportTop &&
          n.y <= viewportBottom
      );

      const visibleNodeIds = new Set(visibleNodes.map((n) => n.id));

      // Draw Edges & Flowing Energy Laser Beams
      ctx.lineWidth = 1.2;
      for (const edge of edges) {
        const s = nodes.find((n) => n.id === edge.source);
        const t = nodes.find((n) => n.id === edge.target);
        if (s && t && visibleNodeIds.has(s.id) && visibleNodeIds.has(t.id)) {
          const isHighlighted = activeNodeId && (edge.source === activeNodeId || edge.target === activeNodeId);
          const isMatchedEdge = matchedNodeIds.has(s.id) || matchedNodeIds.has(t.id);

          ctx.beginPath();
          ctx.moveTo(s.x, s.y);
          ctx.lineTo(t.x, t.y);

          if (isMatchedEdge) {
            ctx.strokeStyle = '#06b6d4';
            ctx.lineWidth = 2.5;
            ctx.stroke();

            // Animated laser energy pulses flowing along searched edges
            const flowProgress1 = ((now * 0.002) % 1.0);
            const flowProgress2 = ((now * 0.002 + 0.5) % 1.0);

            [flowProgress1, flowProgress2].forEach((prog) => {
              const px = s.x + (t.x - s.x) * prog;
              const py = s.y + (t.y - s.y) * prog;
              ctx.beginPath();
              ctx.arc(px, py, 3.5, 0, 2 * Math.PI);
              ctx.fillStyle = '#ffffff';
              ctx.shadowColor = '#06b6d4';
              ctx.shadowBlur = 12;
              ctx.fill();
              ctx.shadowBlur = 0;
            });
          } else if (isHighlighted) {
            ctx.strokeStyle = '#818cf8';
            ctx.lineWidth = 3.0;
            ctx.stroke();

            const flowProgress = ((now * 0.0015) % 1.0);
            const particleX = s.x + (t.x - s.x) * flowProgress;
            const particleY = s.y + (t.y - s.y) * flowProgress;
            ctx.beginPath();
            ctx.arc(particleX, particleY, 3.0, 0, 2 * Math.PI);
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = '#818cf8';
            ctx.shadowBlur = 10;
            ctx.fill();
            ctx.shadowBlur = 0;
          } else {
            ctx.strokeStyle = isSearchActive ? 'rgba(99, 102, 241, 0.08)' : 'rgba(99, 102, 241, 0.22)';
            ctx.lineWidth = 1.0;
            ctx.stroke();
          }
        }
      }

      // Draw Nodes with Expanding Radar Waves & Glow Halos
      for (const node of visibleNodes) {
        const isDragged = draggedNodeId === node.id;
        const isHovered = hoveredNodeId === node.id;
        const isMatched = matchedNodeIds.has(node.id);
        const isConnectedToActive =
          activeNodeId &&
          edges.some(
            (e) => (e.source === activeNodeId && e.target === node.id) || (e.target === activeNodeId && e.source === node.id)
          );

        const color = isMatched ? '#06b6d4' : getNodeColor(node.type, node.category);

        // Radar Beam Wave Animation on Matched Nodes
        if (isMatched) {
          const wave1 = ((now * 0.003) % 1.0);
          const wave2 = ((now * 0.003 + 0.5) % 1.0);

          [wave1, wave2].forEach((w) => {
            const waveRadius = node.radius + w * 32;
            const alpha = (1 - w) * 0.7;
            ctx.beginPath();
            ctx.arc(node.x, node.y, waveRadius, 0, 2 * Math.PI);
            ctx.strokeStyle = `rgba(6, 182, 212, ${alpha})`;
            ctx.lineWidth = 2.0;
            ctx.stroke();
          });
        }

        // Breathing pulse ring for active/hovered node
        if (isDragged || isHovered) {
          const pulseRadius = node.radius + 8 + Math.sin(now * 0.008) * 4;
          ctx.beginPath();
          ctx.arc(node.x, node.y, pulseRadius, 0, 2 * Math.PI);
          ctx.fillStyle = isDragged ? 'rgba(99, 102, 241, 0.3)' : 'rgba(255, 255, 255, 0.2)';
          ctx.fill();
        }

        // Render Core Node
        ctx.beginPath();
        const displayRadius = isMatched
          ? node.radius + 6 + Math.sin(now * 0.006) * 2
          : isDragged
          ? node.radius + 5
          : isHovered
          ? node.radius + 3
          : node.radius;

        ctx.arc(node.x, node.y, displayRadius, 0, 2 * Math.PI);

        if (isMatched) {
          ctx.shadowColor = '#06b6d4';
          ctx.shadowBlur = 20;
        }

        ctx.fillStyle = color;
        ctx.fill();
        ctx.shadowBlur = 0; // Reset shadow

        ctx.strokeStyle = isMatched
          ? '#ffffff'
          : isDragged
          ? '#6366f1'
          : isHovered || isConnectedToActive
          ? '#ffffff'
          : 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = isMatched ? 3.0 : isDragged ? 3.5 : isHovered || isConnectedToActive ? 2.5 : 1.2;
        ctx.stroke();

        // Render Label Pills
        if (zoom >= 0.65 || isMatched || isHovered || isDragged || isConnectedToActive) {
          const labelText = node.label.length > 24 ? node.label.substring(0, 22) + '...' : node.label;
          ctx.font = isMatched ? 'bold 11px Inter, sans-serif' : '500 10px Inter, sans-serif';
          const textMetrics = ctx.measureText(labelText);
          const pillWidth = textMetrics.width + 14;
          const pillHeight = 18;
          const pillX = node.x - pillWidth / 2;
          const pillY = node.y + displayRadius + 6;

          ctx.fillStyle = isMatched
            ? 'rgba(6, 182, 212, 0.95)'
            : isDragged
            ? 'rgba(99, 102, 241, 0.95)'
            : 'rgba(10, 11, 16, 0.88)';
          ctx.beginPath();
          ctx.roundRect(pillX, pillY, pillWidth, pillHeight, 5);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.fillText(labelText, node.x, pillY + 12);
        }
      }

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [nodes, edges, zoom, pan, hoveredNodeId, draggedNodeId, matchedNodeIds]);

  // Mouse Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left - pan.x) / zoom;
    const mouseY = (e.clientY - rect.top - pan.y) / zoom;

    const hitNode = nodes.find((n) => {
      const dx = n.x - mouseX;
      const dy = n.y - mouseY;
      return Math.sqrt(dx * dx + dy * dy) <= n.radius + 6;
    });

    if (hitNode) {
      const weights = getConnectedWeights(hitNode.id);
      const initialPositions = new Map<string, { x: number; y: number; weight: number }>();

      nodes.forEach((n) => {
        const weight = weights.get(n.id);
        if (weight !== undefined) {
          initialPositions.set(n.id, { x: n.targetX, y: n.targetY, weight });
        }
      });

      dragNodeStartRef.current = {
        mouseX,
        mouseY,
        dragMovedDist: 0,
        initialPositions,
      };

      setDraggedNodeId(hitNode.id);
      setIsDraggingNode(true);
    } else {
      setIsDraggingCanvas(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left - pan.x) / zoom;
    const mouseY = (e.clientY - rect.top - pan.y) / zoom;

    if (isDraggingNode && dragNodeStartRef.current) {
      const { mouseX: startX, mouseY: startY, initialPositions } = dragNodeStartRef.current;
      const dx = mouseX - startX;
      const dy = mouseY - startY;
      dragNodeStartRef.current.dragMovedDist += Math.abs(dx) + Math.abs(dy);

      setNodes((prevNodes) =>
        prevNodes.map((n) => {
          const init = initialPositions.get(n.id);
          if (init) {
            return {
              ...n,
              targetX: init.x + dx * init.weight,
              targetY: init.y + dy * init.weight,
            };
          }
          return n;
        })
      );
      return;
    }

    if (isDraggingCanvas) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
      return;
    }

    const hovered = nodes.find((n) => {
      const dx = n.x - mouseX;
      const dy = n.y - mouseY;
      return Math.sqrt(dx * dx + dy * dy) <= n.radius + 5;
    });

    setHoveredNodeId(hovered ? hovered.id : null);
  };

  const handleMouseUp = () => {
    setIsDraggingCanvas(false);
    setIsDraggingNode(false);
    setDraggedNodeId(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
    const delta = e.deltaY < 0 ? 1.12 : 0.88;
    setZoom((prev) => Math.min(2.5, Math.max(0.3, prev * delta)));
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (dragNodeStartRef.current && dragNodeStartRef.current.dragMovedDist > 8) {
      dragNodeStartRef.current = null;
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = (e.clientX - rect.left - pan.x) / zoom;
    const clickY = (e.clientY - rect.top - pan.y) / zoom;

    const clickedNode = nodes.find((n) => {
      const dx = n.x - clickX;
      const dy = n.y - clickY;
      return Math.sqrt(dx * dx + dy * dy) <= n.radius + 5;
    });

    if (clickedNode) {
      if (clickedNode.type === 'memory' || clickedNode.id.startsWith('mem_')) {
        selectMemoryById(clickedNode.id);
      } else {
        showToast(`Node: ${clickedNode.label}`, 'info');
      }
    }
  };

  const categories = [
    'Artificial Intelligence',
    'Programming & Web',
    'Android & Kotlin',
    'Information Security',
    'Creative & Music',
    'Culture & Language',
    'Business & Ideas',
  ];

  return (
    <div className="relative w-full h-full bg-[#07080c] overflow-hidden select-none">
      {/* Live Graph Search Matched Banner */}
      {matchedNodes.length > 0 && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 bg-[#0c0d14]/95 border border-cyan-500/50 rounded-2xl px-4 py-2 shadow-2xl backdrop-blur-xl flex items-center gap-3 animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400 animate-spin" style={{ animationDuration: '3s' }} />
            <span className="text-xs font-mono font-bold text-cyan-300">
              LIVE MATCH: {matchedNodes.length} NODES FOUND
            </span>
          </div>

          <div className="flex items-center gap-1 border-l border-slate-800 pl-3">
            <button
              onClick={() => setFocusIndex((i) => (i > 0 ? i - 1 : matchedNodes.length - 1))}
              className="p-1 text-slate-400 hover:text-cyan-300 rounded-lg hover:bg-slate-800 transition"
              title="Previous Match"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-[11px] font-mono text-slate-300">
              {focusIndex + 1} / {matchedNodes.length}
            </span>
            <button
              onClick={() => setFocusIndex((i) => (i + 1) % matchedNodes.length)}
              className="p-1 text-slate-400 hover:text-cyan-300 rounded-lg hover:bg-slate-800 transition"
              title="Next Match"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => {
              setFilterQuery('');
              fitToView();
            }}
            className="text-[10px] font-mono uppercase font-bold text-slate-400 hover:text-rose-400 ml-2"
          >
            Clear
          </button>
        </div>
      )}

      {/* Top Header Controls & Category Filter Pills */}
      <div className="absolute top-4 left-4 z-10 flex flex-wrap items-center gap-2 max-w-3xl">
        <div className="px-2.5 py-1 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-mono text-xs flex items-center gap-1.5 shadow-lg backdrop-blur-md">
          <Zap className="w-3.5 h-3.5 text-emerald-400 fill-current animate-pulse" />
          <span>{fps} FPS</span>
        </div>

        <button
          onClick={() => setSelectedCategory(null)}
          className={`px-3 py-1 rounded-xl text-xs font-mono font-medium border backdrop-blur-md transition-all ${
            selectedCategory === null
              ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-500/20'
              : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:border-slate-700'
          }`}
        >
          Top Nodes ({nodes.length})
        </button>

        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
            className={`px-3 py-1 rounded-xl text-xs font-mono font-medium border backdrop-blur-md transition-all ${
              selectedCategory === cat
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-500/20'
                : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:border-slate-700'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Right Controls Bar & Live Graph Node Search Bar */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        <div className="relative">
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => {
              setFilterQuery(e.target.value);
              setFocusIndex(0);
            }}
            placeholder="Live search graph nodes..."
            className="pl-8 pr-3 py-1.5 bg-slate-900/90 border border-cyan-500/40 focus:border-cyan-400 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none shadow-lg backdrop-blur-md w-60 font-medium transition-all"
          />
          <Search className="w-3.5 h-3.5 text-cyan-400 absolute left-2.5 top-2.5" />
        </div>

        <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 rounded-xl p-1 shadow-lg backdrop-blur-md">
          <button
            onClick={fitToView}
            title="Fit Graph to View"
            className="p-1.5 text-slate-400 hover:text-indigo-400 transition-colors"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.min(2.5, z * 1.2))}
            title="Zoom In"
            className="p-1.5 text-slate-400 hover:text-white transition-colors"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(0.3, z * 0.8))}
            title="Zoom Out"
            className="p-1.5 text-slate-400 hover:text-white transition-colors"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setFilterQuery('');
              fitToView();
              setSelectedCategory(null);
            }}
            title="Reset View"
            className="p-1.5 text-slate-400 hover:text-white transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        onClick={handleCanvasClick}
        className={`w-full h-full ${
          isDraggingNode || isDraggingCanvas
            ? 'cursor-grabbing'
            : hoveredNodeId
            ? 'cursor-grab'
            : 'cursor-crosshair'
        }`}
      />
    </div>
  );
};
