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
  const { currentPosition } = useGameContext();
  const [whiteHeight, setWhiteHeight] = useState(50);
  const [blackHeight, setBlackHeight] = useState(50);
  const [evalDisplay, setEvalDisplay] = useState("0.0");
  const [showWhiteText, setShowWhiteText] = useState(true);
  const [showBlackText, setShowBlackText] = useState(false);
  
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
  
  useEffect(() => {
    // Safely get evaluation from current position
    let evaluation = { type: "cp", value: 0 };
    
    try {
      if (currentPosition?.topLines?.length > 0) {
        const topLine = currentPosition.topLines.find(line => line.id === 1);
        if (topLine?.evaluation) {
          evaluation = topLine.evaluation;
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
      // Handle checkmate
      if (evaluation.value === 0) {
        whitePercent = 5; // Default to black winning in checkmate
      } else if (evaluation.value > 0) {
        whitePercent = 95; // White is winning with mate
      } else {
        whitePercent = 5; // Black is winning with mate
      }
    } else {
      // Handle centipawn evaluation
      const cpValue = evaluation.value;
      const maxEval = 1000; // Cap at +/- 10 pawns
      
      // Scale from 10% to 90% based on evaluation
      whitePercent = 50 + (Math.min(Math.abs(cpValue), maxEval) / maxEval * 45) * Math.sign(cpValue);
    }
    
    // Clamp values to ensure both colors are always visible
    whitePercent = Math.max(5, Math.min(95, whitePercent));
    
    // Set state values
    setWhiteHeight(whitePercent);
    setBlackHeight(100 - whitePercent);
    
    // Determine which side should show the text
    if (evaluation.type === "mate" && evaluation.value === 0) {
      setShowWhiteText(false);
      setShowBlackText(false);
    } else {
      const whiteWinning = evaluation.value >= 0;
      setShowWhiteText(whiteWinning);
      setShowBlackText(!whiteWinning);
    }
  }, [currentPosition]);
  
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
      className="w-6 mr-2 rounded-md overflow-hidden shadow-inner flex flex-col border border-secondary-600" 
      style={{ height: `${barHeight}px` }}
    >
      {/* Black section */}
      <div 
        style={{ height: `${blackHeight}%` }} 
        className="w-full bg-secondary-900 transition-[height] duration-300"
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
        className="w-full bg-white transition-[height] duration-300 flex items-end justify-center"
      >
        {showWhiteText && (
          <div className="w-full text-center text-xs font-mono text-secondary-900 font-semibold pb-1">
            {evalDisplay}
          </div>
        )}
      </div>
    </div>
  );
};

export default EvaluationBar;