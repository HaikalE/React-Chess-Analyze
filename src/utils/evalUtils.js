/**
 * Format an evaluation score for display
 * @param {object} evaluation - The evaluation object with type and value
 * @returns {string} - Formatted evaluation string
 */
export const formatEvaluation = (evaluation) => {
  if (!evaluation) return "0.0";
  
  if (evaluation.type === "cp") {
    return (Math.abs(evaluation.value) / 100).toFixed(1);
  } else if (evaluation.type === "mate") {
    if (evaluation.value === 0) {
      return "0-0";
    }
    return "M" + Math.abs(evaluation.value).toString();
  }
  
  return "0.0";
};

/**
 * Get the color that should be ahead in the evaluation bar
 * @param {object} evaluation - The evaluation object
 * @param {string} movedPlayer - The player who moved last ("white" or "black")
 * @returns {string} - "white" or "black" depending on who's ahead
 */
export const getWinningColor = (evaluation, movedPlayer = null) => {
  if (!evaluation) return "white";
  
  // If it's a checkmate or 0 value, return the player who moved last
  if (evaluation.type === "mate" && evaluation.value === 0) {
    return movedPlayer || "white";
  }
  
  // Otherwise base it on evaluation value
  return evaluation.value >= 0 ? "white" : "black";
};

/**
 * Calculate the height percentage for the evaluation bar
 * @param {object} evaluation - The evaluation object
 * @param {boolean} forWhite - Whether to calculate for white (true) or black (false)
 * @returns {number} - Height percentage (0-100)
 */
export const calculateEvalBarHeight = (evaluation, forWhite = true) => {
  if (!evaluation) return 50;
  
  if (evaluation.type === "mate") {
    // For checkmate (value = 0), return based on who's currently checkmated
    if (evaluation.value === 0) {
      return forWhite ? 0 : 100; // Checkmate position is already handled by caller
    }
    
    // For mate-in-X
    if (evaluation.value > 0) {
      // White wins with mate
      return forWhite ? 95 : 5;
    } else {
      // Black wins with mate
      return forWhite ? 5 : 95;
    }
  }
  
  // For centipawn evaluation, calculate percentage
  const cpValue = evaluation.value;
  // Max value to scale with (after this, bar is at max)
  const maxCp = 1000;
  
  // Calculate percentage based on eval
  let percentage;
  if (forWhite) {
    // For white bar: 50% is equal, 100% is white winning completely
    percentage = 50 + Math.min(Math.abs(cpValue), maxCp) / maxCp * 45 * Math.sign(cpValue);
  } else {
    // For black bar: we just take the complement of white's percentage
    percentage = 100 - (50 + Math.min(Math.abs(cpValue), maxCp) / maxCp * 45 * Math.sign(cpValue));
  }
  
  // Clamp between 5 and 95 to always show at least a bit of both colors
  return Math.max(5, Math.min(95, percentage));
};

/**
 * Determine if evaluation text should be visible
 * @param {object} evaluation - The evaluation object
 * @param {boolean} boardFlipped - Whether the board is flipped
 * @param {string} forPlayer - Which player's text to check ("white" or "black")
 * @returns {boolean} - Whether the text should be visible
 */
export const isEvalTextVisible = (evaluation, boardFlipped, forPlayer) => {
  if (!evaluation) return forPlayer === "white";
  
  const winningColor = getWinningColor(evaluation);
  
  // If it's checkmate, hide both texts
  if (evaluation.type === "mate" && evaluation.value === 0) {
    return false;
  }
  
  // Show evaluation on the side that has more space based on who's winning
  const whiteWinning = winningColor === "white";
  
  if (forPlayer === "white") {
    return whiteWinning; // Show white text if white is winning
  } else {
    return !whiteWinning; // Show black text if black is winning
  }
};