import { Chess } from 'chess.js';

// Constants
export const BOARD_SIZE = 730;
export const startingPositionFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

// Classification colors
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

export const pieceValues = {
  "p": 1,
  "n": 3,
  "b": 3,
  "r": 5,
  "q": 9,
  "k": Infinity,
  "m": 0
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
function getSquare(coordinate) {
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
    
    if (oppositeKing && (attackers.length > 0 || kingCaptureLegal)) {
      attackers.push(oppositeKing);
    }
    
    return attackers;
  } catch (e) {
    console.error("Error in getAttackers:", e);
    return [];
  }
}

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