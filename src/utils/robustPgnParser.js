/**
 * Universal PGN Parser - Handles all standard PGN formats without any game-specific hardcoding
 * Designed to replace robustPgnParser.js
 */
import { Chess } from 'chess.js';

/**
 * Main entry point for parsing PGN
 * @param {string} pgn - PGN string to parse
 * @returns {Object} - Object with positions array and player info
 */
export function tryExactMatch(pgn) {
  return parseUniversalPgn(pgn);
}

/**
 * Parse PGN string with multiple fallback strategies
 * @param {string} pgn - PGN string to parse
 * @returns {Object} - Object with positions array and player info
 */
export function parseUniversalPgn(pgn) {
  console.log("Using universal PGN parser");
  
  // Extract player info from headers
  const playerInfo = extractPlayerInfo(pgn);
  
  // Try multiple parsing strategies with fallbacks
  
  // Strategy 1: Direct parsing with Chess.js
  try {
    const result = parseWithChessJS(pgn);
    if (result && result.positions.length > 1) {
      console.log(`Direct Chess.js parsing successful: ${result.positions.length-1} moves`);
      return { positions: result.positions, playerInfo };
    }
  } catch (e) {
    console.warn("Direct Chess.js parsing failed:", e.message);
  }
  
  // Strategy 2: Standard move extraction and application
  try {
    const result = parseWithMoveByMove(pgn);
    if (result && result.positions.length > 1) {
      console.log(`Standard move-by-move parsing successful: ${result.positions.length-1} moves`);
      return { positions: result.positions, playerInfo };
    }
  } catch (e) {
    console.warn("Standard move-by-move parsing failed:", e.message);
  }
  
  // Strategy 3: Advanced move extraction with recovery
  try {
    const result = parseWithAdvancedRecovery(pgn);
    if (result && result.positions.length > 1) {
      console.log(`Advanced recovery parsing successful: ${result.positions.length-1} moves`);
      return { positions: result.positions, playerInfo };
    }
  } catch (e) {
    console.warn("Advanced recovery parsing failed:", e.message);
  }
  
  // Return minimal positions if all else fails
  console.error("All parsing methods failed");
  return {
    positions: [{ fen: new Chess().fen() }],
    playerInfo
  };
}

/**
 * Extract player info from PGN headers
 */
function extractPlayerInfo(pgn) {
  const playerInfo = {
    white: { username: 'White Player', rating: '?' },
    black: { username: 'Black Player', rating: '?' }
  };
  
  // Extract header info
  const whiteMatch = pgn.match(/\[White\s+"([^"]+)"/);
  const blackMatch = pgn.match(/\[Black\s+"([^"]+)"/);
  const whiteEloMatch = pgn.match(/\[WhiteElo\s+"([^"]+)"/);
  const blackEloMatch = pgn.match(/\[BlackElo\s+"([^"]+)"/);
  
  if (whiteMatch) playerInfo.white.username = whiteMatch[1];
  if (blackMatch) playerInfo.black.username = blackMatch[1];
  if (whiteEloMatch) playerInfo.white.rating = whiteEloMatch[1];
  if (blackEloMatch) playerInfo.black.rating = blackEloMatch[1];
  
  return playerInfo;
}

/**
 * Clean and normalize PGN text
 */
function cleanPgn(pgn) {
  return pgn
    .replace(/\{[^}]*\}/g, '')      // Remove comments
    .replace(/\([^)]*\)/g, '')      // Remove variations
    .replace(/\$\d+/g, '')          // Remove NAGs
    .replace(/Cannot\s+move/gi, '') // Remove problem words
    .replace(/Invalid\s+move/gi, '')
    .replace(/Illegal\s+move/gi, '')
    .replace(/\s+/g, ' ')           // Normalize whitespace
    .replace(/\s*1-0\s*$|\s*0-1\s*$|\s*1\/2-1\/2\s*$|\s*\*\s*$/, '') // Remove result
    .trim();
}

/**
 * Parse using Chess.js's built-in parser
 */
