import React, { useState, useEffect } from 'react';
import { useGameContext } from '../../contexts/GameContext';
import { 
  formatEvaluation, 
  getWinningColor, 
  calculateEvalBarHeight,
  isEvalTextVisible
} from '../../utils/evalUtils';
import { getMovedPlayer } from '../../utils/boardUtils';

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
    <div className="w-5 mr-2 rounded-md overflow-hidden shadow-inner bg-secondary-700 flex flex-col">
      <div 
        style={{ height: `${blackHeight}%` }}
        className="w-full bg-secondary-900 transition-all duration-500 ease-out flex items-start justify-center"
      >
        {showBlackText && (
          <span className="text-xs font-mono text-white font-semibold pt-1 leading-none">
            {formattedEval}
          </span>
        )}
      </div>
      
      <div
        style={{ height: `${whiteHeight}%` }}
        className="w-full bg-white transition-all duration-500 ease-out flex items-end justify-center"
      >
        {showWhiteText && (
          <span className="text-xs font-mono text-secondary-900 font-semibold pb-1 leading-none">
            {formattedEval}
          </span>
        )}
      </div>
    </div>
  );
};

export default EvaluationBar;