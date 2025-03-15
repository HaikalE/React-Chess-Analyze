// MoveQualityAnalyzer.jsx
import React, { useState, useEffect } from 'react';
import { Chess } from 'chess.js';

// Konstanta untuk klasifikasi
const Classification = {
  BRILLIANT: "brilliant",
  GREAT: "great",
  BEST: "best",
  EXCELLENT: "excellent",
  GOOD: "good",
  INACCURACY: "inaccuracy",
  MISTAKE: "mistake",
  BLUNDER: "blunder",
  BOOK: "book",
  FORCED: "forced"
};

// Nilai untuk perhitungan akurasi
const classificationValues = {
  "blunder": 0,
  "mistake": 0.2,
  "inaccuracy": 0.4,
  "good": 0.65,
  "excellent": 0.9,
  "best": 1,
  "great": 1,
  "brilliant": 1,
  "book": 1,
  "forced": 1
};

// Warna untuk menampilkan klasifikasi
const classificationColors = {
  "brilliant": "#1baaa6",
  "great": "#5b8baf",
  "best": "#98bc49",
  "excellent": "#98bc49",
  "good": "#97af8b",
  "inaccuracy": "#f4bf44",
  "mistake": "#e28c28",
  "blunder": "#c93230",
  "forced": "#97af8b",
  "book": "#a88764"
};

// Nilai buah catur
const pieceValues = {
  "p": 1,
  "n": 3,
  "b": 3,
  "r": 5,
  "q": 9,
  "k": Infinity,
  "m": 0 // Placeholder untuk square kosong
};

// Klasifikasi berdasarkan centipawn
const centipawnClassifications = [
  Classification.BEST,
  Classification.EXCELLENT,
  Classification.GOOD,
  Classification.INACCURACY,
  Classification.MISTAKE,
  Classification.BLUNDER
];

// Opsi promosi
const promotions = [undefined, "b", "n", "r", "q"];

// Fungsi untuk mendapatkan koordinat papan
function getBoardCoordinates(square) {
  return {
    x: "abcdefgh".indexOf(square.slice(0, 1)),
    y: parseInt(square.slice(1)) - 1
  };
}

// Fungsi untuk mendapatkan notasi square dari koordinat
function getSquare(coordinate) {
  return "abcdefgh".charAt(coordinate.x) + (coordinate.y + 1).toString();
}

