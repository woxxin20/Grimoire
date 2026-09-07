import { useRef, useState, type FormEvent } from 'react';
import { ArrowUpRight, Copy, FileText, Upload, Star, Trash2, Check } from 'lucide-react';
import { useMind } from '../../context/MindContext';
import { SealDialog } from './SealDialog';

export function CaptureDialog({ importing = false, onClose }: { importing?: boolean; onClose: () => void }) {
  const { fetchMemories, fetchCategories, fetchConcepts, showToast } = useMind();
  const [content, setContent] = useState('');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [kind, setKind] = useState<'text' | 'file'>('text');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const errorRef = useRef<HTMLParagraphElement>(null);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setError('');
    try {
      let body: string | FormData;
      if (importing) {
        const parsed: unknown = JSON.parse(content);
        if (!parsed || typeof parsed !== 'object') throw new Error('Paste a JSON object or array of memory records.');
        body = JSON.stringify(Array.isArray(parsed) ? parsed : [parsed]);
      } else if (kind === 'file') {
        if (!file) throw new Error('Choose a file to preserve.');
        if (file.size > 50 * 1024 * 1024) throw new Error('Choose a file smaller than 50 MB.');
        const data = new FormData();
        data.append('file', file);
        data.append('user_notes', notes);
        body = data;
      } else {
        if (!content.trim()) throw new Error('Write a thought to preserve.');
        body = JSON.stringify({ content, user_notes: notes });
      }
      setBusy(true);
      const response = await fetch(importing ? '/api/import' : kind === 'file' ? '/api/upload' : '/api/memories', {
        method: 'POST', headers: body instanceof FormData ? undefined : { 'Content-Type': 'application/json' }, body,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'The memory could not be saved. Try again.');
      await Promise.all([fetchMemories(), fetchCategories(), fetchConcepts()]);
      if (importing && result.errors > 0) {
        setError(`${result.imported} imported · ${result.duplicates} duplicates skipped · ${result.errors} failed. Review your records before retrying.`);
      } else {
        showToast(importing ? `${result.imported} memories imported. ${result.duplicates || 0} duplicates skipped.` : 'Memory preserved. The Hive remembers.', 'success');
        onClose();
      }
    } catch (cause) {
      setError(cause instanceof SyntaxError ? 'The JSON is invalid. Check the syntax and try again.' : cause instanceof Error ? cause.message : 'Unable to reach the memory service. Your input is still here.');
      requestAnimationFrame(() => errorRef.current?.focus());
    } finally { setBusy(false); }
  };
  return <SealDialog title={importing ? 'Summon your memories.' : 'Preserve a thought.'} label={importing ? 'IMPORT GRIMOIRE' : 'INSCRIBE MEMORY'} onClose={() => { if (!busy) onClose(); }}>
    <p className="dialog-description">{importing ? 'Bring an existing JSON collection into your knowledge library.' : 'A note, a link, a fragment of inspiration. Your original words remain untouched.'}</p>
    <form className="seal-form" onSubmit={submit}>
      {!importing && <div className="segmented-control" aria-label="Memory input type"><button type="button" aria-pressed={kind === 'text'} onClick={() => setKind('text')}><FileText size={15}/>Text or link</button><button type="button" aria-pressed={kind === 'file'} onClick={() => setKind('file')}><Upload size={15}/>Upload file</button></div>}
      {kind === 'text' || importing ? <label>{importing ? 'JSON memories' : 'Original content'}<textarea autoFocus rows={7} required value={content} onChange={event => setContent(event.target.value)} placeholder={importing ? '[{"title": "A thought", "summary": "Something worth remembering"}]' : 'What would you like the Hive to remember?'} aria-invalid={Boolean(error)} aria-describedby={error ? 'capture-error' : undefined}/></label>
        : <label className="file-drop"><Upload size={30}/><span>{file?.name || 'Choose a file'}</span><small>Text, code, images, or documents · up to 50 MB</small><input aria-label="Choose memory file" type="file" required onChange={event => setFile(event.target.files?.[0] || null)}/></label>}
      {!importing && <label>A little context <span className="muted">(optional)</span><input value={notes} onChange={event => setNotes(event.target.value)} placeholder="Why is this worth remembering?"/></label>}
      {error && <p id="capture-error" className="inline-error" role="alert" tabIndex={-1} ref={errorRef}>{error}</p>}
      {busy && <p className="working-label" role="status">{importing ? 'Summoning knowledge' : 'Preserving original content'}<span className="thought-dots"> · · ·</span></p>}
      <div className="dialog-actions"><button className="quiet-button" type="button" disabled={busy} onClick={onClose}>Cancel</button><button className="primary-button" type="submit" disabled={busy}><Check size={16}/>{busy ? 'Working…' : importing ? 'Import memories' : 'Seal memory'}</button></div>
    </form>
  </SealDialog>;
}

