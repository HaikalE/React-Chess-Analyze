import React, { useState } from 'react';
import useChessboard from '../../hooks/useChessboard';
import { useGameContext } from '../../contexts/GameContext';
import EvaluationBar from './EvaluationBar';
import { BOARD_SIZE } from '../../utils/boardUtils';
import './Board.css';

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
    <div className="board-outer-container">
      <EvaluationBar />
      
      <div className="board-inner-container">
        <div className="profile top-player-profile">
          {topPlayerProfile.username} ({topPlayerProfile.rating})
        </div>
        
        <canvas 
          id="chess-board"
          ref={canvasRef}
          width={BOARD_SIZE}
          height={BOARD_SIZE}
          onClick={handleBoardClick}
          className="chess-board"
        />
        
        <div className="profile bottom-player-profile">
          {bottomPlayerProfile.username} ({bottomPlayerProfile.rating})
        </div>
      </div>
    </div>
  );
};

export default Board;