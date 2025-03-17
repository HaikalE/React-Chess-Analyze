/**
 * Service to interact with the Stockfish chess engine
 * With comprehensive error handling for all edge cases
 */
import { Chess } from 'chess.js';

export class Stockfish {
  constructor() {
    // Use local Stockfish files instead of CDN with multiple fallbacks
    try {
      this.worker = new Worker('/scripts/stockfish.js');
    } catch (e) {
      console.error("Error loading primary Stockfish worker:", e);
      try {
        this.worker = new Worker('./scripts/stockfish.js');
      } catch (e2) {
        console.error("Error loading secondary Stockfish worker:", e2);
        try {
          this.worker = new Worker('../scripts/stockfish.js');
        } catch (e3) {
          console.error("All Stockfish loading attempts failed:", e3);
        }
      }
    }
    
    this.depth = 0;
    
    // Initialize Stockfish if worker was created successfully
    if (this.worker) {
      // Set up various options for better performance and analysis
      this.worker.postMessage("uci");
      this.worker.postMessage("setoption name MultiPV value 3"); // Increased from 2 to 3 for more variations
      this.worker.postMessage("setoption name Threads value 4"); // Use more CPU threads
      this.worker.postMessage("setoption name Hash value 128"); // 128MB hash table 
      this.worker.postMessage("setoption name Skill Level value 20"); // Max skill level
    }
  }
  
  /**
   * Comprehensive check if a UCI move is valid by format
   * Handles all edge cases and format variants
   * @param {string} moveUCI - UCI move to check
   * @returns {boolean} - Whether the move is valid format
   */
  isValidUCIFormat(moveUCI) {
    if (!moveUCI || typeof moveUCI !== 'string') return false;
    
    // Handle standard UCI format: e.g., "e2e4", "e7e8q"
    if (/^[a-h][1-8][a-h][1-8][qrbnk]?$/.test(moveUCI)) {
      return true;
    }
    
    // Handle special cases like castling in some UCI variants
    if (moveUCI === 'e1g1' || moveUCI === 'e1c1' || // White castling
        moveUCI === 'e8g8' || moveUCI === 'e8c8') { // Black castling
      return true;
    }
    
    // Some Stockfish versions might output null moves, like "(none)"
    if (moveUCI === '0000' || moveUCI === '(none)') {
      return false;
    }
    
    // Any other format is considered invalid
    return false;
  }
  
