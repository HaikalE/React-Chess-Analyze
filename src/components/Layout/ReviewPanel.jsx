import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChessKnight } from '@fortawesome/free-solid-svg-icons';
import useAnalysis from '../../hooks/useAnalysis';
import AnalysisForm from '../Analysis/AnalysisForm';
import AccuracyStats from '../Analysis/AccuracyStats';
import ClassificationDisplay from '../Analysis/ClassificationDisplay';
import EngineSuggestions from '../Analysis/EngineSuggestions';
import EvaluationGraph from '../Board/EvaluationGraph';
import BoardControls from '../Board/BoardControls';
import GameSelectModal from '../GameSelect/GameSelectModal';
import { useGameContext } from '../../contexts/GameContext';
import './ReviewPanel.css';

const ReviewPanel = () => {
  const { reportResults } = useGameContext();
  const { saveAnalysis, analyzePgn } = useAnalysis();
  const [showGameSelect, setShowGameSelect] = useState(false);
  const [selectSource, setSelectSource] = useState('');
  const [selectUsername, setSelectUsername] = useState('');
  const [pgnText, setPgnText] = useState('');
  
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
    
    // Start analysis automatically
    // This will analyze the game as soon as it's selected
    setTimeout(() => {
      analyzePgn(pgn);
    }, 100);
  };
  
  const handleSaveAnalysis = () => {
    if (!reportResults) return;
    saveAnalysis();
  };
  
  return (
    <div className="review-panel">
      <div className="review-panel-main">
        <div className="review-panel-wrapper">
          <h1 className="panel-title">
            <FontAwesomeIcon icon={faChessKnight} className="knight-icon" />
            Game Report
          </h1>
          
          <AnalysisForm 
            onShowGameSelect={handleShowGameSelect} 
            pgnText={pgnText}
            setPgnText={setPgnText}
          />
          
          {reportResults && (
            <div className="report-cards">
              <AccuracyStats />
              <ClassificationDisplay />
              <EngineSuggestions />
              <EvaluationGraph />
            </div>
          )}
        </div>
      </div>
      
      <BoardControls onSave={handleSaveAnalysis} />
      
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