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
      <div className="min-h-screen flex flex-col">
        <Header />
        
        <main className="flex-1 flex flex-col lg:flex-row items-center lg:items-start justify-center gap-6 p-4 md:p-6 max-w-7xl mx-auto w-full">
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