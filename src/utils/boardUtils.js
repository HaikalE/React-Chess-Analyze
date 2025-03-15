import { Chess } from 'chess.js';

// Nilai buah catur
export const pieceValues = {
  "p": 1,  // pion
  "n": 3,  // kuda
  "b": 3,  // uskup
  "r": 5,  // benteng
  "q": 9,  // ratu
  "k": Infinity, // raja
  "m": 0   // placeholder untuk square kosong
};

// Konstanta
export const BOARD_SIZE = 730;
export const startingPositionFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

// Warna klasifikasi
export const classificationColors = {
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

export const promotions = [undefined, "b", "n", "r", "q"];

// Get board coordinates based on chess notation (e.g., "e4")
export function getBoardCoordinates(square, boardFlipped = false) {
  if (!square) return { x: 0, y: 0 };
  
  if (boardFlipped) {
    return {
      x: 7 - "abcdefgh".indexOf(square.slice(0, 1)),
      y: parseInt(square.slice(1)) - 1
    };
  } else {
    return {
      x: "abcdefgh".indexOf(square.slice(0, 1)),
      y: 8 - parseInt(square.slice(1))
    };
  }
}

// Convert coordinates to square notation
export function getSquare(coordinate) {
  return "abcdefgh".charAt(coordinate.x) + (coordinate.y + 1).toString();
}

// Draw an arrow on a canvas
export function drawArrow(fromX, fromY, toX, toY, width, color = classificationColors.best) {
  // Create a new canvas for the arrow
  const canvas = document.createElement('canvas');
  canvas.width = BOARD_SIZE;
  canvas.height = BOARD_SIZE;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) return null;
  
  const headlen = 15;
  const angle = Math.atan2(toY - fromY, toX - fromX);
  toX -= Math.cos(angle) * ((width * 1.15));
  toY -= Math.sin(angle) * ((width * 1.15));
  
  // Draw arrow line
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
  
  // Draw arrow head
  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(
    toX - headlen * Math.cos(angle - Math.PI / 7), 
    toY - headlen * Math.sin(angle - Math.PI / 7)
  );
  
  ctx.lineTo(
    toX - headlen * Math.cos(angle + Math.PI / 7), 
    toY - headlen * Math.sin(angle + Math.PI / 7)
  );
  
  ctx.lineTo(toX, toY);
  ctx.lineTo(
    toX - headlen * Math.cos(angle - Math.PI / 7),
    toY - headlen * Math.sin(angle - Math.PI / 7)
  );

  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.fill();

  return canvas;
}

