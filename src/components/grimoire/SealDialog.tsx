import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { Rune } from './ConsciousnessCore';

export function SealDialog({ title, label, onClose, children, danger = false }: {
  title: string; label: string; onClose: () => void; children: ReactNode; danger?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.showModal();
    return () => { ref.current?.close(); previous?.focus(); };
  }, []);
  return <dialog ref={ref} className={`seal-dialog ${danger ? 'danger-seal' : ''}`} aria-label={title}
    onCancel={event => { event.preventDefault(); close.current(); }}
    onClick={event => { if (event.target === event.currentTarget) close.current(); }}>
    <div className="seal-dialog-inner"><div className="dialog-heading"><div><span className="eyebrow"><Rune kind="command"/>{label}</span><h2>{title}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close dialog"><X size={20}/></button></div>{children}</div>
  </dialog>;
}
