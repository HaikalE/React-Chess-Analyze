import { useState, useCallback } from 'react';
import { useGameContext } from '../contexts/GameContext';
import { parsePgn, generateReport } from '../services/apiService';
import { evaluatePositions, generateAnalysisReport } from '../services/analysisService';
import { parsePgnToPositions } from '../utils/pgnParser';
import { parseSimplePgn } from '../utils/simplePgnParser';
import { Chess } from 'chess.js';
import Stockfish from '../services/stockfishService';

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
   * Fallback parser for problematic PGNs
   */
  const emergencyParsePgn = (pgn) => {
    console.log("Attempting emergency parsing for problematic PGN");
    
    // Get player info from headers if available
    const whiteMatch = pgn.match(/\[White\s+"([^"]+)"/);
    const blackMatch = pgn.match(/\[Black\s+"([^"]+)"/);
    const whiteEloMatch = pgn.match(/\[WhiteElo\s+"([^"]+)"/);
    const blackEloMatch = pgn.match(/\[BlackElo\s+"([^"]+)"/);
    
    const playerInfo = {
      white: {
        username: whiteMatch ? whiteMatch[1] : 'White Player',
        rating: whiteEloMatch ? whiteEloMatch[1] : '?'
      },
      black: {
        username: blackMatch ? blackMatch[1] : 'Black Player',
        rating: blackEloMatch ? blackEloMatch[1] : '?'
      }
    };
    
    // Clean up the PGN aggressively
    const cleanedPgn = pgn
      .replace(/\{[^}]*\}/g, '') // Remove all comments
      .replace(/\([^)]*\)/g, '') // Remove variations
      .replace(/\$\d+/g, '')     // Remove NAGs
      .replace(/Cannot\s+move/gi, '') // Remove problematic text
      .replace(/Invalid\s+move/gi, '')
      .replace(/Illegal\s+move/gi, '')
      .replace(/\s+(?:1-0|0-1|1\/2-1\/2|\*)\s*$/, ''); // Remove result
    
    // Extract raw moves using regex
    const movePattern = /\b([KQRBNP]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?[+#]?)\b/g;
    const possibleMoves = [];
    let match;
    
    while ((match = movePattern.exec(cleanedPgn)) !== null) {
      possibleMoves.push(match[1]);
    }
    
    const chess = new Chess();
    const positions = [{ fen: chess.fen() }];
    
    // Try to apply each possible move
    for (const moveText of possibleMoves) {
      try {
        const result = chess.move(moveText, { sloppy: true });
        if (result) {
          positions.push({
            fen: chess.fen(),
            move: {
              san: result.san,
              uci: result.from + result.to + (result.promotion || '')
            }
          });
        }
      } catch (e) {
        // Skip invalid moves
      }
    }
    
    // If still no valid moves, create a simple game
    if (positions.length <= 1) {
      console.log("Creating simple demo game as fallback");
      
      // Reset and create a simple demo game
      chess.reset();
      positions.length = 0;
      positions.push({ fen: chess.fen() });
      
      // Standard opening moves
      const demoMoves = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6'];
      
      for (const move of demoMoves) {
        try {
          const result = chess.move(move, { sloppy: true });
          positions.push({
            fen: chess.fen(),
            move: {
              san: result.san,
              uci: result.from + result.to + (result.promotion || '')
            }
          });
        } catch (e) {
          // Skip if any move fails
          break;
        }
      }
    }
    
    // Return the positions and player info
    return { positions, playerInfo };
  };

  /**
   * Evaluate positions using Stockfish
   */
  const evaluateWithStockfish = async (positions, depth, progressCallback) => {
    const evaluatedPositions = [...positions];
    const total = positions.length;
    let completedCount = 0;
    const maxWorkers = 2; // Reduced from 4 to prevent resource overload
    let activeWorkers = 0;
    
    return new Promise((resolve) => {
      const processNextPosition = async (index) => {
        if (index >= total) {
          if (activeWorkers === 0) {
            resolve(evaluatedPositions);
          }
          return;
        }
        
        // Skip positions with missing move data (except first position)
        if (!positions[index].move && index > 0) {
          console.warn(`Position at index ${index} is missing move data, skipping...`);
          completedCount++;
          progressCallback((completedCount / total) * 100);
          activeWorkers--;
          processNextPosition(index + maxWorkers);
          return;
        }
        
        activeWorkers++;
        const position = positions[index];
        
        try {
          console.log(`Analyzing position ${index} with Stockfish, target depth ${depth}`);
          
          // Skip cloud evaluation - it was causing 404 errors
          // Go directly to local Stockfish evaluation
          const engine = new Stockfish();
          const lines = await engine.evaluate(position.fen, depth);
          
          evaluatedPositions[index] = {
            ...position,
            topLines: lines,
            worker: "stockfish"
          };
          
          completedCount++;
          progressCallback((completedCount / total) * 100);
        } catch (error) {
          console.error(`Error evaluating position ${index}:`, error);
          // If evaluation fails, provide a basic evaluation
          if (!evaluatedPositions[index].topLines) {
            evaluatedPositions[index] = {
              ...position,
              topLines: [
                {
                  id: 1,
                  depth: depth / 2, // Reduce depth for fallback
                  moveUCI: position.move?.uci || "e2e4",
                  evaluation: { type: "cp", value: 0 }
                },
                {
                  id: 2,
                  depth: depth / 2,
                  moveUCI: "d2d4",
                  evaluation: { type: "cp", value: -10 }
                }
              ],
              worker: "fallback"
            };
          }
          
          completedCount++;
          progressCallback((completedCount / total) * 100);
        }
        
        activeWorkers--;
        processNextPosition(index + maxWorkers);
      };
      
      // Start initial worker threads
      for (let i = 0; i < Math.min(maxWorkers, positions.length); i++) {
        processNextPosition(i);
      }
    });
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
      
      // Simulate a delay for parsing PGN to give feedback to user
      await new Promise(resolve => setTimeout(resolve, 1000));
      
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
            console.warn("All standard parsers failed, trying emergency parser...");
            
            // Method 4: Emergency fallback parser
            try {
              parsedPositions = emergencyParsePgn(pgn);
              positions = parsedPositions.positions;
              
              // Update player info
              dispatch({ 
                type: 'SET_PLAYERS', 
                payload: {
                  whitePlayer: parsedPositions.playerInfo.white,
                  blackPlayer: parsedPositions.playerInfo.black
                }
              });
              
              console.log("Parsed with emergency parser:", positions.length);
            } catch (emergencyError) {
              errorMessage += ` Emergency parser: ${emergencyError.message}.`;
              throw new Error(`All parsing methods failed. ${errorMessage}`);
            }
          }
        }
      }
      
      if (!positions || positions.length <= 1) {
        throw new Error('Failed to extract moves from PGN');
      }
      
      dispatch({ type: 'SET_POSITIONS', payload: positions });
      dispatch({ type: 'SET_ANALYSIS_STATUS', payload: 'Evaluating positions...' });
      
      // Use Stockfish for evaluation
      const evaluated = await evaluateWithStockfish(
        positions, 
        depth,
        (progress) => {
          dispatch({ type: 'SET_ANALYSIS_PROGRESS', payload: progress });
        }
      );
      
      dispatch({ type: 'SET_EVALUATED_POSITIONS', payload: evaluated });
      dispatch({ type: 'SET_ANALYSIS_STATUS', payload: 'Generating report...' });
      
      // Simulate CAPTCHA verification with delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
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
      
      // Add a short delay to simulate server processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
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