'use client';

import { useGameStore } from '@/store/gameStore';
import { LobbyView } from '@/components/game/LobbyView';
import { TableView } from '@/components/game/TableView';

export default function Home() {
  const { view } = useGameStore();

  return (
    <main className="min-h-screen">
      {view === 'lobby' ? <LobbyView /> : <TableView />}
    </main>
  );
}
