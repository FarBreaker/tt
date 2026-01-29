import React, { useState,useEffect } from 'react';

function FogOfWarManager({ socket, fogSettings, onSettingsChange }) {
  const [localFogEnabled, setLocalFogEnabled] = useState(fogSettings.fogEnabled);
  const [localVisionRadius, setLocalVisionRadius] = useState(fogSettings.visionRadius);
  const [localShowVisionCircles, setLocalShowVisionCircles] = useState(fogSettings.showVisionCircles);

  // Sync local state with parent fog settings
  useEffect(() => {
    console.log('FogOfWarManager: Syncing with parent fog settings:', fogSettings);
    setLocalFogEnabled(fogSettings.fogEnabled);
    setLocalVisionRadius(fogSettings.visionRadius);
    setLocalShowVisionCircles(fogSettings.showVisionCircles);
  }, [fogSettings]);

  const handleFogToggle = (enabled) => {
    console.log('FogOfWarManager: Fog toggle changed to:', enabled);
    setLocalFogEnabled(enabled);
    const newSettings = { fogEnabled: enabled, visionRadius: localVisionRadius, showVisionCircles: localShowVisionCircles };
    console.log('FogOfWarManager: Broadcasting fog settings:', newSettings);
    
    if (onSettingsChange) {
      onSettingsChange(newSettings);
    }
    
    // Broadcast to all players via socket
    if (socket) {
      console.log('FogOfWarManager: Emitting dm-update-fog-settings');
      socket.emit('dm-update-fog-settings', newSettings);
    } else {
      console.error('FogOfWarManager: Socket not available');
    }
  };

  const handleRadiusChange = (radius) => {
    console.log('FogOfWarManager: Vision radius changed to:', radius);
    setLocalVisionRadius(radius);
    const newSettings = { fogEnabled: localFogEnabled, visionRadius: radius, showVisionCircles: localShowVisionCircles };
    console.log('FogOfWarManager: Broadcasting fog settings:', newSettings);
    
    if (onSettingsChange) {
      onSettingsChange(newSettings);
    }
    
    // Broadcast to all players via socket
    if (socket) {
      console.log('FogOfWarManager: Emitting dm-update-fog-settings');
      socket.emit('dm-update-fog-settings', newSettings);
    } else {
      console.error('FogOfWarManager: Socket not available');
    }
  };

  const handleVisionCirclesToggle = (show) => {
    setLocalShowVisionCircles(show);
    const newSettings = { fogEnabled: localFogEnabled, visionRadius: localVisionRadius, showVisionCircles: show };
    if (onSettingsChange) {
      onSettingsChange(newSettings);
    }
    // Note: Don't broadcast this to players - it's DM-only
  };

  return (
    <div className="fog-manager">
      <h4>Fog of War</h4>
      
      <div className="fog-controls">
        <div className="fog-toggle">
          <label>
            <input
              type="checkbox"
              checked={localFogEnabled}
              onChange={(e) => handleFogToggle(e.target.checked)}
            />
            Enable Fog of War
          </label>
        </div>

        <div className="vision-circles-toggle">
          <label>
            <input
              type="checkbox"
              checked={localShowVisionCircles}
              onChange={(e) => handleVisionCirclesToggle(e.target.checked)}
            />
            Show Vision Circles (DM Only)
          </label>
        </div>

        {localFogEnabled && (
          <div className="vision-radius-control">
            <label htmlFor="visionRadius">Vision Radius: {localVisionRadius} cells</label>
            <input
              id="visionRadius"
              type="range"
              min="2"
              max="10"
              value={localVisionRadius}
              onChange={(e) => handleRadiusChange(parseInt(e.target.value, 10))}
              className="radius-slider"
            />
            <div className="radius-labels">
              <span>2</span>
              <span>5</span>
              <span>10</span>
            </div>
          </div>
        )}

        <div className="fog-info">
          <small>
            {localFogEnabled 
              ? `Players see ${localVisionRadius * 2} cell diameter around characters`
              : 'Players can see the entire map'
            }
          </small>
        </div>
      </div>

      <div className="fog-preview">
        <h5>Vision Preview</h5>
        <div className="preview-grid">
          {Array.from({ length: 11 }, (_, y) => (
            <div key={y} className="preview-row">
              {Array.from({ length: 11 }, (_, x) => {
                const centerX = 5;
                const centerY = 5;
                const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
                const isVisible = !localFogEnabled || distance <= localVisionRadius;
                const isCenter = x === centerX && y === centerY;
                
                return (
                  <div
                    key={`${x}-${y}`}
                    className={`preview-cell ${isVisible ? 'visible' : 'hidden'} ${isCenter ? 'center' : ''}`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default FogOfWarManager;