function parseWithChessJS(pgn) {
  // Format headers properly for chess.js
  const headerRegex = /\[(.*?)\s+"(.*?)"\]/g;
  let match;
  let headers = [];
  
  // Extract headers
  while ((match = headerRegex.exec(pgn)) !== null) {
    headers.push(`[${match[1]} "${match[2]}"]`);
  }
  
  // Format headers with newlines
  const formattedHeaders = headers.join('\n') + '\n\n';
  
  // Extract and clean moves section
  let movesText = pgn.replace(/\[(.*?)\s+"(.*?)"\]/g, '').trim();
  movesText = cleanPgn(movesText);
  
  const formattedPgn = formattedHeaders + movesText;
  
  // Try direct PGN loading
  const chess = new Chess();
  if (!chess.loadPgn(formattedPgn, { sloppy: true })) {
    throw new Error("Chess.js failed to load PGN");
  }
  
  // Get position history
  const history = chess.history({ verbose: true });
  chess.reset();
  
  // Generate positions
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
  
  return { positions };
}

/**
 * Parse by extracting moves and applying them one by one
 */
function parseWithMoveByMove(pgn) {
  // Clean PGN
  let cleanedPgn = cleanPgn(pgn);
  
  // Extract moves using multiple patterns to maximize extraction
  const moves = extractMoves(cleanedPgn);
  console.log(`Extracted ${moves.length} moves from PGN`);
  
  if (moves.length === 0) {
    throw new Error("No moves found in PGN");
  }
  
  // Init chess and positions array
  const chess = new Chess();
  const positions = [{ fen: chess.fen() }];
  
  let successCount = 0;
  
  // Try to apply each move
  for (const moveText of moves) {
    try {
      // First handle special cases like promotion
      let result = null;
      
      if (moveText.includes('=')) {
        result = handlePromotion(chess, moveText);
      } else {
        // Try normal move
        result = chess.move(moveText, { sloppy: true });
      }
      
      if (result) {
        successCount++;
        positions.push({
          fen: chess.fen(),
          move: {
            san: result.san,
            uci: result.from + result.to + (result.promotion || '')
          }
        });
      }
    } catch (e) {
      console.warn(`Failed to apply move ${moveText}: ${e.message}`);
      // No recovery, just continue with next move
    }
  }
  
  console.log(`Successfully applied ${successCount}/${moves.length} moves`);
  
  if (successCount === 0) {
    throw new Error("No moves could be applied");
  }
  
  return { positions };
}

/**
 * Parse with advanced move extraction and recovery techniques
 */
