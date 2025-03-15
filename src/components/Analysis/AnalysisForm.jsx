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
  faHourglassHalf,
  faChessPawn,
  faSpinner,
  faChessKnight,
  faCircleExclamation
} from '@fortawesome/free-solid-svg-icons';

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
  const [statusMessage, setStatusMessage] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const [showCaptcha, setShowCaptcha] = useState(false);
  
  // Load saved preferences
  useEffect(() => {
    const savedUsername = localStorage.getItem(`chess-site-username-saved-${loadType}`);
    if (savedUsername && (loadType === 'chesscom' || loadType === 'lichess')) {
      setUsername(savedUsername);
    }
  }, [loadType]);
  
  // Update status message during analysis
  useEffect(() => {
    if (isAnalysisRunning) {
      setStatusMessage('Processing game, this may take a few minutes...');
    } else if (evaluatedPositions?.length > 0 && !reportResults) {
      setStatusMessage('Please complete the verification to continue.');
      setShowCaptcha(true);
    } else {
      setStatusMessage('');
      setShowCaptcha(false);
    }
  }, [isAnalysisRunning, evaluatedPositions, reportResults]);
  
  const handleLoadTypeChange = (e) => {
    const newLoadType = e.target.value;
    setLoadType(newLoadType);
    
    if (newLoadType === 'json') {
      setStatusMessage('Enter JSON from saved analysis');
    } else {
      setStatusMessage('');
    }
  };
  
  const handleAnalysisStart = async () => {
    if (isAnalysisRunning) return;
    
    if (loadType === 'json') {
      try {
        const savedAnalysis = JSON.parse(pgnText);
        const success = loadSavedAnalysis(savedAnalysis);
        
        if (!success) {
          setStatusMessage('Invalid analysis file');
        }
      } catch (error) {
        setStatusMessage('Invalid JSON format');
      }
      return;
    }
    
    if (!pgnText.trim()) {
      setStatusMessage('Please enter PGN to analyze');
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
      setStatusMessage('Please enter a username');
      return;
    }
    
    // Save username for future use
    localStorage.setItem(`chess-site-username-saved-${loadType}`, username);
    
    // Show game selection modal
    onShowGameSelect(loadType, username);
  };

  // Generate progress stage description
  const getStageDescription = () => {
    if (!analysisStatus) return "";
    if (analysisStatus.includes("Parsing")) {
      return "Opening PGN file and extracting moves";
    } else if (analysisStatus.includes("Evaluating")) {
      return "Analyzing each position with Stockfish";
    } else if (analysisStatus.includes("Generating")) {
      return "Creating move quality classifications and reports";
    } else if (analysisStatus.includes("complete")) {
      return "Your analysis is ready to explore!";
    }
    return "";
  };
  
  return (
    <div className="flex flex-col gap-3">
      {/* Source selection */}
      <div className="flex gap-1">
        <select 
          id="load-type-dropdown"
          value={loadType}
          onChange={handleLoadTypeChange}
          className="input bg-secondary-700 text-sm flex-grow rounded-r-none"
          disabled={isAnalysisRunning}
        >
          <option value="pgn">PGN</option>
          <option value="chesscom">Chess.com</option>
          <option value="lichess">Lichess.org</option>
          <option value="json">JSON</option>
        </select>
        
        {/* Depth setting */}
        <div className="relative group">
          <select
            value={depth}
            onChange={(e) => setDepth(parseInt(e.target.value))}
            className="input bg-secondary-700 text-sm rounded-l-none font-mono"
            disabled={isAnalysisRunning}
          >
            <option value="14">14 {/* Fast */}</option>
            <option value="16">16 {/* Standard */}</option>
            <option value="18">18 {/* Deep */}</option>
            <option value="20">20 {/* Very Deep */}</option>
          </select>
          <div className="absolute hidden group-hover:block bg-secondary-800 text-xs p-2 rounded shadow-lg -top-10 right-0 w-28 z-10">
            Analysis depth
          </div>
        </div>
      </div>
      
      {/* PGN or JSON input */}
      {(loadType === 'pgn' || loadType === 'json') ? (
        <textarea
          value={pgnText}
          onChange={(e) => setPgnText(e.target.value)}
          placeholder={loadType === 'pgn' ? 'Enter PGN...' : 'Enter JSON...'}
          className="input text-sm min-h-[100px]"
          disabled={isAnalysisRunning}
        />
      ) : (
        <div className="flex">
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username..."
            className="input text-sm flex-grow rounded-r-none"
            disabled={isAnalysisRunning}
          />
          <button 
            className="bg-primary-600 hover:bg-primary-700 text-white px-3 rounded-r-md disabled:opacity-50"
            onClick={handleFetchGames}
            disabled={isAnalysisRunning}
          >
            <FontAwesomeIcon icon={faArrowRight} />
          </button>
        </div>
      )}
      
      {/* Action buttons */}
      <button 
        className={`btn-accent flex items-center justify-center gap-2 ${isAnalysisRunning ? 'opacity-70 cursor-not-allowed' : ''}`}
        onClick={handleAnalysisStart}
        disabled={isAnalysisRunning}
      >
        {isAnalysisRunning ? (
          <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
        ) : (
          <FontAwesomeIcon icon={faMagnifyingGlass} />
        )}
        <span className="font-semibold">Analyze Game</span>
      </button>
      
      {/* Enhanced progress indicator */}
      {isAnalysisRunning && (
        <div className="mt-2 flex flex-col items-center p-3 bg-secondary-800 rounded-lg border border-secondary-700">
          <div className="flex items-center justify-center gap-3 w-full mb-3">
            <FontAwesomeIcon icon={faChessKnight} className="text-primary-400 animate-bounce" />
            <div className="text-sm font-medium text-primary-300">{analysisStatus || "Processing..."}</div>
          </div>
          
          <div className="w-full bg-secondary-700 rounded-full overflow-hidden h-2 mb-2">
            <div 
              className="bg-accent-500 h-full transition-all duration-500"
              style={{ width: `${analysisProgress}%` }}
            ></div>
          </div>
          
          <div className="text-xs text-secondary-400 text-center">
            {getStageDescription()}
          </div>
          
          <div className="text-xs text-secondary-500 mt-2 text-center">
            Analysis at depth {depth} takes approximately {depth <= 14 ? "1-2" : depth <= 16 ? "2-3" : "3-5"} minutes for a full game
          </div>
        </div>
      )}
      
      {/* Status message (when not analyzing) */}
      {!isAnalysisRunning && (analysisStatus || statusMessage) && !error && (
        <div className="text-sm py-2 px-3 rounded bg-secondary-700 text-secondary-300">
          <FontAwesomeIcon icon={faCircleInfo} className="mr-1.5" />
          {analysisStatus || statusMessage}
        </div>
      )}
      
      {/* Error message with guidance */}
      {error && !isAnalysisRunning && (
        <div className="bg-error-500/20 text-error-500 p-3 rounded-lg border border-error-500/50 mt-2">
          <div className="flex items-center gap-2 font-medium mb-1">
            <FontAwesomeIcon icon={faCircleExclamation} />
            <span>Error parsing your PGN</span>
          </div>
          <div className="text-sm mb-2">
            {error}
          </div>
          <div className="text-xs text-error-400">
            <p className="font-medium">Try these solutions:</p>
            <ul className="list-disc pl-4 mt-1 space-y-1">
              <li>Check if your PGN format is valid</li>
              <li>Remove any special annotations or comments</li>
              <li>Try copying a fresh PGN from Chess.com or Lichess</li>
              <li>Use the Chess.com or Lichess import options instead</li>
            </ul>
          </div>
        </div>
      )}
      
      {/* Captcha placeholder */}
      {showCaptcha && !isAnalysisRunning && (
        <div className="flex justify-center mt-1">
          <button 
            className="btn-primary text-sm flex items-center gap-2 animate-pulse"
            onClick={() => handleCaptchaSubmit('demo-token')}
          >
            <FontAwesomeIcon icon={faChessPawn} />
            Verify and Complete Analysis
          </button>
        </div>
      )}
    </div>
  );
};

export default AnalysisForm;