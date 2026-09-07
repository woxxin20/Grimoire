import React, { useEffect, useRef } from 'react';
import { useMind } from '../../context/MindContext';
import { Share2, Zap } from 'lucide-react';

export const NodeConnectionSearchScanner: React.FC = () => {
  const { isSearching } = useMind();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!isSearching) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    // Generated scanner nodes
    const nodeCount = 14;
    const nodes: Array<{ x: number; y: number; vx: number; vy: number; radius: number; color: string }> = [];
    const colors = ['#06b6d4', '#10b981', '#6366f1', '#f59e0b', '#8b5cf6'];

    const width = 360;
    const height = 70;
    canvas.width = width * (window.devicePixelRatio || 1);
    canvas.height = height * (window.devicePixelRatio || 1);

    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        x: Math.random() * (width - 40) + 20,
        y: Math.random() * (height - 30) + 15,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        radius: 4 + Math.random() * 3,
        color: colors[i % colors.length],
      });
    }

    const render = () => {
      const now = performance.now();
      const dpr = window.devicePixelRatio || 1;

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      // Physics update
      nodes.forEach((n) => {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 15 || n.x > width - 15) n.vx *= -1;
        if (n.y < 10 || n.y > height - 10) n.vy *= -1;
      });

      // Draw Connections & Laser Beams
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[j].x - nodes[i].x;
          const dy = nodes[j].y - nodes[i].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 95) {
            const alpha = (1 - dist / 95) * 0.7;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = `rgba(6, 182, 212, ${alpha})`;
            ctx.lineWidth = 1.2;
            ctx.stroke();

            // Energy particle flowing along edge
            const prog = ((now * 0.003 + i * 0.2) % 1.0);
            const px = nodes[i].x + dx * prog;
            const py = nodes[i].y + dy * prog;
            ctx.beginPath();
            ctx.arc(px, py, 2, 0, 2 * Math.PI);
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = '#06b6d4';
            ctx.shadowBlur = 6;
            ctx.fill();
            ctx.shadowBlur = 0;
          }
        }
      }

      // Draw Nodes with radar waves
      nodes.forEach((n) => {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, 2 * Math.PI);
        ctx.fillStyle = n.color;
        ctx.shadowColor = n.color;
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [isSearching]);

  if (!isSearching) return null;

  return (
    <div className="w-full bg-[#090a10]/95 border border-cyan-500/40 rounded-2xl p-4 shadow-2xl backdrop-blur-xl mb-6 flex flex-col md:flex-row items-center justify-between gap-4 animate-in slide-in-from-top-2">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-cyan-950/80 border border-cyan-500/50 shadow-lg shadow-cyan-500/20">
          <Share2 className="w-5 h-5 text-cyan-400 animate-spin" style={{ animationDuration: '4s' }} />
        </div>

        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-300">
              Graph Nodes Connection Scanner
            </h4>
            <span className="px-2 py-0.5 text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-500/40 rounded-full flex items-center gap-1">
              <Zap className="w-2.5 h-2.5 fill-current" />
              Scanning Active Edges
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Resolving memory relationships & connecting knowledge graph nodes live...
          </p>
        </div>
      </div>

      {/* Mini 2D Canvas Visualizer */}
      <div className="relative w-80 h-16 bg-slate-950/80 rounded-xl border border-cyan-900/40 overflow-hidden flex-shrink-0">
        <canvas ref={canvasRef} className="w-full h-full" />
      </div>
    </div>
  );
};
