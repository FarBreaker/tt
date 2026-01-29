import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE } from '../config';
import MapGrid from './MapGrid';
import POIManager from './POIManager';
import GameStateManager from './GameStateManager';
import ActorManager from './ActorManager';
import FogOfWarManager from './FogOfWarManager';

function DMView({ socket, gameState }) {
  const [maps, setMaps] = useState([]);
  const [pois, setPois] = useState([]);
  const [actors, setActors] = useState([]);
  const [selectedMap, setSelectedMap] = useState(null);
  const [fogSettings, setFogSettings] = useState({
    fogEnabled: true,
    visionRadius: 5,
    showVisionCircles: true
  });
  
  // Collapsible menu states
  const [expandedSections, setExpandedSections] = useState({
    actors: false,
    fog: false,
    gameState: false,
    createPOI: false
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  useEffect(() => {
    loadMaps();
    loadActors();
    
    // Request current fog settings from server
    console.log('DMView: Requesting fog settings from server');
    socket.emit('dm-request-fog-settings');
  }, []);

  useEffect(() => {
    // Listen for fog settings from server
    const handleFogSettings = (settings) => {
      console.log('DMView: Received fog settings from server:', settings);
      setFogSettings(settings);
    };
    
    socket.on('dm-fog-settings', handleFogSettings);
    
    return () => {
      socket.off('dm-fog-settings', handleFogSettings);
    };
  }, [socket]);

  useEffect(() => {
    if (gameState.currentMap) {
      setSelectedMap(gameState.currentMap);
      loadPOIs(gameState.currentMap);
      loadMapActors(gameState.currentMap);
    }
  }, [gameState.currentMap]);

  useEffect(() => {
    // Listen for actor movement updates
    socket.on('actor-moved', ({ actorId, mapId, x, y, actor }) => {
      console.log('Received actor-moved event:', { actorId, mapId, x, y });
      if (mapId === selectedMap) {
        console.log('Updating local actor position');
        setActors(prev => prev.map(a => 
          a.id === actorId ? { ...actor, x, y } : a
        ));
      }
    });

    socket.on('actor-removed', ({ actorId }) => {
      console.log('Received actor-removed event:', actorId);
      setActors(prev => prev.filter(a => a.id !== actorId));
    });

    return () => {
      socket.off('actor-moved');
      socket.off('actor-removed');
    };
  }, [selectedMap, socket]);

  const loadMaps = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/maps`);
      setMaps(response.data);
    } catch (error) {
      console.error('Error loading maps:', error);
    }
  };

  const loadActors = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/actors`);
      // Don't set actors here, they'll be loaded per map
    } catch (error) {
      console.error('Error loading actors:', error);
    }
  };

  const loadPOIs = async (mapId) => {
    try {
      const response = await axios.get(`${API_BASE}/api/maps/${mapId}/poi`);
      setPois(response.data);
    } catch (error) {
      console.error('Error loading POIs:', error);
    }
  };

  const loadMapActors = async (mapId) => {
    console.log('Loading actors for map:', mapId);
    try {
      const response = await axios.get(`${API_BASE}/api/maps/${mapId}/actors`);
      console.log('Map actors loaded:', response.data);
      setActors(response.data);
    } catch (error) {
      console.error('Error loading map actors:', error);
    }
  };

  // Also load actors when the component mounts and when actors are created
  useEffect(() => {
    if (selectedMap) {
      console.log('Selected map changed to:', selectedMap);
      loadMapActors(selectedMap);
    }
  }, [selectedMap]);

  // Listen for actor creation to refresh the map actors
  useEffect(() => {
    const interval = setInterval(() => {
      if (selectedMap) {
        loadMapActors(selectedMap);
      }
    }, 3000); // Refresh every 3 seconds

    return () => clearInterval(interval);
  }, [selectedMap]);

  const createMap = async (mapData) => {
    try {
      const formData = new FormData();
      formData.append('name', mapData.name);
      formData.append('gridWidth', mapData.gridWidth);
      formData.append('gridHeight', mapData.gridHeight);
      
      if (mapData.imageFile) {
        formData.append('mapImage', mapData.imageFile);
      }

      const response = await axios.post(`${API_BASE}/api/maps`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      setMaps(prev => [...prev, response.data]);
      return response.data;
    } catch (error) {
      console.error('Error creating map:', error);
    }
  };

  const setCurrentMap = async (mapId) => {
    try {
      await axios.post(`${API_BASE}/api/maps/${mapId}/set-current`);
    } catch (error) {
      console.error('Error setting current map:', error);
    }
  };

  const createPOI = async (poiData) => {
    if (!selectedMap) return;
    
    try {
      const response = await axios.post(`${API_BASE}/api/maps/${selectedMap}/poi`, poiData);
      setPois(prev => [...prev, response.data]);
      return response.data;
    } catch (error) {
      console.error('Error creating POI:', error);
    }
  };

  const togglePOIVisibility = async (poiId, visible) => {
    try {
      await axios.put(`${API_BASE}/api/poi/${poiId}/visibility`, { visible });
      setPois(prev => prev.map(poi => 
        poi.id === poiId ? { ...poi, visible } : poi
      ));
    } catch (error) {
      console.error('Error toggling POI visibility:', error);
    }
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <h1>Dungeon Master View</h1>
          <button 
            className="btn-back"
            onClick={() => window.location.reload()}
          >
            ⬅️ Back to Menu
          </button>
        </div>
      </header>
      <div className="main-content">
        <div className="sidebar">
          {/* Collapsible Sections */}
          <div className="collapsible-menu">
            
            {/* Game State Section */}
            <div className="menu-section">
              <button 
                className="section-header"
                onClick={() => toggleSection('gameState')}
              >
                <span>💾 Game State</span>
                <span className="toggle-icon">{expandedSections.gameState ? '▼' : '▶'}</span>
              </button>
              {expandedSections.gameState && (
                <div className="section-content">
                  <GameStateManager />
                </div>
              )}
            </div>

            {/* Actors Section */}
            <div className="menu-section">
              <button 
                className="section-header"
                onClick={() => toggleSection('actors')}
              >
                <span>👥 Manage Characters</span>
                <span className="toggle-icon">{expandedSections.actors ? '▼' : '▶'}</span>
              </button>
              {expandedSections.actors && (
                <div className="section-content">
                  <ActorManager 
                    selectedMap={selectedMap}
                    showCreationForm={false}
                    onActorCreated={() => {
                      console.log('Actor created, refreshing map actors');
                      if (selectedMap) loadMapActors(selectedMap);
                    }}
                    onActorDeleted={() => {
                      console.log('Actor deleted, refreshing map actors');
                      if (selectedMap) loadMapActors(selectedMap);
                    }}
                  />
                </div>
              )}
            </div>

            {/* Fog of War Section */}
            <div className="menu-section">
              <button 
                className="section-header"
                onClick={() => toggleSection('fog')}
              >
                <span>🌫️ Fog of War</span>
                <span className="toggle-icon">{expandedSections.fog ? '▼' : '▶'}</span>
              </button>
              {expandedSections.fog && (
                <div className="section-content">
                  <FogOfWarManager 
                    socket={socket}
                    fogSettings={fogSettings}
                    onSettingsChange={setFogSettings}
                  />
                </div>
              )}
            </div>

            {/* Create POI Section */}
            {selectedMap && (
              <div className="menu-section">
                <button 
                  className="section-header"
                  onClick={() => toggleSection('createPOI')}
                >
                  <span>➕ Create POI</span>
                  <span className="toggle-icon">{expandedSections.createPOI ? '▼' : '▶'}</span>
                </button>
                {expandedSections.createPOI && (
                  <div className="section-content">
                    <POIManager 
                      maps={maps}
                      selectedMap={selectedMap}
                      pois={[]}
                      onCreateMap={() => {}}
                      onSetCurrentMap={() => {}}
                      onCreatePOI={createPOI}
                      onTogglePOIVisibility={() => {}}
                      showOnlyPOIForm={true}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Current Map Actors - Always Visible */}
          {selectedMap && actors.length > 0 && (
            <div className="current-actors-section">
              <h4>👥 Characters on Map</h4>
              <div className="actors-list">
                {actors.map(actor => (
                  <div key={actor.id} className="actor-item-compact">
                    <div 
                      className="actor-icon-small"
                      style={{ 
                        color: actor.color,
                        borderColor: actor.color
                      }}
                    >
                      {actor.icon}
                    </div>
                    <div className="actor-details">
                      <span className="actor-name">{actor.name}</span>
                      <span className="actor-position">({actor.x}, {actor.y})</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Always Visible: POI Visibility Controls */}
          {selectedMap && pois.length > 0 && (
            <div className="poi-visibility-section">
              <h4>📍 POI Visibility</h4>
              <div className="poi-list">
                {pois.map(poi => (
                  <div key={poi.id} className="poi-item">
                    <div>
                      <strong>{poi.name}</strong> ({poi.x}, {poi.y})
                      <br />
                      <small>{poi.description}</small>
                    </div>
                    <button
                      type="button"
                      className={`visibility-toggle ${poi.visible ? 'visible' : 'hidden'}`}
                      onClick={() => togglePOIVisibility(poi.id, !poi.visible)}
                    >
                      {poi.visible ? '👁️' : '🚫'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="map-area">
          {gameState.map && (
            <div className="dm-map-info">
              <h3>{gameState.map.name}</h3>
              <span>Grid: {gameState.map.gridSize.width} × {gameState.map.gridSize.height}</span>
            </div>
          )}
          <MapGrid 
            map={gameState.map}
            pois={pois}
            actors={actors}
            isDM={true}
            fogSettings={fogSettings}
            onPOIClick={(poi) => console.log('POI clicked:', poi)}
          />
        </div>
      </div>
    </div>
  );
}

export default DMView;