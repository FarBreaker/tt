import React from 'react';

function RoleSelector({ onSelectRole }) {
  return (
    <div className="app">
      <header className="header">
        <h1>Tabletop Simulator</h1>
        <div className="role-selector">
          <button 
            className="role-button dm" 
            onClick={() => onSelectRole('dm')}
          >
            Join as Dungeon Master
          </button>
          <button 
            className="role-button player" 
            onClick={() => onSelectRole('player')}
          >
            Join as Player
          </button>
        </div>
      </header>
    </div>
  );
}

export default RoleSelector;