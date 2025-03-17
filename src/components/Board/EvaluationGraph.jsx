import React, { useRef, useEffect, useState } from 'react';
import { useGameContext } from '../../contexts/GameContext';
import { classificationColors, getSemiTransparentColor } from '../../utils/boardUtils';
import { Chess } from 'chess.js';

const EvaluationGraph = () => {
  const { 
    reportResults, 
    currentMoveIndex, 
    traverseMoves, 
    boardFlipped, 
    whitePlayer, 
    blackPlayer 
  } = useGameContext();
  
  const canvasRef = useRef(null);
  const [hoverIndex, setHoverIndex] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  
  // Draw the evaluation graph
  useEffect(() => {
    if (!canvasRef.current || !reportResults) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const positions = reportResults.positions;
    const graphHeight = 100;
    const graphWidth = canvas.width;
    
    // Clear the canvas
    ctx.clearRect(0, 0, graphWidth, graphHeight);
    
    // Set background
    ctx.fillStyle = "#1e293b"; // secondary-800
    ctx.fillRect(0, 0, graphWidth, graphHeight);
    
    // Constants for scaling
    const maxEval = 1100; // Max centipawn value 
    const cpPerPixel = maxEval / (graphHeight / 2);
    
    // Calculate bar dimensions
    const baseBarWidth = Math.floor(graphWidth / positions.length);
    const remainderPixels = graphWidth - (baseBarWidth * positions.length);
    const extraWidthPerBar = remainderPixels / positions.length;
    
    // Pre-calculate bar positions and widths for consistent drawing and hover detection
    const barInfo = positions.map((_, index) => {
      const width = baseBarWidth + 
        Math.floor((index + 1) * extraWidthPerBar) - 
        Math.floor(index * extraWidthPerBar);
        
      // Calculate previous widths to determine x-position
      const prevBarsWidth = Array.from({length: index}, (_, i) => {
        return baseBarWidth + 
          Math.floor((i + 1) * extraWidthPerBar) - 
          Math.floor(i * extraWidthPerBar);
      }).reduce((sum, w) => sum + w, 0);
      
      return {
        index,
        width,
        x: prevBarsWidth
      };
    });
    
    // Check for checkmate in the final position
    let finalCheckmateDetected = false;
    let finalCheckmateWinner = null;
    
    if (positions.length > 0) {
      const finalPosition = positions[positions.length - 1];
      try {
        const chess = new Chess(finalPosition.fen);
        if (chess.isCheckmate()) {
          finalCheckmateDetected = true;
          finalCheckmateWinner = finalPosition.fen.includes(" w ") ? "black" : "white";
          console.log("Detected checkmate! Winner:", finalCheckmateWinner);
        }
      } catch (error) {
        console.warn("Error checking final position for checkmate:", error);
      }
    }
    
    // Draw each position bar
    for (const barData of barInfo) {
      const i = barData.index;
      const position = positions[i];
      const topLine = position.topLines?.find(line => line.id === 1);
      let evaluation = topLine?.evaluation;
      
      // Set background color
      if (i === hoverIndex) {
        ctx.fillStyle = "#475569"; // secondary-600
      } else {
        ctx.fillStyle = "#0f172a"; // secondary-900
      }
      
      // Draw background
      ctx.fillRect(barData.x, 0, barData.width, graphHeight);
      
      // Check for checkmate in this specific position
      let isCheckmatePosition = false;
      let checkmateWinner = null;
      
      try {
        // First check for "#" or "++" in move SAN (checkmate notation)
        const hasMateSymbol = position.move?.san && 
                             (position.move.san.includes('#') || 
                              position.move.san.includes('++'));
        
        if (hasMateSymbol || i === positions.length - 1 && finalCheckmateDetected) {
          isCheckmatePosition = true;
          checkmateWinner = position.fen.includes(" w ") ? "black" : "white";
          
          // For final position, use the pre-computed winner
          if (i === positions.length - 1 && finalCheckmateDetected) {
            checkmateWinner = finalCheckmateWinner;
          }
          
          // Override evaluation to show decisive advantage
          evaluation = {
            type: "mate",
            value: 0,
            winner: checkmateWinner
          };
        }
        // If we still don't have a clear indication, try using Chess.js to check
        else if (!evaluation || !isCheckmatePosition) {
          const chess = new Chess(position.fen);
          if (chess.isCheckmate()) {
            isCheckmatePosition = true;
            checkmateWinner = position.fen.includes(" w ") ? "black" : "white";
            
            // Set evaluation to represent checkmate
            evaluation = {
              type: "mate",
              value: 0,
              winner: checkmateWinner
            };
          }
        }
      } catch (error) {
        console.warn("Error checking for checkmate:", error);
      }
      
      // Skip to next position if we still don't have evaluation
      if (!evaluation) continue;
      
      // Handle mate positions
      if (evaluation.type === "mate") {
        // For checkmate (value = 0), fill the entire height based on winner
        if (evaluation.value === 0 || isCheckmatePosition) {
          if (isCheckmatePosition || evaluation.winner) {
            // Use the detected winner or evaluation winner
            const winner = checkmateWinner || evaluation.winner;
            ctx.fillStyle = winner === "white" ? "#ffffff" : "#000000";
            
            // Fill entire bar in winner's color
            ctx.fillRect(
              barData.x, 
              0, 
              barData.width, 
              graphHeight
            );
          } else {
            // Fallback method: determine from FEN if we still don't have a winner
            const isWhiteToMove = position.fen.includes(" w ");
            ctx.fillStyle = isWhiteToMove ? "#000000" : "#ffffff";
            
            ctx.fillRect(
              barData.x, 
              0, 
              barData.width, 
              graphHeight
            );
          }
        } 
        // For mate-in-X (not immediate checkmate)
        else {
          // For mate-in-X, fill based on which side has the advantage
          const color = evaluation.value > 0 ? "#ffffff" : "#000000";
          ctx.fillStyle = i === currentMoveIndex ? "#10b981" : color;
          
          // Fill entire bar to show decisive advantage
          ctx.fillRect(
            barData.x, 
            0, 
            barData.width, 
            graphHeight
          );
        }
      } 
      // Handle centipawn evaluation 
      else if (evaluation.type === "cp") {
        const height = graphHeight / 2 + evaluation.value / cpPerPixel;
        
        if (i === hoverIndex) {
          ctx.fillStyle = "#e2e8f0"; // secondary-200
        } else {
          ctx.fillStyle = "#ffffff";
        }
        
        // Draw centipawn bar (adjusting for board orientation)
        if (!boardFlipped) {
          ctx.fillRect(
            barData.x, 
            graphHeight - height, 
            barData.width, 
            height
          );
        } else {
          ctx.fillRect(
            barData.x, 
            0, 
            barData.width, 
            height
          );
        }
      }
      
      // Highlight current move 
      if (i === currentMoveIndex) {
        const classification = position.classification;
        const classificationColor = classification 
          ? classificationColors[classification] 
          : "#10b981"; // accent-500
          
        ctx.fillStyle = classification 
          ? getSemiTransparentColor(classificationColor, 0.5) 
          : getSemiTransparentColor("#0ea5e9", 0.5); // primary-500
          
        ctx.fillRect(
          barData.x, 
          0, 
          barData.width, 
          graphHeight
        );
      }
    }
    
    // Draw midline
    ctx.beginPath();
    ctx.moveTo(0, graphHeight / 2);
    ctx.lineTo(graphWidth, graphHeight / 2);
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#ef4444'; // error-500
    ctx.stroke();
    
    // Draw tooltip if hovering
    if (hoverIndex !== null) {
      const position = positions[hoverIndex];
      const classification = position?.classification;
      
      if (classification && position) {
        // Draw tooltip background
        const tooltipX = mousePos.x + 10;
        const tooltipY = mousePos.y - 20;
        const tooltipWidth = 150;
        const tooltipHeight = 40;
        
        ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
        ctx.strokeStyle = "#64748b"; // secondary-500
        ctx.lineWidth = 1;
        
        // Make sure tooltip stays within canvas
        const adjustedX = Math.min(tooltipX, graphWidth - tooltipWidth - 5);
        const adjustedY = Math.min(tooltipY, graphHeight - tooltipHeight - 5);
        
        // Draw tooltip
        ctx.beginPath();
        ctx.roundRect(adjustedX, adjustedY, tooltipWidth, tooltipHeight, 5);
        ctx.fill();
        ctx.stroke();
        
        // Draw text
        ctx.fillStyle = "#0f172a"; // secondary-900
        ctx.font = "12px 'Inter', sans-serif";
        ctx.textAlign = "left";
        
        // Player name
        const playerName = hoverIndex % 2 === 0 
          ? blackPlayer.username 
          : whitePlayer.username;
        
        ctx.fillText(
          playerName, 
          adjustedX + 10, 
          adjustedY + 20
        );
        
        // Classification
        ctx.fillStyle = classificationColors[classification];
        ctx.fillText(
          classification.toUpperCase(), 
          adjustedX + 10, 
          adjustedY + 35
        );
      }
    }
  }, [
    reportResults, 
    currentMoveIndex, 
    hoverIndex, 
    boardFlipped, 
    mousePos,
    whitePlayer,
    blackPlayer
  ]);
  
  // Handle mouse events
  const handleMouseMove = (event) => {
    if (!canvasRef.current || !reportResults) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    setMousePos({ x, y });
    
    // Calculate which bar the mouse is over using the same calculation as in drawing
    const positions = reportResults.positions;
    const graphWidth = canvas.width;
    
    const baseBarWidth = Math.floor(graphWidth / positions.length);
    const remainderPixels = graphWidth - (baseBarWidth * positions.length);
    const extraWidthPerBar = remainderPixels / positions.length;
    
    let currentPosition = 0;
    let newHoverIndex = null;
    
    // Use the same calculation as in drawing to determine bar positions
    for (let i = 0; i < positions.length; i++) {
      const barWidth = baseBarWidth + 
        Math.floor((i + 1) * extraWidthPerBar) - 
        Math.floor(i * extraWidthPerBar);
      
      // Check if mouse is within this bar's bounds
      if (x >= currentPosition && x < currentPosition + barWidth) {
        newHoverIndex = i;
        break;
      }
      
      currentPosition += barWidth;
    }
    
    setHoverIndex(newHoverIndex);
  };
  
  const handleMouseOut = () => {
    setHoverIndex(null);
  };
  
  const handleClick = (event) => {
    if (!canvasRef.current || !reportResults || hoverIndex === null) return;
    
    // Navigate to the move that was clicked
    traverseMoves(hoverIndex - currentMoveIndex);
  };
  
  if (!reportResults) {
    return null;
  }
  
  return (
    <div className="card bg-secondary-700/50 border-secondary-600">
      <h3 className="font-medium text-primary-300 mb-2">Game Flow</h3>
      <div className="rounded overflow-hidden border border-secondary-600">
        <canvas
          ref={canvasRef}
          width={350}
          height={100}
          className="w-full cursor-pointer"
          onMouseMove={handleMouseMove}
          onMouseOut={handleMouseOut}
          onClick={handleClick}
        />
      </div>
    </div>
  );
};

export default EvaluationGraph;