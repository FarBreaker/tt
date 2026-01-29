import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE } from '../config';

function MapGrid({ map, pois = [], actors = [], isDM, onPOIClick, fogSettings }) {
  const [clickPosition, setClickPosition] = useState(null);
  const [draggedActor, setDraggedActor] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [scale, setScale] = useState(1);
  
  const GRID_CELL_SIZE = 30;
  
  // Use default values if fogSettings is not provided
  const effectiveFogSettings = fogSettings || { fogEnabled: false, visionRadius: 5, showVisionCircles: true };
  const VISION_RADIUS = effectiveFogSettings.visionRadius;

  // Calculate scale for player view to maximize grid size
  useEffect(() => {
    if (!isDM && map) {
      const calculateScale = () => {
        const container = document.querySelector('.player-map-container');
        if (!container) return;
        
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        
        const gridWidth = map.gridSize.width * GRID_CELL_SIZE;
        const gridHeight = map.gridSize.height * GRID_CELL_SIZE;
        
        // Calculate scale to fit container while maintaining aspect ratio
        const scaleX = containerWidth / gridWidth;
        const scaleY = containerHeight / gridHeight;
        const newScale = Math.min(scaleX, scaleY, 3); // Max scale of 3x
        
        setScale(newScale);
      };
      
      calculateScale();
      window.addEventListener('resize', calculateScale);
      
      return () => window.removeEventListener('resize', calculateScale);
    } else {
      setScale(1);
    }
  }, [isDM, map]);

  // Debug logging
  useEffect(() => {
    console.log('MapGrid rendered with:', { 
      isDM, 
      actorsCount: actors.length, 
      fogSettings: effectiveFogSettings,
      fogEnabled: effectiveFogSettings.fogEnabled 
    });
  }, [isDM, actors.length, effectiveFogSettings]);

  if (!map) {
    return (
      <div className="no-map-message">
        <h3>No map selected</h3>
        <p>Select or create a map to begin</p>
      </div>
    );
  }

  // Calculate if a point is visible to players (within vision radius of any actor)
  const isVisibleToPlayers = (x, y) => {
    if (isDM || !effectiveFogSettings.fogEnabled) return true; // DM sees everything or fog disabled
    
    return actors.some(actor => {
      const distance = Math.sqrt(
        Math.pow(actor.x - x, 2) + Math.pow(actor.y - y, 2)
      );
      return distance <= VISION_RADIUS;
    });
  };

  const handleGridClick = (event) => {
    console.log('Grid clicked, isDM:', isDM);
    
    if (!isDM) return;
    
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left) / GRID_CELL_SIZE);
    const y = Math.floor((event.clientY - rect.top) / GRID_CELL_SIZE);
    
    console.log('Grid position:', { x, y });
    
    if (x >= 0 && x < map.gridSize.width && y >= 0 && y < map.gridSize.height) {
      setClickPosition({ x, y });
      setContextMenu(null);
      
      if (onPOIClick) {
        onPOIClick({ x, y, type: 'grid-click' });
      }
    }
  };

  const handleActorClick = (actor, event) => {
    console.log('Actor clicked:', actor.name, 'isDM:', isDM);
    
    if (!isDM) return;
    
    event.stopPropagation();
    
    // Simple click to select
    console.log('Actor selected:', actor.name);
  };

  const handleActorMouseDown = (actor, event) => {
    console.log('Actor mouse down:', actor.name, 'isDM:', isDM);
    
    if (!isDM) return;
    
    event.preventDefault();
    event.stopPropagation();
    
    console.log('Starting drag for:', actor.name);
    
    let currentDraggedActor = { ...actor };
    setDraggedActor(currentDraggedActor);
    
    let hasMoved = false;
    const startX = event.clientX;
    const startY = event.clientY;

    const handleMouseMove = (e) => {
      const deltaX = Math.abs(e.clientX - startX);
      const deltaY = Math.abs(e.clientY - startY);
      
      if (deltaX > 5 || deltaY > 5) {
        hasMoved = true;
      }
      
      const gridContainer = document.querySelector('.grid-container');
      if (!gridContainer) return;
      
      const rect = gridContainer.getBoundingClientRect();
      const x = Math.floor((e.clientX - rect.left) / GRID_CELL_SIZE);
      const y = Math.floor((e.clientY - rect.top) / GRID_CELL_SIZE);
      
      if (x >= 0 && x < map.gridSize.width && y >= 0 && y < map.gridSize.height) {
        console.log('Dragging to:', { x, y });
        currentDraggedActor = { ...currentDraggedActor, x, y };
        setDraggedActor(currentDraggedActor);
      }
    };

    const handleMouseUp = async () => {
      console.log('Mouse up event triggered');
      console.log('hasMoved:', hasMoved);
      console.log('currentDraggedActor:', currentDraggedActor);
      console.log('original actor position:', { x: actor.x, y: actor.y });
      
      if (hasMoved && currentDraggedActor && (currentDraggedActor.x !== actor.x || currentDraggedActor.y !== actor.y)) {
        console.log('Attempting to move actor from', { x: actor.x, y: actor.y }, 'to', { x: currentDraggedActor.x, y: currentDraggedActor.y });
        console.log('API call details:', {
          url: `${API_BASE}/api/actors/${actor.id}/position`,
          mapId: map.id,
          actorId: actor.id,
          newPosition: { x: currentDraggedActor.x, y: currentDraggedActor.y }
        });
        
        try {
          const response = await axios.put(`${API_BASE}/api/actors/${actor.id}/position`, {
            mapId: map.id,
            x: currentDraggedActor.x,
            y: currentDraggedActor.y
          });
          console.log('Move API response:', response.data);
          console.log('Move successful!');
        } catch (error) {
          console.error('Error moving actor:', error);
          console.error('Error details:', error.response?.data);
        }
      } else {
        console.log('Move conditions not met:');
        console.log('- hasMoved:', hasMoved);
        console.log('- currentDraggedActor exists:', !!currentDraggedActor);
        if (currentDraggedActor) {
          console.log('- position changed:', currentDraggedActor.x !== actor.x || currentDraggedActor.y !== actor.y);
          console.log('- currentDraggedActor position:', { x: currentDraggedActor.x, y: currentDraggedActor.y });
          console.log('- original position:', { x: actor.x, y: actor.y });
        }
      }
      
      setDraggedActor(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleActorRightClick = (actor, event) => {
    console.log('Actor right clicked:', actor.name, 'isDM:', isDM);
    
    if (!isDM) return;
    
    event.preventDefault();
    event.stopPropagation();
    
    console.log('Setting context menu at:', { x: event.clientX, y: event.clientY });
    
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      actor: actor
    });
  };

  const moveActorToPosition = async (actor, x, y) => {
    console.log('Moving actor via context menu:', actor.name, 'to', { x, y });
    
    try {
      await axios.put(`${API_BASE}/api/actors/${actor.id}/position`, {
        mapId: map.id,
        x: x,
        y: y
      });
      console.log('Context menu move successful');
      setContextMenu(null);
      setClickPosition(null);
    } catch (error) {
      console.error('Error moving actor via context menu:', error);
    }
  };

  const handleContextMenuClick = (action, event) => {
    console.log('Context menu action:', action);
    event.stopPropagation();
    
    if (action === 'move-here' && contextMenu && clickPosition) {
      moveActorToPosition(contextMenu.actor, clickPosition.x, clickPosition.y);
    } else {
      setContextMenu(null);
    }
  };

  const getPOIStyle = (poi) => ({
    left: `${poi.x * GRID_CELL_SIZE + 5}px`,
    top: `${poi.y * GRID_CELL_SIZE + 5}px`,
  });

  const getActorStyle = (actor) => {
    const isDraggingThis = draggedActor && draggedActor.id === actor.id;
    
    return {
      left: `${actor.x * GRID_CELL_SIZE + 2}px`,
      top: `${actor.y * GRID_CELL_SIZE + 2}px`,
      color: actor.color,
      borderColor: actor.color,
      transform: isDraggingThis ? 'scale(1.2)' : 'scale(1)',
      boxShadow: isDraggingThis ? '0 4px 12px rgba(0,0,0,0.4)' : 'none',
      zIndex: isDraggingThis ? 15 : 10,
      cursor: isDM ? 'pointer' : 'default',
      opacity: isDraggingThis ? 0.8 : 1
    };
  };

  const getPOITypeIcon = (type) => {
    switch (type) {
      case 'treasure': return '💰';
      case 'enemy': return '⚔️';
      case 'npc': return '👤';
      default: return '📍';
    }
  };

  const gridStyle = {
    width: `${map.gridSize.width * GRID_CELL_SIZE}px`,
    height: `${map.gridSize.height * GRID_CELL_SIZE}px`,
    backgroundSize: `${GRID_CELL_SIZE}px ${GRID_CELL_SIZE}px`,
    position: 'relative',
    cursor: isDM ? 'crosshair' : 'default',
    transform: !isDM ? `scale(${scale})` : 'none',
    transformOrigin: 'center center'
  };

  return (
    <div className="map-grid-wrapper">
      {/* Debug info */}
      {isDM && (
        <div style={{ 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          background: 'rgba(0,0,0,0.7)', 
          color: 'white', 
          padding: '5px', 
          fontSize: '12px',
          zIndex: 100
        }}>
          DM Mode: {isDM ? 'ON' : 'OFF'} | Actors: {actors.length} | Click Pos: {clickPosition ? `(${clickPosition.x}, ${clickPosition.y})` : 'None'}
        </div>
      )}
      
      <div 
        className="grid-container" 
        style={gridStyle}
        onClick={handleGridClick}
        onContextMenu={(e) => {
          if (isDM) {
            e.preventDefault();
            console.log('Grid right clicked');
          }
        }}
      >
        {map.imageUrl && (
          <img 
            src={`${API_BASE}${map.imageUrl}`}
            alt="Map background"
            className="map-background"
            draggable={false}
          />
        )}
        
        {/* Only show POIs that are visible to players */}
        {pois.filter(poi => isVisibleToPlayers(poi.x, poi.y)).map(poi => (
          <div
            key={poi.id}
            className={`poi ${poi.type}`}
            style={getPOIStyle(poi)}
            onClick={(e) => {
              e.stopPropagation();
              onPOIClick && onPOIClick(poi);
            }}
            title={`${poi.name}: ${poi.description}`}
          >
            {getPOITypeIcon(poi.type)}
          </div>
        ))}
        
        {actors.map(actor => {
          const displayActor = draggedActor && draggedActor.id === actor.id ? draggedActor : actor;
          return (
            <div
              key={actor.id}
              className={`actor ${isDM ? 'draggable' : ''}`}
              style={getActorStyle(displayActor)}
              onClick={(e) => handleActorClick(actor, e)}
              onMouseDown={(e) => handleActorMouseDown(actor, e)}
              onContextMenu={(e) => handleActorRightClick(actor, e)}
              title={`${actor.name} (${displayActor.x}, ${displayActor.y})`}
              draggable={false}
            >
              {actor.icon}
            </div>
          );
        })}

        {/* Vision Circles for DM - Show what players can see */}
        {isDM && effectiveFogSettings.fogEnabled && effectiveFogSettings.showVisionCircles && actors.map((actor, index) => (
          <div
            key={`vision-circle-${actor.id}-${index}`}
            className="vision-circle"
            style={{
              position: 'absolute',
              left: `${actor.x * GRID_CELL_SIZE + GRID_CELL_SIZE / 2 - VISION_RADIUS * GRID_CELL_SIZE}px`,
              top: `${actor.y * GRID_CELL_SIZE + GRID_CELL_SIZE / 2 - VISION_RADIUS * GRID_CELL_SIZE}px`,
              width: `${VISION_RADIUS * 2 * GRID_CELL_SIZE}px`,
              height: `${VISION_RADIUS * 2 * GRID_CELL_SIZE}px`,
              borderRadius: '50%',
              border: `2px dashed ${actor.color}`,
              backgroundColor: `${actor.color}15`, // 15 = ~8% opacity in hex
              pointerEvents: 'none',
              zIndex: 5
            }}
          >
            <div
              className="vision-label"
              style={{
                position: 'absolute',
                top: '-25px',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: actor.color,
                color: 'white',
                padding: '2px 6px',
                borderRadius: '3px',
                fontSize: '10px',
                fontWeight: 'bold',
                whiteSpace: 'nowrap'
              }}
            >
              {actor.name} Vision
            </div>
          </div>
        ))}
        
        {isDM && clickPosition && (
          <div
            className="grid-click-indicator"
            style={{
              left: `${clickPosition.x * GRID_CELL_SIZE}px`,
              top: `${clickPosition.y * GRID_CELL_SIZE}px`,
              width: `${GRID_CELL_SIZE}px`,
              height: `${GRID_CELL_SIZE}px`,
            }}
          >
            <span className="click-coords">({clickPosition.x}, {clickPosition.y})</span>
          </div>
        )}

        {/* Fog of War Overlay for Players */}
        {!isDM && effectiveFogSettings.fogEnabled && (
          <>
            {/* SVG for creating vision holes in the fog */}
            <svg
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 999
              }}
            >
              <defs>
                <mask id={`vision-mask-${map.id}`}>
                  {/* White background - everything is hidden by default */}
                  <rect 
                    width="100%" 
                    height="100%" 
                    fill="white" 
                  />
                  {/* Black circles - these create transparent holes in the fog */}
                  {actors.map((actor, index) => (
                    <circle
                      key={`vision-hole-${actor.id}-${index}`}
                      cx={actor.x * GRID_CELL_SIZE + GRID_CELL_SIZE / 2}
                      cy={actor.y * GRID_CELL_SIZE + GRID_CELL_SIZE / 2}
                      r={VISION_RADIUS * GRID_CELL_SIZE}
                      fill="black"
                    />
                  ))}
                </mask>
              </defs>
              
              {/* The actual fog overlay */}
              <rect
                width="100%"
                height="100%"
                fill="rgba(0, 0, 0, 0.65)"
                mask={`url(#vision-mask-${map.id})`}
              />
            </svg>
          </>
        )}
      </div>
      
      {/* Context Menu */}
      {contextMenu && isDM && (
        <div
          className="context-menu"
          style={{
            position: 'fixed',
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
            zIndex: 1000,
            background: 'white',
            border: '1px solid #ccc',
            borderRadius: '4px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.3)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {clickPosition && (
            <div 
              className="context-menu-item" 
              onClick={(e) => handleContextMenuClick('move-here', e)}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                borderBottom: '1px solid #eee'
              }}
            >
              📍 Move {contextMenu.actor.name} to ({clickPosition.x}, {clickPosition.y})
            </div>
          )}
          <div 
            className="context-menu-item" 
            onClick={(e) => handleContextMenuClick('cancel', e)}
            style={{
              padding: '8px 12px',
              cursor: 'pointer'
            }}
          >
            ❌ Cancel
          </div>
        </div>
      )}
    </div>
  );
}

export default MapGrid;