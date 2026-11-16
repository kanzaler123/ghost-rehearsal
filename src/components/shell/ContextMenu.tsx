import type { ReactNode } from 'react';
import { MoreHorizontal } from 'lucide-react';
export function ContextMenu({ label, children, className = 'context-menu' }: { label: string; children: ReactNode; className?: string }) {
  return <details className={className} onKeyDown={event => {
    if (event.key === 'Escape' && event.currentTarget.open) { event.stopPropagation(); event.preventDefault(); event.currentTarget.open = false; event.currentTarget.querySelector('summary')?.focus(); }
    if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) { event.preventDefault(); event.currentTarget.open = true; }
  }} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false; }}>
    <summary className="icon-btn" aria-label={label} title={label}><MoreHorizontal size={19} aria-hidden="true" /></summary>
    <div className="workspace-menu-body" onMouseDown={event => { if ((event.target as HTMLElement).closest('button')) event.preventDefault(); }} onClick={event => { if ((event.target as HTMLElement).closest('button')) { const details = event.currentTarget.parentElement as HTMLDetailsElement; details.open = false; details.querySelector('summary')?.focus(); } }}>{children}</div>
  </details>;
}
