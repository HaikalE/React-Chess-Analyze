import React from 'react';
import { useGameContext } from '../../contexts/GameContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faRepeat, 
  faBackwardStep, 
  faArrowLeft, 
  faArrowRight, 
  faForwardStep,
  faFloppyDisk,
  faLightbulb
} from '@fortawesome/free-solid-svg-icons';

const BoardControls = ({ onSave, showSuggestionArrows, setShowSuggestionArrows }) => {
  const { 
    goToStart, 
    prevMove, 
    nextMove, 
    goToEnd, 
    flipBoard 
  } = useGameContext();
  
  return (
    <div className="w-full flex flex-col sm:flex-row justify-between gap-2">
      <div className="flex justify-center sm:justify-start">
        <button 
          className="btn-secondary rounded-l-md rounded-r-none px-3 py-2 border-r border-secondary-600"
          onClick={flipBoard}
          title="Flip Board"
        >
          <FontAwesomeIcon icon={faRepeat} className="text-secondary-200" />
        </button>
        
        <button 
          className="btn-secondary px-3 py-2 border-r border-secondary-600"
          onClick={goToStart}
          title="Back to Start"
        >
          <FontAwesomeIcon icon={faBackwardStep} className="text-secondary-200" />
        </button>
        
        <button 
          className="btn-secondary px-3 py-2 border-r border-secondary-600"
          onClick={prevMove}
          title="Previous Move"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="text-secondary-200" />
        </button>
        
        <button 
          className="btn-secondary px-3 py-2 border-r border-secondary-600"
          onClick={nextMove}
          title="Next Move"
        >
          <FontAwesomeIcon icon={faArrowRight} className="text-secondary-200" />
        </button>
        
        <button 
          className="btn-secondary px-3 py-2 border-r border-secondary-600"
          onClick={goToEnd}
          title="Go to End"
        >
          <FontAwesomeIcon icon={faForwardStep} className="text-secondary-200" />
        </button>
        
        <button 
          className="btn-secondary rounded-r-md rounded-l-none px-3 py-2"
          onClick={onSave}
          title="Save Analysis"
        >
          <FontAwesomeIcon icon={faFloppyDisk} className="text-secondary-200" />
        </button>
      </div>
      
      <div className="flex items-center justify-center sm:justify-end mt-2 sm:mt-0">
        <button
          className={`flex items-center gap-2 text-sm py-1.5 px-3 rounded transition-colors ${
            showSuggestionArrows 
              ? 'bg-accent-600 hover:bg-accent-700 text-secondary-100' 
              : 'bg-secondary-700 hover:bg-secondary-600 text-secondary-300'
          }`}
          onClick={() => setShowSuggestionArrows(!showSuggestionArrows)}
        >
          <FontAwesomeIcon icon={faLightbulb} />
          <span className="hidden sm:inline">Suggestions</span>
        </button>
      </div>
    </div>
  );
};

export default BoardControls;