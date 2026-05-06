import { useTranslation } from '../i18n/useTranslation.jsx';
import '../styles/LangToggle.css';

export default function LangToggle() {
  const { lang, setLang } = useTranslation();
  // Show the flag of the language we'd switch TO
  return (
    <button
      className="lang-toggle"
      onClick={() => setLang(lang === 'en' ? 'de' : 'en')}
      title={lang === 'en' ? 'Auf Deutsch wechseln' : 'Switch to English'}
    >
      {lang === 'en' ? '🇩🇪' : '🇬🇧'}
    </button>
  );
}
