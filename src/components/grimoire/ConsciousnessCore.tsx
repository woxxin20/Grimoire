import { useRef } from 'react';
import type { CoreState } from './useConsciousness';

const polar = (r: number, angle: number) => [250 + r * Math.cos(angle), 250 + r * Math.sin(angle)];

export function Rune({ className = '', kind = 'core' }: { className?: string; kind?: 'core' | 'memory' | 'command' | 'hive' }) {
  return <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.25" className={`rune ${className}`} aria-hidden="true">
    {kind === 'core' ? <><path d="M16 2 28 9v14l-12 7L4 23V9Z"/><path d="m16 7 7 9-7 9-7-9 7-9Zm0-5v5m0 18v5M4 9l5 7-5 7m24-14-5 7 5 7"/><circle cx="16" cy="16" r="3"/></>
    : kind === 'memory' ? <><path d="m16 3 4 9 9 4-9 4-4 9-4-9-9-4 9-4 4-9Z"/><path d="M16 9v14M9 16h14"/></>
    : kind === 'hive' ? <><path d="M16 3 28 10v12l-12 7-12-7V10Z"/><path d="m4 10 12 6 12-6M16 16v13m0-26v13M4 22l12-6 12 6"/><circle cx="16" cy="16" r="3"/></>
    : <><path d="m16 3 10 13-10 13L6 16 16 3Z"/><path d="M16 9v14M10 16h12M2 16h4m20 0h4"/></>}
  </svg>;
}

