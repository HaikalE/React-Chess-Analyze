import React, { useEffect, useState } from 'react';
import { useGameContext } from '../../contexts/GameContext';
import { formatEvaluation } from '../../utils/evalUtils';

const EngineSuggestion = ({ line }) => {
  // Determine color based on evaluation
  const isPositive = line.evaluation.value >= 0;
  const evalType = line.evaluation.type;
  
  // Style values
  const bgColor = isPositive ? 'bg-white' : 'bg-black';
  const textColor = isPositive ? 'text-secondary-900' : 'text-white';
  const borderColor = isPositive ? 'border-white' : 'border-secondary-700';
  
  return (
    <div className="flex items-center gap-2">
      <div className={`${bgColor} ${textColor} px-2 py-0.5 rounded font-mono text-sm font-medium border ${borderColor}`}>
        {formatEvaluation(line.evaluation)}
      </div>
      <div className="text-sm font-medium">
        {line.moveSAN || line.moveUCI}
      </div>
      {/* Add depth indicator */}
      <div className="text-xs text-secondary-400 ml-auto">
        d{line.actualDepth || line.depth}
      </div>
    </div>
  );
};

const EngineSuggestions = () => {
  const { currentPosition } = useGameContext();
  const [suggestions, setSuggestions] = useState([]);
  const [averageDepth, setAverageDepth] = useState(0);
  const [actualDepth, setActualDepth] = useState(0);
  const [depthRequested, setDepthRequested] = useState(0);
  
  useEffect(() => {
    if (!currentPosition || !currentPosition.topLines) {
      setSuggestions([]);
      setAverageDepth(0);
      setActualDepth(0);
      return;
    }
    
    // Sort lines by ID and filter out invalid ones
    const validLines = currentPosition.topLines
      .filter(line => line && line.evaluation && !(line.evaluation.type === 'mate' && line.evaluation.value === 0))
      .sort((a, b) => a.id - b.id);
    
    setSuggestions(validLines);
    
    // Calculate average depth
    if (validLines.length > 0) {
      // Use actual depth if available, otherwise fall back to reported depth
      const totalDepth = validLines.reduce((sum, line) => sum + (line.actualDepth || line.depth || 0), 0);
      setAverageDepth(Math.round(totalDepth / validLines.length));
      
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
    
  }, [currentPosition]);
  
  if (!suggestions.length) {
    return null;
  }
  
  return (
    <div className="card bg-secondary-700/50 border-secondary-600">
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <h3 className="font-medium text-primary-300">Engine Analysis</h3>
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
        
        <div className="flex flex-col gap-3">
          {suggestions.map((line) => (
            <EngineSuggestion key={line.id} line={line} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default EngineSuggestions;