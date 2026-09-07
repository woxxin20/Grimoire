import { useEffect, useRef } from 'react';

export function Atmosphere({ motion }: { motion: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    let frame = 0;
    let width = 0;
    let height = 0;
    let t = 0;
    let last = 0;
    const particles = Array.from({length: 95}, (_, i) => ({ x: ((i * 137.508) % 997) / 997, y: ((i * 73.321) % 991) / 991, size: i % 5 === 0 ? 1.2 : .65 }));
    const draw = (time: number) => {
      if (time - last > 32 || !motion) {
        t += motion ? .002 : 0;
        ctx.clearRect(0, 0, width, height);
        particles.forEach((p, i) => {
          ctx.fillStyle = i % 7 === 0 ? 'rgba(215,180,106,.38)' : 'rgba(83,255,176,.24)';
          ctx.beginPath();
          ctx.arc(p.x * width + Math.sin(t + i) * 7, ((p.y * height - t * 8) % height + height) % height, p.size, 0, Math.PI * 2);
          ctx.fill();
        });
        last = time;
      }
      if (motion && !document.hidden) frame = requestAnimationFrame(draw);
    };
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cancelAnimationFrame(frame);
      draw(0);
    };
    const visibility = () => { cancelAnimationFrame(frame); if (!document.hidden) draw(0); };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    document.addEventListener('visibilitychange', visibility);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); document.removeEventListener('visibilitychange', visibility); };
  }, [motion]);
  return <canvas ref={ref} className="atmosphere" aria-hidden="true"/>;
}
