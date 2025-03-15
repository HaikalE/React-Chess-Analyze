import React from 'react';
import { useGameContext } from '../../contexts/GameContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faRepeat, 
  faBackwardStep, 
  faArrowLeft, 
  faArrowRight, 
  faForwardStep,
  faFloppyDisk
} from '@fortawesome/free-solid-svg-icons';
import './BoardControls.css';

const BoardControls = ({ onSave }) => {
  const { 
    goToStart, 
    prevMove, 
    nextMove, 
    goToEnd, 
    flipBoard 
  } = useGameContext();
  
  return (
    <div className="board-controls">
      <div className="board-controls-buttons">
        <button 
          className="control-button" 
          onClick={flipBoard}
          title="Flip Board"
        >
          <FontAwesomeIcon icon={faRepeat} />
        </button>
        
        <button 
          className="control-button" 
          onClick={goToStart}
          title="Back to Start"
        >
          <FontAwesomeIcon icon={faBackwardStep} />
        </button>
        
        <button 
          className="control-button" 
          onClick={prevMove}
          title="Previous Move"
        >
          <FontAwesomeIcon icon={faArrowLeft} />
        </button>
        
        <button 
          className="control-button" 
          onClick={nextMove}
          title="Next Move"
        >
          <FontAwesomeIcon icon={faArrowRight} />
        </button>
        
        <button 
          className="control-button" 
          onClick={goToEnd}
          title="Go to End"
        >
          <FontAwesomeIcon icon={faForwardStep} />
        </button>
        
        <button 
          className="control-button" 
          onClick={onSave}
          title="Save Analysis"
        >
          <FontAwesomeIcon icon={faFloppyDisk} />
        </button>
      </div>
      
      <div className="footer">
        A website by wintrcat
        <a href="/privacy">Privacy Policy</a>
      </div>
    </div>
  );
};

export default BoardControls;