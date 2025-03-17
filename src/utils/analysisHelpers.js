import { Chess } from 'chess.js';

/**
 * Comprehensive check if a UCI move is valid in the given position
 * Handles all edge cases and checks for legal moves
 * @param {object} chess - Chess.js instance
 * @param {string} moveUCI - UCI move to check
 * @returns {boolean} - Whether the move is valid
 */
function isValidUciMove(chess, moveUCI) {
  // Basic format validation
  if (!moveUCI || typeof moveUCI !== 'string' || moveUCI.length < 4) return false;
  
  const from = moveUCI.slice(0, 2);
  const to = moveUCI.slice(2, 4);
  const promotion = moveUCI.length > 4 ? moveUCI.slice(4) : undefined;
  
  // Check if squares are valid
  if (!/^[a-h][1-8]$/.test(from) || !/^[a-h][1-8]$/.test(to)) return false;
  
  // Check if there's a piece at the 'from' square
  const piece = chess.get(from);
  if (!piece) return false;
  
  // Check if piece belongs to the player whose turn it is
  if (piece.color !== chess.turn()) return false;
  
  // For pawn promotions, check if the promotion piece is valid
  if (piece.type === 'p' && promotion) {
    if (!/^[qrbnk]$/.test(promotion)) return false;
    
    // Check if the pawn is on the second-to-last rank
    const isWhitePawn = piece.color === 'w';
    const isOnPromotionRank = isWhitePawn ? from[1] === '7' : from[1] === '2';
    
    // Pawn must be on the 7th rank (for white) or 2nd rank (for black) to be able to promote
    if (!isOnPromotionRank) return false;
  }
  
  // Check if the move is legal using chess.js legal moves
  try {
    const legalMoves = chess.moves({ verbose: true });
    return legalMoves.some(move => move.from === from && move.to === to && 
                           (!promotion || move.promotion === promotion));
  } catch (e) {
    // If there's any error checking legal moves, be conservative and return false
    return false;
  }
}

/**
 * Convert UCI moves to SAN notation starting from a given position
 * With comprehensive error handling for all edge cases
 * @param {string} fen - Starting position in FEN notation
 * @param {string} moveUCI - First UCI move to convert
 * @param {string[]} futureMoveUCIs - List of future UCI moves to convert
 * @returns {object} - Object containing SAN move and future moves
 */
export function convertUciToSan(fen, moveUCI, futureMoveUCIs = []) {
  if (!fen) {
    console.warn("No FEN provided to convertUciToSan");
    return { moveSAN: moveUCI || '', futureMoves: [] };
  }
  
  try {
    // Validate FEN
    let chess;
    try {
      chess = new Chess(fen);
    } catch (fenError) {
      console.warn(`Invalid FEN: ${fen}`, fenError);
      return { moveSAN: moveUCI || '', futureMoves: [] };
    }
    
    let moveSAN = '';
    const futureMoves = [];
    
    // Handle first move
    if (moveUCI) {
      // Check if the move is valid before trying to apply it
      if (!isValidUciMove(chess, moveUCI)) {
        console.warn(`Invalid or illegal UCI move ${moveUCI} for position ${fen}`);
        return { moveSAN: moveUCI, futureMoves: [] }; // Return UCI as fallback
      }
      
      const from = moveUCI.slice(0, 2);
      const to = moveUCI.slice(2, 4);
      const promotion = moveUCI.length > 4 ? moveUCI.slice(4) : undefined;
      
      try {
        const result = chess.move({ from, to, promotion });
        if (result) {
          moveSAN = result.san;
        } else {
          console.warn(`Move not executed despite validation: ${moveUCI}`);
          return { moveSAN: moveUCI, futureMoves: [] };
        }
      } catch (error) {
        console.warn(`Exception in chess.move for ${moveUCI}:`, error);
        return { moveSAN: moveUCI, futureMoves: [] }; // Return UCI as fallback
      }
    } else {
      // No move provided
      return { moveSAN: '', futureMoves: [] };
    }
    
    // Process future moves
    if (Array.isArray(futureMoveUCIs)) {
      for (const futureMoveUCI of futureMoveUCIs) {
        if (!futureMoveUCI) continue;
        
        try {
          // Check if the move is valid before trying to apply it
          if (!isValidUciMove(chess, futureMoveUCI)) {
            futureMoves.push(futureMoveUCI); // Use UCI as fallback
            continue;
          }
          
          const from = futureMoveUCI.slice(0, 2);
          const to = futureMoveUCI.slice(2, 4);
          const promotion = futureMoveUCI.length > 4 ? futureMoveUCI.slice(4) : undefined;
          
          const result = chess.move({ from, to, promotion });
          if (result) {
            futureMoves.push(result.san);
          } else {
            futureMoves.push(futureMoveUCI); // Use UCI as fallback
          }
        } catch (error) {
          console.warn(`Error converting future UCI move ${futureMoveUCI} to SAN:`, error);
          futureMoves.push(futureMoveUCI); // Use UCI as fallback
          break; // Stop on first error as subsequent moves would be invalid
        }
      }
    }
    
    return { moveSAN, futureMoves };
  } catch (error) {
    console.error("Critical error in UCI to SAN conversion:", error);
    return { moveSAN: moveUCI || '', futureMoves: [] };
  }
}

