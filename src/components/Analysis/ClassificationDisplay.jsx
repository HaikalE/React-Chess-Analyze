import React, { useEffect, useState } from 'react';
import { useGameContext } from '../../contexts/GameContext';
import { classificationColors } from '../../utils/boardUtils';
import { 
  getClassificationMessage,
  shouldShowAlternative 
} from '../../utils/classificationUtils';

const ClassificationDisplay = () => {
  const { 
    reportResults, 
    currentMoveIndex, 
    positions 
  } = useGameContext();
  
  const [iconSrc, setIconSrc] = useState('/static/media/book.png');
  const [message, setMessage] = useState('');
  const [alternativeMessage, setAlternativeMessage] = useState('');
  const [messageColor, setMessageColor] = useState('#a88764');
  
  useEffect(() => {
    if (!reportResults || currentMoveIndex <= 0) {
      setMessage('');
      setAlternativeMessage('');
      return;
    }
    
    const currentPosition = reportResults.positions[currentMoveIndex];
    const lastPosition = reportResults.positions[currentMoveIndex - 1];
    
    if (!currentPosition || !currentPosition.classification) {
      setMessage('');
      setAlternativeMessage('');
      return;
    }
    
    // Set the classification icon
    setIconSrc(`/static/media/${currentPosition.classification}.png`);
    
    // Set the classification message
    const formattedMessage = getClassificationMessage(
      currentPosition.classification,
      currentPosition.move?.san
    );
    
    setMessage(formattedMessage);
    setMessageColor(classificationColors[currentPosition.classification]);
    
    // Set alternative move message if needed
    if (shouldShowAlternative(currentPosition.classification) && lastPosition) {
      const topAlternative = lastPosition.topLines?.[0]?.moveSAN;
      
      if (topAlternative) {
        setAlternativeMessage(`Best was ${topAlternative}`);
      } else {
        setAlternativeMessage('');
      }
    } else {
      setAlternativeMessage('');
    }
    
  }, [reportResults, currentMoveIndex, positions]);
  
  if (!message) {
    return null;
  }
  
  return (
    <div className="card bg-secondary-700/50 border-secondary-600">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <img 
            src={iconSrc}
            alt="Classification"
            className="w-6 h-6"
          />
          <div className="font-medium" style={{ color: messageColor }}>
            {message}
          </div>
        </div>
        
        {alternativeMessage && (
          <div className="text-sm bg-secondary-700 py-1.5 px-3 rounded text-accent-400 font-medium">
            {alternativeMessage}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClassificationDisplay;