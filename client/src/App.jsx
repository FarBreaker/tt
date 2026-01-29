import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import io from 'socket.io-client';
import { SOCKET_URL } from './config';
import DMView from './components/DMView';
import PlayerView from './components/PlayerView';
import RoleSelector from './components/RoleSelector';
import CampaignMenu from './components/CampaignMenu';

const socket = io(SOCKET_URL);

function App() {
  const [role, setRole] = useState(null);
  const [inGame, setInGame] = useState(false);
  const [gameState, setGameState] = useState({
    currentMap: null,
    map: null,
    visiblePOIs: [],
    actors: []
  });

  useEffect(() => {
    socket.on('game-state', (state) => {
      setGameState(state);
    });

    socket.on('map-changed', ({ mapId, map, actors }) => {
      setGameState(prev => ({
        ...prev,
        currentMap: mapId,
        map: map,
        actors: actors || []
      }));
    });

    socket.on('poi-visibility-changed', ({ poiId, visible, poi }) => {
      setGameState(prev => ({
        ...prev,
        visiblePOIs: visible 
          ? [...prev.visiblePOIs.filter(p => p.id !== poiId), poi]
          : prev.visiblePOIs.filter(p => p.id !== poiId)
      }));
    });

    socket.on('actor-moved', ({ actorId, mapId, x, y, actor }) => {
      setGameState(prev => ({
        ...prev,
        actors: prev.actors.map(a => 
          a.id === actorId ? { ...actor, x, y } : a
        )
      }));
    });

    socket.on('actor-removed', ({ actorId }) => {
      setGameState(prev => ({
        ...prev,
        actors: prev.actors.filter(a => a.id !== actorId)
      }));
    });

    socket.on('game-state-imported', ({ maps, currentMap, message }) => {
      console.log('Game state imported:', message);
      // Refresh the page to reload all data
      window.location.reload();
    });

    return () => {
      socket.off('game-state');
      socket.off('map-changed');
      socket.off('poi-visibility-changed');
      socket.off('actor-moved');
      socket.off('actor-removed');
      socket.off('game-state-imported');
    };
  }, []);

  const selectRole = (selectedRole) => {
    setRole(selectedRole);
    if (selectedRole === 'dm') {
      socket.emit('join-as-dm');
      // DM goes to campaign menu first
      setInGame(false);
    } else {
      socket.emit('join-as-player');
      // Players go directly to game
      setInGame(true);
    }
  };

  const startGame = () => {
    setInGame(true);
  };

  if (!role) {
    return <RoleSelector onSelectRole={selectRole} />;
  }

  // DM flow: Menu -> Game
  if (role === 'dm' && !inGame) {
    return <CampaignMenu onStartGame={startGame} />;
  }

  // In-game view
  return (
    <div className="app">
      {role === 'dm' ? (
        <DMView socket={socket} gameState={gameState} />
      ) : (
        <PlayerView socket={socket} gameState={gameState} />
      )}
    </div>
  );
}

export default App;