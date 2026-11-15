import { useEffect, useState } from 'react';
function useMedia(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia?.(query)?.matches ?? false);
  useEffect(() => {
    const media = window.matchMedia?.(query);
    if (!media) return;
    const update = () => setMatches(media.matches);
    update(); media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [query]);
  return matches;
}
export const usePrefersReducedMotion = () => useMedia('(prefers-reduced-motion: reduce)');
export const useNarrowScreen = () => useMedia('(max-width: 980px)');
