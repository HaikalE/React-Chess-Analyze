import { useState, useEffect, useRef, useCallback } from 'react';
import { useGameContext } from '../contexts/GameContext';
import { 
  BOARD_SIZE, 
  getBoardCoordinates, 
  startingPositionFen,
  drawArrow,
  classificationColors
} from '../utils/boardUtils';
import { initSounds, playSoundForMove, playSound, SOUND_TYPES } from '../utils/soundService';

// Piece images cache
const pieceImages = {};
const classificationIcons = {};

/**
 * Hook to handle chess board rendering and interactions
 * @param {boolean} showSuggestionArrows - Whether to show suggestion arrows
 */
const useChessboard = (showSuggestionArrows = false) => {
  const { 
    currentPosition, 
    displayPosition, // Use the displayPosition which may be from an engine line
    positions, 
    reportResults, 
    currentMoveIndex, 
    prevMoveIndex,
    boardFlipped,
    traverseMoves,
    isViewingEngineLine,
    activeEngineLine,
    soundEnabled
  } = useGameContext();
  
  const canvasRef = useRef(null);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  
  // Initialize sounds when component mounts
  useEffect(() => {
    initSounds();
  }, []);
  
  // Play sounds when moves change
  useEffect(() => {
    // Only play sound when sound is enabled
    if (soundEnabled && currentMoveIndex !== prevMoveIndex && reportResults?.positions) {
      // Moving forward
      if (currentMoveIndex > prevMoveIndex) {
        const currentMove = reportResults.positions[currentMoveIndex]?.move;
        if (currentMove) {
          // Get extended move data for sound determination
          const moveData = {
            san: currentMove.san,
            piece: currentMove.san?.charAt(0),
            captured: currentMove.san?.includes('x'),
            flags: ''
          };
          
          playSoundForMove(moveData);
        }
      } 
      // Moving backward
      else if (currentMoveIndex < prevMoveIndex) {
        // When going backward, we need to determine what kind of move
        // was previously made to reach the position we're returning from
        
        // The move we're undoing is the one that led to the previous position
        const moveBeingUndone = reportResults.positions[prevMoveIndex]?.move;
        
        if (moveBeingUndone) {
          // Get extended move data for sound determination
          const moveData = {
            san: moveBeingUndone.san,
            piece: moveBeingUndone.san?.charAt(0),
            captured: moveBeingUndone.san?.includes('x'),
            flags: ''
          };
          
          // Play the appropriate sound based on the move being undone
          playSoundForMove(moveData);
        } else {
          // Fallback to standard move sound if we can't determine the move type
          playSound(SOUND_TYPES.MOVE);
        }
      }
    }
  }, [currentMoveIndex, prevMoveIndex, reportResults, soundEnabled]);
  
  // Load piece images and classification icons
  useEffect(() => {
    const pieceIds = {
      "white_pawn": "P",
      "white_knight": "N",
      "white_bishop": "B",
      "white_rook": "R",
      "white_queen": "Q",
      "white_king": "K",
      "black_pawn": "p",
      "black_knight": "n",
      "black_bishop": "b",
      "black_rook": "r",
      "black_queen": "q",
      "black_king": "k"
    };
    
    const classifications = [
      "brilliant", "great", "best", "excellent", "good",
      "inaccuracy", "mistake", "blunder", "forced", "book"
    ];
    
    const loadImage = (src) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.src = src;
        img.onload = () => resolve(img);
        img.onerror = () => {
          console.error(`Failed to load: ${src}`);
          resolve(null);
        };
      });
    };
    
    const loadAllImages = async () => {
      // Load piece images
      const piecePromises = Object.entries(pieceIds).map(async ([pieceId, pieceFenChar]) => {
        const image = await loadImage(`/static/media/${pieceId}.svg`);
        if (image) pieceImages[pieceFenChar] = image;
      });
      
      // Load classification icons
      const iconPromises = classifications.map(async (classification) => {
        const image = await loadImage(`/static/media/${classification}.png`);
        if (image) classificationIcons[classification] = image;
      });
      
      await Promise.all([...piecePromises, ...iconPromises]);
      setImagesLoaded(true);
    };
    
    loadAllImages();
  }, []);
  
  /**
   * Draw the chess board and pieces
   */
  const drawBoard = useCallback(() => {
    if (!canvasRef.current || !imagesLoaded) return;
    
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    
    // Use displayPosition (which might be from an engine line) instead of currentPosition
    const positionToShow = displayPosition || currentPosition;
    const fen = positionToShow?.fen || startingPositionFen;
    
    // Draw surface of board
    const colors = ["#f6dfc0", "#b88767"];
    const squareSize = BOARD_SIZE / 8;
    
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        ctx.fillStyle = colors[(x + y) % 2];
        ctx.fillRect(x * squareSize, y * squareSize, squareSize, squareSize);
      }
    }
    
    // Draw coordinates
    ctx.font = "24px Arial";
    
    const files = "abcdefgh".split("");
    for (let x = 0; x < 8; x++) {
      ctx.fillStyle = colors[x % 2];
      ctx.fillText(boardFlipped ? files[7 - x] : files[x], x * squareSize + 5, BOARD_SIZE - 5);
    }
    
    for (let y = 0; y < 8; y++) {
      ctx.fillStyle = colors[(y + 1) % 2];
      ctx.fillText(boardFlipped ? (y + 1).toString() : (8 - y).toString(), 5, y * squareSize + 24);
    }
    
    // Only draw last move highlight for real game moves (not engine lines)
    if (!isViewingEngineLine) {
      const lastMove = reportResults?.positions[currentMoveIndex];
      
      const lastMoveCoordinates = {
        from: { x: 0, y: 0 },
        to: { x: 0, y: 0 }
      };
      
      if (currentMoveIndex > 0 && lastMove?.move?.uci) {
        const lastMoveUCI = lastMove.move.uci;
        
        lastMoveCoordinates.from = getBoardCoordinates(lastMoveUCI.slice(0, 2), boardFlipped);
        lastMoveCoordinates.to = getBoardCoordinates(lastMoveUCI.slice(2, 4), boardFlipped);
        
        const classification = lastMove.classification || "book";
        const highlightColor = classificationColors[classification];
        
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = highlightColor;
        
        // Highlight from square
        ctx.fillRect(
          lastMoveCoordinates.from.x * squareSize, 
          lastMoveCoordinates.from.y * squareSize, 
          squareSize,
          squareSize
        );
        
        // Highlight to square
        ctx.fillRect(
          lastMoveCoordinates.to.x * squareSize, 
          lastMoveCoordinates.to.y * squareSize, 
          squareSize,
          squareSize
        );
        
        ctx.globalAlpha = 1;
      }
      
      // Draw last move classification icon (only for real game moves)
      if (currentMoveIndex > 0 && reportResults) {
        const classification = reportResults.positions[currentMoveIndex]?.classification;
        
        if (classification && classificationIcons[classification]) {
          ctx.drawImage(
            classificationIcons[classification],
            lastMoveCoordinates.to.x * squareSize + ((68 / 90) * squareSize), 
            lastMoveCoordinates.to.y * squareSize - ((10 / 90) * squareSize), 
            56, 56
          );
        }
      }
    } 
    // For engine lines, highlight the suggested move
    else if (activeEngineLine && activeEngineLine.moveUCI) {
      const moveUCI = activeEngineLine.moveUCI;
      
      const engineMoveCoordinates = {
        from: getBoardCoordinates(moveUCI.slice(0, 2), boardFlipped),
        to: getBoardCoordinates(moveUCI.slice(2, 4), boardFlipped)
      };
      
      // Use a specific highlight color for engine suggestions
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = "#0ea5e9"; // primary-500
      
      // Highlight from square
      ctx.fillRect(
        engineMoveCoordinates.from.x * squareSize, 
        engineMoveCoordinates.from.y * squareSize, 
        squareSize,
        squareSize
      );
      
      // Highlight to square
      ctx.fillRect(
        engineMoveCoordinates.to.x * squareSize, 
        engineMoveCoordinates.to.y * squareSize, 
        squareSize,
        squareSize
      );
      
      ctx.globalAlpha = 1;
    }
    
    // Draw pieces
    const fenBoard = fen.split(" ")[0];
    let x = boardFlipped ? 7 : 0;
    let y = x;
    
    for (const character of fenBoard) {
      if (character === "/") {
        x = boardFlipped ? 7 : 0;
        y += boardFlipped ? -1 : 1;
      } else if (/\d/g.test(character)) {
        x += parseInt(character) * (boardFlipped ? -1 : 1);
      } else if (pieceImages[character]) {
        ctx.drawImage(
          pieceImages[character],
          x * squareSize,
          y * squareSize,
          squareSize,
          squareSize
        );
        x += boardFlipped ? -1 : 1;
      }
    }
    
    // Draw engine suggestion arrows only if not viewing an engine line already
    if (!isViewingEngineLine && showSuggestionArrows && currentPosition?.topLines) {
      const arrowAttributes = [
        { width: 35, opacity: 0.8 },
        { width: 21, opacity: 0.55 }
      ];
      
      currentPosition.topLines.slice(0, 2).forEach((topLine, index) => {
        if (!topLine?.moveUCI) return;
        
        const from = getBoardCoordinates(topLine.moveUCI.slice(0, 2), boardFlipped);
        const to = getBoardCoordinates(topLine.moveUCI.slice(2, 4), boardFlipped);
        
        const arrow = drawArrow(
          from.x * squareSize + (squareSize / 2), 
          from.y * squareSize + (squareSize / 2), 
          to.x * squareSize + (squareSize / 2), 
          to.y * squareSize + (squareSize / 2), 
          arrowAttributes[index].width,
          classificationColors.best
        );
        
        if (arrow) {
          ctx.globalAlpha = arrowAttributes[index].opacity;
          ctx.drawImage(arrow, 0, 0);
          ctx.globalAlpha = 1;
        }
      });
    }
  }, [
    displayPosition,
    currentPosition, 
    reportResults, 
    currentMoveIndex, 
    boardFlipped, 
    imagesLoaded,
    showSuggestionArrows,
    isViewingEngineLine,
    activeEngineLine
  ]);
  
  /**
   * Handle click on the chess board
   * @param {React.MouseEvent} event - Click event
   */
  const handleBoardClick = useCallback((event) => {
    if (!canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    
    // Navigate forward or backward based on which half of the board was clicked
    traverseMoves(x > rect.width / 2 ? 1 : -1);
  }, [traverseMoves]);
  
  // Draw board when component updates
  useEffect(() => {
    if (imagesLoaded) {
      drawBoard();
    }
  }, [
    drawBoard, 
    imagesLoaded
  ]);
  
  return {
    canvasRef,
    handleBoardClick,
    imagesLoaded
  };
};

export default useChessboard;