import { Chess } from 'chess.js';
import { Classification } from './constants';

// Nilai buah catur
export const pieceValues = {
  "p": 1,
  "n": 3,
  "b": 3,
  "r": 5,
  "q": 9,
  "k": Infinity,
  "m": 0 // Placeholder untuk square kosong
};

// Klasifikasi berdasarkan centipawn
export const centipawnClassifications = [
  Classification.BEST,
  Classification.EXCELLENT,
  Classification.GOOD,
  Classification.INACCURACY,
  Classification.MISTAKE,
  Classification.BLUNDER
];

// Opsi promosi
export const promotions = [undefined, "b", "n", "r", "q"];

// Fungsi untuk mendapatkan koordinat papan
export function getBoardCoordinates(square) {
  return {
    x: "abcdefgh".indexOf(square.slice(0, 1)),
    y: parseInt(square.slice(1)) - 1
  };
}

// Fungsi untuk mendapatkan notasi square dari koordinat
export function getSquare(coordinate) {
  return "abcdefgh".charAt(coordinate.x) + (coordinate.y + 1).toString();
}

// Algoritma WTF dari sumber asli
// Mendapatkan threshold maksimum evaluation loss untuk klasifikasi
export function getEvaluationLossThreshold(classif, prevEval) {
  prevEval = Math.abs(prevEval);
  
  let threshold = 0;
  
  switch (classif) {
    case Classification.BEST:
      threshold = 0.0001 * Math.pow(prevEval, 2) + (0.0236 * prevEval) - 3.7143;
      break;
    case Classification.EXCELLENT:
      threshold = 0.0002 * Math.pow(prevEval, 2) + (0.1231 * prevEval) + 27.5455;
      break;
    case Classification.GOOD:
      threshold = 0.0002 * Math.pow(prevEval, 2) + (0.2643 * prevEval) + 60.5455;
      break;
    case Classification.INACCURACY:
      threshold = 0.0002 * Math.pow(prevEval, 2) + (0.3624 * prevEval) + 108.0909;
      break;
    case Classification.MISTAKE:
      threshold = 0.0003 * Math.pow(prevEval, 2) + (0.4027 * prevEval) + 225.8182;
      break;
    default:
      threshold = Infinity;
  }
  
  return Math.max(threshold, 0);
}

// Fungsi untuk mendapatkan piece yang menyerang square tertentu
export function getAttackers(fen, square) {
  let attackers = [];
  
  try {
    let board = new Chess(fen);
    let piece = board.get(square);
    
    // If no piece at square, return empty array
    if (!piece) return [];
    
    // Set colour to move to opposite of attacked piece
    let oppositeTurn = piece.color === 'w' ? 'b' : 'w';
    
    // Try to load a modified FEN with opponent to move
    try {
      board.load(fen
        .replace(/(?<= )(?:w|b)(?= )/g, oppositeTurn)
        .replace(/ [a-h][1-8] /g, " - ")
      );
    } catch (e) {
      console.warn("Failed to modify FEN for attacker check:", e);
      return [];
    }
    
    // Find each legal move that captures attacked piece
    let legalMoves = board.moves({ verbose: true });
    
    for (let move of legalMoves) {
      if (move.to === square) {
        attackers.push({
          square: move.from,
          color: move.color,
          type: move.piece
        });
      }
    }
    
    // If there is an opposite king around the attacked piece add him as an attacker
    // if he is not the only attacker or it is a legal move for the king to capture it
    let oppositeKing;
    let oppositeColour = piece.color === 'w' ? 'b' : 'w';
    
    let pieceCoordinate = getBoardCoordinates(square);
    for (let xOffset = -1; xOffset <= 1; xOffset++) {
      for (let yOffset = -1; yOffset <= 1; yOffset++) {
        if (xOffset === 0 && yOffset === 0) continue;
        
        try {
          let offsetSquare = getSquare({
            x: Math.min(Math.max(pieceCoordinate.x + xOffset, 0), 7),
            y: Math.min(Math.max(pieceCoordinate.y + yOffset, 0), 7)
          });
          
          let offsetPiece = board.get(offsetSquare);
          if (!offsetPiece) continue;
          
          if (offsetPiece.color === oppositeColour && offsetPiece.type === "k") {
            oppositeKing = {
              color: offsetPiece.color,
              square: offsetSquare,
              type: offsetPiece.type
            };
            break;
          }
        } catch (e) {
          console.warn("Error checking adjacent squares:", e);
        }
      }
      if (oppositeKing) break;
    }
    
    if (!oppositeKing) return attackers;
    
    let kingCaptureLegal = false;
    try {
      board.move({
        from: oppositeKing.square,
        to: square
      });
      
      kingCaptureLegal = true;
    } catch {}
    
    if (kingCaptureLegal || attackers.length > 0) {
      attackers.push(oppositeKing);
    }
    
    return attackers;
  } catch (e) {
    console.error("Error in getAttackers:", e);
    return [];
  }
}

