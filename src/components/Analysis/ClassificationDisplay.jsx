import React, { useEffect, useState } from 'react';
import { useGameContext } from '../../contexts/GameContext';
import { classificationColors } from '../../utils/boardUtils';
import { 
  getClassificationMessage,
  shouldShowAlternative 
} from '../../utils/classificationUtils';
import './ClassificationDisplay.css';

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
    <>
      <div className="classification-message-container">
        <img 
          src={iconSrc}
          alt="Classification"
          className="classification-icon"
        />
        <span 
          className="classification-message"
          style={{ color: messageColor }}
        >
          {message}
        </span>
      </div>
      
      {alternativeMessage && (
        <div className="top-alternative-message">
          {alternativeMessage}
        </div>
      )}
    </>
  );
};

export default ClassificationDisplay;