import { Chess } from 'chess.js';
import { isPieceHanging, getAttackers, getDefenders, pieceValues, promotions } from './boardUtils';
import { getEvaluationLossThreshold, centipawnClassifications } from '../utils/classificationUtils';
import { Classification, classificationValues } from '../utils/constants';
import openings from '../data/openings.json';

// Positive classifications for book move detection
const positiveClassifications = [
  Classification.BEST,
  Classification.BRILLIANT, 
  Classification.EXCELLENT, 
  Classification.GREAT
];

/**
 * Mock evaluation function that doesn't rely on Stockfish
 * @param {Array} positions - Array of positions to evaluate
 * @param {number} depth - Analysis depth
 * @param {function} onProgress - Callback for progress updates
 * @returns {Promise<Array>} - Evaluated positions with mock data
 */
export const mockEvaluatePositions = async (positions, depth = 16, onProgress = () => {}) => {
  // Process positions with mock evaluations
  const evaluated = positions.map((position, index) => {
    // Create basic mock evaluation
    const isWhiteToMove = position.fen.includes(' w ');
    const moveNumber = Math.floor(index / 2) + 1;
    
    // Add mock top lines if not already present
    if (!position.topLines) {
      position.topLines = [
        {
          id: 1,
          depth: depth,
          moveUCI: position.move?.uci || "e2e4",
          moveSAN: position.move?.san || "e4",
          evaluation: {
            type: "cp",
            value: isWhiteToMove ? 20 : -20  // Slight advantage to side to move
          }
        },
        {
          id: 2,
          depth: depth,
          moveUCI: "d2d4",
          moveSAN: "d4",
          evaluation: {
            type: "cp",
            value: isWhiteToMove ? 10 : -10
          }
        }
      ];
    }
    
    // Report progress
    onProgress((index / positions.length) * 100);
    
    return position;
  });
  
  return evaluated;
};

/**
 * Process evaluated positions to generate a complete analysis report
 * @param {Array} positions - Evaluated chess positions
 * @returns {object} - Full analysis report with classifications and accuracies
 */
