const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: true, // Allow all origins
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.use(cors({
  origin: true, // Allow all origins
  credentials: true
}));
app.use(express.json());

// Create uploads and data directories if they don't exist
const uploadsDir = path.join(__dirname, '../uploads');
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Serve uploaded files statically
app.use('/uploads', express.static(uploadsDir));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Only allow image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Game state
let gameState = {
  maps: {},
  currentMap: null,
  pointsOfInterest: {},
  visiblePOIs: new Set(),
  actors: {},
  actorPositions: {}, // mapId -> { actorId: { x, y } }
  fogSettings: {
    fogEnabled: true,
    visionRadius: 5,
    showVisionCircles: true
  }
};

// File paths for persistence
const GAME_STATE_FILE = path.join(dataDir, 'gameState.json');

// Load game state from file on startup
function loadGameState() {
  try {
    if (fs.existsSync(GAME_STATE_FILE)) {
      const data = fs.readFileSync(GAME_STATE_FILE, 'utf8');
      const savedState = JSON.parse(data);
      
      gameState.maps = savedState.maps || {};
      gameState.currentMap = savedState.currentMap || null;
      gameState.pointsOfInterest = savedState.pointsOfInterest || {};
      gameState.visiblePOIs = new Set(savedState.visiblePOIs || []);
      gameState.actors = savedState.actors || {};
      gameState.actorPositions = savedState.actorPositions || {};
      gameState.fogSettings = savedState.fogSettings || {
        fogEnabled: true,
        visionRadius: 5,
        showVisionCircles: true
      };
      
      console.log('Game state loaded successfully');
      console.log(`Loaded ${Object.keys(gameState.maps).length} maps, ${Object.keys(gameState.pointsOfInterest).length} POIs, and ${Object.keys(gameState.actors).length} actors`);
      console.log('Fog settings:', gameState.fogSettings);
    } else {
      console.log('No saved game state found, starting fresh');
    }
  } catch (error) {
    console.error('Error loading game state:', error);
    console.log('Starting with fresh game state');
  }
}

// Save game state to file
function saveGameState() {
  try {
    const stateToSave = {
      maps: gameState.maps,
      currentMap: gameState.currentMap,
      pointsOfInterest: gameState.pointsOfInterest,
      visiblePOIs: Array.from(gameState.visiblePOIs),
      actors: gameState.actors,
      actorPositions: gameState.actorPositions,
      fogSettings: gameState.fogSettings,
      lastSaved: new Date().toISOString()
    };
    
    fs.writeFileSync(GAME_STATE_FILE, JSON.stringify(stateToSave, null, 2));
    console.log('Game state saved successfully');
  } catch (error) {
    console.error('Error saving game state:', error);
  }
}

// Auto-save every 30 seconds
setInterval(saveGameState, 30000);

// Load initial state
loadGameState();

// REST API Routes
app.get('/api/maps', (req, res) => {
  res.json(Object.values(gameState.maps));
});

app.post('/api/maps', upload.single('mapImage'), (req, res) => {
  const { name, gridWidth, gridHeight } = req.body;
  const mapId = uuidv4();
  
  let imageUrl = null;
  if (req.file) {
    imageUrl = `/uploads/${req.file.filename}`;
  }
  
  const newMap = {
    id: mapId,
    name,
    gridSize: { 
      width: parseInt(gridWidth, 10) || 20, 
      height: parseInt(gridHeight, 10) || 20 
    },
    imageUrl,
    createdAt: new Date().toISOString()
  };
  
  gameState.maps[mapId] = newMap;
  saveGameState(); // Save after creating map
  res.json(newMap);
});

app.get('/api/maps/:mapId/poi', (req, res) => {
  const { mapId } = req.params;
  const mapPOIs = Object.values(gameState.pointsOfInterest)
    .filter(poi => poi.mapId === mapId);
  res.json(mapPOIs);
});

