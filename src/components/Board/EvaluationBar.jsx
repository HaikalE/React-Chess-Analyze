import React, { useEffect, useState, useRef } from 'react';
import { useGameContext } from '../../contexts/GameContext';
import { BOARD_SIZE } from '../../utils/boardUtils';

const formatEval = (evaluation) => {
  if (!evaluation) return "0.0";
  
  if (evaluation.type === "cp") {
    const value = Math.abs(evaluation.value) / 100;
    return value.toFixed(1);
  } else if (evaluation.type === "mate") {
    if (evaluation.value === 0) return "#";
    return "M" + Math.abs(evaluation.value);
  }
  
  return "0.0";
};

const EvaluationBar = () => {
  const { 
    currentMoveIndex, 
    reportResults, 
    isViewingEngineLine,  // Using this to detect if we're viewing an engine line
    activeEngineLine,     // This contains the selected engine line
    engineMoveIndex,      // Current position in the engine line
    displayPosition       // The position currently displayed (might be from engine line)
  } = useGameContext();
  
  const [whiteHeight, setWhiteHeight] = useState(50);
  const [blackHeight, setBlackHeight] = useState(50);
  const [evalDisplay, setEvalDisplay] = useState("0.0");
  const [showWhiteText, setShowWhiteText] = useState(true);
  const [showBlackText, setShowBlackText] = useState(false);
  const [originalEval, setOriginalEval] = useState(null); // Store original evaluation
  
  // Reference to the chessboard to match its height
  const boardRef = useRef(null);
  
  // Effect for finding the chessboard
  useEffect(() => {
    // Find the chessboard element
    const chessboard = document.getElementById('chess-board');
    if (chessboard) {
      boardRef.current = chessboard;
    }
  }, []);
  
  // Store the original evaluation when entering engine line view
  useEffect(() => {
    // When we start viewing an engine line, save the current evaluation
    if (isViewingEngineLine && !originalEval) {
      const position = reportResults?.positions?.[currentMoveIndex];
      
      try {
        if (position?.topLines?.length > 0) {
          const topLine = position.topLines.find(line => line.id === 1);
          if (topLine?.evaluation) {
            setOriginalEval(topLine.evaluation);
          }
        }
      } catch (error) {
        console.error("Error saving original evaluation:", error);
      }
    } 
    // When we stop viewing an engine line, clear the saved evaluation
    else if (!isViewingEngineLine) {
      setOriginalEval(null);
    }
  }, [isViewingEngineLine, reportResults, currentMoveIndex, originalEval]);
  
  useEffect(() => {
    let evaluation = { type: "cp", value: 0 };
    
    try {
      // If viewing engine line, use its evaluation
      if (isViewingEngineLine && activeEngineLine?.evaluation) {
        evaluation = activeEngineLine.evaluation;
        
        // Apply a small delta based on engineMoveIndex to show progression
        // This only works for cp evaluations, not mate
        if (evaluation.type === "cp" && activeEngineLine.futureMoves && engineMoveIndex > 0) {
          // Small incremental change based on move index
          // We'll adjust by 5cp per move as a simple approximation
          const moveEffect = engineMoveIndex * 5;
          
          // Evaluation improves for the side to move in the original position
          const originalPosition = reportResults?.positions?.[currentMoveIndex];
          const isWhiteToMove = originalPosition?.fen.includes(" w ");
          
          if (isWhiteToMove) {
            evaluation = {
              type: "cp",
              value: evaluation.value + moveEffect
            };
          } else {
            evaluation = {
              type: "cp", 
              value: evaluation.value - moveEffect
            };
          }
        }
      } 
      // Otherwise use normal position evaluation
      else {
        const position = reportResults?.positions?.[currentMoveIndex];
        
        if (position?.topLines?.length > 0) {
          const topLine = position.topLines.find(line => line.id === 1);
          if (topLine?.evaluation) {
            evaluation = topLine.evaluation;
          }
        }
      }
    } catch (error) {
      console.error("Error getting evaluation:", error);
    }
    
    // Format display value
    setEvalDisplay(formatEval(evaluation));
    
    // Calculate bar heights
    let whitePercent = 50; // Default to equal position
    
    if (evaluation.type === "mate") {
      // Handle checkmate situations - more extreme values for clear visualization
      if (evaluation.value === 0) {
        // If mate value is 0, it means immediate checkmate
        // Check who's to move to determine the winner
        const position = isViewingEngineLine 
          ? displayPosition 
          : reportResults?.positions?.[currentMoveIndex];
        
        const isWhiteToMove = position?.fen?.includes(" w ");
        
        // If white to move and mate=0, black has won (white is mated)
        whitePercent = isWhiteToMove ? 1 : 99;
      } 
      else if (evaluation.value > 0) {
        // White delivers mate - show almost entirely white
        // For mate in 1, show 99%
        // For longer mates, still show very dominant but slightly less
        whitePercent = Math.min(99, 99 - (Math.abs(evaluation.value) - 1));
      } 
      else {
        // Black delivers mate - show almost entirely black
        // For mate in 1, show 1%
        // For longer mates, still show very minimal but slightly more
        whitePercent = Math.max(1, 1 + (Math.abs(evaluation.value) - 1));
      }
    } 
    else {
      // Handle centipawn evaluation
      const cpValue = evaluation.value;
      const maxEval = 1000; // Cap at +/- 10 pawns
      
      // Scale from 10% to 90% based on evaluation
      whitePercent = 50 + (Math.min(Math.abs(cpValue), maxEval) / maxEval * 45) * Math.sign(cpValue);
      
      // For very large evaluations (>8 pawns), show more extreme bar
      if (Math.abs(cpValue) > 800) {
        whitePercent = cpValue > 0 ? 95 : 5;
      }
    }
    
    // Clamp values to ensure both colors are always visible, at least a tiny bit
    whitePercent = Math.max(1, Math.min(99, whitePercent));
    
    // Set state values
    setWhiteHeight(whitePercent);
    setBlackHeight(100 - whitePercent);
    
    // Determine which side should show the text
    const whiteWinning = whitePercent > 50;
    setShowWhiteText(whiteWinning);
    setShowBlackText(!whiteWinning);
  }, [currentMoveIndex, reportResults, isViewingEngineLine, activeEngineLine, engineMoveIndex, displayPosition]);
  
  // Find the player info bars to get their height
  const getPlayerBarsHeight = () => {
    const playerBars = document.querySelectorAll('.bg-secondary-700.rounded-t-md, .bg-secondary-700.rounded-b-md');
    let totalHeight = 0;
    
    if (playerBars && playerBars.length) {
      playerBars.forEach(bar => {
        totalHeight += bar.offsetHeight;
      });
    }
    
    return totalHeight || 72; // default to 72px if we can't find the bars
  };
  
  const getBarHeight = () => {
    if (boardRef.current) {
      const playerBarsHeight = getPlayerBarsHeight();
      return boardRef.current.offsetHeight + playerBarsHeight;
    }
    return BOARD_SIZE + 72; // Default fallback
  };
  
  const barHeight = getBarHeight();
  
  return (
    <div 
      className="w-6 mr-2 rounded-md overflow-hidden shadow-inner flex flex-col border border-secondary-600 relative" 
      style={{ height: `${barHeight}px` }}
    >
      {/* Black section */}
      <div 
        style={{ height: `${blackHeight}%` }} 
        className="w-full bg-secondary-900 transition-[height] duration-300 eval-bar-transition"
      >
        {showBlackText && (
          <div className="w-full text-center text-xs font-mono text-white font-semibold pt-1">
            {evalDisplay}
          </div>
        )}
      </div>
      
      {/* White section */}
      <div
        style={{ height: `${whiteHeight}%` }}
        className="w-full bg-white transition-[height] duration-300 eval-bar-transition flex items-end justify-center"
      >
        {showWhiteText && (
          <div className="w-full text-center text-xs font-mono text-secondary-900 font-semibold pb-1">
            {evalDisplay}
          </div>
        )}
      </div>
      
      {/* Engine line indicator that shows we're viewing a variation */}
      {isViewingEngineLine && (
        <div className="absolute left-0 top-0 h-full w-1 bg-primary-500"></div>
      )}
    </div>
  );
};

export default EvaluationBar;