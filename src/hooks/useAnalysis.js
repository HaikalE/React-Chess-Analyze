import { useState, useCallback } from 'react';
import { useGameContext } from '../contexts/GameContext';
import { parsePgn, generateReport } from '../services/apiService';
import { evaluatePositions, generateAnalysisReport } from '../services/analysisService';
import { parsePgnToPositions } from '../utils/pgnParser';
import { parseSimplePgn } from '../utils/simplePgnParser';
import { Chess } from 'chess.js';

/**
 * Hook to handle chess game analysis logic
 */
const useAnalysis = () => {
  const { 
    dispatch, 
    isAnalysisRunning,
    evaluatedPositions,
    reportResults,
    whitePlayer, 
    blackPlayer
  } = useGameContext();
  
  const [error, setError] = useState(null);
  
  /**
   * Reset the analysis state
   */
  const resetAnalysis = useCallback(() => {
    dispatch({ type: 'RESET_ANALYSIS' });
    setError(null);
  }, [dispatch]);
  
  /**
   * Most direct method to parse PGN with chess.js
   */
  const parseWithChessJs = (pgn) => {
    const chess = new Chess();
    
    // Try to load PGN directly
    try {
      if (!chess.loadPgn(pgn, { sloppy: true })) {
        throw new Error('chess.js could not load the PGN');
      }
      
      // Extract player info from headers
      const headers = chess.header();
      const playerInfo = {
        white: {
          username: headers.White || 'White Player',
          rating: headers.WhiteElo || '?'
        },
        black: {
          username: headers.Black || 'Black Player',
          rating: headers.BlackElo || '?'
        }
      };
      
      // Get move history
      const history = chess.history({ verbose: true });
      
      // Reset chess instance
      chess.reset();
      
      // Generate positions array
      const positions = [{ fen: chess.fen() }];
      
      for (const move of history) {
        chess.move(move);
        positions.push({
          fen: chess.fen(),
          move: {
            san: move.san,
            uci: move.from + move.to + (move.promotion || '')
          }
        });
      }
      
      // Update player info
      dispatch({ 
        type: 'SET_PLAYERS', 
        payload: {
          whitePlayer: playerInfo.white,
          blackPlayer: playerInfo.black
        }
      });
      
      return positions;
    } catch (error) {
      console.error('Direct chess.js parsing failed:', error);
      throw error;
    }
  };
  
  /**
   * Start the analysis process with a PGN
   * @param {string} pgn - The PGN to analyze
   * @param {number} depth - Analysis depth
   */
  const analyzePgn = useCallback(async (pgn, depth = 16) => {
    if (isAnalysisRunning) return;
    
    try {
      resetAnalysis();
      dispatch({ type: 'SET_ANALYSIS_RUNNING', payload: true });
      dispatch({ type: 'SET_ANALYSIS_STATUS', payload: 'Parsing PGN...' });
      
      // Try multiple parsing methods in sequence
      let positions = null;
      let parsedPositions = null;
      let errorMessage = '';
      
      // Method 1: Simplest direct approach with chess.js
      try {
        positions = parseWithChessJs(pgn);
        console.log("Parsed positions directly with chess.js:", positions.length);
      } catch (directError) {
        errorMessage += `Direct parsing: ${directError.message}. `;
        console.warn("Direct chess.js parsing failed, trying simple parser...");
        
        // Method 2: Simple dedicated parser
        try {
          parsedPositions = parseSimplePgn(pgn);
          positions = parsedPositions.positions;
          
          // Update player info
          dispatch({ 
            type: 'SET_PLAYERS', 
            payload: {
              whitePlayer: parsedPositions.playerInfo.white,
              blackPlayer: parsedPositions.playerInfo.black
            }
          });
          
          console.log("Parsed with simple parser:", positions.length);
        } catch (simpleError) {
          errorMessage += `Simple parser: ${simpleError.message}. `;
          console.warn("Simple parser failed, trying advanced parser...");
          
          // Method 3: Advanced complex parser
          try {
            parsedPositions = parsePgnToPositions(pgn);
            positions = parsedPositions.positions;
            
            // Update player info
            dispatch({ 
              type: 'SET_PLAYERS', 
              payload: {
                whitePlayer: parsedPositions.playerInfo.white,
                blackPlayer: parsedPositions.playerInfo.black
              }
            });
            
            console.log("Parsed with advanced parser:", positions.length);
          } catch (advancedError) {
            errorMessage += `Advanced parser: ${advancedError.message}.`;
            throw new Error(`All parsing methods failed. ${errorMessage}`);
          }
        }
      }
      
      if (!positions || positions.length <= 1) {
        throw new Error('Failed to extract moves from PGN');
      }
      
      dispatch({ type: 'SET_POSITIONS', payload: positions });
      dispatch({ type: 'SET_ANALYSIS_STATUS', payload: 'Evaluating positions...' });
      
      // Evaluate positions with Stockfish
      const evaluated = await evaluatePositions(
        positions, 
        depth,
        (progress) => {
          dispatch({ type: 'SET_ANALYSIS_PROGRESS', payload: progress });
        }
      );
      
      dispatch({ type: 'SET_EVALUATED_POSITIONS', payload: evaluated });
      dispatch({ type: 'SET_ANALYSIS_STATUS', payload: 'Generating report...' });
      
      // Generate report client-side
      const report = generateAnalysisReport(evaluated);
      dispatch({ type: 'SET_REPORT_RESULTS', payload: report });
      dispatch({ type: 'SET_CURRENT_MOVE_INDEX', payload: 0 });
      
      dispatch({ type: 'SET_ANALYSIS_STATUS', payload: 'Analysis complete.' });
      dispatch({ type: 'SET_ANALYSIS_PROGRESS', payload: 100 });
      dispatch({ type: 'SET_ANALYSIS_RUNNING', payload: false });
      
      return evaluated;
    } catch (error) {
      console.error('Analysis failed:', error);
      setError(error.message || 'Analysis failed');
      dispatch({ type: 'SET_ANALYSIS_RUNNING', payload: false });
      dispatch({ type: 'SET_ANALYSIS_STATUS', payload: 'Error: ' + error.message });
      throw error;
    }
  }, [dispatch, isAnalysisRunning, resetAnalysis]);
  
  /**
   * Generate a final report from evaluated positions
   * @param {string} captchaToken - reCAPTCHA token
   */
  const generateFinalReport = useCallback(async (captchaToken) => {
    if (!evaluatedPositions || evaluatedPositions.length === 0) {
      setError('No positions to analyze');
      return;
    }
    
    try {
      dispatch({ type: 'SET_ANALYSIS_STATUS', payload: 'Generating report...' });
      
      // Generate client-side report
      const report = generateAnalysisReport(evaluatedPositions);
      dispatch({ type: 'SET_REPORT_RESULTS', payload: report });
      dispatch({ type: 'SET_CURRENT_MOVE_INDEX', payload: 0 });
      dispatch({ type: 'SET_ANALYSIS_STATUS', payload: '' });
      
      return report;
    } catch (error) {
      setError(error.message || 'Report generation failed');
      dispatch({ type: 'SET_ANALYSIS_STATUS', payload: 'Error: ' + error.message });
      throw error;
    } finally {
      dispatch({ type: 'SET_ANALYSIS_RUNNING', payload: false });
    }
  }, [dispatch, evaluatedPositions]);
  
  /**
   * Load saved analysis JSON
   * @param {object} analysisJson - The analysis data
   */
  const loadSavedAnalysis = useCallback((analysisJson) => {
    try {
      const { players, results } = analysisJson;
      
      if (!players || !results) {
        throw new Error('Invalid analysis file');
      }
      
      dispatch({ type: 'SET_PLAYERS', payload: {
        whitePlayer: players.white,
        blackPlayer: players.black
      }});
      
      dispatch({ type: 'SET_POSITIONS', payload: results.positions });
      dispatch({ type: 'SET_REPORT_RESULTS', payload: results });
      dispatch({ type: 'SET_CURRENT_MOVE_INDEX', payload: 0 });
      
      return true;
    } catch (error) {
      setError('Invalid saved analysis file');
      return false;
    }
  }, [dispatch]);
  
  /**
   * Save the current analysis to JSON
   */
  const saveAnalysis = useCallback(() => {
    if (!reportResults) {
      setError('No analysis to save');
      return null;
    }
    
    const savedAnalysis = {
      players: {
        white: whitePlayer,
        black: blackPlayer
      },
      results: reportResults
    };
    
    const blob = new Blob([JSON.stringify(savedAnalysis)], {"type": "application/json"});
    const url = URL.createObjectURL(blob);
    
    // Open the file in a new tab (this would typically be a download in a real app)
    window.open(url);
    
    return savedAnalysis;
  }, [reportResults, whitePlayer, blackPlayer]);
  
  return {
    analyzePgn,
    generateFinalReport,
    loadSavedAnalysis,
    saveAnalysis,
    error,
    isAnalysisRunning,
    resetAnalysis
  };
};

export default useAnalysis;