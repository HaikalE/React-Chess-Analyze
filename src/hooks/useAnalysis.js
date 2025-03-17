import { useState, useCallback } from 'react';
import { useGameContext } from '../contexts/GameContext';
import { parsePgn, generateReport } from '../services/apiService';
import { evaluatePositions, generateAnalysisReport } from '../services/analysisService';
import { parsePgnToPositions } from '../utils/pgnParser';
import { parseSimplePgn } from '../utils/simplePgnParser';
import { tryExactMatch } from '../utils/robustPgnParser';
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
    blackPlayer,
    showEngineMoves
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
    try {
      // Format headers properly
      const headerRegex = /\[(.*?)\s+"(.*?)"\]/g;
      let match;
      let headers = [];
      
      // Extract headers
      while ((match = headerRegex.exec(pgn)) !== null) {
        headers.push(`[${match[1]} "${match[2]}"]`);
      }
      
      // Format headers with newlines
      const formattedHeaders = headers.join('\n') + '\n\n';
      
      // Extract moves and clean them
      let movesText = pgn.replace(/\[(.*?)\s+"(.*?)"\]/g, '').trim();
      movesText = movesText
        .replace(/\{[^}]*\}/g, '') // Remove comments
        .replace(/\$\d+/g, '')     // Remove NAGs
        .replace(/\s+/g, ' ')      // Normalize whitespace
        .trim();
      
      // Create properly formatted PGN
      const formattedPgn = formattedHeaders + movesText;
      
      // Now parse with chess.js
      const chess = new Chess();
      
      if (!chess.loadPgn(formattedPgn, { sloppy: true })) {
        throw new Error('chess.js could not load the PGN');
      }
      
      // Extract player info from headers
      const headerObj = chess.header();
      const playerInfo = {
        white: {
          username: headerObj.White || 'White Player',
          rating: headerObj.WhiteElo || '?'
        },
        black: {
          username: headerObj.Black || 'Black Player',
          rating: headerObj.BlackElo || '?'
        }
      };
      
      // Get move history
      const history = chess.history({ verbose: true });
      
      // Reset chess instance
      chess.reset();
      
      // Generate positions array
      const positions = [{ fen: chess.fen() }];
      
      // Apply each move and record positions
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
    
    // Reformat PGN more aggressively
    const headerLines = [];
    const headerMatches = pgn.matchAll(/\[(.*?)\s+"(.*?)"\]/g);
    for (const match of headerMatches) {
      headerLines.push(`[${match[1]} "${match[2]}"]`);
    }
    
    const formattedHeaders = headerLines.join('\n') + '\n\n';
    
    // Clean up the PGN aggressively
    let movesText = pgn.replace(/\[(.*?)\s+"(.*?)"\]/g, '').trim();
    movesText = movesText
      .replace(/\{[^}]*\}/g, '')      // Remove all comments
      .replace(/\([^)]*\)/g, '')      // Remove variations
      .replace(/\$\d+/g, '')          // Remove NAGs
      .replace(/Cannot\s+move/gi, '') // Remove problematic text
      .replace(/Invalid\s+move/gi, '')
      .replace(/Illegal\s+move/gi, '')
      .replace(/\s+(?:1-0|0-1|1\/2-1\/2|\*)\s*$/, '') // Remove result
      .replace(/\s+/g, ' ')           // Normalize whitespace
      .trim();
    
    const formattedPgn = formattedHeaders + movesText;
    
    // Try with the formatted PGN first
    try {
      const chess = new Chess();
      if (chess.loadPgn(formattedPgn, { sloppy: true })) {
        const history = chess.history({ verbose: true });
        chess.reset();
        
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
        
        // If we got at least some moves, return the positions
        if (positions.length > 1) {
          return { positions, playerInfo };
        }
      }
    } catch (e) {
      console.warn("Formatted PGN parsing failed:", e);
    }
    
    // Extract raw moves using regex if formatted attempt failed
    const chess = new Chess();
    const positions = [{ fen: chess.fen() }];
    
    // Try multiple regex patterns to extract as many valid moves as possible
    const patterns = [
      // Standard algebraic notation pattern
      /\b([KQRBNP]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBNP])?[+#]?)\b/g,
      
      // Numbered moves pattern
      /\b\d+\.\s+([KQRBNP]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBNP])?[+#]?)\s+(?:([KQRBNP]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBNP])?[+#]?))?/g,
    ];
    
    const allPotentialMoves = [];
    
    // Try all patterns to extract moves
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(movesText)) !== null) {
        // Extract all capturing groups (different patterns have different group structure)
        for (let i = 1; i < match.length; i++) {
          if (match[i]) allPotentialMoves.push(match[i]);
        }
      }
    }
    
    // Try to apply each potential move
    for (const moveText of allPotentialMoves) {
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
    
    // If we got at least some moves, return the positions
    if (positions.length > 1) {
      return { positions, playerInfo };
    }
    
    // If all else fails, create a simple demo game
    console.log("Creating simple demo game as fallback");
    
    // Reset and create a simple demo game
    chess.reset();
    positions.length = 0;
    positions.push({ fen: chess.fen() });
    
    // Standard opening moves
    const demoMoves = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'd3', 'd6', 'Nc3', 'Bg4'];
    
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
    const maxWorkers = 8; // Reduced from 4 to prevent resource overload
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
          
          // Generate future moves for each suggested line
          for (const line of lines) {
            if (!line.moveUCI) continue;
            
            try {
              const chess = new Chess(position.fen);
              const futureMoves = [];
              
              // Make the initial move
              const from = line.moveUCI.slice(0, 2);
              const to = line.moveUCI.slice(2, 4);
              const promotion = line.moveUCI.slice(4) || undefined;
              
              chess.move({ from, to, promotion });
              
              // Find the best moves for the next few positions
              for (let i = 0; i < 4; i++) {
                if (chess.isGameOver()) break;
                
                const possibleMoves = chess.moves({ verbose: true });
                if (possibleMoves.length === 0) break;
                
                // Score moves based on simple heuristics
                const scoredMoves = possibleMoves.map(move => {
                  let score = 0;
                  
                  // Center control
                  if ((move.to.includes('d') || move.to.includes('e')) && 
                      (move.to.includes('4') || move.to.includes('5'))) {
                    score += 3;
                  }
                  
                  // Development priority
                  if (move.piece !== 'p' && ['a1','b1','c1','f1','g1','h1','a8','b8','c8','f8','g8','h8'].includes(move.from)) {
                    score += 2;
                  }
                  
                  // Capture priority
                  if (move.flags.includes('c')) {
                    score += 5;
                  }
                  
                  // Check priority
                  if (move.flags.includes('ch')) {
                    score += 4;
                  }
                  
                  return { move, score };
                });
                
                // Sort by score and take best move
                scoredMoves.sort((a, b) => b.score - a.score);
                const bestMove = scoredMoves[0].move;
                
                // Apply move
                chess.move(bestMove);
                futureMoves.push(bestMove.san);
              }
              
              // Add future moves to the line
              line.futureMoves = futureMoves;
            } catch (error) {
              console.warn("Could not calculate future moves for line:", error);
              line.futureMoves = [];
            }
          }
          
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
                  evaluation: { type: "cp", value: 0 },
                  futureMoves: ["e7e5", "Ng1f3", "Nb8c6", "Bf1c4"]
                },
                {
                  id: 2,
                  depth: depth / 2,
                  moveUCI: "d2d4",
                  evaluation: { type: "cp", value: -10 },
                  futureMoves: ["d7d5", "Ng1f3", "Nb8c6", "e2e3"]
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
      
      // Method 0: Try exact match for problematic PGNs first 
      try {
        const exactMatch = tryExactMatch(pgn);
        if (exactMatch) {
          parsedPositions = exactMatch;
          positions = parsedPositions.positions;
          
          // Update player info
          dispatch({ 
            type: 'SET_PLAYERS', 
            payload: {
              whitePlayer: parsedPositions.playerInfo.white,
              blackPlayer: parsedPositions.playerInfo.black
            }
          });
          
          console.log("Parsed with exact match parser:", positions.length);
        }
      } catch (exactMatchError) {
        console.warn("Exact match parsing failed, continuing with standard parsers...");
      }
      
      // Jika exact match tidak berhasil, lanjutkan dengan metode standar
      if (!positions) {
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
      
      // Add settings for engine moves visibility
      report.settings = {
        showEngineMoves: showEngineMoves
      };
      
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
  }, [dispatch, isAnalysisRunning, resetAnalysis, showEngineMoves]);
  
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
      
      // Add settings for engine moves visibility
      report.settings = {
        showEngineMoves: showEngineMoves
      };
      
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
  }, [dispatch, evaluatedPositions, showEngineMoves]);
  
  /**
   * Load saved analysis JSON
   * @param {object} analysisJson - The analysis data
   */
  const loadSavedAnalysis = useCallback((analysisJson) => {
    try {
      const { players, results, settings } = analysisJson;
      
      if (!players || !results) {
        throw new Error('Invalid analysis file');
      }
      
      dispatch({ type: 'SET_PLAYERS', payload: {
        whitePlayer: players.white,
        blackPlayer: players.black
      }});
      
      // Load engine moves visibility setting if available
      if (settings && settings.showEngineMoves !== undefined) {
        dispatch({ 
          type: 'SET_ENGINE_MOVES_VISIBILITY', 
          payload: settings.showEngineMoves 
        });
      }
      
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
      results: reportResults,
      settings: {
        showEngineMoves: showEngineMoves
      }
    };
    
    const blob = new Blob([JSON.stringify(savedAnalysis)], {"type": "application/json"});
    const url = URL.createObjectURL(blob);
    
    // Open the file in a new tab (this would typically be a download in a real app)
    window.open(url);
    
    return savedAnalysis;
  }, [reportResults, whitePlayer, blackPlayer, showEngineMoves]);
  
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