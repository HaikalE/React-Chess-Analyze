import { 
  Classification, 
  classificationValues
} from '../utils/constants';
import { determineMoveQuality } from '../utils/moveQualityUtils';
import openings from '../data/openings.json';
import { Chess } from 'chess.js';

/**
 * Process evaluated positions to generate a complete analysis report
 * Implementasi yang persis dengan versi TypeScript
 * @param {Array} positions - Evaluated chess positions
 * @returns {object} - Full analysis report with classifications and accuracies
 */
export const generateAnalysisReport = (positions) => {
  // Generate classifications for each position
  let positionIndex = 0;
  
  for (let position of positions.slice(1)) {
    positionIndex++;
    
    try {
      let board = new Chess(position.fen);
      let lastPosition = positions[positionIndex - 1];
      
      let topMove = lastPosition.topLines.find(line => line.id === 1);
      let secondTopMove = lastPosition.topLines.find(line => line.id === 2);
      if (!topMove) continue;
      
      let previousEvaluation = topMove.evaluation;
      let evaluation = position.topLines.find(line => line.id === 1)?.evaluation;
      if (!previousEvaluation) continue;
      
      let moveColour = position.fen.includes(" b ") ? "white" : "black";
      
      // Jika tidak ada langkah legal di posisi ini (end game state)
      if (!evaluation) {
        evaluation = { type: board.isCheckmate() ? "mate" : "cp", value: 0 };
        position.topLines.push({
          id: 1,
          depth: 0,
          evaluation: evaluation,
          moveUCI: ""
        });
      }
      
      let absoluteEvaluation = evaluation.value * (moveColour === "white" ? 1 : -1);
      let previousAbsoluteEvaluation = previousEvaluation.value * (moveColour === "white" ? 1 : -1);
      let absoluteSecondEvaluation = (secondTopMove?.evaluation?.value || 0) * (moveColour === "white" ? 1 : -1);
      
      // Hitung evaluation loss sebagai hasil dari langkah ini
      let evalLoss = Infinity;
      let cutoffEvalLoss = Infinity;
      let lastLineEvalLoss = Infinity;
      
      let matchingTopLine = lastPosition.topLines.find(line => line.moveUCI === position.move.uci);
      if (matchingTopLine) {
        if (moveColour === "white") {
          lastLineEvalLoss = previousEvaluation.value - matchingTopLine.evaluation.value;
        } else {
          lastLineEvalLoss = matchingTopLine.evaluation.value - previousEvaluation.value;
        }
      }
      
      if (lastPosition.cutoffEvaluation) {
        if (moveColour === "white") {
          cutoffEvalLoss = lastPosition.cutoffEvaluation.value - evaluation.value;
        } else {
          cutoffEvalLoss = evaluation.value - lastPosition.cutoffEvaluation.value;
        }
      }
      
      if (moveColour === "white") {
        evalLoss = previousEvaluation.value - evaluation.value;
      } else {
        evalLoss = evaluation.value - previousEvaluation.value;
      }
      
      evalLoss = Math.min(evalLoss, cutoffEvalLoss, lastLineEvalLoss);
      
      // Jika langkah ini satu-satunya yang legal, terapkan FORCED
      if (!secondTopMove) {
        position.classification = Classification.FORCED;
        continue;
      }
      
      // Gunakan fungsi determineMoveQuality yang lengkap
      position.classification = determineMoveQuality(
        lastPosition.fen,
        position.fen,
        previousEvaluation,
        evaluation,
        lastPosition.topLines,
        position.topLines,
        position.move.uci,
        position.move.san,
        lastPosition.classification,  // Tambahkan lastPositionClassification
        lastPosition.cutoffEvaluation // Tambahkan cutoffEvaluation
      );
      
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
  let positiveClassifs = Object.keys(classificationValues).slice(4, 8); // Persis dengan TypeScript
  
  try {
    for (let position of positions.slice(1)) {
      if (
        (position.worker === "cloud" && positiveClassifs.includes(position.classification))
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
  
  // Generate SAN moves from all engine lines
  for (let position of positions) {
    if (!position.topLines) continue;
    
    for (let line of position.topLines) {
      if (!line) continue;
      if (line.evaluation?.type === "mate" && line.evaluation?.value === 0) continue;
      if (!line.moveUCI || line.moveSAN) continue;
      
      let board = new Chess(position.fen);
      
      try {
        line.moveSAN = board.move({
          from: line.moveUCI.slice(0, 2),
          to: line.moveUCI.slice(2, 4),
          promotion: line.moveUCI.slice(4) || undefined
        }).san;
      } catch (e) {
        line.moveSAN = "";
      }
    }
  }
  
  // Process engine lines to include future moves data
  for (let position of positions) {
    if (!position.topLines) continue;
    
    // Add potential future moves to engine lines
    position.topLines.forEach(line => {
      if (!line || !line.moveUCI) return;
      
      try {
        // Setup a chess instance with the current position
        const chess = new Chess(position.fen);
        
        // Make the initial engine suggestion move
        const from = line.moveUCI.slice(0, 2);
        const to = line.moveUCI.slice(2, 4);
        const promotion = line.moveUCI.slice(4) || undefined;
        
        chess.move({ from, to, promotion });
        
        // Calculate potential next 4 moves (simplified approach)
        const futureMoves = [];
        
        // Make 4 moves based on simple heuristics - this is a very simplified approach
        // In a real implementation, you'd use the engine to calculate the line
        for (let i = 0; i < 4; i++) {
          if (chess.isGameOver()) break;
          
          const possibleMoves = chess.moves({ verbose: true });
          if (possibleMoves.length === 0) break;
          
          // Simple heuristic: prefer center control, development, and captures
          const scoredMoves = possibleMoves.map(move => {
            let score = 0;
            
            // Center control
            if ((move.to.includes('d') || move.to.includes('e')) && 
                (move.to.includes('4') || move.to.includes('5'))) {
              score += 3;
            }
            
            // Development priority
            if (move.piece !== 'p' && ['a1','b1','c1','f1','g1','h1','a8','b8','c8','f8','g8','h8'].includes(move.from)) {
              score += 2;
            }
            
            // Capture priority
            if (move.flags.includes('c')) {
              score += 5;
            }
            
            // Check priority
            if (move.flags.includes('c')) {
              score += 4;
            }
            
            return { move, score };
          });
          
          // Sort by score and take best move
          scoredMoves.sort((a, b) => b.score - a.score);
          const bestMove = scoredMoves[0].move;
          
          // Apply the move
          chess.move(bestMove);
          futureMoves.push(bestMove.san);
        }
        
        // Add future moves to the line data
        line.futureMoves = futureMoves;
      } catch (error) {
        console.warn("Could not calculate future moves for line", error);
        line.futureMoves = [];
      }
    });
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
    positions: positions,
    settings: {
      showEngineMoves: false // Default to false, user can toggle
    }
  };
};