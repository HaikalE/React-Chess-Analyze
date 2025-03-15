import React from 'react';
import { GameProvider } from './contexts/GameContext';
import Announcement from './components/Layout/Announcement';
import Board from './components/Board/Board';
import ReviewPanel from './components/Layout/ReviewPanel';
import './App.css';

function App() {
  return (
    <GameProvider>
      <div className="app">
        <Announcement />
        
        <div className="review-container">
          <Board />
          <ReviewPanel />
        </div>
        
        {/* Audio elements for chess sounds */}
        <audio id="sound-fx-move" className="sound-fx" src="/static/media/move.mp3"></audio>
        <audio id="sound-fx-capture" className="sound-fx" src="/static/media/capture.mp3"></audio>
        <audio id="sound-fx-check" className="sound-fx" src="/static/media/check.mp3"></audio>
        <audio id="sound-fx-castle" className="sound-fx" src="/static/media/castle.mp3"></audio>
        <audio id="sound-fx-promote" className="sound-fx" src="/static/media/promote.mp3"></audio>
        <audio id="sound-fx-game-end" className="sound-fx" src="/static/media/game_end.mp3"></audio>
      </div>
    </GameProvider>
  );
}

export default App;