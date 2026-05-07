import { useEffect, useState } from 'react';
import { useTranslation } from '../i18n/useTranslation.jsx';
import '../styles/UpdateBanner.css';

const POLL_MS = 60_000; // check every minute
const VERSION_URL = '/version.json';

async function fetchVersion() {
  try {
    const res = await fetch(`${VERSION_URL}?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    return data.ts;
  } catch {
    return null;
  }
}

export default function UpdateBanner() {
  const { t } = useTranslation();
  const [baselineVersion, setBaselineVersion] = useState(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetchVersion().then(v => { if (mounted) setBaselineVersion(v); });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!baselineVersion) return;
    const tick = async () => {
      const v = await fetchVersion();
      if (v && v !== baselineVersion) setUpdateAvailable(true);
    };
    const id = setInterval(tick, POLL_MS);
    // Re-check whenever the tab becomes visible again
    const onVis = () => { if (document.visibilityState === 'visible') tick(); };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [baselineVersion]);

  if (!updateAvailable || dismissed) return null;

  return (
    <div className="update-banner">
      <span className="update-banner-text">{t('update.available')}</span>
      <button className="update-banner-reload" onClick={() => window.location.reload()}>
        {t('update.reload')}
      </button>
      <button className="update-banner-dismiss" onClick={() => setDismissed(true)} aria-label="Dismiss">
        ✕
      </button>
    </div>
  );
}