// Fungsi untuk mendapatkan pembela buah pada square tertentu
export function getDefenders(fen, square) {
  try {
    let board = new Chess(fen);
    let piece = board.get(square);
    
    // If no piece at square, return empty array
    if (!piece) return [];
    
    let testAttacker = getAttackers(fen, square)[0];
    
    // If there is an attacker we can test capture the piece with
    if (testAttacker) {
      // Set player to move to colour of test attacker
      try {
        board.load(fen
          .replace(/(?<= )(?:w|b)(?= )/g, testAttacker.color)
          .replace(/ [a-h][1-8] /g, " - ")
        );
      } catch (e) {
        console.warn("Failed to modify FEN for defender check:", e);
        return [];
      }
      
      // Capture the defended piece with the test attacker
      for (let promotion of promotions) {
        try {
          board.move({
            from: testAttacker.square,
            to: square,
            promotion: promotion
          });
          
          // Return the attackers that can now capture the test attacker
          return getAttackers(board.fen(), square);
        } catch {}
      }
    } else {
      // Set player to move to defended piece colour
      try {
        board.load(fen
          .replace(/(?<= )(?:w|b)(?= )/g, piece.color)
          .replace(/ [a-h][1-8] /g, " - ")
        );
      } catch (e) {
        console.warn("Failed to modify FEN for defender check:", e);
        return [];
      }
      
      // Replace defended piece with an enemy queen
      try {
        board.put({
          color: piece.color === 'w' ? 'b' : 'w',
          type: "q"
        }, square);
        
        // Return the attackers of that piece
        return getAttackers(board.fen(), square);
      } catch (e) {
        console.warn("Failed to place test piece:", e);
      }
    }
    
    return [];
  } catch (e) {
    console.error("Error in getDefenders:", e);
    return [];
  }
}

// Fungsi untuk cek apakah buah sedang "hanging" (bisa diambil)
export function isPieceHanging(lastFen, fen, square) {
  try {
    // Initial null checks to prevent errors
    if (!lastFen || !fen || !square) {
      console.warn("Missing parameters in isPieceHanging");
      return false;
    }
    
    let lastBoard = new Chess(lastFen);
    let board = new Chess(fen);
    
    let lastPiece = lastBoard.get(square);
    let piece = board.get(square);
    
    // If either piece is undefined, it's not hanging
    if (!lastPiece || !piece) {
      return false;
    }
    
    let attackers = getAttackers(fen, square);
    let defenders = getDefenders(fen, square);
    
    // If piece was just traded equally or better, not hanging
    if (pieceValues[lastPiece.type] >= pieceValues[piece.type] && lastPiece.color !== piece.color) {
      return false;
    }
    
    // If a rook took a minor piece that was only defended by one other
    // minor piece, it was a favourable rook exchange, so rook not hanging
    if (
      piece.type === "r" &&
      pieceValues[lastPiece.type] === 3 && 
      attackers.every(atk => pieceValues[atk.type] === 3) &&
      attackers.length === 1
    ) {
      return false;
    }
    
    // If piece has an attacker of lower value, hanging
    if (attackers.some(atk => pieceValues[atk.type] < pieceValues[piece.type])) {
      return true;
    }
    
    if (attackers.length > defenders.length) {
      let minAttackerValue = Infinity;
      for (let attacker of attackers) {
        minAttackerValue = Math.min(pieceValues[attacker.type], minAttackerValue);
      }
      
      // If taking the piece even though it has more attackers than defenders
      // would be a sacrifice in itself, not hanging
      if (
        pieceValues[piece.type] < minAttackerValue && 
        defenders.some(dfn => pieceValues[dfn.type] < minAttackerValue)
      ) {
        return false;
      }
      
      // If any of the piece's defenders are pawns, then the sacrificed piece
      // is the defending pawn. The least valuable attacker is equal in value
      // to the sacrificed piece at this point of the logic
      if (defenders.some(dfn => pieceValues[dfn.type] === 1)) {
        return false;
      }
      
      return true;
    }
    
    return false;
  } catch (e) {
    console.error("Error in isPieceHanging:", e, {lastFen, fen, square});
    return false; // Safe default is "not hanging"
  }
}

