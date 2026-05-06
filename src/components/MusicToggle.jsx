import { useState } from 'react';
import { setMusicMuted, isMusicMuted } from '../audio';
import '../styles/MusicToggle.css';

export default function MusicToggle() {
  const [muted, setMuted] = useState(isMusicMuted());
  const toggle = () => {
    const next = !muted;
    setMuted(next);
    setMusicMuted(next);
  };
  return (
    <button
      className="music-toggle"
      onClick={toggle}
      title={muted ? 'Unmute music' : 'Mute music'}
      aria-label={muted ? 'Unmute music' : 'Mute music'}
    >
      {muted ? '🔇' : '🎵'}
    </button>
  );
}
