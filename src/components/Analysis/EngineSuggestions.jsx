import React, { useEffect, useState } from 'react';
import { useGameContext } from '../../contexts/GameContext';
import { formatEvaluation } from '../../utils/evalUtils';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faChessKnight, 
  faEye, 
  faEyeSlash, 
  faChevronDown, 
  faChevronUp,
  faPlay,
  faStop,
  faCirclePlay,
  faTrophy
} from '@fortawesome/free-solid-svg-icons';
import { Chess } from 'chess.js';
import { convertUciToSan } from '../../utils/analysisHelpers';

const EngineSuggestion = ({ line, showMove, expanded, onToggleExpand, onViewLine, isActive }) => {
  // Determine color based on evaluation
  const isPositive = line.evaluation.value >= 0;
  const evalType = line.evaluation.type;
  
  // Style values
  const bgColor = isPositive ? 'bg-white' : 'bg-black';
  const textColor = isPositive ? 'text-secondary-900' : 'text-white';
  const borderColor = isPositive ? 'border-white' : 'border-secondary-700';
  
  return (
    <div className={`flex flex-col rounded-md border overflow-hidden transition-all duration-300 ${
      isActive 
        ? 'bg-primary-700/40 border-primary-500' 
        : 'bg-secondary-700 border-secondary-600'
    }`}>
      <div className="flex items-center justify-between p-2">
        <div 
          className="flex items-center gap-2 flex-grow cursor-pointer hover:bg-secondary-600/50 p-1 rounded transition-colors"
          onClick={onToggleExpand}
        >
          <div className={`${bgColor} ${textColor} px-2 py-0.5 rounded font-mono text-sm font-medium border ${borderColor}`}>
            {formatEvaluation(line.evaluation)}
          </div>
          
          {showMove ? (
            <div className="text-sm font-medium">
              {line.moveSAN || line.moveUCI}
            </div>
          ) : (
            <div className="text-sm font-medium text-secondary-400">
              <FontAwesomeIcon icon={faChessKnight} className="mr-1.5" />
              Engine suggestion {line.id}
            </div>
          )}
          
          <div className="text-xs text-secondary-400 ml-auto mr-2">
            d{line.actualDepth || line.depth}
          </div>
          
          <FontAwesomeIcon 
            icon={expanded ? faChevronUp : faChevronDown}
            className="text-secondary-400 text-xs"
          />
        </div>
        
        <button
          className={`p-1.5 rounded-md text-xs ${
            isActive 
              ? 'bg-primary-500 hover:bg-primary-600 text-white' 
              : 'bg-secondary-600 hover:bg-secondary-500 text-secondary-200'
          }`}
          onClick={() => onViewLine(isActive ? null : line)}
          title={isActive ? "Hide this variation" : "Show this variation on board"}
        >
          <FontAwesomeIcon icon={isActive ? faStop : faPlay} />
        </button>
      </div>
      
      {expanded && line.futureMoves && (
        <div className="p-2 pt-0 border-t border-secondary-600 bg-secondary-800/50">
          <div className="text-xs text-secondary-400 mb-1 mt-2">Continuation:</div>
          <div className="pl-2 border-l-2 border-primary-600/30 flex flex-wrap gap-1.5">
            {line.futureMoves.map((move, idx) => (
              <span 
                key={idx} 
                className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                  isActive && idx < (line.variationDepth || 0)
                    ? 'bg-primary-600 text-white'
                    : 'bg-secondary-700 text-secondary-300'
                }`}
              >
                {move}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const EngineSuggestions = () => {
  const { 
    currentPosition, 
    displayPosition, 
    showEngineMoves, 
    activeEngineLine,
    setActiveEngineLine,
    clearActiveEngineLine,
    engineMoveIndex,
    isViewingEngineLine
  } = useGameContext();
  
  const [suggestions, setSuggestions] = useState([]);
  const [expandedLines, setExpandedLines] = useState({});
  const [actualDepth, setActualDepth] = useState(0);
  const [depthRequested, setDepthRequested] = useState(0);
  
  // Add this code to detect checkmate
  const isCheckmate = React.useMemo(() => {
    if (!displayPosition?.fen) return false;
    try {
      // Check if position is checkmate using chess.js
      const chess = new Chess(displayPosition.fen);
      return chess.isCheckmate();
    } catch (error) {
      console.warn("Error checking for checkmate:", error);
      return false;
    }
  }, [displayPosition?.fen]);
  
  // Handle view/hide engine line
  const handleViewLine = (line) => {
    if (line) {
      setActiveEngineLine(line);
      // Auto-expand the line being viewed
      setExpandedLines(prev => ({
        ...prev,
        [line.id]: true
      }));
    } else {
      clearActiveEngineLine();
    }
  };
  
  useEffect(() => {
    // Skip processing if in checkmate
    if (isCheckmate) {
      setSuggestions([]);
      setActualDepth(0);
      return;
    }
    
    if (!currentPosition || !currentPosition.topLines) {
      setSuggestions([]);
      setActualDepth(0);
      return;
    }
    
    // Sort lines by ID and filter out invalid ones
    const validLines = currentPosition.topLines
      .filter(line => line && line.evaluation && !(line.evaluation.type === 'mate' && line.evaluation.value === 0))
      .sort((a, b) => a.id - b.id);
    
    // Process the lines to ensure they have SAN notation and full future moves
    const processedLines = validLines.map(line => {
      // If moveSAN is missing but we have moveUCI, convert it
      if (!line.moveSAN && line.moveUCI) {
        try {
          // Only convert if not already converted
          const { moveSAN, futureMoves } = convertUciToSan(
            currentPosition.fen, 
            line.moveUCI, 
            line.futureMoveUCIs || []
          );
          
          return {
            ...line,
            moveSAN: moveSAN || line.moveSAN || '',
            futureMoves: line.futureMoves || futureMoves || [],
            // Add variation depth for highlighting if this is the active line
            variationDepth: activeEngineLine?.id === line.id ? engineMoveIndex : undefined
          };
        } catch (error) {
          console.warn("Error converting UCI to SAN:", error);
          return {
            ...line,
            // Add variation depth for highlighting if this is the active line
            variationDepth: activeEngineLine?.id === line.id ? engineMoveIndex : undefined
          };
        }
      }
      
      return {
        ...line,
        // Add variation depth for highlighting if this is the active line
        variationDepth: activeEngineLine?.id === line.id ? engineMoveIndex : undefined
      };
    });
    
    setSuggestions(processedLines);
    
    // Set depth info
    if (validLines.length > 0) {
      // Set the first line's actual depth for display
      if (validLines[0]) {
        setActualDepth(validLines[0].actualDepth || validLines[0].depth || 0);
      }
      
      // If the position has a stored requested depth, show it
      if (currentPosition.requestedDepth) {
        setDepthRequested(currentPosition.requestedDepth);
      } else {
        // Otherwise make a guess based on actual depth
        setDepthRequested(
          validLines[0]?.actualDepth >= 18 ? 20 : 
          validLines[0]?.actualDepth >= 16 ? 18 : 
          validLines[0]?.actualDepth >= 14 ? 16 : 14
        );
      }
    }
    
  }, [currentPosition, activeEngineLine, engineMoveIndex, isCheckmate]);
  
  const toggleLineExpand = (lineId) => {
    setExpandedLines(prev => ({
      ...prev,
      [lineId]: !prev[lineId]
    }));
  };
  
  // Display checkmate message instead of suggestions when game is over
  if (isCheckmate) {
    return (
      <div className="card bg-secondary-700/50 border-secondary-600">
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <h3 className="font-medium text-primary-300 flex items-center gap-1.5">
              <FontAwesomeIcon icon={faChessKnight} className="text-primary-400" />
              Game Over: Checkmate
            </h3>
          </div>
          
          <div className="text-sm text-center py-3 bg-secondary-800/50 rounded border border-secondary-600">
            <p className="font-medium text-accent-400">
              <FontAwesomeIcon icon={faTrophy} className="mr-2" />
              Checkmate! The game has ended.
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  if (!suggestions.length) {
    return null;
  }
  
  return (
    <div className="card bg-secondary-700/50 border-secondary-600">
      <div className="flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <h3 className="font-medium text-primary-300 flex items-center gap-1.5">
            <FontAwesomeIcon icon={faChessKnight} className="text-primary-400" />
            Engine Analysis
            {isViewingEngineLine && (
              <span className="text-xs bg-primary-600 text-white px-2 py-0.5 rounded-full animate-pulse ml-1">
                Viewing variation
              </span>
            )}
          </h3>
          <div className="flex items-center gap-2">
            <div className="text-xs rounded px-1.5 py-0.5 bg-secondary-600 text-secondary-300 flex items-center gap-1">
              <span>Depth:</span>
              <span className="font-mono">
                {actualDepth !== depthRequested ? 
                  `${actualDepth}/${depthRequested}` : 
                  actualDepth}
              </span>
              {currentPosition.isCriticalPosition && 
                <span className="text-primary-400 ml-1" title="Critical position analyzed at full depth">★</span>
              }
              {currentPosition.worker === "cloud" && 
                <span className="text-accent-400 ml-1" title="Analysis from cloud database">☁</span>
              }
            </div>
          </div>
        </div>
        
        <div className="flex flex-col gap-2">
          {suggestions.map((line) => (
            <EngineSuggestion 
              key={line.id} 
              line={line} 
              showMove={showEngineMoves}
              expanded={expandedLines[line.id] || false}
              onToggleExpand={() => toggleLineExpand(line.id)}
              onViewLine={handleViewLine}
              isActive={activeEngineLine?.id === line.id}
            />
          ))}
        </div>
        
        <div className="text-xs text-secondary-400 text-center mt-1 p-2 bg-secondary-800/50 rounded border border-secondary-600">
          <p className="font-medium mb-1">
            {isViewingEngineLine ? (
              <span className="text-primary-300">
                <FontAwesomeIcon icon={faCirclePlay} className="mr-1" />
                Viewing engine variation. Use arrows to navigate.
              </span>
            ) : (
              "Select a line to see it on the board"
            )}
          </p>
          <p className="italic">
            {showEngineMoves ? 
              "Engine moves are shown. Toggle visibility in board controls." : 
              "Engine moves are hidden. Toggle visibility in board controls."}
          </p>
        </div>
      </div>
    </div>
  );
};

export default EngineSuggestions;