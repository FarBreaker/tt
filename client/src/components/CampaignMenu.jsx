import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE } from '../config';

function CampaignMenu({ onStartGame }) {
  const [activeTab, setActiveTab] = useState('maps');
  const [maps, setMaps] = useState([]);
  const [actors, setActors] = useState([]);
  
  // Map creation state
  const [newMapData, setNewMapData] = useState({
    name: '',
    gridWidth: 20,
    gridHeight: 20,
    imageFile: null
  });
  
  // Actor creation state
  const [newActor, setNewActor] = useState({
    name: '',
    color: '#007bff',
    icon: '👤'
  });

  const availableIcons = ['👤', '🧙', '⚔️', '🛡️', '🏹', '🗡️', '🔮', '⚡', '🔥', '❄️', '🌟'];
  const availableColors = ['#007bff', '#28a745', '#dc3545', '#ffc107', '#17a2b8', '#6f42c1', '#fd7e14', '#e83e8c'];

  useEffect(() => {
    loadMaps();
    loadActors();
  }, []);

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
      setActors(response.data);
    } catch (error) {
      console.error('Error loading actors:', error);
    }
  };

  const handleCreateMap = async (e) => {
    e.preventDefault();
    if (newMapData.name.trim()) {
      try {
        const formData = new FormData();
        formData.append('name', newMapData.name);
        formData.append('gridWidth', newMapData.gridWidth);
        formData.append('gridHeight', newMapData.gridHeight);
        
        if (newMapData.imageFile) {
          formData.append('mapImage', newMapData.imageFile);
        }

        await axios.post(`${API_BASE}/api/maps`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        
        setNewMapData({
          name: '',
          gridWidth: 20,
          gridHeight: 20,
          imageFile: null
        });
        
        const fileInput = document.getElementById('mapImageInput');
        if (fileInput) fileInput.value = '';
        
        loadMaps();
      } catch (error) {
        console.error('Error creating map:', error);
      }
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setNewMapData(prev => ({ ...prev, imageFile: file }));
  };

  const handleDeleteMap = async (mapId) => {
    if (window.confirm('Are you sure you want to delete this map?')) {
      try {
        await axios.delete(`${API_BASE}/api/maps/${mapId}`);
        loadMaps();
      } catch (error) {
        console.error('Error deleting map:', error);
      }
    }
  };

  const handleLoadMap = async (mapId) => {
    try {
      await axios.post(`${API_BASE}/api/maps/${mapId}/set-current`);
      onStartGame();
    } catch (error) {
      console.error('Error loading map:', error);
    }
  };

  const handleCreateActor = async (e) => {
    e.preventDefault();
    if (newActor.name.trim()) {
      try {
        await axios.post(`${API_BASE}/api/actors`, newActor);
        setNewActor({
          name: '',
          color: '#007bff',
          icon: '👤'
        });
        loadActors();
      } catch (error) {
        console.error('Error creating actor:', error);
      }
    }
  };

  const handleDeleteActor = async (actorId) => {
    if (window.confirm('Are you sure you want to delete this character?')) {
      try {
        await axios.delete(`${API_BASE}/api/actors/${actorId}`);
        loadActors();
      } catch (error) {
        console.error('Error deleting actor:', error);
      }
    }
  };

  return (
    <div className="campaign-menu">
      <div className="campaign-header">
        <h1>📋 Campaign Management</h1>
        <p>Manage your maps and characters before starting the game</p>
      </div>

      <div className="campaign-tabs">
        <button 
          className={`tab-button ${activeTab === 'maps' ? 'active' : ''}`}
          onClick={() => setActiveTab('maps')}
        >
          🗺️ Maps
        </button>
        <button 
          className={`tab-button ${activeTab === 'characters' ? 'active' : ''}`}
          onClick={() => setActiveTab('characters')}
        >
          👥 Characters
        </button>
      </div>

      <div className="campaign-content">
        {activeTab === 'maps' && (
          <div className="maps-tab">
            <div className="tab-section">
              <h2>Create New Map</h2>
              <form onSubmit={handleCreateMap} className="creation-form">
                <div className="form-group">
                  <label htmlFor="mapName">Map Name</label>
                  <input
                    id="mapName"
                    type="text"
                    placeholder="Enter map name"
                    value={newMapData.name}
                    onChange={(e) => setNewMapData(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="gridWidth">Grid Width (5-100)</label>
                    <input
                      id="gridWidth"
                      type="number"
                      min="5"
                      max="100"
                      value={newMapData.gridWidth}
                      onChange={(e) => setNewMapData(prev => ({ ...prev, gridWidth: parseInt(e.target.value, 10) || 20 }))}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="gridHeight">Grid Height (5-100)</label>
                    <input
                      id="gridHeight"
                      type="number"
                      min="5"
                      max="100"
                      value={newMapData.gridHeight}
                      onChange={(e) => setNewMapData(prev => ({ ...prev, gridHeight: parseInt(e.target.value, 10) || 20 }))}
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label htmlFor="mapImageInput">Background Image (optional)</label>
                  <input
                    id="mapImageInput"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                  {newMapData.imageFile && (
                    <p className="file-selected">Selected: {newMapData.imageFile.name}</p>
                  )}
                </div>
                
                <button type="submit" className="btn-primary">Create Map</button>
              </form>
            </div>

            <div className="tab-section">
              <h2>Available Maps ({maps.length})</h2>
              <div className="items-grid">
                {maps.length === 0 ? (
                  <p className="empty-message">No maps created yet. Create your first map above!</p>
                ) : (
                  maps.map(map => (
                    <div key={map.id} className="map-card">
                      {map.imageUrl && (
                        <div className="map-preview">
                          <img src={`${API_BASE}${map.imageUrl}`} alt={map.name} />
                        </div>
                      )}
                      <div className="map-info">
                        <h3>{map.name}</h3>
                        <p className="map-dimensions">
                          Grid: {map.gridSize.width} × {map.gridSize.height}
                        </p>
                        {map.imageUrl && <span className="badge">📷 Has Image</span>}
                      </div>
                      <div className="map-actions">
                        <button 
                          className="btn-success"
                          onClick={() => handleLoadMap(map.id)}
                        >
                          ▶️ Load & Play
                        </button>
                        <button 
                          className="btn-danger"
                          onClick={() => handleDeleteMap(map.id)}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'characters' && (
          <div className="characters-tab">
            <div className="tab-section">
              <h2>Create New Character</h2>
              <form onSubmit={handleCreateActor} className="creation-form">
                <div className="form-group">
                  <label htmlFor="actorName">Character Name</label>
                  <input
                    id="actorName"
                    type="text"
                    placeholder="Enter character name"
                    value={newActor.name}
                    onChange={(e) => setNewActor(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Icon</label>
                  <div className="icon-grid">
                    {availableIcons.map(icon => (
                      <button
                        key={icon}
                        type="button"
                        className={`icon-option ${newActor.icon === icon ? 'selected' : ''}`}
                        onClick={() => setNewActor(prev => ({ ...prev, icon }))}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label>Color</label>
                  <div className="color-grid">
                    {availableColors.map(color => (
                      <button
                        key={color}
                        type="button"
                        className={`color-option ${newActor.color === color ? 'selected' : ''}`}
                        style={{ backgroundColor: color }}
                        onClick={() => setNewActor(prev => ({ ...prev, color }))}
                      />
                    ))}
                  </div>
                </div>

                <div className="character-preview">
                  <label>Preview</label>
                  <div 
                    className="preview-token"
                    style={{ 
                      color: newActor.color,
                      borderColor: newActor.color
                    }}
                  >
                    {newActor.icon}
                  </div>
                </div>

                <button type="submit" className="btn-primary">Create Character</button>
              </form>
            </div>

            <div className="tab-section">
              <h2>Campaign Characters ({actors.length})</h2>
              <div className="items-list">
                {actors.length === 0 ? (
                  <p className="empty-message">No characters created yet. Create your first character above!</p>
                ) : (
                  actors.map(actor => (
                    <div key={actor.id} className="character-card">
                      <div 
                        className="character-token"
                        style={{ 
                          color: actor.color,
                          borderColor: actor.color
                        }}
                      >
                        {actor.icon}
                      </div>
                      <div className="character-info">
                        <h3>{actor.name}</h3>
                        <p className="character-meta">
                          Created: {new Date(actor.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <button 
                        className="btn-danger"
                        onClick={() => handleDeleteActor(actor.id)}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CampaignMenu;