// Algoritma WTF dari sumber asli
// Mendapatkan threshold maksimum evaluation loss untuk klasifikasi
function getEvaluationLossThreshold(classif, prevEval) {
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
function getAttackers(fen, square) {
  let attackers = [];
  
  let board = new Chess(fen);
  let piece = board.get(square);
  
  if (!piece) return attackers; // Jika tidak ada buah di square tersebut
  
  // Set warna giliran ke lawan dari buah yang diserang
  try {
    let modifiedFen = fen
      .replace(/(?<= )(?:w|b)(?= )/g, piece.color === 'w' ? 'b' : 'w')
      .replace(/ [a-h][1-8] /g, " - ");
    board.load(modifiedFen);
  } catch (e) {
    console.warn("Failed to modify FEN:", e);
    return attackers;
  }
  
  // Cari langkah legal yang menangkap buah
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
  
  // Cek raja lawan di sekitar buah yang diserang
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
  
  // Cek apakah raja bisa menangkap buah tersebut secara legal
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
}

// Fungsi untuk mendapatkan pembela buah pada square tertentu
function getDefenders(fen, square) {
  let board = new Chess(fen);
  let piece = board.get(square);
  
  if (!piece) return []; // Jika tidak ada buah
  
  let testAttacker = getAttackers(fen, square)[0];
  
  // Jika ada attacker yang bisa kita gunakan untuk test
  if (testAttacker) {
    // Set giliran ke warna attacker
    try {
      board.load(fen
        .replace(/(?<= )(?:w|b)(?= )/g, testAttacker.color)
        .replace(/ [a-h][1-8] /g, " - ")
      );
    } catch (e) {
      console.warn("Failed to modify FEN:", e);
      return [];
    }
    
    // Tangkap buah yang dibela dengan test attacker
    for (let promotion of promotions) {
      try {
        board.move({
          from: testAttacker.square,
          to: square,
          promotion: promotion
        });
        
        // Return attackers yang bisa menangkap test attacker
        return getAttackers(board.fen(), square);
      } catch {}
    }
  } else {
    // Set giliran ke warna buah yang dibela
    try {
      board.load(fen
        .replace(/(?<= )(?:w|b)(?= )/g, piece.color)
        .replace(/ [a-h][1-8] /g, " - ")
      );
    } catch (e) {
      console.warn("Failed to modify FEN:", e);
      return [];
    }
    
    // Ganti buah dengan ratu lawan
    try {
      board.put({
        color: piece.color === 'w' ? 'b' : 'w',
        type: "q"
      }, square);
      
      // Return attackers ratu lawan tersebut
      return getAttackers(board.fen(), square);
    } catch (e) {
      console.warn("Failed to place test piece:", e);
    }
  }
  
  return [];
}

// Fungsi untuk cek apakah buah sedang "hanging" (bisa diambil)
function isPieceHanging(lastFen, fen, square) {
  // Cek parameter
  if (!lastFen || !fen || !square) {
    console.warn("Missing parameters in isPieceHanging");
    return false;
  }
  
  let lastBoard = new Chess(lastFen);
  let board = new Chess(fen);
  
  let lastPiece = lastBoard.get(square);
  let piece = board.get(square);
  
  // Jika tidak ada buah, tidak hanging
  if (!lastPiece || !piece) {
    return false;
  }
  
  let attackers = getAttackers(fen, square);
  let defenders = getDefenders(fen, square);
  
  // Jika buah baru saja ditukar rata atau lebih baik, tidak hanging
  if (pieceValues[lastPiece.type] >= pieceValues[piece.type] && lastPiece.color !== piece.color) {
    return false;
  }
  
  // Jika benteng mengambil minor piece yang hanya dibela oleh satu minor piece lain,
  // itu tukar yang menguntungkan, jadi benteng tidak hanging
  if (
    piece.type === "r" &&
    pieceValues[lastPiece.type] === 3 && 
    attackers.every(atk => pieceValues[atk.type] === 3) &&
    attackers.length === 1
  ) {
    return false;
  }
  
  // Jika buah punya penyerang dengan nilai lebih rendah, hanging
  if (attackers.some(atk => pieceValues[atk.type] < pieceValues[piece.type])) {
    return true;
  }
  
  if (attackers.length > defenders.length) {
    let minAttackerValue = Infinity;
    for (let attacker of attackers) {
      minAttackerValue = Math.min(pieceValues[attacker.type], minAttackerValue);
    }
    
    // Jika mengambil buah meskipun punya lebih banyak penyerang akan jadi
    // pengorbanan tersendiri, tidak hanging
    if (
      pieceValues[piece.type] < minAttackerValue && 
      defenders.some(dfn => pieceValues[dfn.type] < minAttackerValue)
    ) {
      return false;
    }
    
    // Jika ada pion pembela, maka pion tersebutlah yang dikorbankan
    if (defenders.some(dfn => pieceValues[dfn.type] === 1)) {
      return false;
    }
    
    return true;
  }
  
  return false;
}

// Komponen React untuk analisa kualitas langkah
const MoveQualityAnalyzer = ({ 
  previousFen, 
  currentFen, 
  previousEvaluation, 
  currentEvaluation,
  previousTopMoves, 
  currentTopMoves,
  moveSan,
  moveUci 
}) => {
  const [classification, setClassification] = useState(null);
  const [message, setMessage] = useState('');
  
  useEffect(() => {
    if (!previousFen || !currentFen || !previousEvaluation || !currentEvaluation) {
      return;
    }
    
    // Tentukan klasifikasi langkah
    const moveClassification = determineMoveQuality(
      previousFen,
      currentFen,
      previousEvaluation,
      currentEvaluation,
      previousTopMoves,
      currentTopMoves,
      moveUci
    );
    
    setClassification(moveClassification);
    
    // Buat pesan berdasarkan klasifikasi
    if (moveClassification) {
      let classificationMessage = '';
      switch (moveClassification) {
        case Classification.BRILLIANT:
          classificationMessage = "langkah brilian";
          break;
        case Classification.GREAT:
          classificationMessage = "langkah hebat";
          break;
        case Classification.BEST:
          classificationMessage = "langkah terbaik";
          break;
        case Classification.EXCELLENT:
          classificationMessage = "langkah sangat baik";
          break;
        case Classification.GOOD:
          classificationMessage = "langkah bagus";
          break;
        case Classification.INACCURACY:
          classificationMessage = "ketidaktepatan";
          break;
        case Classification.MISTAKE:
          classificationMessage = "kesalahan";
          break;
        case Classification.BLUNDER:
          classificationMessage = "blunder";
          break;
        case Classification.BOOK:
          classificationMessage = "langkah teori";
          break;
        case Classification.FORCED:
          classificationMessage = "langkah terpaksa";
          break;
        default:
          classificationMessage = "langkah yang tidak diklasifikasikan";
      }
      
      setMessage(`${moveSan} adalah ${classificationMessage}`);
    } else {
      setMessage('');
    }
  }, [previousFen, currentFen, previousEvaluation, currentEvaluation, previousTopMoves, currentTopMoves, moveSan, moveUci]);
  
  // Fungsi untuk menentukan kualitas langkah
  function determineMoveQuality(
    lastFen, 
    fen, 
    prevEval, 
    evaluation, 
    prevTopMoves, 
    topMoves, 
    moveUci
  ) {
    try {
      // Cek parameter input
      if (!lastFen || !fen || !prevEval || !evaluation || !prevTopMoves || !topMoves) {
        console.warn("Missing parameters for move quality determination");
        return Classification.BOOK;
      }
      
      const board = new Chess(fen);
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
            const lastBoard = new Chess(lastFen);
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
                      return Classification.BRILLIANT;
                    }
                  }
                }
              }
            }
          }
          
          // Cek langkah hebat (great move)
          if (
            noMate &&
            lastBoard && 
            topMove && 
            secondTopMove &&
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
      
      // Jika tak bisa diklasifikasikan, default ke blunder
      return Classification.BLUNDER;
    } catch (error) {
      console.error("Error classifying move:", error);
      return Classification.BOOK; // Default klasifikasi aman
    }
  }
  
  // Jika tidak ada klasifikasi, jangan render apa-apa
  if (!classification) {
    return null;
  }
  
  return (
    <div className="move-quality">
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div 
          style={{ 
            width: '24px', 
            height: '24px', 
            backgroundImage: `url('/static/media/${classification}.png')`,
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat'
          }} 
        />
        <div style={{ color: classificationColors[classification], fontWeight: 'bold' }}>
          {message}
        </div>
      </div>
      
      {/* Alternatif jika langkah tidak optimal */}
      {classification !== Classification.BEST && 
       classification !== Classification.BRILLIANT && 
       classification !== Classification.GREAT && 
       classification !== Classification.FORCED && 
       classification !== Classification.BOOK && 
       previousTopMoves && previousTopMoves[0] && (
        <div className="alternative-move" style={{ marginTop: '8px', color: '#98bc49' }}>
          Langkah terbaik adalah {previousTopMoves[0].moveSAN || previousTopMoves[0].moveUCI}
        </div>
      )}
    </div>
  );
};

export default MoveQualityAnalyzer;