export function MemoryDetail({ onClose }: { onClose: () => void }) {
  const { selectedMemory: memory, setSelectedMemory, toggleFavorite, fetchMemories, fetchCategories, fetchConcepts, showToast } = useMind();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  if (!memory) return null;
  const remove = async () => {
    setDeleting(true);
    try {
      const response = await fetch(`/api/memories/${encodeURIComponent(memory.id)}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('The memory could not be deleted. Try again.');
      setSelectedMemory(null);
      await Promise.all([fetchMemories(), fetchCategories(), fetchConcepts()]);
      showToast('Memory forgotten.', 'info');
      onClose();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to reach the memory service.'); }
    finally { setDeleting(false); }
  };
  return <SealDialog title={confirmDelete ? 'Break this memory seal?' : memory.title} label={confirmDelete ? 'DESTRUCTIVE COMMAND' : 'MEMORY ARCHIVE'} danger={confirmDelete} onClose={() => { if (!deleting) onClose(); }}>
    {confirmDelete ? <><p className="dialog-description">“{memory.title}” and its relationships will be permanently deleted. This cannot be automatically reversed.</p>{error && <p role="alert" className="inline-error">{error}</p>}<div className="dialog-actions"><button className="quiet-button" disabled={deleting} onClick={() => setConfirmDelete(false)}>Keep memory</button><button className="danger-button" disabled={deleting} onClick={remove}>{deleting ? 'Forgetting…' : 'Confirm deletion'}</button></div></>
      : <><div className="memory-metadata"><span>{memory.category}</span><span>{new Date(memory.created_at).toLocaleDateString()}</span><span>{memory.relationships?.length ?? '—'} connections</span></div>
        <div className="memory-detail-section"><div className="section-label"><span>ORIGINAL CONTENT</span><button className="text-action" onClick={async () => { try { await navigator.clipboard.writeText(memory.original_content); showToast('Original content copied.', 'success'); } catch { showToast('Copy is unavailable. Select and copy the text below.', 'error'); } }}><Copy size={13}/>Copy original</button></div><pre className="original-content">{memory.original_content}</pre></div>
        {memory.summary && <div className="memory-detail-section"><span className="eyebrow gold">AI UNDERSTANDING</span><p>{memory.summary}</p></div>}
        {memory.tags.length > 0 && <div className="memory-tags">{memory.tags.map(tag => <span key={tag}>{tag}</span>)}</div>}
        {memory.source_url && /^https?:\/\//i.test(memory.source_url) && <a className="text-action gold" target="_blank" rel="noreferrer" href={memory.source_url}>Open original source <ArrowUpRight size={15}/></a>}
        <div className="dialog-actions split"><button className="text-action danger" onClick={() => setConfirmDelete(true)}><Trash2 size={15}/>Forget</button><button className="quiet-button" onClick={() => void toggleFavorite(memory.id)}><Star size={16} fill={memory.favorite ? 'currentColor' : 'none'}/>{memory.favorite ? 'Sealed as important' : 'Mark as important'}</button></div></>}
  </SealDialog>;
}
