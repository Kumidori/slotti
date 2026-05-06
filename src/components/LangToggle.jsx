import { useTranslation } from '../i18n/useTranslation.jsx';
import { SUPPORTED_LANGS } from '../i18n/translations';
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

function FlagBG() {
  return (
    <svg viewBox="0 0 5 3" className="flag-svg" aria-hidden="true">
      <rect width="5" height="3" fill="#fff" />
      <rect width="5" height="2" y="1" fill="#00966E" />
      <rect width="5" height="1" y="2" fill="#D62612" />
    </svg>
  );
}

const FLAGS = { en: FlagGB, de: FlagDE, bg: FlagBG };
const TITLES = { en: 'Switch language', de: 'Sprache wechseln', bg: 'Смени езика' };

export default function LangToggle() {
  const { lang, setLang } = useTranslation();
  const Flag = FLAGS[lang] || FlagGB;
  const cycle = () => {
    const i = SUPPORTED_LANGS.indexOf(lang);
    setLang(SUPPORTED_LANGS[(i + 1) % SUPPORTED_LANGS.length]);
  };
  return (
    <button className="lang-toggle" onClick={cycle} title={TITLES[lang]}>
      <Flag />
    </button>
  );
}
