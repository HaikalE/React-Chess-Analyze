import React from 'react';
import { GameProvider } from './contexts/GameContext';
import Header from './components/Layout/Header';
import Board from './components/Board/Board';
import ReviewPanel from './components/Layout/ReviewPanel';
import Footer from './components/Layout/Footer';

// Make sure to import the CSS with Tailwind directives
import './index.css';

function App() {
  return (
    <GameProvider>
      {/* Remove min-h-screen to prevent excessive stretching */}
      <div className="flex flex-col">
        <Header />
        
        {/* Removed flex-1 to prevent the main content from stretching unnecessarily */}
        <main className="flex flex-col lg:flex-row items-start justify-center gap-3 p-2 md:p-4 max-w-7xl mx-auto w-full">
          <Board />
          <ReviewPanel />
        </main>
        
        <Footer />
        
        {/* Audio elements for chess sounds */}
        <audio id="sound-fx-move" className="hidden" src="/static/media/move.mp3"></audio>
        <audio id="sound-fx-capture" className="hidden" src="/static/media/capture.mp3"></audio>
        <audio id="sound-fx-check" className="hidden" src="/static/media/check.mp3"></audio>
        <audio id="sound-fx-castle" className="hidden" src="/static/media/castle.mp3"></audio>
        <audio id="sound-fx-promote" className="hidden" src="/static/media/promote.mp3"></audio>
        <audio id="sound-fx-game-end" className="hidden" src="/static/media/game_end.mp3"></audio>
      </div>
    </GameProvider>
  );
}

export default App;