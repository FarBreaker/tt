import { useState, useEffect } from 'react';
import MapGrid from './MapGrid';

function PlayerView({ socket, gameState }) {
  const [fogSettings, setFogSettings] = useState({
    fogEnabled: true,
    visionRadius: 5
  });

  // Request and listen for fog settings updates from DM
  useEffect(() => {
    console.log('PlayerView: Setting up fog settings');
    console.log('PlayerView: Socket ID:', socket.id);
    console.log('PlayerView: Socket connected:', socket.connected);
    
    // Request current fog settings from server
    console.log('PlayerView: Requesting fog settings...');
    socket.emit('player-request-fog-settings');
    
    const handleFogSettingsChanged = (settings) => {
      console.log('PlayerView: ✅ Received fog settings:', settings);
      setFogSettings({
        fogEnabled: settings.fogEnabled,
        visionRadius: settings.visionRadius
      });
    };
    
    socket.on('player-fog-settings', handleFogSettingsChanged);

    return () => {
      console.log('PlayerView: Cleaning up fog settings listener');
      socket.off('player-fog-settings', handleFogSettingsChanged);
    };
  }, [socket]);

  return (
    <div className="player-view">
      {/* Debug info */}
      <div style={{ 
        position: 'fixed', 
        top: 0, 
        right: 0, 
        background: 'rgba(0,0,0,0.7)', 
        color: 'white', 
        padding: '10px', 
        fontSize: '12px',
        zIndex: 1000,
        borderRadius: '0 0 0 8px'
      }}>
        <div>Fog: {fogSettings.fogEnabled ? 'ON' : 'OFF'}</div>
        <div>Radius: {fogSettings.visionRadius}</div>
        <div>Socket: {socket.connected ? '🟢' : '🔴'}</div>
      </div>

      <div className="player-map-container">
        <MapGrid 
          map={gameState.map}
          pois={gameState.visiblePOIs || []}
          actors={gameState.actors || []}
          isDM={false}
          fogSettings={fogSettings}
          onPOIClick={(poi) => console.log('POI clicked:', poi)}
        />
      </div>
    </div>
  );
}

export default PlayerView;