export const generateAnalysisReport = (positions) => {
  // Generate classifications for each position
  let positionIndex = 0;
  for (let position of positions.slice(1)) {
    positionIndex++;
    
    let board = new Chess(position.fen);
    let lastPosition = positions[positionIndex - 1];
    
    let topMove = lastPosition.topLines?.find(line => line.id == 1);
    let secondTopMove = lastPosition.topLines?.find(line => line.id == 2);
    if (!topMove) continue;
    
    let previousEvaluation = topMove.evaluation;
    let evaluation = position.topLines?.find(line => line.id == 1)?.evaluation;
    if (!previousEvaluation) continue;
    
    let moveColour = position.fen.includes(" b ") ? "white" : "black";
    
    // If there are no legal moves in this position, game is in terminal state
    if (!evaluation) {
      evaluation = { type: board.isCheckmate() ? "mate" : "cp", value: 0 };
      position.topLines.push({
        id: 1,
        depth: 0,
        evaluation: evaluation,
        moveUCI: ""
      });
    }
    
    let absoluteEvaluation = evaluation.value * (moveColour == "white" ? 1 : -1);
    let previousAbsoluteEvaluation = previousEvaluation.value * (moveColour == "white" ? 1 : -1);
    
    let absoluteSecondEvaluation = (secondTopMove?.evaluation?.value ?? 0) * (moveColour == "white" ? 1 : -1);
    
    // Calculate evaluation loss as a result of this move
    let evalLoss = Infinity;
    let cutoffEvalLoss = Infinity;
    let lastLineEvalLoss = Infinity;
    
    let matchingTopLine = lastPosition.topLines?.find(line => line.moveUCI == position.move.uci);
    if (matchingTopLine) {
      if (moveColour == "white") {
        lastLineEvalLoss = previousEvaluation.value - matchingTopLine.evaluation.value;
      } else {
        lastLineEvalLoss = matchingTopLine.evaluation.value - previousEvaluation.value;
      }
    }
    
    if (lastPosition.cutoffEvaluation) {
      if (moveColour == "white") {
        cutoffEvalLoss = lastPosition.cutoffEvaluation.value - evaluation.value;
      } else {
        cutoffEvalLoss = evaluation.value - lastPosition.cutoffEvaluation.value;
      }   
    }
    
    if (moveColour == "white") {
      evalLoss = previousEvaluation.value - evaluation.value;
    } else {
      evalLoss = evaluation.value - previousEvaluation.value;
    }
    
    evalLoss = Math.min(evalLoss, cutoffEvalLoss, lastLineEvalLoss);
    
    // If this move was the only legal one, apply forced
    if (!secondTopMove) {
      position.classification = Classification.FORCED;
      continue;
    }
    
    let noMate = previousEvaluation.type == "cp" && evaluation.type == "cp";
    
    // If it is the top line, disregard other detections and give best
    if (topMove.moveUCI == position.move.uci) {
      position.classification = Classification.BEST;
    } else {
      // If no mate on the board last move and still no mate
      if (noMate) {
        for (let classif of centipawnClassifications) {
          if (evalLoss <= getEvaluationLossThreshold(classif, previousEvaluation.value)) {
            position.classification = classif;
            break;
          }
        }
      }
      
      // If no mate last move but you blundered a mate
      else if (previousEvaluation.type == "cp" && evaluation.type == "mate") {
        if (absoluteEvaluation > 0) {
          position.classification = Classification.BEST;
        } else if (absoluteEvaluation >= -2) {
          position.classification = Classification.BLUNDER;
        } else if (absoluteEvaluation >= -5) {
          position.classification = Classification.MISTAKE;
        } else {
          position.classification = Classification.INACCURACY;
        }
      }
      
      // If mate last move and there is no longer a mate
      else if (previousEvaluation.type == "mate" && evaluation.type == "cp") {
        if (previousAbsoluteEvaluation < 0 && absoluteEvaluation < 0) {
          position.classification = Classification.BEST;
        } else if (absoluteEvaluation >= 400) {
          position.classification = Classification.GOOD;
        } else if (absoluteEvaluation >= 150) {
          position.classification = Classification.INACCURACY;
        } else if (absoluteEvaluation >= -100) {
          position.classification = Classification.MISTAKE;
        } else {
          position.classification = Classification.BLUNDER;
        }
      }
      
      // If mate last move and forced mate still exists
      else if (previousEvaluation.type == "mate" && evaluation.type == "mate") {
        if (previousAbsoluteEvaluation > 0) {
          if (absoluteEvaluation <= -4) {
            position.classification = Classification.MISTAKE;
          } else if (absoluteEvaluation < 0) {
            position.classification = Classification.BLUNDER;
          } else if (absoluteEvaluation < previousAbsoluteEvaluation) {
            position.classification = Classification.BEST;
          } else if (absoluteEvaluation <= previousAbsoluteEvaluation + 2) {
            position.classification = Classification.EXCELLENT;
          } else {
            position.classification = Classification.GOOD;
          }
        } else {
          if (absoluteEvaluation == previousAbsoluteEvaluation) {
            position.classification = Classification.BEST;
          } else {
            position.classification = Classification.GOOD;
          }
        }
      }
    }
    
    // If current verdict is best, check for possible brilliancy
    if (position.classification == Classification.BEST) {
      // Test for brilliant move classification
      // Must be winning for the side that played the brilliancy
      let winningAnyways = (
        absoluteSecondEvaluation >= 700 && topMove.evaluation.type == "cp"
        || (topMove.evaluation.type == "mate" && secondTopMove?.evaluation?.type == "mate")
      );
      
      if (absoluteEvaluation >= 0 && !winningAnyways && !position.move.san.includes("=")) {
        let lastBoard = new Chess(lastPosition.fen);
        let currentBoard = new Chess(position.fen);
        if (lastBoard.isCheck()) continue;
        
        let lastPiece = lastBoard.get(position.move.uci.slice(2, 4)) || { type: "m" };
        
        let sacrificedPieces = [];
        for (let row of currentBoard.board()) {
          for (let piece of row) {
            if (!piece) continue;
            if (piece.color != moveColour.charAt(0)) continue;
            if (piece.type == "k" || piece.type == "p") continue;
            
            // If the piece just captured is of higher or equal value than the candidate
            // hanging piece, not hanging, better trade happening somewhere else
            if (pieceValues[lastPiece.type] >= pieceValues[piece.type]) {
              continue;
            }
            
            // If the piece is otherwise hanging, brilliant
            if (isPieceHanging(lastPosition.fen, position.fen, piece.square)) {
              position.classification = Classification.BRILLIANT;
              sacrificedPieces.push(piece);
            }
          }
        }
        
        // If all captures of all of your hanging pieces would result in an enemy piece
        // of greater or equal value also being hanging OR mate in 1, not brilliant
        let anyPieceViablyCapturable = false;
        let captureTestBoard = new Chess(position.fen);
        
        for (let piece of sacrificedPieces) {
          let attackers = getAttackers(position.fen, piece.square);
          
          for (let attacker of attackers) {
            for (let promotion of promotions) {
              try {
                captureTestBoard.move({
                  from: attacker.square,
                  to: piece.square,
                  promotion: promotion
                });
                
                // If the capture of the piece with the current attacker leads to
                // a piece of greater or equal value being hung (if attacker is pinned)
                let attackerPinned = false;
                for (let row of captureTestBoard.board()) {
                  for (let enemyPiece of row) {
                    if (!enemyPiece) continue;
                    if (enemyPiece.color == captureTestBoard.turn()) continue;
                    if (enemyPiece.type == "k" || enemyPiece.type == "p") continue;
                    
                    if (
                      isPieceHanging(position.fen, captureTestBoard.fen(), enemyPiece.square)
                      && pieceValues[enemyPiece.type] >= Math.max(...sacrificedPieces.map(sack => pieceValues[sack.type]))
                    ) {
                      attackerPinned = true;
                      break;
                    }
                  }
                  if (attackerPinned) break;
                }
                
                // If the sacked piece is a rook or more in value, given brilliant
                // regardless of taking it leading to mate in 1. If it less than a
                // rook, only give brilliant if its capture cannot lead to mate in 1
                if (pieceValues[piece.type] >= 5) {
                  if (!attackerPinned) {
                    anyPieceViablyCapturable = true;
                    break;
                  }
                } else if (
                  !attackerPinned
                  && !captureTestBoard.moves().some(move => move.endsWith("#"))
                ) {
                  anyPieceViablyCapturable = true;
                  break;
                }
                
                captureTestBoard.undo();
              } catch {}
            }
            
            if (anyPieceViablyCapturable) break;
          }
          
          if (anyPieceViablyCapturable) break;
        }
        
        if (!anyPieceViablyCapturable) {
          position.classification = Classification.BEST;
        }
      }
      
      // Test for great move classification
      try {
        if (
          noMate
          && position.classification != Classification.BRILLIANT
          && lastPosition.classification == Classification.BLUNDER
          && Math.abs(topMove.evaluation.value - secondTopMove.evaluation.value) >= 150
          && !isPieceHanging(lastPosition.fen, position.fen, position.move.uci.slice(2, 4))
        ) {
          position.classification = Classification.GREAT;
        }
      } catch {}
    }
    
    // Do not allow blunder if move still completely winning
    if (position.classification == Classification.BLUNDER && absoluteEvaluation >= 600) {
      position.classification = Classification.GOOD;
    }
    
    // Do not allow blunder if you were already in a completely lost position
    if (
      position.classification == Classification.BLUNDER 
      && previousAbsoluteEvaluation <= -600
      && previousEvaluation.type == "cp"
      && evaluation.type == "cp"
    ) {
      position.classification = Classification.GOOD;
    }
    
    position.classification ??= Classification.BOOK;
  }
  
  // Generate opening names for named positions
  for (let position of positions) {
    let opening = openings.find(opening => position.fen.includes(opening.fen));
    position.opening = opening?.name;
  }
  
  // Apply book moves for cloud evaluations and named positions
  for (let position of positions.slice(1)) {
    if (
      (position.worker == "cloud" && positiveClassifications.includes(position.classification))
      || position.opening
    ) {
      position.classification = Classification.BOOK;
    } else {
      break;
    }
  }
  
  // Generate SAN moves from all engine lines
  for (let position of positions) {
    for (let line of position.topLines || []) {
      if (line.evaluation.type == "mate" && line.evaluation.value == 0) continue;
      
      let board = new Chess(position.fen);
      
      try {
        line.moveSAN = board.move({
          from: line.moveUCI.slice(0, 2),
          to: line.moveUCI.slice(2, 4),
          promotion: line.moveUCI.slice(4) || undefined
        }).san;
      } catch {
        line.moveSAN = "";
      }
    }
  }
  
  // Calculate computer accuracy percentages
  let accuracies = {
    white: {
      current: 0,
      maximum: 0
    },
    black: {
      current: 0,
      maximum: 0
    }
  };
  
  const classifications = {
    white: {
      brilliant: 0,
      great: 0,
      best: 0,
      excellent: 0,
      good: 0,
      inaccuracy: 0,
      mistake: 0,
      blunder: 0,
      book: 0,
      forced: 0,
    },
    black: {
      brilliant: 0,
      great: 0,
      best: 0,
      excellent: 0,
      good: 0,
      inaccuracy: 0,
      mistake: 0,
      blunder: 0,
      book: 0,
      forced: 0,
    }
  };
  
  for (let position of positions.slice(1)) {
    if (!position.classification) continue;
    
    const moveColour = position.fen.includes(" b ") ? "white" : "black";
    
    accuracies[moveColour].current += classificationValues[position.classification];
    accuracies[moveColour].maximum++;
    
    classifications[moveColour][position.classification] += 1;
  }
  
  // Return complete report
  return {
    accuracies: {
      white: accuracies.white.maximum ? (accuracies.white.current / accuracies.white.maximum * 100) : 100,
      black: accuracies.black.maximum ? (accuracies.black.current / accuracies.black.maximum * 100) : 100
    },
    classifications,
    positions: positions
  };
};

// Re-export Classification for backward compatibility
export { Classification };