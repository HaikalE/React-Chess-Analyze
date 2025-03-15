import React, { useState, useEffect } from 'react';
import { useGameContext } from '../../contexts/GameContext';
import useAnalysis from '../../hooks/useAnalysis';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faMagnifyingGlass, 
  faCircleInfo, 
  faGear, 
  faArrowRight,
  faBolt,
  faWind,
  faHourglassHalf 
} from '@fortawesome/free-solid-svg-icons';
import './AnalysisForm.css';

const AnalysisForm = ({ onShowGameSelect, pgnText, setPgnText }) => {
  const { 
    isAnalysisRunning, 
    analysisProgress, 
    analysisStatus,
    evaluatedPositions,
    reportResults
  } = useGameContext();
  
  const { analyzePgn, generateFinalReport, loadSavedAnalysis, error } = useAnalysis();
  
  const [loadType, setLoadType] = useState('pgn');
  const [username, setUsername] = useState('');
  const [depth, setDepth] = useState(16);
  const [showArrows, setShowArrows] = useState(true);
  const [secondaryMessage, setSecondaryMessage] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const [showCaptcha, setShowCaptcha] = useState(false);
  
  // Load saved preferences
  useEffect(() => {
    const savedUsername = localStorage.getItem(`chess-site-username-saved-${loadType}`);
    if (savedUsername && (loadType === 'chesscom' || loadType === 'lichess')) {
      setUsername(savedUsername);
    }
  }, [loadType]);
  
  // Update secondary message during analysis
  useEffect(() => {
    if (isAnalysisRunning) {
      setSecondaryMessage('It can take around a minute to process a full game.');
    } else if (evaluatedPositions?.length > 0 && !reportResults) {
      setSecondaryMessage('Please complete the CAPTCHA to continue.');
      setShowCaptcha(true);
    } else {
      setSecondaryMessage('');
      setShowCaptcha(false);
    }
  }, [isAnalysisRunning, evaluatedPositions, reportResults]);
  
  const handleLoadTypeChange = (e) => {
    const newLoadType = e.target.value;
    setLoadType(newLoadType);
    
    if (newLoadType === 'json') {
      setSecondaryMessage('Enter JSON from saved analysis');
    } else {
      setSecondaryMessage('');
    }
  };
  
  const handleAnalysisStart = async () => {
    if (isAnalysisRunning) return;
    
    if (loadType === 'json') {
      try {
        const savedAnalysis = JSON.parse(pgnText);
        const success = loadSavedAnalysis(savedAnalysis);
        
        if (!success) {
          setSecondaryMessage('Invalid analysis file');
        }
      } catch (error) {
        setSecondaryMessage('Invalid JSON format');
      }
      return;
    }
    
    if (!pgnText.trim()) {
      setSecondaryMessage('Please enter PGN to analyze');
      return;
    }
    
    try {
      await analyzePgn(pgnText, depth);
    } catch (error) {
      console.error('Analysis error:', error);
    }
  };
  
  const handleCaptchaSubmit = async (token) => {
    setCaptchaToken(token);
    
    try {
      await generateFinalReport(token);
    } catch (error) {
      console.error('Report generation error:', error);
    }
  };
  
  const handleFetchGames = () => {
    if (!username.trim()) {
      setSecondaryMessage('Please enter a username');
      return;
    }
    
    // Save username for future use
    localStorage.setItem(`chess-site-username-saved-${loadType}`, username);
    
    // Show game selection modal
    onShowGameSelect(loadType, username);
  };
  
  const handleDepthChange = (e) => {
    const newDepth = parseInt(e.target.value);
    setDepth(newDepth);
  };
  
  return (
    <div className="analysis-form">
      <div className="load-type-container">
        <select 
          id="load-type-dropdown"
          value={loadType}
          onChange={handleLoadTypeChange}
          className="load-type-dropdown"
        >
          <option value="pgn">PGN</option>
          <option value="chesscom">Chess.com</option>
          <option value="lichess">Lichess.org</option>
          <option value="json">JSON</option>
        </select>
      </div>
      
      {/* PGN or JSON input */}
      {(loadType === 'pgn' || loadType === 'json') && (
        <div className="game-input-container">
          <textarea
            id="pgn"
            value={pgnText}
            onChange={(e) => setPgnText(e.target.value)}
            className="game-input"
            placeholder={loadType === 'pgn' ? 'Enter PGN...' : 'Enter JSON...'}
          />
        </div>
      )}
      
      {/* Username input for Chess.com or Lichess */}
      {(loadType === 'chesscom' || loadType === 'lichess') && (
        <div className="game-input-container username-container">
          <textarea
            id="chess-site-username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="game-input username-input"
            placeholder="Username..."
            maxLength={48}
          />
          <button 
            className="fetch-games-button"
            onClick={handleFetchGames}
          >
            <FontAwesomeIcon icon={faArrowRight} />
          </button>
        </div>
      )}
      
      {/* Analyze button */}
      <button 
        className="analyze-button"
        onClick={handleAnalysisStart}
        disabled={isAnalysisRunning}
      >
        <FontAwesomeIcon icon={faMagnifyingGlass} className="analyze-icon" />
        <b>Analyse</b>
      </button>
      
      {/* Progress bar */}
      {isAnalysisRunning && (
        <progress 
          className="analysis-progress" 
          value={analysisProgress} 
          max={100} 
        />
      )}
      
      {/* Status message */}
      {analysisStatus && (
        <div className={`status-message ${error ? 'error' : ''}`}>
          <FontAwesomeIcon icon={faCircleInfo} />
          {analysisStatus}
        </div>
      )}
      
      {/* Secondary message */}
      {secondaryMessage && (
        <div className="secondary-message">{secondaryMessage}</div>
      )}
      
      {/* reCAPTCHA placeholder (would need actual implementation) */}
      {showCaptcha && (
        <div className="captcha-container">
          {/* In a real implementation, you'd use the actual reCAPTCHA component here */}
          <button 
            className="captcha-button"
            onClick={() => handleCaptchaSubmit('demo-token')}
          >
            Complete CAPTCHA (Demo)
          </button>
        </div>
      )}
      
      {/* Depth settings */}
      <div className="depth-container">
        <div className="depth-header">
          <span className="depth-title">
            <FontAwesomeIcon icon={faGear} />
            <p>Depth</p>
          </span>
          
          <div className="arrows-toggle">
            <span>Arrows|</span>
            <label className="toggle" htmlFor="suggestion-arrows-setting">
              <input
                id="suggestion-arrows-setting"
                type="checkbox"
                checked={showArrows}
                onChange={() => setShowArrows(!showArrows)}
              />
              <div className="toggle-fill"></div>
            </label>
          </div>
        </div>
        
        <div className="depth-slider-container">
          <input
            type="range"
            min="14"
            max="20"
            value={depth}
            onChange={handleDepthChange}
            className="depth-slider"
          />
          <span className="depth-counter">
            {depth}|
            <FontAwesomeIcon 
              icon={
                depth <= 14 
                  ? faBolt 
                  : depth <= 17 
                    ? faWind 
                    : faHourglassHalf
              } 
            />
          </span>
        </div>
      </div>
    </div>
  );
};

export default AnalysisForm;