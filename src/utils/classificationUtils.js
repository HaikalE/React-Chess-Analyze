import { Classification } from '../services/analysisService';

// Classification types with no special rules
export const centipawnClassifications = [
  Classification.BEST,
  Classification.EXCELLENT,
  Classification.GOOD,
  Classification.INACCURACY,
  Classification.MISTAKE,
  Classification.BLUNDER
];

// Best move classifications that don't need alternatives
export const bestClassifications = [
  Classification.BRILLIANT,
  Classification.GREAT,
  Classification.BEST,
  Classification.BOOK,
  Classification.FORCED
];

// Messages for each classification
export const classificationMessages = {
  [Classification.BRILLIANT]: "a brilliant move",
  [Classification.GREAT]: "a great move",
  [Classification.BEST]: "the best move",
  [Classification.EXCELLENT]: "an excellent move",
  [Classification.GOOD]: "a good move",
  [Classification.INACCURACY]: "an inaccuracy",
  [Classification.MISTAKE]: "a mistake",
  [Classification.BLUNDER]: "a blunder",
  [Classification.BOOK]: "theory",
  [Classification.FORCED]: "a forced move"
};

// WTF Algorithm from original source
// Get the maximum evaluation loss for a classification to be applied
// Evaluation loss threshold for excellent in a previously equal position is 30
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

/**
 * Get a classification message for display
 * @param {string} classification - The classification enum value
 * @param {string} moveSan - The SAN notation of the move
 * @returns {string} - Formatted message
 */
export const getClassificationMessage = (classification, moveSan) => {
  if (!classification || !moveSan) return "";
  
  const message = classificationMessages[classification] || classification;
  return `${moveSan} is ${message}`;
};

/**
 * Determine if the classification requires showing alternatives
 * @param {string} classification - The classification enum value
 * @returns {boolean} - Whether to show alternatives
 */
export const shouldShowAlternative = (classification) => {
  return !bestClassifications.includes(classification);
};

// Helper function to load classification icons
export const preloadClassificationIcons = async () => {
  const classificationIconPromises = {};
  
  for (const classification of Object.values(Classification)) {
    classificationIconPromises[classification] = loadIcon(classification);
  }
  
  const icons = {};
  
  for (const [classification, promise] of Object.entries(classificationIconPromises)) {
    icons[classification] = await promise;
  }
  
  return icons;
};

// Load an icon
const loadIcon = async (classification) => {
  return new Promise((resolve) => {
    const image = new Image();
    image.src = `/static/media/${classification}.png`;
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
  });
};