/**
 * Enhanced function to process engine line results, including converting UCI moves to SAN
 * With comprehensive validation and error handling
 * @param {string} fen - Position FEN string
 * @param {Array} engineLines - Raw engine evaluation lines
 * @returns {Array} - Processed engine lines with SAN notation
 */
export function processEngineLines(fen, engineLines) {
  if (!fen) {
    console.warn("No FEN provided to processEngineLines");
    return [];
  }
  
  if (!engineLines || !Array.isArray(engineLines)) {
    console.warn("Invalid engine lines received:", engineLines);
    return [];
  }
  
  try {
    // Validate FEN
    try {
      new Chess(fen);
    } catch (fenError) {
      console.warn(`Invalid FEN: ${fen}`, fenError);
      return engineLines; // Return original lines as fallback
    }
    
    return engineLines.map(line => {
      if (!line) return line;
      
      try {
        // Skip processing if moveUCI is missing
        if (!line.moveUCI) {
          console.warn("Line missing moveUCI:", line);
          return line;
        }
        
        // Skip processing if already processed
        if (line.moveSAN && line.futureMoves?.length > 0) {
          return line;
        }
        
        const futureMoveUCIs = Array.isArray(line.futureMoveUCIs) ? line.futureMoveUCIs : [];
        const { moveSAN, futureMoves } = convertUciToSan(fen, line.moveUCI, futureMoveUCIs);
        
        return {
          ...line,
          moveSAN: moveSAN || line.moveUCI,  // Fallback to UCI if SAN conversion fails
          futureMoves: futureMoves || []
        };
      } catch (lineError) {
        console.warn("Error processing engine line:", lineError);
        return line; // Return the original line on error
      }
    }).filter(line => line && line.moveUCI); // Remove invalid lines
  } catch (error) {
    console.error("Critical error in processEngineLines:", error);
    return engineLines; // Return original lines as fallback
  }
}

/**
 * Convert the entire Principal Variation (PV) from Stockfish output to SAN
 * With comprehensive error handling
 * @param {string} fen - Starting position FEN
 * @param {string} pvLine - Space-separated UCI moves from Stockfish
 * @returns {string[]} - Array of moves in SAN notation
 */
export function convertPvToSan(fen, pvLine) {
  if (!fen) {
    console.warn("No FEN provided to convertPvToSan");
    return [];
  }
  
  if (!pvLine) return [];
  
  try {
    // Validate FEN
    let chess;
    try {
      chess = new Chess(fen);
    } catch (fenError) {
      console.warn(`Invalid FEN: ${fen}`, fenError);
      return pvLine.trim().split(/\s+/); // Return raw UCI moves as fallback
    }
    
    const uciMoves = pvLine.trim().split(/\s+/);
    if (uciMoves.length === 0) return [];
    
    const sanMoves = [];
    
    for (const uciMove of uciMoves) {
      if (!uciMove) continue;
      
      try {
        // Check if the move is valid before trying to apply it
        if (!isValidUciMove(chess, uciMove)) {
          sanMoves.push(uciMove); // Use UCI as fallback
          continue;
        }
        
        const from = uciMove.slice(0, 2);
        const to = uciMove.slice(2, 4);
        const promotion = uciMove.length > 4 ? uciMove.slice(4) : undefined;
        
        const result = chess.move({ from, to, promotion });
        if (result) {
          sanMoves.push(result.san);
        } else {
          sanMoves.push(uciMove); // Use UCI as fallback
          break;
        }
      } catch (error) {
        console.warn(`Error in PV conversion for move ${uciMove}:`, error);
        sanMoves.push(uciMove); // Use UCI as fallback
        break;
      }
    }
    
    return sanMoves;
  } catch (error) {
    console.error("Critical error in convertPvToSan:", error);
    return pvLine.trim().split(/\s+/); // Return raw UCI moves as fallback
  }
}