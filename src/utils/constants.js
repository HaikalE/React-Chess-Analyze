/**
 * Classification enum values
 */
export const Classification = {
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

/**
 * Values associated with each classification for accuracy calculation
 * Nilai klasifikasi untuk menghitung akurasi
 */
export const classificationValues = {
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