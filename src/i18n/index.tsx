import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { MESSAGES } from './messages';
import type { Lang, Messages } from './messages';

export type { Lang, Messages } from './messages';
export { issueText, errorText, zodIssueText } from './issues';
export { localizeDocument } from './example';

const LANG_KEY = 'ghost-rehearsal.lang';

/** English is the default; a saved choice wins. */
export function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved === 'en' || saved === 'zh') return saved;
  } catch { /* storage unavailable */ }
  return 'en';
}

interface I18n { lang: Lang; t: Messages; setLang: (lang: Lang) => void }
const I18nContext = createContext<I18n | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(initialLang);
  const t = MESSAGES[lang];
  useEffect(() => {
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    document.title = t.meta.title;
    document.querySelector('meta[name="description"]')?.setAttribute('content', t.meta.description);
    try { localStorage.setItem(LANG_KEY, lang); } catch { /* storage unavailable */ }
  }, [lang, t]);
  const value = useMemo(() => ({ lang, t, setLang }), [lang, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n must be used inside I18nProvider');
  return value;
}
