import React, { useState, useEffect } from 'react';
import { useGameContext } from '../../contexts/GameContext';
import { 
  formatEvaluation, 
  getWinningColor, 
  calculateEvalBarHeight,
  isEvalTextVisible
} from '../../utils/evalUtils';
import { getMovedPlayer } from '../../utils/boardUtils';
import './EvaluationBar.css';

const EvaluationBar = () => {
  const { currentPosition, boardFlipped, currentMoveIndex, positions } = useGameContext();
  
  const [whiteHeight, setWhiteHeight] = useState(50);
  const [blackHeight, setBlackHeight] = useState(50);
  const [evaluation, setEvaluation] = useState({ type: 'cp', value: 0 });
  
  useEffect(() => {
    if (!currentPosition) return;
    
    const topLine = currentPosition.topLines?.find(line => line.id === 1);
    const newEvaluation = topLine?.evaluation || { type: 'cp', value: 0 };
    
    setEvaluation(newEvaluation);
    
    // Calculate heights based on evaluation
    const whiteHeightPercent = calculateEvalBarHeight(newEvaluation, true);
    const blackHeightPercent = 100 - whiteHeightPercent;
    
    // Animate the evaluation bar changes
    setWhiteHeight(whiteHeightPercent);
    setBlackHeight(blackHeightPercent);
  }, [currentPosition]);
  
  // Get the player who moved last (needed for displaying checkmate)
  const movedPlayer = currentMoveIndex > 0 && positions[currentMoveIndex] 
    ? getMovedPlayer(positions[currentMoveIndex].fen)
    : "black";
  
  const formattedEval = formatEvaluation(evaluation);
  const showWhiteText = isEvalTextVisible(evaluation, boardFlipped, "white");
  const showBlackText = isEvalTextVisible(evaluation, boardFlipped, "black");
  
  return (
    <div className="evaluation-bar-container">
      <svg width="40" height="730" className="evaluation-bar">
        {/* Black area */}
        <rect
          x="0"
          y="0"
          width="40"
          height={`${blackHeight}%`}
          fill="#000000"
          className="black-rect"
        />
        
        {/* White area */}
        <rect
          x="0"
          y={`${blackHeight}%`}
          width="40"
          height={`${whiteHeight}%`}
          fill="#ffffff"
          className="white-rect"
        />
        
        {/* Black evaluation text */}
        <text
          x="20"
          y="20"
          fill="#ffffff"
          fontSize="16"
          textAnchor="middle"
          visibility={showBlackText ? "visible" : "hidden"}
          className="black-eval-text"
        >
          {formattedEval}
        </text>
        
        {/* White evaluation text */}
        <text
          x="20"
          y="710"
          fill="#000000"
          fontSize="16"
          textAnchor="middle"
          visibility={showWhiteText ? "visible" : "hidden"}
          className="white-eval-text"
        >
          {formattedEval}
        </text>
      </svg>
    </div>
  );
};

export default EvaluationBar;