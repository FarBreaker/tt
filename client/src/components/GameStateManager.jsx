import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE } from '../config';

function GameStateManager() {
  const [gameInfo, setGameInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadGameInfo();
  }, []);

  const loadGameInfo = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/info`);
      setGameInfo(response.data);
    } catch (error) {
      console.error('Error loading game info:', error);
    }
  };

  const handleManualSave = async () => {
    setIsLoading(true);
    try {
      const response = await axios.post(`${API_BASE}/api/save`);
      setMessage('Game saved successfully!');
      loadGameInfo();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('Error saving game state');
      setTimeout(() => setMessage(''), 3000);
    }
    setIsLoading(false);
  };

  const handleExport = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/export`, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `tabletop-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setMessage('Game state exported successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('Error exporting game state');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsLoading(true);
    const formData = new FormData();
    formData.append('gameStateFile', file);

    try {
      const response = await axios.post(`${API_BASE}/api/import`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      setMessage(`Import successful! Loaded ${response.data.mapsCount} maps, ${response.data.poisCount} POIs, and ${response.data.actorsCount} actors`);
      loadGameInfo();
      setTimeout(() => setMessage(''), 5000);
      
      // Reset file input
      event.target.value = '';
    } catch (error) {
      setMessage('Error importing game state: ' + (error.response?.data?.error || error.message));
      setTimeout(() => setMessage(''), 5000);
    }
    setIsLoading(false);
  };

  return (
    <div className="game-state-manager">
      <h4>Game State Management</h4>
      
      {gameInfo && (
        <div className="game-info">
          <div className="info-item">
            <span>Maps: {gameInfo.mapsCount}</span>
          </div>
          <div className="info-item">
            <span>POIs: {gameInfo.poisCount}</span>
          </div>
          <div className="info-item">
            <span>Visible POIs: {gameInfo.visiblePoisCount}</span>
          </div>
          <div className="info-item">
            <span>Actors: {gameInfo.actorsCount}</span>
          </div>
          {gameInfo.lastSaved && (
            <div className="info-item">
              <span>Last Saved: {new Date(gameInfo.lastSaved).toLocaleString()}</span>
            </div>
          )}
        </div>
      )}

      {message && (
        <div className={`message ${message.includes('Error') ? 'error' : 'success'}`}>
          {message}
        </div>
      )}

      <div className="state-actions">
        <button 
          onClick={handleManualSave} 
          disabled={isLoading}
          type="button"
        >
          {isLoading ? 'Saving...' : 'Manual Save'}
        </button>
        
        <button 
          onClick={handleExport}
          type="button"
        >
          Export Game
        </button>
        
        <div className="import-section">
          <label htmlFor="importFile">Import Game:</label>
          <input
            id="importFile"
            type="file"
            accept=".json"
            onChange={handleImport}
            disabled={isLoading}
          />
        </div>
      </div>

      <div className="auto-save-info">
        <small>💾 Auto-save every 30 seconds</small>
      </div>
    </div>
  );
}

export default GameStateManager;