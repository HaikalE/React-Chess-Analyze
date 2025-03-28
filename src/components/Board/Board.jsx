import React, { useState } from 'react';
import useChessboard from '../../hooks/useChessboard';
import { useGameContext } from '../../contexts/GameContext';
import EvaluationBar from './EvaluationBar';
import BoardControls from './BoardControls';
import { BOARD_SIZE } from '../../utils/boardUtils';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCirclePlay, faChessKnight } from '@fortawesome/free-solid-svg-icons';

const Board = () => {
  const { 
    boardFlipped, 
    whitePlayer, 
    blackPlayer,
    isViewingEngineLine,
    activeEngineLine,
    displayPosition,
    clearActiveEngineLine
  } = useGameContext();
  
  const [showSuggestionArrows, setShowSuggestionArrows] = useState(true);
  const { canvasRef, handleBoardClick } = useChessboard(showSuggestionArrows);

  // Get profiles based on board orientation
  const bottomPlayerProfile = boardFlipped ? blackPlayer : whitePlayer;
  const topPlayerProfile = boardFlipped ? whitePlayer : blackPlayer;

  return (
    // Added h-auto to prevent vertical stretching
    <div className="card h-auto flex flex-col items-center p-2">
      <div className="flex w-full max-w-xl">
        <div className="flex"> 
          <EvaluationBar />
        </div>
        
        <div className="flex-1 flex flex-col">
          {/* Top player */}
          <div className="py-1.5 px-3 bg-secondary-700 rounded-t-md flex justify-between items-center h-[36px]">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-secondary-400"></div>
              <span className="text-sm sm:text-base font-medium text-secondary-100">{topPlayerProfile.username}</span>
            </div>
            <span className="text-sm font-mono bg-secondary-600 py-0.5 px-2 rounded text-secondary-200">
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
            
            {/* Overlay for engine variation */}
            {isViewingEngineLine && (
              <div className="absolute top-2 left-2 right-2 bg-primary-900/80 text-white px-3 py-2 rounded-md flex items-center justify-between shadow-md">
                <div className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faChessKnight} className="text-primary-300" />
                  <span className="text-sm font-medium">
                    Viewing engine line: {activeEngineLine?.moveSAN || 'Variation'}
                  </span>
                </div>
                <button 
                  onClick={clearActiveEngineLine}
                  className="text-xs bg-primary-700 hover:bg-primary-600 px-2 py-1 rounded"
                >
                  Back to game
                </button>
              </div>
            )}
          </div>
          
          {/* Bottom player */}
          <div className="py-1.5 px-3 bg-secondary-700 rounded-b-md flex justify-between items-center h-[36px]">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-white"></div>
              <span className="text-sm sm:text-base font-medium text-secondary-100">{bottomPlayerProfile.username}</span>
            </div>
            <span className="text-sm font-mono bg-secondary-600 py-0.5 px-2 rounded text-secondary-200">
              {bottomPlayerProfile.rating}
            </span>
          </div>
          
          {/* Board controls with minimal margin */}
          <div className="mt-1 mb-0">
            <BoardControls 
              showSuggestionArrows={showSuggestionArrows} 
              setShowSuggestionArrows={setShowSuggestionArrows} 
              onSave={() => {}}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Board;