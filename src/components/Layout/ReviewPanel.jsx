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
    <div className="card w-full lg:w-96 flex flex-col h-full gap-4 max-h-screen lg:max-h-[90vh] overflow-hidden">
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
      
      <AnalysisForm 
        onShowGameSelect={handleShowGameSelect} 
        pgnText={pgnText}
        setPgnText={setPgnText}
        onDepthChange={handleDepthChange} // Pass the depth change handler
      />
      
      {reportResults ? (
        <div className="overflow-y-auto flex-1 flex flex-col gap-4 pr-1 pb-2">
          <AccuracyStats />
          <ClassificationDisplay />
          <EngineSuggestions />
          <EvaluationGraph />
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-4 text-secondary-400">
          <FontAwesomeIcon icon={faLightbulb} className="text-4xl mb-3 text-secondary-600" />
          <h3 className="text-lg font-medium mb-2">No Analysis Yet</h3>
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