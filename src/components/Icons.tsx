import type { CSSProperties } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Boxes, ConciergeBell, DoorOpen, Hourglass, LogOut, Merge, Signpost } from 'lucide-react';
import type { Node } from '../schemas';

export const NODE_ICONS: Record<Node['type'], LucideIcon> = {
  entrance: DoorOpen,
  service: ConciergeBell,
  decision: Signpost,
  waiting_area: Hourglass,
  merge: Merge,
  exit: LogOut,
  subflow: Boxes,
};

export const NODE_ENGLISH: Record<Node['type'], string> = {
  entrance: 'Entrance',
  service: 'Service',
  decision: 'Decision',
  waiting_area: 'Waiting Area',
  merge: 'Merge',
  exit: 'Exit',
  subflow: 'Subflow',
};

export function NodeIcon({ type, size = 16 }: { type: Node['type']; size?: number }) {
  const Icon = NODE_ICONS[type];
  return <Icon size={size} strokeWidth={1.8} aria-hidden="true" />;
}

const eye: CSSProperties = { fill: 'var(--ghost-eye, #0b0912)' };

/** Participant ghost. Each rendered ghost is bound to a real participant ID. */
export function Ghost({ small = false, size, className }: { small?: boolean; size?: number; className?: string }) {
  const width = size ?? (small ? 16 : 28);
  return <svg className={className} width={width} height={width * 28 / 24} viewBox="0 0 24 28" aria-hidden="true">
    <path fill="currentColor" d="M3 11.5C3 6.2 7 2 12 2s9 4.2 9 9.5v13.3c0 1.4-1.6 2.1-2.6 1.2l-1.5-1.3a1.6 1.6 0 0 0-2.1 0l-1.4 1.2a2 2 0 0 1-2.8 0l-1.4-1.2a1.6 1.6 0 0 0-2.1 0L5.6 26C4.6 26.9 3 26.2 3 24.8Z" />
    <ellipse style={eye} cx="9" cy="11.6" rx="1.7" ry="2.3" />
    <ellipse style={eye} cx="15" cy="11.6" rx="1.7" ry="2.3" />
    <ellipse style={eye} cx="12" cy="16.4" rx="0.95" ry="1.15" />
  </svg>;
}

export function Bat({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 64 26" aria-hidden="true">
    <path fill="currentColor" d="M32 9 30 4l-.5 4.5C24 6 14 4 2 6c4 3 6 7 6 11 3-3 7-3 9 0 2-3 6-3 8 1 2-1 4 1 7 6 3-5 5-7 7-6 2-4 6-4 8-1 2-3 6-3 9 0 0-4 2-8 6-11-12-2-22 0-27.5 2.5L34 4Z" />
  </svg>;
}

export function Pumpkin({ size = 32, className }: { size?: number; className?: string }) {
  return <svg className={className} width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
    <path d="M31 17c-3-7 1-12 8-13l2 5c-6 0-8 4-7 8" fill="#a1a86c" />
    <path d="M32 17C8 6-3 30 9 49c5 8 14 10 23 7 9 3 18 1 23-7C67 30 56 6 32 17Z" fill="currentColor" />
    <path d="M25 18c-9 10-10 25-4 35m18-35c9 10 10 25 4 35" fill="none" stroke="#9b431f" strokeWidth="2" opacity=".5" />
    <path d="m16 30 11 4-9 5Zm32 0-11 4 9 5ZM18 44l8 3 2-4 6 1 1 4 11-4c-4 11-22 12-28 0Z" fill="#241018" />
    <path d="m30 39 2-4 3 4Z" fill="#241018" />
  </svg>;
}

/** Decorative night layer behind the canvas. Purely visual; pointer events are disabled. */
export function HauntedBackdrop() {
  return <div className="haunt" aria-hidden="true">
    <div className="haunt-moon" />
    <Bat className="haunt-bat bat-1" />
    <Bat className="haunt-bat bat-2" />
    <Bat className="haunt-bat bat-3" />
    <svg className="haunt-web" viewBox="0 0 180 180" fill="none" stroke="currentColor" aria-hidden="true">
      <path d="M0 0v172M0 0l55 165M0 0l112 133M0 0l155 80M0 0l178 25M0 40q7-9 13-1 6-11 13-8 6-12 10-12 5-14 9-13M0 80q14-16 26-2 13-23 26-16 12-25 20-24 10-28 19-25M0 120q22-24 39-3 19-34 39-24 18-38 30-36 15-42 29-38M0 160q28-32 52-4 26-46 52-32 24-50 40-48 20-56 38-50" />
    </svg>
    <div className="haunt-pumpkins"><Pumpkin size={76} /><Pumpkin size={48} /></div>
    <div className="haunt-fog fog-a" />
    <div className="haunt-fog fog-b" />
    <div className="haunt-vignette" />
  </div>;
}