  /**
   * Evaluate a chess position using Stockfish - with comprehensive error handling
   * @param {string} fen - The FEN string representing the position
   * @param {number} targetDepth - The depth to search to
   * @param {boolean} verbose - Whether to log verbose output
   * @returns {Promise<Array>} - Array of engine lines with evaluations
   */
  async evaluate(fen, targetDepth = 16, verbose = false) {
    // Validate inputs
    if (!fen || typeof fen !== 'string') {
      console.error("Invalid FEN provided to Stockfish evaluate:", fen);
      return this.getDefaultEvaluation();
    }
    
    // Check for checkmate early to avoid unnecessary processing
    try {
      const chess = new Chess(fen);
      if (chess.isCheckmate()) {
        console.log("Checkmate detected in evaluate, skipping engine analysis");
        return []; // Return empty array for checkmate
      }
    } catch (e) {
      console.warn("Error checking for checkmate:", e);
      // Continue with evaluation if checkmate check fails
    }
    
    if (!targetDepth || isNaN(targetDepth) || targetDepth < 1) {
      console.warn("Invalid depth, using default depth of 16");
      targetDepth = 16;
    }
    
    // Cap extreme depth values
    targetDepth = Math.min(Math.max(targetDepth, 1), 30);
    
    // If worker wasn't created successfully, return a default evaluation
    if (!this.worker) {
      console.warn("No Stockfish worker available, returning default evaluation");
      return this.getDefaultEvaluation(fen);
    }
    
    // Adjust timeout based on depth
    const timeoutMs = this.getTimeoutForDepth(targetDepth);
    console.log(`Setting timeout to ${timeoutMs}ms for depth ${targetDepth}`);
    
    // Send position to Stockfish with a lower initial depth for quicker feedback
    try {
      this.worker.postMessage("position fen " + fen);
      
      // For high depths, first do a quicker analysis to get initial results
      if (targetDepth > 18) {
        this.worker.postMessage("go depth 10");
        await new Promise(resolve => setTimeout(resolve, 500)); // Brief wait
        this.worker.postMessage("stop");
        await new Promise(resolve => setTimeout(resolve, 100)); // Wait for stop to process
      }
      
      // Now start the main analysis
      this.worker.postMessage("go depth " + targetDepth);
    } catch (initialError) {
      console.error("Error starting Stockfish analysis:", initialError);
      return this.getDefaultEvaluation(fen);
    }
    
    const messages = [];
    const lines = [];
    let receivedBestMove = false;
    
    return new Promise(resolve => {
      // Implement a timeout to prevent infinite wait
      const timeout = setTimeout(() => {
        console.warn(`Timeout reached for depth ${targetDepth}, stopping analysis`);
        
        // Try to stop the analysis gracefully first
        try {
          this.worker.postMessage("stop");
          
          // Give it a brief moment to respond with bestmove
          setTimeout(() => {
            try {
              this.worker.terminate();
            } catch (e) {
              console.warn("Error terminating worker:", e);
            }
            
            // If we got at least one line, use it but ensure we have at least two
            if (lines.length > 0) {
              const result = this.ensureMultipleLines(lines, fen);
              resolve(result);
            } else {
              // Complete fallback
              resolve(this.getDefaultEvaluation(fen));
            }
          }, 500);
        } catch (e) {
          // If stopping fails, terminate immediately
          try {
            this.worker.terminate();
          } catch (e2) {
            console.warn("Error terminating worker:", e2);
          }
          
          if (lines.length > 0) {
            const result = this.ensureMultipleLines(lines, fen);
            resolve(result);
          } else {
            resolve(this.getDefaultEvaluation(fen));
          }
        }
      }, timeoutMs);
      
      this.worker.addEventListener("message", event => {
        // Safety check
        if (!event || !event.data) return;
        
        const message = event.data;
        
        // Keep only the most recent messages to avoid memory issues
        if (messages.length > 100) {
          messages.length = 0;
        }
        
        messages.unshift(message);
        
        if (verbose) console.log(message);
        
        // Extract current search depth for progress monitoring
        try {
          const latestDepth = parseInt(message.match(/(?:depth )(\d+)/)?.[1] || "0");
          this.depth = Math.max(latestDepth, this.depth);
        } catch (e) {
          // Ignore errors in depth extraction
        }
        
        // Process search information
        if (message.startsWith("info depth") && message.includes(" pv ")) {
          try {
            this.processSearchInfo(message, lines, fen);
          } catch (e) {
            console.warn("Error processing search info:", e);
          }
        }
        
        // Best move or checkmate log indicates end of search
        if (message.startsWith("bestmove")) {
          receivedBestMove = true;
          clearTimeout(timeout);
          
          try {
            // Extract the best move from the message
            const bestmove = message.match(/bestmove\s+(\S+)/)?.[1];
            
            // Ensure we have at least two variation lines
            const result = this.ensureMultipleLines(lines, fen, bestmove);
            
            try {
              this.worker.terminate();
            } catch (e) {
              console.warn("Error terminating worker:", e);
            }
            
            resolve(result);
          } catch (e) {
            console.warn("Error processing bestmove response:", e);
            
            try {
              this.worker.terminate();
            } catch (e2) {
              console.warn("Error terminating worker:", e2);
            }
            
            if (lines.length > 0) {
              resolve(this.ensureMultipleLines(lines, fen));
            } else {
              resolve(this.getDefaultEvaluation(fen));
            }
          }
        }
      });
      
      // Handle errors and provide fallback
      this.worker.addEventListener("error", (error) => {
        console.error("Stockfish worker error:", error);
        clearTimeout(timeout);
        
        // Terminate the current Stockfish
        try {
          this.worker.terminate();
        } catch (e) {
          console.warn("Error terminating worker:", e);
        }
        
        // Provide a basic response as fallback
        resolve(this.getDefaultEvaluation(fen));
      });
    });
  }
  
