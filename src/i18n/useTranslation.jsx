import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { TRANSLATIONS, DEFAULT_LANG, SUPPORTED_LANGS, detectBrowserLang, interpolate } from './translations';

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(() => detectBrowserLang());

  const setLang = useCallback((next) => {
    if (!SUPPORTED_LANGS.includes(next)) return;
    setLangState(next);
    try { localStorage.setItem('lang', next); } catch { /* ignore */ }
  }, []);

  const t = useCallback((key, params) => {
    const dict = TRANSLATIONS[lang] || TRANSLATIONS[DEFAULT_LANG];
    const template = dict[key] ?? TRANSLATIONS[DEFAULT_LANG][key] ?? key;
    return interpolate(template, params);
  }, [lang]);

  const value = useMemo(() => ({ t, lang, setLang }), [t, lang, setLang]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useTranslation must be used within I18nProvider');
  return ctx;
}
