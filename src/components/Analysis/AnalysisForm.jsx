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

const AnalysisForm = ({ onShowGameSelect, pgnText, setPgnText, onDepthChange }) => {
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
  const [depth, setDepth] = useState(20);
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
  
  // Send depth changes to parent component
  useEffect(() => {
    if (onDepthChange) {
      onDepthChange(depth);
    }
  }, [depth, onDepthChange]);
  
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
    onShowGameSelect(loadType, username, depth);
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
    // Changed gap-3 to gap-2 for more compact mobile layout
    <div className="flex flex-col gap-2">
      {/* Source selection */}
      <div className="flex gap-1">
        <select 
          id="load-type-dropdown"
          value={loadType}
          onChange={handleLoadTypeChange}
          className="bg-secondary-700 text-sm text-white flex-grow rounded-r-none p-2 border border-secondary-600 focus:outline-none focus:ring-1 focus:ring-primary-500"
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
            className="bg-secondary-700 text-white text-sm rounded-l-none font-mono p-2 border border-secondary-600 focus:outline-none focus:ring-1 focus:ring-primary-500"
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
      
      {/* PGN or JSON input - reduced min-height for mobile */}
      {(loadType === 'pgn' || loadType === 'json') ? (
        <textarea
          value={pgnText}
          onChange={(e) => setPgnText(e.target.value)}
          placeholder={loadType === 'pgn' ? 'Enter PGN...' : 'Enter JSON...'}
          className="w-full bg-secondary-800 text-white placeholder-secondary-400 border border-secondary-600 rounded-md p-2 sm:p-3 text-sm min-h-[80px] sm:min-h-[100px] focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
          disabled={isAnalysisRunning}
        />
      ) : (
        <div className="flex">
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username..."
            className="w-full bg-secondary-800 text-white placeholder-secondary-400 border border-secondary-600 border-r-0 rounded-l-md p-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
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
      
      {/* Action buttons - more compact */}
      <button 
        className="btn-accent flex items-center justify-center gap-2 py-1.5 sm:py-2 px-4 rounded-md bg-accent-600 hover:bg-accent-700 text-white font-medium transition-colors duration-200 ${isAnalysisRunning ? 'opacity-70 cursor-not-allowed' : ''}"
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
      
      {/* Enhanced progress indicator - reduced padding on mobile */}
      {isAnalysisRunning && (
        <div className="mt-1 flex flex-col items-center p-2 sm:p-3 bg-secondary-800 rounded-lg border border-secondary-700">
          <div className="flex items-center justify-center gap-2 sm:gap-3 w-full mb-2 sm:mb-3">
            <FontAwesomeIcon icon={faChessKnight} className="text-primary-400 animate-bounce" />
            <div className="text-sm font-medium text-primary-300">{analysisStatus || "Processing..."}</div>
          </div>
          
          <div className="w-full bg-secondary-700 rounded-full overflow-hidden h-2 mb-1 sm:mb-2">
            <div 
              className="bg-accent-500 h-full transition-all duration-500"
              style={{ width: `${analysisProgress}%` }}
            ></div>
          </div>
          
          <div className="text-xs text-secondary-400 text-center">
            {getStageDescription()}
          </div>
          
          <div className="text-xs text-secondary-500 mt-1 sm:mt-2 text-center">
            Analysis at depth {depth} takes approximately {depth <= 14 ? "1-2" : depth <= 16 ? "2-3" : depth <= 18 ? "3-5" : "5-8"} minutes for a full game
          </div>
        </div>
      )}
      
      {/* Status message - more compact on mobile */}
      {!isAnalysisRunning && (analysisStatus || statusMessage) && !error && (
        <div className="text-sm py-1.5 sm:py-2 px-3 rounded bg-secondary-700 text-secondary-300">
          <FontAwesomeIcon icon={faCircleInfo} className="mr-1.5" />
          {analysisStatus || statusMessage}
        </div>
      )}
      
      {/* Error message with guidance - more compact */}
      {error && !isAnalysisRunning && (
        <div className="bg-error-500/20 text-error-500 p-2 sm:p-3 rounded-lg border border-error-500/50 mt-1">
          <div className="flex items-center gap-2 font-medium mb-1">
            <FontAwesomeIcon icon={faCircleExclamation} />
            <span>Error parsing your PGN</span>
          </div>
          <div className="text-sm mb-1 sm:mb-2">
            {error}
          </div>
          <div className="text-xs text-error-400">
            <p className="font-medium">Try these solutions:</p>
            <ul className="list-disc pl-4 mt-1 space-y-0.5 sm:space-y-1">
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
        <div className="flex justify-center mt-0.5 sm:mt-1">
          <button 
            className="btn-primary text-sm flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-3 py-1.5 rounded-md animate-pulse"
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