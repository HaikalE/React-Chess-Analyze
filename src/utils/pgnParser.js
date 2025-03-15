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
  
  // Extract headers for player info
  const headers = {};
  const headerRegex = /\[(.*?)\s+"(.*?)"\]/g;
  let headerMatch;
  
  while ((headerMatch = headerRegex.exec(pgn)) !== null) {
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
  
  // Clean PGN data by removing problematic elements
  let cleanedPgn = pgn
    // Remove comments
    .replace(/\{[^}]*\}/g, '')
    // Remove NAGs ($1, $2, etc.)
    .replace(/\$\d+/g, '')
    // Remove result at the end
    .replace(/\s+(?:1-0|0-1|1\/2-1\/2|\*)\s*$/, '')
    // Remove clock annotations
    .replace(/\s\{\[%clk\s[^}]*\]\}/g, '')
    // Remove line breaks in moves section
    .replace(/(\]\s*\n+)([1-9])/g, '$1\n$2')
    // Remove variations/alternatives
    .replace(/\([^\(\)]*(?:\([^\(\)]*\)[^\(\)]*)*\)/g, '');
  
  // Special handling for common parsing issues
  cleanedPgn = cleanedPgn
    // Fix common problematic annotations
    .replace(/Cannot\s+move/gi, '')
    .replace(/Invalid\s+move/gi, '')
    .replace(/Illegal\s+move/gi, '')
    // Fix common Chess.com formatting issues
    .replace(/\b(\d+)\.\.\./, '$1...')
    // Fix common Lichess formatting issues
    .replace(/\b(\d+)\.{3}\s*([KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?[+#]?)/, '$1... $2');
  
  console.log("Cleaned PGN for parsing:", cleanedPgn);
  
  // Try parsing with chess.js
  const chess = new Chess();
  
  try {
    if (chess.loadPgn(cleanedPgn, { sloppy: true })) {
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
    console.warn('Standard parsing failed, trying manual extraction:', error);
  }
  
  // If chess.js parsing fails, try extracting and applying moves manually
  try {
    // Extract moves only (after headers)
    const movesSection = cleanedPgn.replace(/\[[^\]]*\]/g, '').trim();
    
    // Process the move text to extract moves
    const moveMatches = movesSection.match(/\d+\.+\s*([^\s.]+)(?:\s+([^\s.]+))?/g) || [];
    const extractedMoves = [];
    
    for (const moveMatch of moveMatches) {
      // Extract white and black moves from notation like "1. e4 e5"
      const parts = moveMatch.split(/\s+/);
      for (let i = 1; i < parts.length; i++) {
        if (parts[i] && !parts[i].match(/^\d+\.+$/)) {
          extractedMoves.push(parts[i]);
        }
      }
    }
    
    console.log("Extracted moves:", extractedMoves);
    
    // Apply moves one by one
    chess.reset();
    const positions = [{ fen: chess.fen() }];
    
    for (const moveText of extractedMoves) {
      try {
        // Skip result indicators and invalid notations
        if (moveText === '1-0' || moveText === '0-1' || moveText === '1/2-1/2' || moveText === '*' || 
            !moveText.match(/^[KQRBNP]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?[+#]?$/)) {
          continue;
        }
        
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
        // Continue with next move
      }
    }
    
    // If no moves were applied successfully, try one more approach with regex
    if (positions.length <= 1) {
      // Reset and try again with a different approach - raw move extraction
      chess.reset();
      
      // Just look for all patterns that look like chess moves
      const movePattern = /\b([KQRBNP]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?[+#]?)\b/g;
      const rawMoves = [];
      let match;
      
      while ((match = movePattern.exec(cleanedPgn)) !== null) {
        rawMoves.push(match[1]);
      }
      
      console.log("Raw extracted moves:", rawMoves);
      
      // Apply these raw moves
      positions.length = 0; // Clear positions
      positions.push({ fen: chess.fen() }); // Add initial position
      
      for (const moveText of rawMoves) {
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
    }
    
    if (positions.length <= 1) {
      throw new Error('Failed to parse any valid moves');
    }
    
    return { positions, playerInfo };
  } catch (error) {
    console.error('Manual move extraction failed:', error);
    throw new Error(`Failed to parse PGN: ${error.message}`);
  }
};