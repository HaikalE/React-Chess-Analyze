import { 
  Classification, 
  classificationValues
} from '../utils/constants';
import { determineMoveQuality } from '../utils/moveQualityUtils';
import openings from '../data/openings.json';

// Positif klasifikasi untuk deteksi langkah "book"
const positiveClassifications = [
  Classification.BEST,
  Classification.BRILLIANT, 
  Classification.EXCELLENT, 
  Classification.GREAT
];

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
    
    try {
      let lastPosition = positions[positionIndex - 1];
      
      // Gunakan algoritma baru untuk klasifikasi
      if (position.move?.uci && lastPosition.topLines && position.topLines) {
        position.classification = determineMoveQuality(
          lastPosition.fen,
          position.fen,
          lastPosition.topLines[0]?.evaluation || { type: "cp", value: 0 },
          position.topLines[0]?.evaluation || { type: "cp", value: 0 },
          lastPosition.topLines,
          position.topLines,
          position.move.uci,
          position.move.san
        );
      } else {
        position.classification = Classification.BOOK;
      }
      
    } catch (error) {
      console.error("Error classifying position:", error);
      position.classification = Classification.BOOK; // Default
    }
  }
  
  // Generate opening names for named positions
  for (let position of positions) {
    try {
      let opening = openings.find(opening => position.fen.includes(opening.fen));
      position.opening = opening?.name;
    } catch (error) {
      console.warn("Error identifying opening:", error);
    }
  }
  
  // Apply book moves for cloud evaluations and named positions
  try {
    for (let position of positions.slice(1)) {
      if (
        (position.worker === "cloud" && positiveClassifications.includes(position.classification))
        || position.opening
      ) {
        position.classification = Classification.BOOK;
      } else {
        break;
      }
    }
  } catch (error) {
    console.warn("Error applying book moves:", error);
  }
  
  // Generate SAN moves from all engine lines if needed
  for (let position of positions) {
    // Skip if already processed or no topLines
    if (!position.topLines) continue;
    
    for (let line of position.topLines) {
      if (!line || !line.moveUCI || line.moveSAN || 
          (line.evaluation?.type === "mate" && line.evaluation?.value === 0)) {
        continue;
      }
      
      // Use chess.js to generate SAN from UCI if missing
      try {
        const chess = new Chess(position.fen);
        line.moveSAN = chess.move({
          from: line.moveUCI.slice(0, 2),
          to: line.moveUCI.slice(2, 4),
          promotion: line.moveUCI.slice(4) || undefined
        }).san;
      } catch (e) {
        line.moveSAN = "";
        console.warn("Error generating SAN for move:", line.moveUCI, e);
      }
    }
  }
  
  // Calculate computer accuracy percentages
  let accuracies = {
    white: { current: 0, maximum: 0 },
    black: { current: 0, maximum: 0 }
  };
  
  const classifications = {
    white: {
      brilliant: 0, great: 0, best: 0, excellent: 0, good: 0,
      inaccuracy: 0, mistake: 0, blunder: 0, book: 0, forced: 0,
    },
    black: {
      brilliant: 0, great: 0, best: 0, excellent: 0, good: 0,
      inaccuracy: 0, mistake: 0, blunder: 0, book: 0, forced: 0,
    }
  };
  
  for (let position of positions.slice(1)) {
    if (!position.classification || !position.fen) continue;
    
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