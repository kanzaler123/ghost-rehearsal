import type { ReactNode } from 'react';
export function ModeActions({ children, unavailable }: { children: ReactNode; unavailable?: string }) {
  return <div className="stage-tools">{children}{unavailable && <span className="mode-unavailable" id="mode-unavailable">{unavailable}</span>}</div>;
}