app.post('/api/maps/:mapId/poi', (req, res) => {
  const { mapId } = req.params;
  const { name, x, y, description, type } = req.body;
  const poiId = uuidv4();
  
  const newPOI = {
    id: poiId,
    mapId,
    name,
    x,
    y,
    description,
    type: type || 'generic',
    visible: false,
    createdAt: new Date().toISOString()
  };
  
  gameState.pointsOfInterest[poiId] = newPOI;
  saveGameState(); // Save after creating POI
  res.json(newPOI);
});

app.put('/api/poi/:poiId/visibility', (req, res) => {
  const { poiId } = req.params;
  const { visible } = req.body;
  
  if (gameState.pointsOfInterest[poiId]) {
    gameState.pointsOfInterest[poiId].visible = visible;
    
    if (visible) {
      gameState.visiblePOIs.add(poiId);
    } else {
      gameState.visiblePOIs.delete(poiId);
    }
    
    saveGameState(); // Save after visibility change
    
    // Broadcast visibility change to all clients
    io.emit('poi-visibility-changed', {
      poiId,
      visible,
      poi: gameState.pointsOfInterest[poiId]
    });
    
    res.json(gameState.pointsOfInterest[poiId]);
  } else {
    res.status(404).json({ error: 'POI not found' });
  }
});

app.post('/api/maps/:mapId/set-current', (req, res) => {
  const { mapId } = req.params;
  
  if (gameState.maps[mapId]) {
    gameState.currentMap = mapId;
    saveGameState(); // Save after map change
    
    // Get actors for this map
    const mapActors = [];
    if (gameState.actorPositions[mapId]) {
      Object.entries(gameState.actorPositions[mapId]).forEach(([actorId, position]) => {
        const actor = gameState.actors[actorId];
        if (actor) {
          mapActors.push({
            ...actor,
            x: position.x,
            y: position.y
          });
        }
      });
    }
    
    // Broadcast map change to all clients
    io.emit('map-changed', {
      mapId,
      map: gameState.maps[mapId],
      actors: mapActors
    });
    
    res.json({ success: true, currentMap: mapId });
  } else {
    res.status(404).json({ error: 'Map not found' });
  }
});

app.delete('/api/maps/:mapId', (req, res) => {
  const { mapId } = req.params;
  
  if (gameState.maps[mapId]) {
    // Delete the map
    delete gameState.maps[mapId];
    
    // Delete all POIs associated with this map
    Object.keys(gameState.pointsOfInterest).forEach(poiId => {
      if (gameState.pointsOfInterest[poiId].mapId === mapId) {
        delete gameState.pointsOfInterest[poiId];
        gameState.visiblePOIs.delete(poiId);
      }
    });
    
    // Delete actor positions for this map
    if (gameState.actorPositions[mapId]) {
      delete gameState.actorPositions[mapId];
    }
    
    // If this was the current map, clear it
    if (gameState.currentMap === mapId) {
      gameState.currentMap = null;
    }
    
    saveGameState();
    
    res.json({ success: true, message: 'Map deleted successfully' });
  } else {
    res.status(404).json({ error: 'Map not found' });
  }
});

// Manual save endpoint
app.post('/api/save', (req, res) => {
  try {
    saveGameState();
    res.json({ 
      success: true, 
      message: 'Game state saved successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save game state' });
  }
});