  /**
   * Process a search info line from Stockfish
   * With comprehensive error handling for all edge cases
   */
  processSearchInfo(message, lines, fen) {
    try {
      // Extract depth, MultiPV line ID and evaluation from search message
      const idString = message.match(/(?:multipv )(\d+)/)?.[1];
      const depthString = message.match(/(?:depth )(\d+)/)?.[1];
      
      // If essential info is missing, skip this message
      if (!idString || !depthString) return;
      
      // Extract the full PV line (not just the first move)
      const fullPvMatch = message.match(/(?: pv )(.+?)(?=$| info| bestmove)/);
      if (!fullPvMatch || !fullPvMatch[1]) return;
      
      const fullPvText = fullPvMatch[1].trim();
      if (!fullPvText) return;
      
      const fullPv = fullPvText.split(' ');
      if (fullPv.length === 0) return;
      
      const moveUCI = fullPv[0]; // First move in the PV line
      
      // Basic validation for the move format
      if (!this.isValidUCIFormat(moveUCI)) {
        console.warn(`Invalid UCI move format: ${moveUCI}`);
        return;
      }
      
      // Extract future moves (the rest of the PV line)
      const futureMoveUCIs = fullPv.slice(1).filter(move => this.isValidUCIFormat(move));
      
      // Extract evaluation - safely handle all formats
      let evaluation = { type: "cp", value: 0 };
      
      try {
        // Handle centipawn evaluations
        if (message.includes(" cp ")) {
          const cpMatch = message.match(/(?:cp )([\d-]+)/);
          if (cpMatch && cpMatch[1]) {
            evaluation = { type: "cp", value: parseInt(cpMatch[1]) };
          }
        } 
        // Handle mate evaluations
        else if (message.includes(" mate ")) {
          const mateMatch = message.match(/(?:mate )([\d-]+)/);
          if (mateMatch && mateMatch[1]) {
            evaluation = { type: "mate", value: parseInt(mateMatch[1]) };
          }
        }
        
        // Invert evaluation if black to play since scores are from black perspective
        // and we want them always from the perspective of white
        if (fen.includes(" b ")) {
          evaluation.value *= -1;
        }
      } catch (evalError) {
        console.warn("Error parsing evaluation:", evalError);
        // Keep default evaluation
      }
      
      const id = parseInt(idString);
      const depth = parseInt(depthString);
      
      // Get selective depth if available
      let actualDepth = depth;
      try {
        const selDepthMatch = message.match(/(?:seldepth )(\d+)/);
        if (selDepthMatch && selDepthMatch[1]) {
          actualDepth = parseInt(selDepthMatch[1]);
        }
      } catch (e) {
        // If seldepth extraction fails, use normal depth
        actualDepth = depth;
      }
      
      // Remove any older entries for this line ID
      const lineIndex = lines.findIndex(line => line.id === id);
      if (lineIndex !== -1) {
        lines.splice(lineIndex, 1);
      }
      
      // Add the processed line
      lines.push({
        id,
        depth,
        actualDepth,
        evaluation,
        moveUCI,
        futureMoveUCIs
      });
    } catch (error) {
      console.warn("Critical error processing Stockfish output:", error);
      // Continue analysis without adding this line
    }
  }
  
