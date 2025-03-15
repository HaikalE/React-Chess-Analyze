import { Chess } from 'chess.js';

/**
 * Parses PGN and returns array of positions with FEN strings
 * Handles the quirks of Chess.com and Lichess PGN formats
 * 
 * @param {string} pgn - PGN string to parse
 * @returns {Object} - Object with positions array and player info
 */
export const parsePgnToPositions = (pgn) => {
  if (!pgn || typeof pgn !== 'string') {
    throw new Error('Invalid PGN: Empty or not a string');
  }
  
  console.log("Parsing PGN:", pgn);
  
  // Clean up the PGN
  const cleanPgn = pgn.trim();
  
  // Extract headers for player info
  const headers = {};
  const headerRegex = /\[(.*?)\s+"(.*?)"\]/g;
  let headerMatch;
  
  while ((headerMatch = headerRegex.exec(cleanPgn)) !== null) {
    headers[headerMatch[1]] = headerMatch[2];
  }
  
  // Get player information
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
  
  // Try using chess.js to load the PGN directly first
  const chess = new Chess();
  
  try {
    if (chess.loadPgn(cleanPgn, { sloppy: true })) {
      console.log("Successfully parsed PGN with chess.js loadPgn");
      // If successful, get all moves and generate positions
      const history = chess.history({ verbose: true });
      
      // Reset to initial position
      chess.reset();
      
      // Build positions array
      const positions = [];
      
      // Add initial position
      positions.push({ fen: chess.fen() });
      
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
      
      return { positions, playerInfo };
    }
  } catch (error) {
    console.warn('Standard PGN parsing failed, trying alternative method:', error);
    // Continue to alternative method below
  }
  
  // If chess.js direct loading fails, try a more robust manual approach
  try {
    console.log("Trying alternative PGN parsing method");
    
    // Find the section with moves using a more flexible approach
    let movesText = cleanPgn;
    
    // Remove all header lines from the PGN to find the moves section
    const headerLines = cleanPgn.match(/^\[.*\].*$/gm);
    if (headerLines) {
      for (const line of headerLines) {
        movesText = movesText.replace(line, '');
      }
    }
    
    // Trim and clean up the moves text
    movesText = movesText.trim();
    console.log("Extracted moves text:", movesText);
    
    // If no moves found, throw an error
    if (!movesText) {
      throw new Error('No move text found after removing headers');
    }
    
    // Clean up move text - remove clocks, annotations, etc.
    const cleanMovesText = movesText
      .replace(/\{[^}]*\}/g, '') // Remove comments
      .replace(/\([^)]*\)/g, '') // Remove variations
      .replace(/\$\d+/g, '') // Remove NAGs
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
    
    console.log("Cleaned moves text:", cleanMovesText);
    
    // Extract moves - first try move numbers pattern
    let extractedMoves = [];
    const movePattern = /\d+\.\s*(\S+)(?:\s+(\S+))?/g;
    let moveMatch;
    
    while ((moveMatch = movePattern.exec(cleanMovesText)) !== null) {
      if (moveMatch[1]) extractedMoves.push(moveMatch[1]);
      if (moveMatch[2]) extractedMoves.push(moveMatch[2]);
    }
    
    // If no moves found with the pattern, just split by spaces and filter
    if (extractedMoves.length === 0) {
      console.log("No moves found with pattern, trying simple split");
      extractedMoves = cleanMovesText.split(/\s+/).filter(token => {
        // Filter out move numbers and result indicators
        return !token.match(/^\d+\./) && 
               !['1-0', '0-1', '1/2-1/2', '*'].includes(token);
      });
    }
    
    console.log("Extracted moves:", extractedMoves);
    
    // If still no moves, one more attempt - just try to play the whole text as a move sequence
    if (extractedMoves.length === 0) {
      console.log("Last resort - trying to load the entire move text");
      chess.reset();
      if (chess.loadPgn(cleanMovesText, { sloppy: true })) {
        extractedMoves = chess.history();
      } else {
        throw new Error('Could not extract any valid moves from the PGN');
      }
    }
    
    // Reset the chess instance
    chess.reset();
    
    // Apply moves and build positions array
    const positions = [];
    positions.push({ fen: chess.fen() });
    
    for (const moveText of extractedMoves) {
      // Skip result indicators and move numbers
      if (moveText === '1-0' || moveText === '0-1' || moveText === '1/2-1/2' || moveText === '*' || 
          moveText.match(/^\d+\./)) {
        continue;
      }
      
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
      } catch (moveError) {
        console.warn(`Error applying move "${moveText}":`, moveError);
        // Continue with the next move instead of halting the entire parse
      }
    }
    
    // Ensure we have at least one move
    if (positions.length <= 1) {
      throw new Error('Failed to parse any valid moves');
    }
    
    console.log("Successfully parsed PGN manually:", positions.length, "positions");
    return { positions, playerInfo };
  } catch (error) {
    console.error('Alternative PGN parsing method failed:', error);
    
    // One final attempt - the simplest approach
    try {
      console.log("Making one final attempt with simplest approach");
      chess.reset();
      
      // Remove any header line and just focus on moves
      const simplePgn = cleanPgn.replace(/^\[.*\].*$/gm, '').trim();
      
      // Direct load without any preprocessing
      if (chess.load_pgn(simplePgn)) {
        const positions = [];
        const history = chess.history({ verbose: true });
        
        chess.reset();
        positions.push({ fen: chess.fen() });
        
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
        
        return { positions, playerInfo };
      }
      
      throw new Error('All parsing attempts failed');
    } catch (finalError) {
      throw new Error(`Failed to parse PGN: ${error.message}`);
    }
  }
};