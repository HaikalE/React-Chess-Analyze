import React, { useEffect, useState } from 'react';
import { useGameContext } from '../../contexts/GameContext';
import { formatEvaluation } from '../../utils/evalUtils';
import './EngineSuggestions.css';

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
    <div className="engine-suggestions">
      <h2 className="engine-suggestions-title">Engine:</h2>
      
      {suggestions.map((line) => (
        <div key={line.id} className="engine-suggestion">
          <b
            className="evaluation-chip"
            style={{
              backgroundColor: line.evaluation.value >= 0 ? '#ffffff' : 'var(--secondary-color)',
              color: line.evaluation.value >= 0 ? 'var(--primary-color)' : '#ffffff'
            }}
          >
            {formatEvaluation(line.evaluation)}
          </b>
          
          <span className="move-san">
            {line.moveSAN || line.moveUCI}
          </span>
        </div>
      ))}
    </div>
  );
};

export default EngineSuggestions;