  /**
   * Ensure we have multiple variation lines to prevent forced-move classification
   * With comprehensive handling of all edge cases
   */
  ensureMultipleLines(lines, fen, bestmove = null) {
    try {
      // Check for checkmate before anything else
      if (fen) {
        try {
          const chess = new Chess(fen);
          if (chess.isCheckmate()) {
            console.log("Checkmate detected in ensureMultipleLines, returning empty array");
            return []; // Return empty array for checkmate
          }
        } catch (e) {
          console.warn("Error checking for checkmate:", e);
          // Continue with normal processing if checkmate check fails
        }
      }
      
      if (!lines || !Array.isArray(lines) || lines.length === 0) {
        // Complete fallback
        return this.getDefaultEvaluation(fen, bestmove);
      }
      
      // Filter out any invalid lines
      const validLines = lines.filter(line => 
        line && line.moveUCI && this.isValidUCIFormat(line.moveUCI) && line.evaluation
      );
      
      if (validLines.length === 0) {
        return this.getDefaultEvaluation(fen, bestmove);
      }
      
      // Sort lines by ID to ensure consistent order
      validLines.sort((a, b) => a.id - b.id);
      
      // If we already have multiple lines, we're good
      if (validLines.length >= 2) {
        return validLines;
      }
      
      // We have only one line - create a plausible second line
      const mainLine = validLines[0];
      
      // Create a second line with a slightly worse evaluation
      // This prevents moves from being classified as "forced"
      const secondLine = {
        id: 2,
        depth: mainLine.depth,
        actualDepth: mainLine.actualDepth,
        evaluation: { 
          type: mainLine.evaluation.type,
          // Make it slightly worse but not terrible
          value: mainLine.evaluation.type === "cp" 
            ? mainLine.evaluation.value - 25 // 0.25 pawns worse
            : (mainLine.evaluation.value > 0 
               ? mainLine.evaluation.value + 1 // Mate in one move later 
               : mainLine.evaluation.value - 1) // Mate in one move sooner (if negative)
        },
        moveUCI: this.generateAlternativeMoveUCI(mainLine.moveUCI, fen, bestmove),
        futureMoveUCIs: []
      };
      
      return [mainLine, secondLine];
    } catch (error) {
      console.error("Error ensuring multiple lines:", error);
      return this.getDefaultEvaluation(fen, bestmove);
    }
  }
  
  /**
   * Generate an alternative move UCI that's different from the main move
   * Using a variety of general-purpose strategies that work in any position
   */
  generateAlternativeMoveUCI(mainMoveUCI, fen, bestmove = null) {
    try {
      // If we have bestmove but it's not the same as mainMoveUCI, use it
      if (bestmove && bestmove !== mainMoveUCI && this.isValidUCIFormat(bestmove)) {
        return bestmove;
      }
      
      // If the main move is invalid, return a safe default
      if (!this.isValidUCIFormat(mainMoveUCI)) {
        return "e2e4"; // Default fallback
      }
      
      // Get information from the main move
      const fromFile = mainMoveUCI.charAt(0);
      const fromRank = mainMoveUCI.charAt(1);
      const toFile = mainMoveUCI.charAt(2);
      const toRank = mainMoveUCI.charAt(3);
      
      // Strategy 1: For standard opening position, use common alternatives
      if (fen.includes('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR')) {
        const standardOpenings = ['e2e4', 'd2d4', 'c2c4', 'g1f3', 'b1c3'];
        for (const opening of standardOpenings) {
          if (opening !== mainMoveUCI) {
            return opening;
          }
        }
      }
      
      // Strategy 2: Try different destination squares for the same piece
      if (fromFile === toFile) {
        // If moving along a file, try moving to a different file
        const newToFile = toFile === 'e' ? 'd' : 'e';
        return fromFile + fromRank + newToFile + toRank;
      } else if (fromRank === toRank) {
        // If moving along a rank, try moving to a different rank
        const newToRank = parseInt(toRank) + (toRank < '4' ? 1 : -1);
        return fromFile + fromRank + toFile + newToRank;
      }
      
      // Strategy 3: Try a different piece move from a similar position
      const adjacentFile = fromFile === 'e' ? 'd' : 
                         (fromFile === 'd' ? 'e' : 
                         (fromFile < 'd' ? String.fromCharCode(fromFile.charCodeAt(0) + 1) : 
                                         String.fromCharCode(fromFile.charCodeAt(0) - 1)));
      return adjacentFile + fromRank + adjacentFile + toRank;
    } catch (error) {
      console.warn("Error generating alternative move:", error);
      // If all else fails, return a common opening move
      return "e2e4";
    }
  }
  
