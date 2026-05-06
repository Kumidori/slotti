import { useTranslation } from '../i18n/useTranslation.jsx';
import '../styles/LangToggle.css';

export default function LangToggle() {
  const { lang, setLang } = useTranslation();
  return (
    <button
      className="lang-toggle"
      onClick={() => setLang(lang === 'en' ? 'de' : 'en')}
      title={lang === 'en' ? 'Auf Deutsch' : 'In English'}
    >
      {lang === 'en' ? '🇬🇧 EN' : '🇩🇪 DE'}
    </button>
  );
}
