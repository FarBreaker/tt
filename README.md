# Tabletop Simulator

A real-time tabletop RPG simulator with separate interfaces for Dungeon Masters and Players.

## Features

- **Dungeon Master Interface**: Full control over maps and points of interest
- **Player Interface**: View-only interface that reflects DM's decisions
- **Real-time Synchronization**: WebSocket-based communication
- **Map Management**: Create maps with custom grid dimensions (5x5 to 100x100)
- **Image Upload**: Upload background images for maps (JPG, PNG, etc.)
- **Points of Interest**: Add, manage, and control visibility of POIs with different types
- **Grid-based System**: Configurable grid system for precise positioning
- **File Storage**: Uploaded images are stored on the server and served statically
- **Game State Persistence**: Automatic saving every 30 seconds with manual save/load
- **Import/Export**: Export game sessions and import them later
- **Backup System**: Automatic backups when importing new game states

## Project Structure

```
tabletop-simulator/
├── server/                 # Node.js backend
│   ├── src/
│   │   └── server.js      # Express + Socket.IO server
│   ├── uploads/           # Uploaded map images
│   ├── data/              # Game state JSON files
│   └── package.json
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── App.jsx       # Main app component
│   │   └── main.jsx      # Entry point
│   └── package.json
└── package.json           # Root package.json
```

## Getting Started

1. Install dependencies:
```bash
npm run install-all
```

2. Start the development servers:
```bash
npm run dev
```

This will start:
- Backend server on http://0.0.0.0:3001 (accessible from LAN)
- Frontend on http://0.0.0.0:5173 (accessible from LAN)

3. Get your network information:
```bash
npm run network-info
```

## Network Access

### Local Access (same computer):
- Open http://localhost:5173

### LAN Access (other devices on same network):
1. Run `npm run network-info` to get your IP address
2. Share the LAN URL (e.g., http://192.168.1.100:5173) with other players
3. Make sure your firewall allows connections on ports 3001 and 5173

### Firewall Configuration:
- **Windows**: Allow Node.js through Windows Defender Firewall
- **macOS**: System Preferences > Security & Privacy > Firewall > Allow Node.js
- **Linux**: Configure iptables or ufw to allow ports 3001 and 5173

## API Endpoints

### Maps
- `GET /api/maps` - Get all maps
- `POST /api/maps` - Create a new map (supports multipart/form-data for image upload)
  - `name` (string): Map name
  - `gridWidth` (number): Grid width (5-100)
  - `gridHeight` (number): Grid height (5-100)  
  - `mapImage` (file): Optional background image
- `POST /api/maps/:mapId/set-current` - Set current active map

### Points of Interest
- `GET /api/maps/:mapId/poi` - Get POIs for a map
- `POST /api/maps/:mapId/poi` - Create a new POI
- `PUT /api/poi/:poiId/visibility` - Toggle POI visibility

### Game State Management
- `POST /api/save` - Manually save current game state
- `GET /api/export` - Export game state as downloadable JSON file
- `POST /api/import` - Import game state from JSON file (creates backup)
- `GET /api/info` - Get game state statistics and info

## WebSocket Events

- `game-state` - Initial game state for new connections
- `map-changed` - Broadcast when DM changes the current map
- `poi-visibility-changed` - Broadcast when POI visibility changes

## Usage

### For the Dungeon Master:
1. Open the application (locally or via LAN)
2. Choose "Join as Dungeon Master"
3. Create maps with custom grid sizes and background images
4. Add player characters (actors) with custom icons and colors
5. Add POIs with different types and control their visibility
6. Move characters around the map by dragging them
7. Switch between maps as needed

### For Players:
1. Open the LAN URL provided by the DM (e.g., http://192.168.1.100:5173)
2. Choose "Join as Player"
3. View the current map and all character positions in real-time
4. See POIs that the DM has made visible

### Multi-Device Setup:
- **DM**: Uses any device (computer, tablet) with full control interface
- **Players**: Can use phones, tablets, or computers for viewing
- **Real-time sync**: All devices stay synchronized automatically

## File Storage

- Uploaded map images are stored in `server/uploads/`
- Images are served at `http://localhost:3001/uploads/filename`
- Supported formats: JPG, PNG, GIF, WebP
- Maximum file size: 10MB

## Game State Persistence

- **Auto-save**: Game state is automatically saved every 30 seconds
- **Manual save**: DMs can manually trigger saves through the interface
- **Export/Import**: Complete game sessions can be exported as JSON files and imported later
- **Backup system**: When importing, the current state is automatically backed up
- **Graceful shutdown**: Game state is saved when the server shuts down
- **Data location**: Game states are stored in `server/data/gameState.json`
- **Backup location**: Import backups are stored in `server/data/gameState-backup-[timestamp].json`

## Next Steps

- Add map image upload functionality
- Implement token/character movement
- Add chat system
- Include dice rolling mechanics
- Add fog of war features