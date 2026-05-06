import { useTranslation } from '../i18n/useTranslation.jsx';
import '../styles/LangToggle.css';

function FlagGB() {
  return (
    <svg viewBox="0 0 60 30" className="flag-svg" aria-hidden="true">
      <clipPath id="t"><path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" /></clipPath>
      <path d="M0,0 v30 h60 v-30 z" fill="#012169" />
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
      <path d="M0,0 L60,30 M60,0 L0,30" clipPath="url(#t)" stroke="#C8102E" strokeWidth="4" />
      <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10" />
      <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
    </svg>
  );
}

function FlagDE() {
  return (
    <svg viewBox="0 0 5 3" className="flag-svg" aria-hidden="true">
      <rect width="5" height="3" fill="#000" />
      <rect width="5" height="2" y="1" fill="#DD0000" />
      <rect width="5" height="1" y="2" fill="#FFCE00" />
    </svg>
  );
}

export default function LangToggle() {
  const { lang, setLang } = useTranslation();
  return (
    <button
      className="lang-toggle"
      onClick={() => setLang(lang === 'en' ? 'de' : 'en')}
      title={lang === 'en' ? 'Auf Deutsch wechseln' : 'Switch to English'}
    >
      {lang === 'de' ? <FlagDE /> : <FlagGB />}
    </button>
  );
}
