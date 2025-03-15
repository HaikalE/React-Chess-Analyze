import { Chess } from 'chess.js';

/**
 * Simple PGN parser that directly uses chess.js
 * Intended for simple, clean PGNs without complex annotations
 * 
 * @param {string} pgn - PGN string to parse
 * @returns {Object} - Object with positions array and player info
 */
export const parseSimplePgn = (pgn) => {
  if (!pgn) {
    throw new Error('Empty PGN provided');
  }
  
  console.log("Parsing simple PGN:", pgn);
  
  // Extract headers manually
  const headers = {};
  const headerLines = pgn.match(/\[(\w+)\s+"([^"]+)"\]/g) || [];
  
  for (const line of headerLines) {
    const match = line.match(/\[(\w+)\s+"([^"]+)"\]/);
    if (match) {
      headers[match[1]] = match[2];
    }
  }
  
  // Create player info
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
  
  // Create chess instance
  const chess = new Chess();
  
  try {
    // Try to load the PGN directly
    chess.loadPgn(pgn, { sloppy: true });
    
    // Generate positions
    const moves = chess.history({ verbose: true });
    
    // Reset the board to starting position
    chess.reset();
    
    // Initialize positions array with starting position
    const positions = [{ fen: chess.fen() }];
    
    // Apply each move and record the position
    for (const move of moves) {
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
  } catch (error) {
    console.error("Error parsing simple PGN:", error);
    
    try {
      // Try manual move extraction as a fallback
      chess.reset();
      
      // Remove headers and extract just the moves section
      const movesText = pgn.replace(/\[[^\]]+\]/g, '').trim();
      
      // Split by move numbers and extract moves
      const movesByNum = movesText.split(/\d+\./);
      const positions = [{ fen: chess.fen() }];
      
      for (let i = 1; i < movesByNum.length; i++) {
        const movePair = movesByNum[i].trim().split(/\s+/);
        
        // Try to apply each move
        for (const move of movePair) {
          if (move && move !== '1-0' && move !== '0-1' && move !== '1/2-1/2' && move !== '*') {
            try {
              const result = chess.move(move, { sloppy: true });
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
              console.warn(`Failed to apply move "${move}":`, moveError);
            }
          }
        }
      }
      
      if (positions.length > 1) {
        return { positions, playerInfo };
      }
      
      throw new Error('No valid moves found');
    } catch (fallbackError) {
      throw new Error(`Failed to parse PGN: ${error.message}. Fallback also failed: ${fallbackError.message}`);
    }
  }
};