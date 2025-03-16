import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChessKnight, faLightbulb } from '@fortawesome/free-solid-svg-icons';
import useAnalysis from '../../hooks/useAnalysis';
import AnalysisForm from '../Analysis/AnalysisForm';
import AccuracyStats from '../Analysis/AccuracyStats';
import ClassificationDisplay from '../Analysis/ClassificationDisplay';
import EngineSuggestions from '../Analysis/EngineSuggestions';
import EvaluationGraph from '../Board/EvaluationGraph';
import GameSelectModal from '../GameSelect/GameSelectModal';
import { useGameContext } from '../../contexts/GameContext';

const ReviewPanel = () => {
  const { reportResults } = useGameContext();
  const { saveAnalysis, analyzePgn } = useAnalysis();
  const [showGameSelect, setShowGameSelect] = useState(false);
  const [selectSource, setSelectSource] = useState('');
  const [selectUsername, setSelectUsername] = useState('');
  const [pgnText, setPgnText] = useState('');
  const [currentDepth, setCurrentDepth] = useState(20); // Add state for depth
  
  const handleShowGameSelect = (source, username) => {
    setSelectSource(source);
    setSelectUsername(username);
    setShowGameSelect(true);
  };
  
  const handleSelectGame = (pgn) => {
    // Update the state with the selected PGN
    setPgnText(pgn);
    
    // Close the game select modal
    setShowGameSelect(false);
    
    // Start analysis automatically with current depth value
    setTimeout(() => {
      analyzePgn(pgn, currentDepth); // Use currentDepth here
    }, 100);
  };
  
  const handleDepthChange = (depth) => {
    setCurrentDepth(depth);
  };
  
  const handleSaveAnalysis = () => {
    if (!reportResults) return;
    saveAnalysis();
  };
  
  return (
    // Completely removed flex-1 and max-h-screen attributes
    // Changed to auto-height (h-auto) instead of flex column with stretching
    <div className="card w-full lg:w-96 flex flex-col h-auto gap-2">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <FontAwesomeIcon icon={faChessKnight} className="text-primary-400" />
          Game Analysis
        </h2>
        
        {reportResults && (
          <button 
            onClick={handleSaveAnalysis}
            className="btn-primary text-xs px-2 py-1"
          >
            Save Report
          </button>
        )}
      </div>
      
      <div className="flex-shrink-0">
        <AnalysisForm 
          onShowGameSelect={handleShowGameSelect} 
          pgnText={pgnText}
          setPgnText={setPgnText}
          onDepthChange={handleDepthChange} 
        />
      </div>
      
      {reportResults ? (
        // Removed max-height and overflow constraints
        // Changed to a standard div without scrolling behavior
        <div className="flex flex-col gap-2 pt-1">
          <AccuracyStats />
          <ClassificationDisplay />
          <EngineSuggestions />
          <EvaluationGraph />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center text-center p-2 text-secondary-400">
          <FontAwesomeIcon icon={faLightbulb} className="text-3xl mb-2 text-secondary-600" />
          <h3 className="text-lg font-medium mb-1">No Analysis Yet</h3>
          <p className="text-sm">
            Enter a PGN above or import a game from Chess.com or Lichess to analyze your chess game.
          </p>
        </div>
      )}
      
      <GameSelectModal 
        isOpen={showGameSelect}
        onClose={() => setShowGameSelect(false)}
        onSelectGame={handleSelectGame}
        source={selectSource}
        username={selectUsername}
      />
    </div>
  );
};

export default ReviewPanel;