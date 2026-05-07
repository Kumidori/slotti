import Game from './components/Game';
import UpdateBanner from './components/UpdateBanner';
import { Analytics } from '@vercel/analytics/react';

export default function App() {
  return (
    <>
      <Game />
      <UpdateBanner />
      <Analytics />
    </>
  );
}