// Fungsi utama untuk menentukan kualitas langkah
export function determineMoveQuality(lastFen, fen, prevEval, evaluation, prevTopMoves, topMoves, moveUci, moveSan) {
  try {
    // Cek parameter input
    if (!lastFen || !fen || !prevEval || !evaluation || !prevTopMoves || !topMoves) {
      console.warn("Missing parameters for move quality determination");
      return Classification.BOOK;
    }
    
    const board = new Chess(fen);
    const lastBoard = new Chess(lastFen);
    const moveColour = fen.includes(" b ") ? "white" : "black";
    const topMove = prevTopMoves[0];
    const secondTopMove = prevTopMoves[1];
    
    // Hitung absolute evaluation (dari perspektif pemain yang bergerak)
    const absoluteEvaluation = evaluation.value * (moveColour === "white" ? 1 : -1);
    const previousAbsoluteEvaluation = prevEval.value * (moveColour === "white" ? 1 : -1);
    const absoluteSecondEvaluation = secondTopMove ? (secondTopMove.evaluation.value * (moveColour === "white" ? 1 : -1)) : 0;
    
    // Hitung evaluation loss
    let evalLoss;
    if (moveColour === "white") {
      evalLoss = prevEval.value - evaluation.value;
    } else {
      evalLoss = evaluation.value - prevEval.value;
    }
    
    // Jika ini satu-satunya langkah yang mungkin
    if (!secondTopMove) {
      return Classification.FORCED;
    }
    
    const noMate = prevEval.type === "cp" && evaluation.type === "cp";
    
    // Jika langkah ini adalah rekomendasi terbaik engine
    if (topMove.moveUCI === moveUci) {
      // Langkah terbaik default
      let classification = Classification.BEST;
      
      // Cek kemungkinan langkah brilian
      if (noMate) {
        const winningAnyways = (
          absoluteSecondEvaluation >= 700 && topMove.evaluation.type === "cp" ||
          (topMove.evaluation.type === "mate" && secondTopMove?.evaluation?.type === "mate")
        );
        
        if (absoluteEvaluation >= 0 && !winningAnyways && !moveSan.includes("=")) {
          if (!lastBoard.isCheck()) {
            const currentBoard = new Chess(fen);
            
            // Get the square of the piece that was captured or moved to
            const toSquare = moveUci?.slice(2, 4);
            if (toSquare) {
              // Make sure piece exists before checking its type
              let lastPiece = lastBoard.get(toSquare);
              if (!lastPiece) {
                lastPiece = { type: "m" }; // Use "m" for empty square
              }
              
              let sacrificedPieces = [];
              // Cek buah yang dikorbankan
              for (let row of currentBoard.board()) {
                if (!row) continue;
                
                for (let piece of row) {
                  if (!piece) continue;
                  if (piece.color !== moveColour.charAt(0)) continue;
                  if (piece.type === "k" || piece.type === "p") continue;
                  
                  // Jika buah yang baru saja ditangkap nilainya lebih tinggi dari kandidat
                  // buah yang hanging, tidak hanging, ada tukar yang lebih baik
                  if (pieceValues[lastPiece.type] >= pieceValues[piece.type]) {
                    continue;
                  }
                  
                  // Jika buah sedang hanging, langkah brilian
                  if (isPieceHanging(lastFen, fen, piece.square)) {
                    sacrificedPieces.push(piece);
                  }
                }
              }
              
              if (sacrificedPieces.length > 0) {
                // Cek apakah pengorbanan layak - jika semua tangkapan terhadap buah
                // akan mengakibatkan kerugian, maka langkah ini brilian
                let anyPieceViablyCapturable = false;
                let captureTestBoard = new Chess(fen);
                
                for (let piece of sacrificedPieces) {
                  let attackers = getAttackers(fen, piece.square);
                  
                  for (let attacker of attackers) {
                    for (let promotion of promotions) {
                      try {
                        captureTestBoard.move({
                          from: attacker.square,
                          to: piece.square,
                          promotion: promotion
                        });
                        
                        // Jika menangkap buah dengan attacker menyebabkan
                        // buah lawan dengan nilai lebih besar jadi hanging
                        let attackerPinned = false;
                        for (let row of captureTestBoard.board()) {
                          if (!row) continue;
                          
                          for (let enemyPiece of row) {
                            if (!enemyPiece) continue;
                            if (enemyPiece.color === captureTestBoard.turn()) continue;
                            if (enemyPiece.type === "k" || enemyPiece.type === "p") continue;
                            
                            if (
                              isPieceHanging(fen, captureTestBoard.fen(), enemyPiece.square) &&
                              pieceValues[enemyPiece.type] >= Math.max(...sacrificedPieces.map(sack => pieceValues[sack.type]))
                            ) {
                              attackerPinned = true;
                              break;
                            }
                          }
                          if (attackerPinned) break;
                        }
                        
                        // Jika buah yang dikorbankan rook atau lebih, brilian
                        // Jika kurang dari rook, brilian hanya jika tidak menyebabkan mate dalam 1
                        if (pieceValues[piece.type] >= 5) {
                          if (!attackerPinned) {
                            anyPieceViablyCapturable = true;
                            break;
                          }
                        } else if (
                          !attackerPinned &&
                          !captureTestBoard.moves().some(move => move.endsWith("#"))
                        ) {
                          anyPieceViablyCapturable = true;
                          break;
                        }
                        
                        captureTestBoard.undo();
                      } catch (e) {}
                    }
                    
                    if (anyPieceViablyCapturable) break;
                  }
                  
                  if (anyPieceViablyCapturable) break;
                }
                
                if (!anyPieceViablyCapturable) {
                  return Classification.BRILLIANT;
                }
              }
            }
          }
        }
        
        // Cek langkah hebat (great move)
        if (
          noMate &&
          classification !== Classification.BRILLIANT &&
          Math.abs((topMove.evaluation.value || 0) - (secondTopMove.evaluation.value || 0)) >= 150
        ) {
          // Periksa apakah square tujuan sudah ada sebelum cek hanging
          const toSquare = moveUci?.slice(2, 4);
          if (toSquare && !isPieceHanging(lastFen, fen, toSquare)) {
            return Classification.GREAT;
          }
        }
      }
      
      return classification;
    } else {
      // Langkah bukan yang terbaik, klasifikasikan berdasarkan evaluation loss
      if (noMate) {
        for (let classif of centipawnClassifications) {
          if (evalLoss <= getEvaluationLossThreshold(classif, prevEval.value)) {
            return classif;
          }
        }
      }
      
      // Jika tidak ada mate sebelumnya tapi sekarang blunder mate
      else if (prevEval.type === "cp" && evaluation.type === "mate") {
        if (absoluteEvaluation > 0) {
          return Classification.BEST;
        } else if (absoluteEvaluation >= -2) {
          return Classification.BLUNDER;
        } else if (absoluteEvaluation >= -5) {
          return Classification.MISTAKE;
        } else {
          return Classification.INACCURACY;
        }
      }
      
      // Jika mate sebelumnya dan sekarang tidak ada mate
      else if (prevEval.type === "mate" && evaluation.type === "cp") {
        if (previousAbsoluteEvaluation < 0 && absoluteEvaluation < 0) {
          return Classification.BEST;
        } else if (absoluteEvaluation >= 400) {
          return Classification.GOOD;
        } else if (absoluteEvaluation >= 150) {
          return Classification.INACCURACY;
        } else if (absoluteEvaluation >= -100) {
          return Classification.MISTAKE;
        } else {
          return Classification.BLUNDER;
        }
      }
      
      // Jika mate sebelumnya dan mate masih ada
      else if (prevEval.type === "mate" && evaluation.type === "mate") {
        if (previousAbsoluteEvaluation > 0) {
          if (absoluteEvaluation <= -4) {
            return Classification.MISTAKE;
          } else if (absoluteEvaluation < 0) {
            return Classification.BLUNDER;
          } else if (absoluteEvaluation < previousAbsoluteEvaluation) {
            return Classification.BEST;
          } else if (absoluteEvaluation <= previousAbsoluteEvaluation + 2) {
            return Classification.EXCELLENT;
          } else {
            return Classification.GOOD;
          }
        } else {
          if (absoluteEvaluation === previousAbsoluteEvaluation) {
            return Classification.BEST;
          } else {
            return Classification.GOOD;
          }
        }
      }
    }
    
    // Jika selalu menang (eval > 600), jangan beri blunder
    if (absoluteEvaluation >= 600) {
      return Classification.GOOD;
    }
    
    // Jika sudah sangat kalah, jangan beri blunder
    if (
      previousAbsoluteEvaluation <= -600 &&
      prevEval.type === "cp" &&
      evaluation.type === "cp"
    ) {
      return Classification.GOOD;
    }
    
    // Jika tak bisa diklasifikasikan, default ke blunder
    return Classification.BLUNDER;
  } catch (error) {
    console.error("Error classifying move:", error);
    return Classification.BOOK; // Default klasifikasi aman
  }
}