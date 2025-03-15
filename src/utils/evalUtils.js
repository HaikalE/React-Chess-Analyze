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
      // For checkmate, return 0 or 100 depending on who's winning
      if (evaluation.value === 0) {
        return forWhite ? 100 : 0;
      } else if (evaluation.value > 0) {
        return forWhite ? 100 : 0;
      } else {
        return forWhite ? 0 : 100;
      }
    }
    
    // For centipawn evaluation, calculate percentage
    const cpValue = evaluation.value;
    // Max value to scale with (after this, bar is at max)
    const maxCp = 1000;
    
    // Calculate percentage based on eval
    let percentage;
    if (forWhite) {
      percentage = 50 + (cpValue / maxCp) * 50;
    } else {
      percentage = 50 - (cpValue / maxCp) * 50;
    }
    
    // Clamp between 0 and 100
    return Math.max(0, Math.min(100, percentage));
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
    
    // If it's checkmate at 0, use the player who moved last
    if (evaluation.type === "mate" && evaluation.value === 0) {
      return false; // Hide both in case of checkmate
    }
    
    // For normal evaluations, show the text for the winning side
    return (forPlayer === winningColor) !== boardFlipped;
  };