function parseWithAdvancedRecovery(pgn) {
  // Clean PGN
  let cleanedPgn = cleanPgn(pgn);
  
  // Extract moves using multiple patterns
  const moves = extractMovesAdvanced(cleanedPgn);
  console.log(`Advanced extraction found ${moves.length} moves`);
  
  if (moves.length === 0) {
    throw new Error("Advanced extraction found no moves");
  }
  
  // Init chess and positions array
  const chess = new Chess();
  const positions = [{ fen: chess.fen() }];
  
  let successCount = 0;
  
  // Try to apply each move with advanced recovery
  for (let i = 0; i < moves.length; i++) {
    const moveText = moves[i];
    let applied = false;
    
    // Try different approaches for each move
    
    // Approach 1: Direct application
    try {
      let result;
      
      if (moveText.includes('=')) {
        result = handlePromotionAdvanced(chess, moveText);
      } else {
        result = chess.move(moveText, { sloppy: true });
      }
      
      if (result) {
        successCount++;
        positions.push({
          fen: chess.fen(),
          move: {
            san: result.san,
            uci: result.from + result.to + (result.promotion || '')
          }
        });
        applied = true;
        continue;
      }
    } catch (e) {
      // Continue to next approach
    }
    
    // Approach 2: Try without check/mate symbols
    if (!applied) {
      try {
        const cleanMove = moveText.replace(/[+#]/, '');
        const result = chess.move(cleanMove, { sloppy: true });
        
        if (result) {
          successCount++;
          positions.push({
            fen: chess.fen(),
            move: {
              san: moveText, // Keep original notation for display
              uci: result.from + result.to + (result.promotion || '')
            }
          });
          applied = true;
          continue;
        }
      } catch (e) {
        // Continue to next approach
      }
    }
    
    // Approach 3: Find similar legal moves
    if (!applied) {
      try {
        const legalMoves = chess.moves({ verbose: true });
        let bestMatch = null;
        let bestScore = 0;
        
        for (const legalMove of legalMoves) {
          const score = calculateSimilarity(moveText, legalMove.san);
          if (score > bestScore && score > 0.6) { // Minimum 60% similarity
            bestScore = score;
            bestMatch = legalMove;
          }
        }
        
        if (bestMatch) {
          chess.move(bestMatch);
          successCount++;
          positions.push({
            fen: chess.fen(),
            move: {
              san: bestMatch.san,
              uci: bestMatch.from + bestMatch.to + (bestMatch.promotion || '')
            }
          });
          applied = true;
          continue;
        }
      } catch (e) {
        // Continue to next approach
      }
    }
    
    // Approach 4: Special case for problematic promotions
    if (!applied && moveText.includes('=')) {
      const match = moveText.match(/^([a-h])([1-8])=([QRBNP])/);
      if (match) {
        try {
          const toFile = match[1];
          const toRank = match[2];
          const promotionPiece = match[3].toLowerCase();
          const toSquare = toFile + toRank;
          
          // Try all pawns that could promote
          const pawns = findPawnsThatCanPromote(chess, toSquare);
          
          for (const pawn of pawns) {
            try {
              const result = chess.move({
                from: pawn,
                to: toSquare,
                promotion: promotionPiece
              });
              
              if (result) {
                successCount++;
                positions.push({
                  fen: chess.fen(),
                  move: {
                    san: moveText,
                    uci: pawn + toSquare + promotionPiece
                  }
                });
                applied = true;
                break;
              }
            } catch (e) {
              // Try next pawn
            }
          }
          
          if (applied) continue;
        } catch (e) {
          // Continue
        }
      }
    }
    
    // If we couldn't apply this move after all approaches, log and continue
    if (!applied) {
      console.warn(`Could not apply move ${moveText} after all recovery attempts`);
    }
  }
  
  console.log(`Advanced recovery applied ${successCount}/${moves.length} moves`);
  
  if (successCount === 0) {
    throw new Error("Could not apply any moves with advanced recovery");
  }
  
  return { positions };
}

/**
 * Find pawns that could potentially promote to a target square
 */
function findPawnsThatCanPromote(chess, targetSquare) {
  const turn = chess.turn();
  const board = chess.board();
  const pawns = [];
  
  // Check the target rank
  const targetRank = parseInt(targetSquare[1]);
  
  // Only pawns on the 7th rank (for white) or 2nd rank (for black) can promote
  const sourceRank = turn === 'w' ? 6 : 1; // 0-based index (7th rank is 6, 2nd rank is 1)
  
  // Check pawns in the corresponding file and adjacent files
  const targetFile = targetSquare.charCodeAt(0) - 97; // 'a' is 97 in ASCII
  const filesToCheck = [targetFile - 1, targetFile, targetFile + 1].filter(f => f >= 0 && f < 8);
  
  for (const file of filesToCheck) {
    const piece = board[sourceRank][file];
    if (piece && piece.type === 'p' && piece.color === turn) {
      const pawnSquare = String.fromCharCode(97 + file) + (8 - sourceRank);
      pawns.push(pawnSquare);
    }
  }
  
  return pawns;
}

/**
 * Extract moves using multiple regex patterns
 */
function extractMoves(pgn) {
  // Try several patterns to extract moves
  const patterns = [
    // Standard algebraic moves including promotions, check, and mate
    /\b([KQRBNP]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBNP])?[+#]?|O-O(?:-O)?)\b/g,
    
    // Move numbers with white and black moves
    /\d+\.\s+([KQRBNP]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBNP])?[+#]?|O-O(?:-O)?)\s+(?:([KQRBNP]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBNP])?[+#]?|O-O(?:-O)?))?/g
  ];
  
  const allMoves = [];
  
  // Try each pattern
  for (const pattern of patterns) {
    let match;
    const matches = [];
    
    // Reset pattern
    pattern.lastIndex = 0;
    
    while ((match = pattern.exec(pgn)) !== null) {
      // Add all capturing groups that look like moves
      for (let i = 1; i < match.length; i++) {
        if (match[i] && isValidMoveText(match[i])) {
          matches.push(match[i]);
        }
      }
    }
    
    // If this pattern found more moves, use it
    if (matches.length > allMoves.length) {
      allMoves.length = 0;
      allMoves.push(...matches);
    }
  }
  
  return allMoves;
}

/**
 * Advanced move extraction with more patterns
 */
function extractMovesAdvanced(pgn) {
  const patterns = [
    // Standard moves
    /\b([KQRBNP]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBNP])?[+#]?|O-O(?:-O)?)\b/g,
    
    // Move numbers with standard format
    /\d+\.\s+([KQRBNP]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBNP])?[+#]?|O-O(?:-O)?)\s+(?:([KQRBNP]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBNP])?[+#]?|O-O(?:-O)?))?/g,
    
    // Specific pattern for promotion moves
    /\b([a-h][1-8]=[QRBNP][+#]?)\b/g,
    
    // Pattern for castling with zeros (0-0 instead of O-O)
    /\b(0-0(?:-0)?)\b/g
  ];
  
  // Also handle variations in move number format
  const movesText = pgn
    .replace(/(\d+)\.{3}/g, '$1... ') // Fix common ellipsis format
    .replace(/(\d+)\.{2,}/g, '$1... ') // Normalize any number of dots
    .replace(/\b0-0\b/g, 'O-O')        // Normalize castling
    .replace(/\b0-0-0\b/g, 'O-O-O');   // Normalize long castling
  
  // Collect all unique moves
  const allMoves = new Set();
  
  // Try all patterns
  for (const pattern of patterns) {
    let match;
    pattern.lastIndex = 0;
    
    while ((match = pattern.exec(movesText)) !== null) {
      for (let i = 1; i < match.length; i++) {
        if (match[i] && isValidMoveText(match[i])) {
          allMoves.add(match[i]);
        }
      }
    }
  }
  
  // Process the moves to ensure they're in the correct order
  const result = [];
  const moveNumberPattern = /(\d+)\.(?:\s+|\.\.\.\s*)([KQRBNP]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBNP])?[+#]?|O-O(?:-O)?)\s*(?:([KQRBNP]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBNP])?[+#]?|O-O(?:-O)?))?/g;
  
  // Try to extract moves in order using move numbers
  let moveNumberMatch;
  while ((moveNumberMatch = moveNumberPattern.exec(movesText)) !== null) {
    if (moveNumberMatch[2]) result.push(moveNumberMatch[2]);
    if (moveNumberMatch[3]) result.push(moveNumberMatch[3]);
  }
  
  // If we didn't get moves in order, use the unordered set
  if (result.length === 0) {
    result.push(...allMoves);
  }
  
  return result;
}

/**
 * Check if text looks like a valid chess move
 */
function isValidMoveText(text) {
  if (!text) return false;
  
  // Check for castling
  if (text === 'O-O' || text === 'O-O-O') return true;
  
  // Check for standard algebraic notation
  return /^[KQRBNP]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBNP])?[+#]?$/.test(text);
}

/**
 * Special handling for promotion moves
 */
function handlePromotion(chess, moveText) {
  // Remove check/mate symbols
  const cleanMove = moveText.replace(/[+#]/, '');
  
  // Parse promotion format (e.g., g1=Q)
  const match = cleanMove.match(/^([a-h][1-8])=([QRBNP])$/);
  if (!match) return null;
  
  const toSquare = match[1];
  const promotionPiece = match[2].toLowerCase();
  
  // Find source square by looking at legal moves
  const legalMoves = chess.moves({ verbose: true });
  
  // Find promotion move to the target square
  for (const move of legalMoves) {
    if (move.to === toSquare && move.promotion) {
      return chess.move({
        from: move.from,
        to: toSquare,
        promotion: promotionPiece
      });
    }
  }
  
  // Try to guess the source square based on typical pawn movement
  const toFile = toSquare.charAt(0);
  const toRank = toSquare.charAt(1);
  
  // For white pawns promoting to 8th rank, check 7th rank
  // For black pawns promoting to 1st rank, check 2nd rank
  const fromRank = toRank === '8' ? '7' : '2';
  const possibleFromSquares = [
    toFile + fromRank,  // Straight push
    String.fromCharCode(toFile.charCodeAt(0) - 1) + fromRank,  // Capture from left
    String.fromCharCode(toFile.charCodeAt(0) + 1) + fromRank   // Capture from right
  ];
  
  // Try each possible source square
  for (const fromSquare of possibleFromSquares) {
    try {
      return chess.move({
        from: fromSquare,
        to: toSquare,
        promotion: promotionPiece
      });
    } catch (e) {
      // Continue to next potential source square
    }
  }
  
  return null;
}

/**
 * Advanced promotion handling with additional recovery
 */
function handlePromotionAdvanced(chess, moveText) {
  // Try standard promotion handling first
  const result = handlePromotion(chess, moveText);
  if (result) return result;
  
  // Advanced handling if standard fails
  const cleanMove = moveText.replace(/[+#]/, '');
  const match = cleanMove.match(/^([a-h])([1-8])=([QRBNP])$/);
  
  if (!match) return null;
  
  const toFile = match[1];
  const toRank = match[2];
  const promotionPiece = match[3].toLowerCase();
  const toSquare = toFile + toRank;
  
  // Check if there are any pawns that can promote
  const turn = chess.turn();
  const board = chess.board();
  
  // Check pawns in the right file or adjacent files
  const fileIndex = toFile.charCodeAt(0) - 97; // 'a' is 97
  
  // Source rank depends on turn
  const sourceRank = turn === 'w' ? 6 : 1; // 0-based index (7th rank is 6, 2nd rank is 1)
  
  // Check all files for pawns
  for (let fileOffset = -1; fileOffset <= 1; fileOffset++) {
    const checkFile = fileIndex + fileOffset;
    if (checkFile < 0 || checkFile > 7) continue;
    
    // Check if there's a pawn
    if (board[sourceRank] && board[sourceRank][checkFile]) {
      const piece = board[sourceRank][checkFile];
      if (piece && piece.type === 'p' && piece.color === turn) {
        const fromSquare = String.fromCharCode(97 + checkFile) + (8 - sourceRank);
        
        try {
          return chess.move({
            from: fromSquare,
            to: toSquare,
            promotion: promotionPiece
          });
        } catch (e) {
          // Try next possible pawn
        }
      }
    }
  }
  
  // If all else fails, check every square for a pawn that can move to the target
  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      if (board[rank] && board[rank][file]) {
        const piece = board[rank][file];
        if (piece && piece.type === 'p' && piece.color === turn) {
          const fromSquare = String.fromCharCode(97 + file) + (8 - rank);
          
          try {
            return chess.move({
              from: fromSquare,
              to: toSquare,
              promotion: promotionPiece
            });
          } catch (e) {
            // Try next square
          }
        }
      }
    }
  }
  
  return null;
}

/**
 * Calculate similarity between two text strings
 */
function calculateSimilarity(text1, text2) {
  if (!text1 || !text2) return 0;
  
  // Clean the texts for better comparison
  const clean1 = text1.replace(/[+#]/, '');
  const clean2 = text2.replace(/[+#]/, '');
  
  // Count matching characters
  const minLength = Math.min(clean1.length, clean2.length);
  let matches = 0;
  
  for (let i = 0; i < minLength; i++) {
    if (clean1[i] === clean2[i]) matches++;
  }
  
  return matches / Math.max(clean1.length, clean2.length);
}