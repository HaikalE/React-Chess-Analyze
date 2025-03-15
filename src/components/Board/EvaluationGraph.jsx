import React, { useRef, useEffect, useState } from 'react';
import { useGameContext } from '../../contexts/GameContext';
import { classificationColors, getSemiTransparentColor } from '../../utils/boardUtils';

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
    
    let cumulativeWidth = 0;
    
    // Draw each position bar
    for (let i = 0; i < positions.length; i++) {
      const position = positions[i];
      const topLine = position.topLines?.find(line => line.id === 1);
      const evaluation = topLine?.evaluation;
      
      // Calculate width for this specific bar
      const currentBarWidth = baseBarWidth + 
        Math.floor((i + 1) * extraWidthPerBar) - 
        Math.floor(i * extraWidthPerBar);
      
      // Get classification color
      const classification = position.classification;
      const classificationColor = classification 
        ? classificationColors[classification] 
        : "#10b981"; // accent-500
      
      // Set background color
      if (i === hoverIndex) {
        ctx.fillStyle = "#475569"; // secondary-600
      } else {
        ctx.fillStyle = "#0f172a"; // secondary-900
      }
      
      // Draw background
      ctx.fillRect(cumulativeWidth, 0, currentBarWidth, graphHeight);
      cumulativeWidth += currentBarWidth;
      
      // If no evaluation, skip the rest
      if (!evaluation) continue;
      
      if (evaluation.type === "mate") {
        const moveColor = position.fen.includes(" b ") ? "white" : "black";
        
        // Handle checkmate (value = 0)
        if (evaluation.value === 0) {
          ctx.fillStyle = moveColor === "white" ? "#ffffff" : "#000000";
        } 
        // Handle mate-in-X
        else {
          if (i === currentMoveIndex && i === hoverIndex) {
            ctx.fillStyle = "#10b981"; // accent-500
          } else if (i === currentMoveIndex) {
            ctx.fillStyle = "#34d399"; // accent-400
          } else if (i === hoverIndex) {
            ctx.fillStyle = evaluation.value >= 0 ? "#e2e8f0" : "#475569";
          } else {
            ctx.fillStyle = evaluation.value >= 0 ? "#ffffff" : "#000000";
          }
        }
        
        // Draw mate bar
        ctx.fillRect(
          cumulativeWidth - currentBarWidth, 
          0, 
          currentBarWidth, 
          graphHeight
        );
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
            cumulativeWidth - currentBarWidth, 
            graphHeight - height, 
            currentBarWidth, 
            height
          );
        } else {
          ctx.fillRect(
            cumulativeWidth - currentBarWidth, 
            0, 
            currentBarWidth, 
            height
          );
        }
      }
      
      // Highlight current move and hover
      if (i === currentMoveIndex) {
        ctx.fillStyle = classification 
          ? getSemiTransparentColor(classificationColor, 0.5) 
          : getSemiTransparentColor("#0ea5e9", 0.5); // primary-500
        ctx.fillRect(
          cumulativeWidth - currentBarWidth, 
          0, 
          currentBarWidth, 
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
    
    // Calculate which bar the mouse is over
    const positions = reportResults.positions;
    const graphWidth = canvas.width;
    
    const baseBarWidth = Math.floor(graphWidth / positions.length);
    const remainderPixels = graphWidth - (baseBarWidth * positions.length);
    const extraWidthPerBar = remainderPixels / positions.length;
    
    let cumulativeWidth = 0;
    let newHoverIndex = null;
    
    for (let i = 0; i < positions.length; i++) {
      const currentBarWidth = baseBarWidth + 
        Math.floor((i + 1) * extraWidthPerBar) - 
        Math.floor(i * extraWidthPerBar);
      
      if (x < cumulativeWidth + currentBarWidth) {
        newHoverIndex = i;
        break;
      }
      
      cumulativeWidth += currentBarWidth;
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