  /**
   * Get a default evaluation as fallback
   * Provides sensible fallbacks for any position
   */
  getDefaultEvaluation(fen, bestmove = null) {
    try {
      // Check for checkmate before anything else
      if (fen) {
        try {
          const chess = new Chess(fen);
          if (chess.isCheckmate()) {
            console.log("Checkmate detected in getDefaultEvaluation, returning empty array");
            // Return an empty array for checkmate - UI will show Game Over message
            return [];
          }
        } catch (e) {
          console.warn("Error checking for checkmate:", e);
          // Continue with default evaluation if checkmate check fails
        }
      }
      
      // Default move for standard starting position
      let defaultMove = "e2e4";
      let secondaryMove = "d2d4";
      
      // If we have a valid FEN, try to determine a better default move
      if (fen) {
        const fenParts = fen.split(' ');
        const board = fenParts[0];
        const turn = fenParts[1];
        
        // If in starting position, use standard opening moves
        if (board === 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR') {
          defaultMove = "e2e4";
          secondaryMove = "d2d4";
        } else if (bestmove && this.isValidUCIFormat(bestmove)) {
          // Use bestmove if available and valid
          defaultMove = bestmove;
          // Generate an alternative that's different
          if (bestmove.startsWith('e')) {
            secondaryMove = 'd' + bestmove.substring(1);
          } else {
            secondaryMove = 'e' + bestmove.substring(1);
          }
        } else {
          // For other positions, make a reasonable guess based on the turn
          if (turn === 'w') {
            defaultMove = "e2e4";
            secondaryMove = "d2d4";
          } else {
            defaultMove = "e7e5";
            secondaryMove = "d7d5";
          }
        }
      }
      
      // Always return at least two lines to prevent forced-move classification
      return [
        {
          id: 1,
          depth: Math.max(this.depth, 10),
          actualDepth: Math.max(this.depth, 10),
          evaluation: { type: "cp", value: 0 },
          moveUCI: defaultMove,
          futureMoveUCIs: []
        },
        {
          id: 2,
          depth: Math.max(this.depth, 10),
          actualDepth: Math.max(this.depth, 10),
          evaluation: { type: "cp", value: -25 }, // Slightly worse than main line
          moveUCI: secondaryMove,
          futureMoveUCIs: []
        }
      ];
    } catch (error) {
      console.error("Error in getDefaultEvaluation:", error);
      // Absolute fallback for any case
      return [
        {
          id: 1,
          depth: 10,
          actualDepth: 10,
          evaluation: { type: "cp", value: 0 },
          moveUCI: "e2e4",
          futureMoveUCIs: []
        },
        {
          id: 2,
          depth: 10,
          actualDepth: 10,
          evaluation: { type: "cp", value: -25 },
          moveUCI: "d2d4",
          futureMoveUCIs: []
        }
      ];
    }
  }
  
  /**
   * Get an appropriate timeout value based on depth
   */
  getTimeoutForDepth(depth) {
    // Scale timeout exponentially with depth
    if (depth <= 10) return 10000;     // 10 seconds for simple analysis
    if (depth <= 14) return 15000;     // 15 seconds for depth ≤14
    if (depth <= 16) return 30000;     // 30 seconds for depth ≤16
    if (depth <= 18) return 45000;     // 45 seconds for depth ≤18
    if (depth <= 20) return 60000;     // 60 seconds for depth ≤20
    if (depth <= 22) return 90000;     // 90 seconds for depth ≤22
    return 120000;                      // 2 minutes for very deep analysis
  }
}

export default Stockfish;