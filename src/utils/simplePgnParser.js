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
  
  // Clean the PGN to remove problematic content
  let cleanedPgn = pgn
    .replace(/\{[^}]*\}/g, '') // Remove comments
    .replace(/Cannot\s+move/gi, '') // Remove problem words
    .replace(/Invalid\s+move/gi, '')
    .replace(/Illegal\s+move/gi, '')
    .replace(/\$\d+/g, ''); // Remove NAGs
  
  // Extract headers manually
  const headers = {};
  const headerLines = cleanedPgn.match(/\[(\w+)\s+"([^"]+)"\]/g) || [];
  
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
    // Try to load the PGN directly with sloppy mode
    if (chess.loadPgn(cleanedPgn, { sloppy: true })) {
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
    } else {
      throw new Error('chess.js could not load the PGN');
    }
  } catch (error) {
    console.error("Error with direct parsing:", error);
    
    try {
      // Try manual move extraction as a fallback
      chess.reset();
      
      // Remove headers and extract just the moves section
      const movesText = cleanedPgn.replace(/\[[^\]]+\]/g, '').trim();
      
      // Try to detect moves with regex
      const movePattern = /\b([KQRBNP]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?[+#]?)\b/g;
      const extractedMoves = [];
      let match;
      
      while ((match = movePattern.exec(movesText)) !== null) {
        extractedMoves.push(match[1]);
      }
      
      console.log("Extracted moves:", extractedMoves);
      
      // Apply these moves
      const positions = [{ fen: chess.fen() }];
      
      for (const moveText of extractedMoves) {
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
          console.warn(`Failed to apply move "${moveText}":`, moveError);
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