import { Chess } from 'chess.js';
import { Classification } from './constants';
import { 
  getAttackers, 
  isPieceHanging, 
  pieceValues, 
  promotions 
} from './boardUtils';

// Klasifikasi berdasarkan centipawn
export const centipawnClassifications = [
  Classification.BEST,
  Classification.EXCELLENT,
  Classification.GOOD,
  Classification.INACCURACY,
  Classification.MISTAKE,
  Classification.BLUNDER
];

// Algoritma dari sumber asli - threshold maksimum evaluation loss
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

// Fungsi utama untuk menentukan kualitas langkah yang persis dengan versi TypeScript
// Fix for the determineMoveQuality function in moveQualityUtils.js
export function determineMoveQuality(lastFen, fen, prevEval, evaluation, prevTopMoves, topMoves, moveUci, moveSan, lastPositionClassification, cutoffEvaluation) {
  try {
    let board = new Chess(fen);
    let lastBoard = new Chess(lastFen);
    
    const topMove = prevTopMoves.find(line => line.id === 1);
    const secondTopMove = prevTopMoves.find(line => line.id === 2);
    
    if (!topMove) return Classification.BOOK;
    
    const previousEvaluation = topMove.evaluation;
    if (!previousEvaluation) return Classification.BOOK;
    
    // Special case for checkmate: Check for #, ++ or 'mate' in the move SAN
    if (moveSan && (moveSan.includes('#') || moveSan.includes('++') || moveSan.includes('mate'))) {
      if (board.isCheckmate()) {
        return Classification.BEST;  // Checkmate is always the best move
      }
    }
    
    // If no evaluation for current position (maybe end of game)
    if (!evaluation) {
      evaluation = { type: board.isCheckmate() ? "mate" : "cp", value: 0 };
    }
    
    // Special case for immediate checkmate (always best)
    if (evaluation.type === "mate" && evaluation.value === 0) {
      if (board.isCheckmate()) {
        return Classification.BEST;
      }
    }
    
    const moveColour = fen.includes(" b ") ? "white" : "black";
    
    // Calculate absolute evaluation from the perspective of the moving player
    const absoluteEvaluation = evaluation.value * (moveColour === "white" ? 1 : -1);
    const previousAbsoluteEvaluation = previousEvaluation.value * (moveColour === "white" ? 1 : -1);
    const absoluteSecondEvaluation = (secondTopMove?.evaluation?.value || 0) * (moveColour === "white" ? 1 : -1);
    
    // Calculate evaluation loss - exact same as before
    let evalLoss = Infinity;
    let cutoffEvalLoss = Infinity;
    let lastLineEvalLoss = Infinity;
    
    // Find move evaluation from previous top lines
    const matchingTopLine = prevTopMoves.find(line => line.moveUCI === moveUci);
    if (matchingTopLine) {
      if (moveColour === "white") {
        lastLineEvalLoss = previousEvaluation.value - matchingTopLine.evaluation.value;
      } else {
        lastLineEvalLoss = matchingTopLine.evaluation.value - previousEvaluation.value;
      }
    }
    
    // Use cutoff evaluation if available
    if (cutoffEvaluation) {
      if (moveColour === "white") {
        cutoffEvalLoss = cutoffEvaluation.value - evaluation.value;
      } else {
        cutoffEvalLoss = evaluation.value - cutoffEvaluation.value;
      }
    }
    
    // Calculate standard evaluation loss
    if (moveColour === "white") {
      evalLoss = previousEvaluation.value - evaluation.value;
    } else {
      evalLoss = evaluation.value - previousEvaluation.value;
    }
    
    // Take minimum value of all loss metrics
    evalLoss = Math.min(evalLoss, cutoffEvalLoss, lastLineEvalLoss);
    
    // If this is the only possible move
    if (!secondTopMove) {
      return Classification.FORCED;
    }
    
    const noMate = previousEvaluation.type === "cp" && evaluation.type === "cp";
    
    // If this move is the engine's top recommendation
    if (topMove.moveUCI === moveUci) {
      // Default best move
      let classification = Classification.BEST;
      
      // If final version is BEST, check if it's a BRILLIANT move
      if (classification === Classification.BEST) {
        // Test for brilliant move - must benefit the player making brilliant
        const winningAnyways = (
          absoluteSecondEvaluation >= 700 && topMove.evaluation.type === "cp" ||
          (topMove.evaluation.type === "mate" && secondTopMove?.evaluation?.type === "mate")
        );
        
        if (absoluteEvaluation >= 0 && !winningAnyways && !moveSan.includes("=")) {
          if (!lastBoard.isCheck()) {
            // Rest of the brilliant move detection logic
            const toSquare = moveUci.slice(2, 4);
            const lastPiece = lastBoard.get(toSquare) || { type: "m" }; // m for empty square
            
            // Find potential sacrificed pieces
            let sacrificedPieces = [];
            
            for (let row of board.board()) {
              for (let piece of row) {
                if (!piece) continue;
                if (piece.color !== moveColour.charAt(0)) continue;
                if (piece.type === "k" || piece.type === "p") continue;
                
                // If the newly captured piece is higher value than the hanging piece candidate, skip
                if (pieceValues[lastPiece.type] >= pieceValues[piece.type]) {
                  continue;
                }
                
                // If piece is hanging, add to sacrificed pieces
                if (isPieceHanging(lastFen, fen, piece.square)) {
                  sacrificedPieces.push(piece);
                  classification = Classification.BRILLIANT; // Set brilliant for now
                }
              }
            }
            
            // If pieces are sacrificed, further analysis
            if (sacrificedPieces.length > 0) {
              // Rest of the brilliancy check logic
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
                      
                      // If capturing with attacker causes higher value piece to be hanging
                      let attackerPinned = false;
                      
                      for (let row of captureTestBoard.board()) {
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
                      
                      // If sacrificed piece is rook or higher, brilliant without condition
                      // If less than rook, brilliant only if not causing mate in 1
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
              
              // If no piece can be safely captured, not a brilliant move
              if (!anyPieceViablyCapturable) {
                classification = Classification.BEST;
              }
            }
          }
        }
        
        // Test for GREAT move
        try {
          if (
            noMate &&
            classification !== Classification.BRILLIANT &&
            lastPositionClassification === Classification.BLUNDER &&
            Math.abs(topMove.evaluation.value - (secondTopMove?.evaluation?.value || 0)) >= 150 &&
            !isPieceHanging(lastFen, fen, moveUci.slice(2, 4))
          ) {
            classification = Classification.GREAT;
          }
        } catch (e) {}
      }
      
      return classification;
    } 
    // Move is not the best
    else {
      // If this is a checkmate move, it should still be classified as BEST
      if (board.isCheckmate() || (evaluation.type === "mate" && evaluation.value === 0)) {
        return Classification.BEST;
      }
      
      // If no mate before and now
      if (noMate) {
        for (let classif of centipawnClassifications) {
          if (evalLoss <= getEvaluationLossThreshold(classif, previousEvaluation.value)) {
            return classif;
          }
        }
      }
      
      // If no mate before but now there is
      else if (previousEvaluation.type === "cp" && evaluation.type === "mate") {
        // If it's a positive mate (we're winning)
        if (evaluation.value > 0) {
          return Classification.BEST;
        } else if (evaluation.value >= -2) {
          return Classification.BLUNDER;
        } else if (evaluation.value >= -5) {
          return Classification.MISTAKE;
        } else {
          return Classification.INACCURACY;
        }
      }
      
      // If mate before but not now
      else if (previousEvaluation.type === "mate" && evaluation.type === "cp") {
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
      
      // If mate before and still mate now
      else if (previousEvaluation.type === "mate" && evaluation.type === "mate") {
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
    
    // Default move if not yet categorized
    let classification = Classification.BLUNDER;
    
    // If still winning by a lot, don't give blunder
    if (classification === Classification.BLUNDER && absoluteEvaluation >= 600) {
      classification = Classification.GOOD;
    }
    
    // If already losing badly, don't give blunder
    if (
      classification === Classification.BLUNDER &&
      previousAbsoluteEvaluation <= -600 &&
      previousEvaluation.type === "cp" &&
      evaluation.type === "cp"
    ) {
      classification = Classification.GOOD;
    }
    
    return classification || Classification.BOOK;
  } catch (error) {
    console.error("Error classifying move:", error);
    return Classification.BOOK;
  }
}