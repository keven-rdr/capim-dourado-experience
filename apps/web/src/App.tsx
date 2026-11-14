import { CURRENT_SEASON } from '@cde/shared';
import { SEASON_IDS, type Season, SeasonProvider } from '@cde/ui';
import { MotionConfig } from 'motion/react';
import { useMemo, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { createApi } from './data/createApi';
import { GameProvider } from './data/GameProvider';
import { AppShell } from './layout/AppShell';
import { Album } from './screens/Album';
import { Catalog } from './screens/Catalog';
import { Chat } from './screens/Chat';
import { CheckIn } from './screens/CheckIn';
import { Home } from './screens/Home';
import { Hunt } from './screens/Hunt';
import { MapScreen } from './screens/MapScreen';
import { MerchantPromotions } from './screens/MerchantPromotions';
import { Missions } from './screens/Missions';
import { Onboarding } from './screens/Onboarding';
import { Profile } from './screens/Profile';
import { Rewards } from './screens/Rewards';
import { Roulette } from './screens/Roulette';
import { Scanner } from './screens/Scanner';
import { StorePanel } from './screens/StorePanel';

const SEASON_KEY = 'cde:season';

function initialSeason(): Season {
  try {
    const saved = localStorage.getItem(SEASON_KEY);
    if (saved && (SEASON_IDS as readonly string[]).includes(saved)) return saved as Season;
  } catch {
    // sem armazenamento
  }
  return CURRENT_SEASON;
}

export function App() {
  const setup = useMemo(() => createApi(), []);
  const [season, setSeason] = useState<Season>(initialSeason);

  function changeSeason(next: Season) {
    setSeason(next);
    try {
      localStorage.setItem(SEASON_KEY, next);
    } catch {
      // sem armazenamento: vale só nesta aba
    }
  }

  return (
    <MotionConfig reducedMotion="user">
      <SeasonProvider season={season} onSeasonChange={changeSeason}>
        <BrowserRouter>
          <GameProvider setup={setup}>
            <Routes>
              <Route path="/catalogo" element={<Catalog />} />
              <Route path="/loja" element={<StorePanel />} />
              <Route element={<AppShell />}>
                <Route index element={<Home />} />
                <Route path="bem-vindo" element={<Onboarding />} />
                <Route path="checkin" element={<CheckIn />} />
                <Route path="missoes" element={<Missions />} />
                <Route path="caca" element={<Hunt />} />
                <Route path="scanner" element={<Scanner />} />
                <Route path="recompensas" element={<Rewards />} />
                <Route path="roleta" element={<Roulette />} />
                <Route path="chat" element={<Chat />} />
                <Route path="lojista" element={<MerchantPromotions />} />
                <Route path="mapa" element={<MapScreen />} />
                <Route path="album" element={<Album />} />
                <Route path="perfil" element={<Profile />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </GameProvider>
        </BrowserRouter>
      </SeasonProvider>
    </MotionConfig>
  );
}
