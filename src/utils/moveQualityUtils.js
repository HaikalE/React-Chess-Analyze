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
export function determineMoveQuality(lastFen, fen, prevEval, evaluation, prevTopMoves, topMoves, moveUci, moveSan, lastPositionClassification, cutoffEvaluation) {
  try {
    let board = new Chess(fen);
    let lastBoard = new Chess(lastFen);
    
    const topMove = prevTopMoves.find(line => line.id === 1);
    const secondTopMove = prevTopMoves.find(line => line.id === 2);
    
    if (!topMove) return Classification.BOOK;
    
    const previousEvaluation = topMove.evaluation;
    if (!previousEvaluation) return Classification.BOOK;
    
    // Jika tidak ada evaluasi untuk posisi saat ini (mungkin end of game)
    if (!evaluation) {
      evaluation = { type: board.isCheckmate() ? "mate" : "cp", value: 0 };
    }
    
    const moveColour = fen.includes(" b ") ? "white" : "black";
    
    // Hitung absolute evaluation dari perspektif pemain yang bergerak
    const absoluteEvaluation = evaluation.value * (moveColour === "white" ? 1 : -1);
    const previousAbsoluteEvaluation = previousEvaluation.value * (moveColour === "white" ? 1 : -1);
    const absoluteSecondEvaluation = (secondTopMove?.evaluation?.value || 0) * (moveColour === "white" ? 1 : -1);
    
    // Hitung evaluation loss - persis dengan versi TypeScript
    let evalLoss = Infinity;
    let cutoffEvalLoss = Infinity;
    let lastLineEvalLoss = Infinity;
    
    // Cari evaluasi langkah dari top lines sebelumnya
    const matchingTopLine = prevTopMoves.find(line => line.moveUCI === moveUci);
    if (matchingTopLine) {
      if (moveColour === "white") {
        lastLineEvalLoss = previousEvaluation.value - matchingTopLine.evaluation.value;
      } else {
        lastLineEvalLoss = matchingTopLine.evaluation.value - previousEvaluation.value;
      }
    }
    
    // Gunakan cutoff evaluation jika tersedia
    if (cutoffEvaluation) {
      if (moveColour === "white") {
        cutoffEvalLoss = cutoffEvaluation.value - evaluation.value;
      } else {
        cutoffEvalLoss = evaluation.value - cutoffEvaluation.value;
      }
    }
    
    // Hitung evaluasi loss standar
    if (moveColour === "white") {
      evalLoss = previousEvaluation.value - evaluation.value;
    } else {
      evalLoss = evaluation.value - previousEvaluation.value;
    }
    
    // Ambil nilai minimum dari semua metrik loss
    evalLoss = Math.min(evalLoss, cutoffEvalLoss, lastLineEvalLoss);
    
    // Jika ini satu-satunya langkah yang mungkin
    if (!secondTopMove) {
      return Classification.FORCED;
    }
    
    const noMate = previousEvaluation.type === "cp" && evaluation.type === "cp";
    
    // Jika langkah ini adalah rekomendasi terbaik engine
    if (topMove.moveUCI === moveUci) {
      // Default langkah terbaik
      let classification = Classification.BEST;
      
      // Jika versi final adalah BEST, cek apakah ini langkah BRILLIANT
      if (classification === Classification.BEST) {
        // Test untuk langkah brilliant - harus menguntungkan pemain yang melakukan brilliant
        const winningAnyways = (
          absoluteSecondEvaluation >= 700 && topMove.evaluation.type === "cp" ||
          (topMove.evaluation.type === "mate" && secondTopMove?.evaluation?.type === "mate")
        );
        
        if (absoluteEvaluation >= 0 && !winningAnyways && !moveSan.includes("=")) {
          if (!lastBoard.isCheck()) {
            // Get square dari buah yang ditangkap atau tujuan langkah
            const toSquare = moveUci.slice(2, 4);
            const lastPiece = lastBoard.get(toSquare) || { type: "m" }; // m untuk square kosong
            
            // Cari buah yang mungkin dikorbankan
            let sacrificedPieces = [];
            
            for (let row of board.board()) {
              for (let piece of row) {
                if (!piece) continue;
                if (piece.color !== moveColour.charAt(0)) continue;
                if (piece.type === "k" || piece.type === "p") continue;
                
                // Jika buah yang baru saja ditangkap nilainya lebih tinggi dari kandidat
                // buah yang hanging, skip (ada pertukaran yang lebih bagus)
                if (pieceValues[lastPiece.type] >= pieceValues[piece.type]) {
                  continue;
                }
                
                // Jika buah hanging, tambahkan ke daftar buah yang dikorbankan
                if (isPieceHanging(lastFen, fen, piece.square)) {
                  sacrificedPieces.push(piece);
                  classification = Classification.BRILLIANT; // Set brilliant untuk sekarang
                }
              }
            }
            
            // Jika ada buah yang dikorbankan, analisis lebih lanjut
            if (sacrificedPieces.length > 0) {
              // Cek apakah pengorbanan layak
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
                      
                      // Jika menangkap buah dengan attacker menyebabkan buah lawan nilai lebih besar jadi hanging
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
                      
                      // Jika buah yang dikorbankan rook atau lebih, brilian tanpa syarat
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
              
              // Jika tidak ada buah yang bisa ditangkap dengan aman, bukan langkah brilian
              if (!anyPieceViablyCapturable) {
                classification = Classification.BEST;
              }
            }
          }
        }
        
        // Test untuk langkah hebat (GREAT)
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
    // Langkah bukan yang terbaik
    else {
      // Jika tidak ada mate sebelumnya dan sekarang
      if (noMate) {
        for (let classif of centipawnClassifications) {
          if (evalLoss <= getEvaluationLossThreshold(classif, previousEvaluation.value)) {
            return classif;
          }
        }
      }
      
      // Jika tidak ada mate sebelumnya tapi sekarang ada mate
      else if (previousEvaluation.type === "cp" && evaluation.type === "mate") {
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
      
      // Jika ada mate sebelumnya tapi sekarang tidak ada
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
      
      // Jika mate sebelumnya dan sekarang masih ada mate
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
    
    // Langkah default jika belum terkategori
    let classification = Classification.BLUNDER;
    
    // Jika masih menang telak, jangan beri blunder
    if (classification === Classification.BLUNDER && absoluteEvaluation >= 600) {
      classification = Classification.GOOD;
    }
    
    // Jika sudah kalah telak, jangan beri blunder
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