// Constants
export const BOARD_SIZE = 730; // Adjust if needed
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

// Get board coordinates based on chess notation (e.g., "e4")
export const getBoardCoordinates = (square, boardFlipped) => {
  if (!square) return { x: 0, y: 0 };
  
  if (boardFlipped) {
    return {
      x: 7 - "abcdefgh".split("").indexOf(square.slice(0, 1)),
      y: parseInt(square.slice(1)) - 1
    };
  } else {
    return {
      x: "abcdefgh".split("").indexOf(square.slice(0, 1)),
      y: 8 - parseInt(square.slice(1))
    };
  }
};

// Convert coordinates to square notation
export const getSquare = (coordinate) => {
  return "abcdefgh".charAt(coordinate.x) + (coordinate.y + 1).toString();
};

// Draw an arrow on a canvas
export const drawArrow = (fromX, fromY, toX, toY, width, color) => {
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
  ctx.strokeStyle = color || classificationColors.best;
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

  ctx.strokeStyle = color || classificationColors.best;
  ctx.lineWidth = width;
  ctx.stroke();
  ctx.fillStyle = color || classificationColors.best;
  ctx.fill();

  return canvas;
};

// Semi-transparent color generator
export const getSemiTransparentColor = (color, opacity) => {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

// Get piece moved player (white/black) based on FEN
export const getMovedPlayer = (fen) => {
  return fen && fen.includes(" b ") ? "white" : "black";
};

// Load a sprite/image with a promise
export const loadSprite = async (filename) => {
  return new Promise((resolve) => {
    const image = new Image();
    image.src = `/static/media/${filename}`;
    image.onload = () => resolve(image);
  });
};

//