export function ConsciousnessCore({ state, onActivate, onCommands, onInterrupt }: {
  state: CoreState; onActivate: () => void; onCommands: () => void; onInterrupt: () => void;
}) {
  const holdTimer = useRef<number | undefined>(undefined);
  const held = useRef(false);
  const stopHold = () => window.clearTimeout(holdTimer.current);
  return <div className={`consciousness state-${state}`}>
    <div className="core-aura" />
    <span className="core-coordinate coordinate-left">N / 01</span>
    <span className="core-coordinate coordinate-right">∞ / HIVE</span>
    <button className="core-target" aria-label={state === 'listening' ? 'Stop listening' : 'Talk to JARVIS'}
      onClick={() => { if (!held.current) onActivate(); }} onDoubleClick={onInterrupt}
      onPointerDown={event => {
        if (event.button !== 0) return;
        held.current = false;
        holdTimer.current = window.setTimeout(() => { held.current = true; onCommands(); }, 650);
      }} onPointerUp={stopHold} onPointerLeave={stopHold} onPointerCancel={stopHold}
      onContextMenu={event => { event.preventDefault(); onCommands(); }}>
      <svg className="core-sigil" viewBox="0 0 500 500" fill="none" aria-hidden="true">
        <defs>
          <radialGradient id="core-halo"><stop stopColor="currentColor" stopOpacity=".2"/><stop offset=".5" stopColor="currentColor" stopOpacity=".06"/><stop offset="1" stopColor="currentColor" stopOpacity="0"/></radialGradient>
          <linearGradient id="seal-light" x1="0" x2="1" y1="0" y2="1"><stop stopColor="#D7B46A"/><stop offset=".45" stopColor="currentColor"/><stop offset="1" stopColor="currentColor" stopOpacity=".25"/></linearGradient>
          <filter id="core-light"><feGaussianBlur stdDeviation="3"/></filter>
          <path id="rune-orbit" d="M250,250m-188,0a188,188 0 1,1 376,0a188,188 0 1,1 -376,0"/>
        </defs>
        <circle cx="250" cy="250" r="230" fill="url(#core-halo)"/>
        <g className="outer-sigil">
          <circle cx="250" cy="250" r="213" stroke="currentColor" strokeOpacity=".12"/>
          <circle cx="250" cy="250" r="202" stroke="currentColor" strokeOpacity=".35" strokeDasharray="106 30 6 30" strokeWidth=".6"/>
          {Array.from({ length: 96 }, (_, i) => {
            const a = i * Math.PI / 48;
            const [x1, y1] = polar(210, a);
            const [x2, y2] = polar(i % 8 === 0 ? 222 : 215, a);
            return <path key={i} d={`M${x1} ${y1}L${x2} ${y2}`} stroke={i % 8 === 0 ? '#D7B46A' : 'currentColor'} strokeOpacity={i % 8 === 0 ? '.7' : '.22'}/>;
          })}
          <text fill="#D7B46A" fillOpacity=".65" fontSize="10" letterSpacing="8"><textPath href="#rune-orbit">◇ CONSCIOUSNESS · MEMORY · INTELLIGENCE · ∞ · CONSCIOUSNESS · MEMORY · INTELLIGENCE · ∞ ·</textPath></text>
        </g>
        <g className="reasoning-orbit" stroke="url(#seal-light)">
          <circle cx="250" cy="250" r="173" strokeOpacity=".55" strokeWidth=".75"/>
          <circle cx="250" cy="250" r="164" strokeOpacity=".3" strokeDasharray="2 9"/>
          <path d="m250 65 160 277H90L250 65Zm0 370L90 158h320L250 435Z" strokeOpacity=".27" strokeWidth=".65"/>
          <path d="m250 102 148 148-148 148-148-148 148-148Z" strokeOpacity=".25"/>
          {[0, 1, 2, 3, 4, 5].map(i => {
            const [x, y] = polar(173, i * Math.PI / 3);
            return <g key={i}><circle cx={x} cy={y} r="4" fill="#081a14"/><circle cx={x} cy={y} r="2" fill="#D7B46A" stroke="none"/></g>;
          })}
        </g>
        <g className="neural-orbits" stroke="currentColor">
          <ellipse cx="250" cy="250" rx="131" ry="90" strokeOpacity=".36" transform="rotate(-35 250 250)"/>
          <ellipse cx="250" cy="250" rx="131" ry="90" strokeOpacity=".36" transform="rotate(35 250 250)"/>
          <ellipse cx="250" cy="250" rx="131" ry="61" strokeOpacity=".3" transform="rotate(90 250 250)"/>
          <circle cx="250" cy="250" r="118" strokeOpacity=".18" strokeDasharray="3 6"/>
          {Array.from({length: 16}, (_, i) => {
            const angle = i * Math.PI / 8;
            const [x, y] = polar(116, angle);
            const [mx, my] = polar(75 + (i % 3) * 9, angle + .11);
            const [ex, ey] = polar(45, angle);
            return <g key={i}><path d={`M${x} ${y}L${mx} ${my}L${ex} ${ey}`} strokeOpacity=".22" strokeWidth=".7"/><circle cx={mx} cy={my} r="1.7" fill="currentColor" stroke="none"/></g>;
          })}
        </g>
        <g className="core-nucleus">
          <path d="m250 158 62 92-62 92-62-92 62-92Z" stroke="currentColor" strokeWidth="5" opacity=".25" filter="url(#core-light)"/>
          <path d="m250 158 62 92-62 92-62-92 62-92Z" fill="#072017" fillOpacity=".7" stroke="currentColor" strokeWidth="1.4"/>
          <path d="m250 184 42 66-42 66-42-66 42-66Z" stroke="currentColor" strokeOpacity=".7"/>
          <path d="M250 158v184m-62-92h124m-104 0 42-27 42 27-42 27-42-27Z" stroke="currentColor" strokeOpacity=".5"/>
          <circle cx="250" cy="250" r="21" fill="currentColor" opacity=".08"/>
          <circle cx="250" cy="250" r="9" fill="currentColor" opacity=".35" filter="url(#core-light)"/>
          <path d="m250 238 8 12-8 12-8-12 8-12Z" fill="#E9FFF6" stroke="currentColor" strokeWidth="2"/>
        </g>
        <g stroke="#D7B46A" strokeOpacity=".7"><path d="m250 13 5 8-5 8-5-8 5-8ZM245 479l5-8 5 8-5 8-5-8Z"/><path d="M250 32v19m0 398v19M20 250h28m404 0h28" strokeWidth=".7"/></g>
      </svg>
    </button>
    <div className="core-root" aria-hidden="true"><span/><i/><span/></div>
  </div>;
}
