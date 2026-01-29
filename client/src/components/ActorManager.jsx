import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE } from '../config';

function ActorManager({ selectedMap, onActorCreated, onActorDeleted, showCreationForm = true }) {
  const [actors, setActors] = useState([]);
  const [mapActors, setMapActors] = useState([]);
  const [newActor, setNewActor] = useState({
    name: '',
    color: '#007bff',
    icon: '👤'
  });

  const actorIcons = ['👤', '🧙‍♂️', '🧙‍♀️', '⚔️', '🏹', '🛡️', '🗡️', '🧝‍♂️', '🧝‍♀️', '🧚‍♂️', '🧚‍♀️'];
  const actorColors = ['#007bff', '#28a745', '#dc3545', '#ffc107', '#6f42c1', '#fd7e14', '#20c997', '#e83e8c'];

  useEffect(() => {
    loadActors();
  }, []);

  useEffect(() => {
    if (selectedMap) {
      loadMapActors();
    }
  }, [selectedMap]);

  // Listen for actor movements to refresh the list
  useEffect(() => {
    const interval = setInterval(() => {
      if (selectedMap) {
        loadMapActors();
      }
    }, 2000); // Refresh every 2 seconds

    return () => clearInterval(interval);
  }, [selectedMap]);

  const loadActors = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/actors`);
      setActors(response.data);
    } catch (error) {
      console.error('Error loading actors:', error);
    }
  };

  const loadMapActors = async () => {
    if (!selectedMap) return;
    
    try {
      const response = await axios.get(`${API_BASE}/api/maps/${selectedMap}/actors`);
      setMapActors(response.data);
    } catch (error) {
      console.error('Error loading map actors:', error);
    }
  };

  const handleCreateActor = async (e) => {
    e.preventDefault();
    if (newActor.name.trim()) {
      try {
        // First create the actor
        const response = await axios.post(`${API_BASE}/api/actors`, newActor);
        const createdActor = response.data;
        
        setActors(prev => [...prev, createdActor]);
        
        // If we have a selected map, automatically place the actor at (0,0)
        if (selectedMap) {
          console.log('Placing new actor on map at (0,0)');
          await axios.put(`${API_BASE}/api/actors/${createdActor.id}/position`, {
            mapId: selectedMap,
            x: 0,
            y: 0
          });
        }
        
        setNewActor({
          name: '',
          color: '#007bff',
          icon: '👤'
        });
        
        if (onActorCreated) onActorCreated(createdActor);
      } catch (error) {
        console.error('Error creating actor:', error);
      }
    }
  };

  const handleDeleteActor = async (actorId) => {
    if (window.confirm('Are you sure you want to delete this actor?')) {
      try {
        await axios.delete(`${API_BASE}/api/actors/${actorId}`);
        setActors(prev => prev.filter(actor => actor.id !== actorId));
        setMapActors(prev => prev.filter(actor => actor.id !== actorId));
        if (onActorDeleted) onActorDeleted(actorId);
      } catch (error) {
        console.error('Error deleting actor:', error);
      }
    }
  };

  const moveActorToPosition = async (actorId, x, y) => {
    if (!selectedMap) return;
    
    try {
      await axios.put(`${API_BASE}/api/actors/${actorId}/position`, {
        mapId: selectedMap,
        x: parseInt(x, 10),
        y: parseInt(y, 10)
      });
      loadMapActors(); // Refresh positions
    } catch (error) {
      console.error('Error moving actor:', error);
    }
  };

  return (
    <div className="actor-manager">
      <h4>Player Characters</h4>
      
      {showCreationForm && (
        <form className="actor-form" onSubmit={handleCreateActor}>
          <input
            type="text"
            placeholder="Character name"
            value={newActor.name}
            onChange={(e) => setNewActor(prev => ({ ...prev, name: e.target.value }))}
            required
          />
          
          <div className="actor-customization">
            <div className="icon-selector">
              <label>Icon:</label>
              <div className="icon-grid">
                {actorIcons.map(icon => (
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
            
            <div className="color-selector">
              <label>Color:</label>
              <div className="color-grid">
                {actorColors.map(color => (
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
          </div>
          
          <button type="submit">Add Character</button>
        </form>
      )}

      <div className="actor-list">
        <h5>All Characters ({actors.length})</h5>
        {actors.map(actor => (
          <div key={actor.id} className="actor-item">
            <div className="actor-info">
              <span className="actor-icon" style={{ color: actor.color }}>
                {actor.icon}
              </span>
              <span className="actor-name">{actor.name}</span>
            </div>
            <div className="actor-actions">
              {selectedMap && (
                <button
                  type="button"
                  className="place-actor"
                  onClick={() => moveActorToPosition(actor.id, 0, 0)}
                  title="Place on current map"
                >
                  📍
                </button>
              )}
              <button
                type="button"
                className="delete-actor"
                onClick={() => handleDeleteActor(actor.id)}
                title="Delete character"
              >
                ×
              </button>
            </div>
          </div>
        ))}
        {actors.length === 0 && (
          <p className="no-actors">No characters created yet</p>
        )}
      </div>

      {selectedMap && mapActors.length > 0 && (
        <div className="map-actors-section">
          <h5>Characters on Current Map ({mapActors.length})</h5>
          <div className="map-actors-list">
            {mapActors.map(actor => (
              <div key={actor.id} className="map-actor-item">
                <div className="actor-info">
                  <span className="actor-icon" style={{ color: actor.color }}>
                    {actor.icon}
                  </span>
                  <span className="actor-name">{actor.name}</span>
                  <span className="actor-position">({actor.x}, {actor.y})</span>
                </div>
                <div className="position-controls">
                  <input
                    type="number"
                    min="0"
                    placeholder="X"
                    className="position-input"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        const x = e.target.value;
                        const y = e.target.parentElement.querySelector('input[placeholder="Y"]').value;
                        if (x !== '' && y !== '') {
                          moveActorToPosition(actor.id, x, y);
                          e.target.value = '';
                          e.target.parentElement.querySelector('input[placeholder="Y"]').value = '';
                        }
                      }
                    }}
                  />
                  <input
                    type="number"
                    min="0"
                    placeholder="Y"
                    className="position-input"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        const y = e.target.value;
                        const x = e.target.parentElement.querySelector('input[placeholder="X"]').value;
                        if (x !== '' && y !== '') {
                          moveActorToPosition(actor.id, x, y);
                          e.target.value = '';
                          e.target.parentElement.querySelector('input[placeholder="X"]').value = '';
                        }
                      }
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="movement-help">
            <small>💡 Enter X,Y coordinates and press Enter to move characters precisely</small>
          </div>
        </div>
      )}

      {selectedMap && actors.length > 0 && mapActors.length === 0 && (
        <div className="no-map-actors">
          <p>No characters on this map yet.</p>
          <small>Use the 📍 button next to characters to place them on this map.</small>
        </div>
      )}
    </div>
  );
}

export default ActorManager;