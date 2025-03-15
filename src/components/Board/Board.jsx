import React, { useState } from 'react';
import useChessboard from '../../hooks/useChessboard';
import { useGameContext } from '../../contexts/GameContext';
import EvaluationBar from './EvaluationBar';
import BoardControls from './BoardControls';
import { BOARD_SIZE } from '../../utils/boardUtils';

const Board = () => {
  const { 
    boardFlipped, 
    whitePlayer, 
    blackPlayer,
  } = useGameContext();
  
  const [showSuggestionArrows, setShowSuggestionArrows] = useState(true);
  const { canvasRef, handleBoardClick } = useChessboard(showSuggestionArrows);

  // Get profiles based on board orientation
  const bottomPlayerProfile = boardFlipped ? blackPlayer : whitePlayer;
  const topPlayerProfile = boardFlipped ? whitePlayer : blackPlayer;

  return (
    <div className="card flex flex-col items-center">
      <div className="flex w-full max-w-xl">
        <EvaluationBar />
        
        <div className="flex-1 flex flex-col">
          {/* Top player */}
          <div className="py-2 px-3 bg-secondary-700 rounded-t-md flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-secondary-400"></div>
              <span className="text-sm sm:text-base font-medium">{topPlayerProfile.username}</span>
            </div>
            <span className="text-sm font-mono bg-secondary-600 py-0.5 px-2 rounded">
              {topPlayerProfile.rating}
            </span>
          </div>
          
          {/* Chess board */}
          <div className="relative">
            <canvas 
              id="chess-board"
              ref={canvasRef}
              width={BOARD_SIZE}
              height={BOARD_SIZE}
              onClick={handleBoardClick}
              className="w-full h-auto cursor-pointer border border-secondary-600 shadow-lg"
            />
          </div>
          
          {/* Bottom player */}
          <div className="py-2 px-3 bg-secondary-700 rounded-b-md flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-white"></div>
              <span className="text-sm sm:text-base font-medium">{bottomPlayerProfile.username}</span>
            </div>
            <span className="text-sm font-mono bg-secondary-600 py-0.5 px-2 rounded">
              {bottomPlayerProfile.rating}
            </span>
          </div>
        </div>
      </div>
      
      {/* Board controls */}
      <BoardControls 
        showSuggestionArrows={showSuggestionArrows} 
        setShowSuggestionArrows={setShowSuggestionArrows} 
      />
    </div>
  );
};

export default Board;