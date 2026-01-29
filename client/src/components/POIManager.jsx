import React, { useState } from 'react';

function POIManager({ 
  maps, 
  selectedMap, 
  pois, 
  onCreateMap, 
  onSetCurrentMap, 
  onCreatePOI, 
  onTogglePOIVisibility,
  showOnlyMaps = false,
  showOnlyPOIForm = false
}) {
  const [newMapData, setNewMapData] = useState({
    name: '',
    gridWidth: 20,
    gridHeight: 20,
    imageFile: null
  });
  const [newPOI, setNewPOI] = useState({
    name: '',
    x: 0,
    y: 0,
    description: '',
    type: 'generic'
  });

  const handleCreateMap = (e) => {
    e.preventDefault();
    if (newMapData.name.trim()) {
      onCreateMap(newMapData);
      setNewMapData({
        name: '',
        gridWidth: 20,
        gridHeight: 20,
        imageFile: null
      });
      // Reset file input
      const fileInput = document.getElementById('mapImageInput');
      if (fileInput) fileInput.value = '';
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setNewMapData(prev => ({ ...prev, imageFile: file }));
  };

  const handleCreatePOI = (e) => {
    e.preventDefault();
    if (newPOI.name.trim() && selectedMap) {
      onCreatePOI(newPOI);
      setNewPOI({
        name: '',
        x: 0,
        y: 0,
        description: '',
        type: 'generic'
      });
    }
  };

  // Show only maps section
  if (showOnlyMaps) {
    return (
      <div>
        <div className="map-upload">
          <h4>Create New Map</h4>
          <form onSubmit={handleCreateMap}>
            <input
              type="text"
              placeholder="Map name"
              value={newMapData.name}
              onChange={(e) => setNewMapData(prev => ({ ...prev, name: e.target.value }))}
              required
            />
            
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <div style={{ flex: 1 }}>
                <label htmlFor="gridWidth">Grid Width:</label>
                <input
                  id="gridWidth"
                  type="number"
                  min="5"
                  max="100"
                  value={newMapData.gridWidth}
                  onChange={(e) => setNewMapData(prev => ({ ...prev, gridWidth: parseInt(e.target.value, 10) || 20 }))}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label htmlFor="gridHeight">Grid Height:</label>
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
            
            <div style={{ marginBottom: '0.5rem' }}>
              <label htmlFor="mapImageInput">Map Image (optional):</label>
              <input
                id="mapImageInput"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
              />
              {newMapData.imageFile && (
                <p style={{ fontSize: '0.8rem', color: '#ccc', margin: '0.25rem 0' }}>
                  Selected: {newMapData.imageFile.name}
                </p>
              )}
            </div>
            
            <button type="submit">Create Map</button>
          </form>
        </div>

        <div>
          <h4>Available Maps</h4>
          {maps.map(map => (
            <div key={map.id} className="poi-item">
              <div>
                <strong>{map.name}</strong>
                <br />
                <small>Grid: {map.gridSize.width} × {map.gridSize.height}</small>
                {map.imageUrl && <br />}
                {map.imageUrl && <small>📷 Has background image</small>}
              </div>
              <button 
                type="button"
                onClick={() => onSetCurrentMap(map.id)}
                style={{ 
                  backgroundColor: selectedMap === map.id ? '#28a745' : '#007bff' 
                }}
              >
                {selectedMap === map.id ? 'Current' : 'Select'}
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Show only POI form
  if (showOnlyPOIForm) {
    return (
      <div>
        <form className="poi-form" onSubmit={handleCreatePOI}>
          <input
            type="text"
            placeholder="POI Name"
            value={newPOI.name}
            onChange={(e) => setNewPOI(prev => ({ ...prev, name: e.target.value }))}
          />
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <div style={{ flex: 1 }}>
              <label>X (0-{maps.find(m => m.id === selectedMap)?.gridSize.width - 1 || 19}):</label>
              <input
                type="number"
                min="0"
                max={(maps.find(m => m.id === selectedMap)?.gridSize.width || 20) - 1}
                value={newPOI.x}
                onChange={(e) => setNewPOI(prev => ({ ...prev, x: parseInt(e.target.value, 10) || 0 }))}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label>Y (0-{maps.find(m => m.id === selectedMap)?.gridSize.height - 1 || 19}):</label>
              <input
                type="number"
                min="0"
                max={(maps.find(m => m.id === selectedMap)?.gridSize.height || 20) - 1}
                value={newPOI.y}
                onChange={(e) => setNewPOI(prev => ({ ...prev, y: parseInt(e.target.value, 10) || 0 }))}
              />
            </div>
          </div>
          <select
            value={newPOI.type}
            onChange={(e) => setNewPOI(prev => ({ ...prev, type: e.target.value }))}
          >
            <option value="generic">Generic</option>
            <option value="treasure">Treasure</option>
            <option value="enemy">Enemy</option>
            <option value="npc">NPC</option>
          </select>
          <textarea
            placeholder="Description"
            value={newPOI.description}
            onChange={(e) => setNewPOI(prev => ({ ...prev, description: e.target.value }))}
          />
          <button type="submit">Add POI</button>
        </form>
      </div>
    );
  }

  // Original full view (not used in new design)
  return (
    <div>
      <h3>Map Management</h3>
      
      <div className="map-upload">
        <h4>Create New Map</h4>
        <form onSubmit={handleCreateMap}>
          <input
            type="text"
            placeholder="Map name"
            value={newMapData.name}
            onChange={(e) => setNewMapData(prev => ({ ...prev, name: e.target.value }))}
            required
          />
          
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <div style={{ flex: 1 }}>
              <label htmlFor="gridWidth">Grid Width:</label>
              <input
                id="gridWidth"
                type="number"
                min="5"
                max="100"
                value={newMapData.gridWidth}
                onChange={(e) => setNewMapData(prev => ({ ...prev, gridWidth: parseInt(e.target.value, 10) || 20 }))}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label htmlFor="gridHeight">Grid Height:</label>
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
          
          <div style={{ marginBottom: '0.5rem' }}>
            <label htmlFor="mapImageInput">Map Image (optional):</label>
            <input
              id="mapImageInput"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
            />
            {newMapData.imageFile && (
              <p style={{ fontSize: '0.8rem', color: '#ccc', margin: '0.25rem 0' }}>
                Selected: {newMapData.imageFile.name}
              </p>
            )}
          </div>
          
          <button type="submit">Create Map</button>
        </form>
      </div>

      <div>
        <h4>Available Maps</h4>
        {maps.map(map => (
          <div key={map.id} className="poi-item">
            <div>
              <strong>{map.name}</strong>
              <br />
              <small>Grid: {map.gridSize.width} × {map.gridSize.height}</small>
              {map.imageUrl && <br />}
              {map.imageUrl && <small>📷 Has background image</small>}
            </div>
            <button 
              type="button"
              onClick={() => onSetCurrentMap(map.id)}
              style={{ 
                backgroundColor: selectedMap === map.id ? '#28a745' : '#007bff' 
              }}
            >
              {selectedMap === map.id ? 'Current' : 'Select'}
            </button>
          </div>
        ))}
      </div>

      {selectedMap && (
        <>
          <h3>Points of Interest</h3>
          
          <form className="poi-form" onSubmit={handleCreatePOI}>
            <input
              type="text"
              placeholder="POI Name"
              value={newPOI.name}
              onChange={(e) => setNewPOI(prev => ({ ...prev, name: e.target.value }))}
            />
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <div style={{ flex: 1 }}>
                <label>X (0-{maps.find(m => m.id === selectedMap)?.gridSize.width - 1 || 19}):</label>
                <input
                  type="number"
                  min="0"
                  max={(maps.find(m => m.id === selectedMap)?.gridSize.width || 20) - 1}
                  value={newPOI.x}
                  onChange={(e) => setNewPOI(prev => ({ ...prev, x: parseInt(e.target.value, 10) || 0 }))}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label>Y (0-{maps.find(m => m.id === selectedMap)?.gridSize.height - 1 || 19}):</label>
                <input
                  type="number"
                  min="0"
                  max={(maps.find(m => m.id === selectedMap)?.gridSize.height || 20) - 1}
                  value={newPOI.y}
                  onChange={(e) => setNewPOI(prev => ({ ...prev, y: parseInt(e.target.value, 10) || 0 }))}
                />
              </div>
            </div>
            <select
              value={newPOI.type}
              onChange={(e) => setNewPOI(prev => ({ ...prev, type: e.target.value }))}
            >
              <option value="generic">Generic</option>
              <option value="treasure">Treasure</option>
              <option value="enemy">Enemy</option>
              <option value="npc">NPC</option>
            </select>
            <textarea
              placeholder="Description"
              value={newPOI.description}
              onChange={(e) => setNewPOI(prev => ({ ...prev, description: e.target.value }))}
            />
            <button type="submit">Add POI</button>
          </form>

          <div className="poi-list">
            <h4>Current POIs</h4>
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
                  onClick={() => onTogglePOIVisibility(poi.id, !poi.visible)}
                >
                  {poi.visible ? 'Visible' : 'Hidden'}
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default POIManager;