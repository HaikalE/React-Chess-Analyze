import React, { useEffect, useState } from 'react';
import { useGameContext } from '../../contexts/GameContext';
import { formatEvaluation } from '../../utils/evalUtils';

// Remove this line: import './EngineSuggestions.css';

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
    </div>
  );
};

const EngineSuggestions = () => {
  const { currentPosition } = useGameContext();
  const [suggestions, setSuggestions] = useState([]);
  
  useEffect(() => {
    if (!currentPosition || !currentPosition.topLines) {
      setSuggestions([]);
      return;
    }
    
    // Sort lines by ID and filter out invalid ones
    const validLines = currentPosition.topLines
      .filter(line => line && line.evaluation && !(line.evaluation.type === 'mate' && line.evaluation.value === 0))
      .sort((a, b) => a.id - b.id);
    
    setSuggestions(validLines);
    
  }, [currentPosition]);
  
  if (!suggestions.length) {
    return null;
  }
  
  return (
    <div className="card bg-secondary-700/50 border-secondary-600">
      <div className="flex flex-col gap-2">
        <h3 className="font-medium text-primary-300">Engine Analysis</h3>
        
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