// Export game state
app.get('/api/export', (req, res) => {
  try {
    const exportData = {
      maps: gameState.maps,
      currentMap: gameState.currentMap,
      pointsOfInterest: gameState.pointsOfInterest,
      visiblePOIs: Array.from(gameState.visiblePOIs),
      actors: gameState.actors,
      actorPositions: gameState.actorPositions,
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="tabletop-export.json"');
    res.json(exportData);
  } catch (error) {
    res.status(500).json({ error: 'Failed to export game state' });
  }
});

// Import game state
app.post('/api/import', upload.single('gameStateFile'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const fileContent = fs.readFileSync(req.file.path, 'utf8');
    const importedData = JSON.parse(fileContent);
    
    // Validate imported data structure
    if (!importedData.maps || !importedData.pointsOfInterest) {
      return res.status(400).json({ error: 'Invalid game state file format' });
    }
    
    // Backup current state before importing
    const backupFile = path.join(dataDir, `gameState-backup-${Date.now()}.json`);
    fs.writeFileSync(backupFile, JSON.stringify({
      maps: gameState.maps,
      currentMap: gameState.currentMap,
      pointsOfInterest: gameState.pointsOfInterest,
      visiblePOIs: Array.from(gameState.visiblePOIs),
      actors: gameState.actors,
      actorPositions: gameState.actorPositions,
      backedUpAt: new Date().toISOString()
    }, null, 2));
    
    // Import new state
    gameState.maps = importedData.maps || {};
    gameState.currentMap = importedData.currentMap || null;
    gameState.pointsOfInterest = importedData.pointsOfInterest || {};
    gameState.visiblePOIs = new Set(importedData.visiblePOIs || []);
    gameState.actors = importedData.actors || {};
    gameState.actorPositions = importedData.actorPositions || {};
    
    // Save the imported state
    saveGameState();
    
    // Clean up uploaded file
    fs.unlinkSync(req.file.path);
    
    // Broadcast state change to all clients
    io.emit('game-state-imported', {
      maps: Object.values(gameState.maps),
      currentMap: gameState.currentMap,
      message: 'Game state imported successfully'
    });
    
    res.json({ 
      success: true, 
      message: 'Game state imported successfully',
      mapsCount: Object.keys(gameState.maps).length,
      poisCount: Object.keys(gameState.pointsOfInterest).length,
      actorsCount: Object.keys(gameState.actors).length,
      backupFile: path.basename(backupFile)
    });
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ error: 'Failed to import game state: ' + error.message });
  }
});

// Get game state info
app.get('/api/info', (req, res) => {
  try {
    const stats = {
      mapsCount: Object.keys(gameState.maps).length,
      poisCount: Object.keys(gameState.pointsOfInterest).length,
      visiblePoisCount: gameState.visiblePOIs.size,
      actorsCount: Object.keys(gameState.actors).length,
      currentMap: gameState.currentMap,
      lastSaved: fs.existsSync(GAME_STATE_FILE) ? fs.statSync(GAME_STATE_FILE).mtime : null
    };
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get game state info' });
  }
});

// Actor management endpoints
app.get('/api/actors', (req, res) => {
  res.json(Object.values(gameState.actors));
});

app.post('/api/actors', (req, res) => {
  const { name, color, icon } = req.body;
  const actorId = uuidv4();
  
  const newActor = {
    id: actorId,
    name,
    color: color || '#007bff',
    icon: icon || '👤',
    createdAt: new Date().toISOString()
  };
  
  gameState.actors[actorId] = newActor;
  saveGameState();
  res.json(newActor);
});

app.delete('/api/actors/:actorId', (req, res) => {
  const { actorId } = req.params;
  
  if (gameState.actors[actorId]) {
    delete gameState.actors[actorId];
    
    // Remove actor from all map positions
    Object.keys(gameState.actorPositions).forEach(mapId => {
      if (gameState.actorPositions[mapId][actorId]) {
        delete gameState.actorPositions[mapId][actorId];
      }
    });
    
    saveGameState();
    
    // Broadcast actor removal
    io.emit('actor-removed', { actorId });
    
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Actor not found' });
  }
});

// Actor position management
app.get('/api/maps/:mapId/actors', (req, res) => {
  const { mapId } = req.params;
  const mapActors = [];
  
  if (gameState.actorPositions[mapId]) {
    Object.entries(gameState.actorPositions[mapId]).forEach(([actorId, position]) => {
      const actor = gameState.actors[actorId];
      if (actor) {
        mapActors.push({
          ...actor,
          x: position.x,
          y: position.y
        });
      }
    });
  }
  
  res.json(mapActors);
});