// Semi-transparent color generator
export function getSemiTransparentColor(color, opacity) {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

// Get the player who moved based on FEN
export function getMovedPlayer(fen) {
  return fen && fen.includes(" b ") ? "white" : "black";
}

/**
 * Mendapatkan semua buah yang menyerang suatu square
 * @param {string} fen - FEN string representasi posisi
 * @param {string} square - Notasi algebraik square (e.g., "e4")
 * @returns {Array} - Array buah yang menyerang square
 */
export function getAttackers(fen, square) {
  let attackers = [];
  
  try {
    let board = new Chess(fen);
    let piece = board.get(square);
    
    // Jika tidak ada buah di square, return array kosong
    if (!piece) return [];
    
    // Set warna giliran ke lawan dari buah yang diserang
    let oppositeTurn = piece.color === 'w' ? 'b' : 'w';
    
    // Coba load FEN yang dimodifikasi dengan lawan yang bergerak
    try {
      const fenParts = fen.split(' ');
      fenParts[1] = oppositeTurn;
      fenParts[3] = '-'; // Hapus en passant
      const modifiedFen = fenParts.join(' ');
      board.load(modifiedFen);
    } catch (e) {
      console.warn("Failed to modify FEN for attacker check:", e);
      return [];
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
    
    // Verifikasi apakah raja bisa menangkap buah secara legal
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

/**
 * Mendapatkan semua buah yang membela suatu square
 * @param {string} fen - FEN string representasi posisi
 * @param {string} square - Notasi algebraik square (e.g., "e4")
 * @returns {Array} - Array buah yang membela square
 */
export function getDefenders(fen, square) {
  try {
    let board = new Chess(fen);
    let piece = board.get(square);
    
    // Jika tidak ada buah di square, return array kosong
    if (!piece) return [];
    
    // Strategi 1: Gunakan penyerang untuk test
    let testAttacker = getAttackers(fen, square)[0];
    
    if (testAttacker) {
      // Set giliran ke warna attacker
      try {
        const fenParts = fen.split(' ');
        fenParts[1] = testAttacker.color;
        fenParts[3] = '-'; // Hapus en passant
        const modifiedFen = fenParts.join(' ');
        board.load(modifiedFen);
      } catch (e) {
        console.warn("Failed to modify FEN for defender check:", e);
        return [];
      }
      
      // Coba tangkap buah yang dibela dengan test attacker
      for (let promotion of promotions) {
        try {
          board.move({
            from: testAttacker.square,
            to: square,
            promotion: promotion
          });
          
          // Return penyerang yang bisa menangkap test attacker
          return getAttackers(board.fen(), square);
        } catch {}
      }
    } 
    // Strategi 2: Gunakan ratu lawan sebagai test
    else {
      // Set giliran ke warna buah yang dibela
      try {
        const fenParts = fen.split(' ');
        fenParts[1] = piece.color;
        fenParts[3] = '-'; // Hapus en passant
        const modifiedFen = fenParts.join(' ');
        board.load(modifiedFen);
      } catch (e) {
        console.warn("Failed to modify FEN for defender check:", e);
        return [];
      }
      
      // Ganti buah dengan ratu lawan untuk test
      try {
        board.remove(square);
        board.put({
          color: piece.color === 'w' ? 'b' : 'w',
          type: "q"
        }, square);
        
        // Return penyerang ratu tersebut (yaitu pembela buah asli)
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

/**
 * Memeriksa apakah buah catur "hanging" (terancam diambil)
 * @param {string} lastFen - FEN string sebelum langkah
 * @param {string} fen - FEN string setelah langkah
 * @param {string} square - Notasi algebraik square buah (e.g., "e4")
 * @returns {boolean} - true jika buah hanging, false jika tidak
 */
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
    
    // Jika tidak ada buah di salah satu posisi, return false
    if (!lastPiece || !piece) {
      return false;
    }
    
    // Dapatkan penyerang dan pembela
    let attackers = getAttackers(fen, square);
    let defenders = getDefenders(fen, square);
    
    // Jika buah baru saja ditukar sama/lebih baik, tidak hanging
    if (pieceValues[lastPiece.type] >= pieceValues[piece.type] && lastPiece.color !== piece.color) {
      return false;
    }
    
    // Kasus khusus untuk benteng yang mengambil minor piece
    if (
      piece.type === "r" &&
      pieceValues[lastPiece.type] === 3 && 
      attackers.every(atk => pieceValues[atk.type] === 3) &&
      attackers.length === 1
    ) {
      return false;
    }
    
    // Jika buah memiliki penyerang dengan nilai lebih rendah, hanging
    if (attackers.some(atk => pieceValues[atk.type] < pieceValues[piece.type])) {
      return true;
    }
    
    // Jika lebih banyak penyerang daripada pembela
    if (attackers.length > defenders.length) {
      let minAttackerValue = Infinity;
      for (let attacker of attackers) {
        minAttackerValue = Math.min(pieceValues[attacker.type], minAttackerValue);
      }
      
      // Jika mengambil buah akan menjadi pengorbanan yang lebih besar, tidak hanging
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
  } catch (e) {
    console.error("Error in isPieceHanging:", e, {lastFen, fen, square});
    return false; // Default aman ke "tidak hanging"
  }
}