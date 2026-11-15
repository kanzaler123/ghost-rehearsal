export function LiveAnnouncer({ message, error }: { message?: string; error?: string }) {
  return <div className="live-announcer sr-only"><span className="live-announcer" role="status" aria-live="polite" aria-atomic="true">{error ? '' : message}</span><span className="live-announcer" role="alert" aria-live="assertive" aria-atomic="true">{error ?? ''}</span></div>;
}