app.put('/api/actors/:actorId/position', (req, res) => {
  const { actorId } = req.params;
  const { mapId, x, y } = req.body;
  
  console.log('Position update request:', {
    actorId,
    mapId,
    x,
    y,
    actorExists: !!gameState.actors[actorId],
    mapExists: !!gameState.maps[mapId]
  });
  
  if (!gameState.actors[actorId]) {
    console.log('Actor not found:', actorId);
    return res.status(404).json({ error: 'Actor not found' });
  }
  
  if (!gameState.maps[mapId]) {
    console.log('Map not found:', mapId);
    return res.status(404).json({ error: 'Map not found' });
  }
  
  // Initialize map positions if needed
  if (!gameState.actorPositions[mapId]) {
    gameState.actorPositions[mapId] = {};
    console.log('Initialized positions for map:', mapId);
  }
  
  // Update position
  gameState.actorPositions[mapId][actorId] = { x, y };
  console.log('Updated actor position:', {
    actorId,
    mapId,
    newPosition: { x, y },
    allPositions: gameState.actorPositions[mapId]
  });
  
  saveGameState();
  
  // Broadcast position change
  io.emit('actor-moved', {
    actorId,
    mapId,
    x,
    y,
    actor: gameState.actors[actorId]
  });
  
  console.log('Position update successful, broadcasted to clients');
  res.json({ success: true, position: { x, y } });
});

// WebSocket connections
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Get current map actors
  const currentMapActors = [];
  if (gameState.currentMap && gameState.actorPositions[gameState.currentMap]) {
    Object.entries(gameState.actorPositions[gameState.currentMap]).forEach(([actorId, position]) => {
      const actor = gameState.actors[actorId];
      if (actor) {
        currentMapActors.push({
          ...actor,
          x: position.x,
          y: position.y
        });
      }
    });
  }
  
  // Send current game state to new client
  socket.emit('game-state', {
    currentMap: gameState.currentMap,
    map: gameState.currentMap ? gameState.maps[gameState.currentMap] : null,
    visiblePOIs: Array.from(gameState.visiblePOIs).map(id => gameState.pointsOfInterest[id]),
    actors: currentMapActors
  });
  
  socket.on('join-as-dm', () => {
    socket.join('dm');
    console.log('Server: Client joined as DM:', socket.id);
    
    // Send current fog settings to DM
    console.log('Server: Sending current fog settings to DM:', gameState.fogSettings);
    socket.emit('dm-fog-settings', gameState.fogSettings);
  });
  
  socket.on('dm-request-fog-settings', () => {
    console.log('Server: DM requesting fog settings:', socket.id);
    socket.emit('dm-fog-settings', gameState.fogSettings);
  });
  
  socket.on('join-as-player', () => {
    socket.join('players');
    console.log('Server: Client joined as PLAYER:', socket.id);
    console.log('Server: Players in room:', io.sockets.adapter.rooms.get('players')?.size || 0);
    
    // Send current fog settings to new player
    console.log('Server: Sending current fog settings to new player:', gameState.fogSettings);
    socket.emit('player-fog-settings', gameState.fogSettings);
  });

  socket.on('player-request-fog-settings', () => {
    console.log('Server: Player requesting fog settings:', socket.id);
    socket.emit('player-fog-settings', gameState.fogSettings);
  });

  socket.on('dm-update-fog-settings', (settings) => {
    console.log('Server: ⚙️ DM updating fog settings:', settings);
    
    // Update server-side fog settings
    gameState.fogSettings = { 
      fogEnabled: settings.fogEnabled,
      visionRadius: settings.visionRadius,
      showVisionCircles: settings.showVisionCircles || true
    };
    console.log('Server: Updated gameState.fogSettings:', gameState.fogSettings);
    
    // Save the updated settings
    saveGameState();
    
    console.log('Server: 📡 Broadcasting to players room...');
    console.log('Server: Players in room:', io.sockets.adapter.rooms.get('players')?.size || 0);
    
    // Broadcast to ALL players
    io.to('players').emit('player-fog-settings', {
      fogEnabled: settings.fogEnabled,
      visionRadius: settings.visionRadius
    });
    
    console.log('Server: ✅ Fog settings broadcast complete');
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
  console.log(`Access from LAN devices using your machine's IP address`);
});

// Graceful shutdown handling
process.on('SIGINT', () => {
  console.log('\nReceived SIGINT, saving game state and shutting down gracefully...');
  saveGameState();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nReceived SIGTERM, saving game state and shutting down gracefully...');
  saveGameState();
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  saveGameState();
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  saveGameState();
});