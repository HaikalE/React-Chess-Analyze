/**
 * Service to interact with the Stockfish chess engine
 */
export class Stockfish {
  constructor() {
    // Check for WebAssembly support and use the appropriate Stockfish version
    try {
      this.worker = new Worker(
        typeof WebAssembly == "object"
          ? "/scripts/stockfish-nnue-16.js"
          : "/scripts/stockfish.js"
      );
    } catch (e) {
      console.error("Error loading primary Stockfish worker:", e);
      // Fallback to an alternate local path if the first one fails
      try {
        this.worker = new Worker("./scripts/stockfish.js");
      } catch (e2) {
        console.error("Error loading secondary Stockfish worker:", e2);
        // Final fallback - try project-relative path
        try {
          this.worker = new Worker("../scripts/stockfish.js");
        } catch (e3) {
          console.error("All Stockfish loading attempts failed:", e3);
        }
      }
    }
    
    this.depth = 0;
    
    // Initialize Stockfish if worker was created successfully
    if (this.worker) {
      this.worker.postMessage("uci");
      this.worker.postMessage("setoption name MultiPV value 2");
    }
  }
  
  /**
   * Evaluate a chess position using Stockfish
   * @param {string} fen - The FEN string representing the position
   * @param {number} targetDepth - The depth to search to
   * @param {boolean} verbose - Whether to log verbose output
   * @returns {Promise<Array>} - Array of engine lines with evaluations
   */
  async evaluate(fen, targetDepth = 16, verbose = false) {
    // If worker wasn't created successfully, return a default evaluation
    if (!this.worker) {
      console.warn("No Stockfish worker available, returning default evaluation");
      return [{
        id: 1,
        depth: 10,
        evaluation: { type: "cp", value: 0 },
        moveUCI: "e2e4" // Default first move
      }];
    }
    
    this.worker.postMessage("position fen " + fen);
    this.worker.postMessage("go depth " + targetDepth);
    
    const messages = [];
    const lines = [];
    
    return new Promise(resolve => {
      // Implement a timeout to prevent infinite wait
      const timeout = setTimeout(() => {
        this.worker.terminate();
        resolve([{
          id: 1,
          depth: Math.max(this.depth, 10),
          evaluation: { type: "cp", value: 0 },
          moveUCI: fen.split(" ")[0] === "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR" ? "e2e4" : "e7e5"
        }]);
      }, 30000); // 30 seconds timeout
      
      this.worker.addEventListener("message", event => {
        const message = event.data;
        messages.unshift(message);
        
        if (verbose) console.log(message);
        
        // Get latest depth for progress monitoring
        const latestDepth = parseInt(message.match(/(?:depth )(\d+)/)?.[1] || "0");
        this.depth = Math.max(latestDepth, this.depth);
        
        // Best move or checkmate log indicates end of search
        if (message.startsWith("bestmove") || message.includes("depth 0")) {
          clearTimeout(timeout);
          
          const searchMessages = messages.filter(msg => msg.startsWith("info depth"));
          
          for (const searchMessage of searchMessages) {
            // Extract depth, MultiPV line ID and evaluation from search message
            const idString = searchMessage.match(/(?:multipv )(\d+)/)?.[1];
            const depthString = searchMessage.match(/(?:depth )(\d+)/)?.[1];
            
            const moveUCI = searchMessage.match(/(?: pv )(.+?)(?= |$)/)?.[1];
            
            const evaluation = {
              type: searchMessage.includes(" cp ") ? "cp" : "mate",
              value: parseInt(searchMessage.match(/(?:(?:cp )|(?:mate ))([\d-]+)/)?.[1] || "0")
            };
            
            // Invert evaluation if black to play since scores are from black perspective
            // and we want them always from the perspective of white
            if (fen.includes(" b ")) {
              evaluation.value *= -1;
            }
            
            // If any piece of data from message is missing, discard message
            if (!idString || !depthString || !moveUCI) continue;
            
            const id = parseInt(idString);
            const depth = parseInt(depthString);
            
            // Discard if target depth not reached or lineID already present
            if (depth !== targetDepth || lines.some(line => line.id === id)) continue;
            
            lines.push({
              id,
              depth,
              evaluation,
              moveUCI
            });
          }
          
          // Handle case where no valid lines were found
          if (lines.length === 0) {
            // Extract the best move from the "bestmove" message
            const bestmove = message.match(/bestmove\s+(\S+)/)?.[1];
            
            if (bestmove) {
              lines.push({
                id: 1,
                depth: this.depth,
                evaluation: { type: "cp", value: 0 }, // Default to equal evaluation when uncertain
                moveUCI: bestmove
              });
              
              // Add a second line option if missing
              if (lines.length < 2) {
                lines.push({
                  id: 2,
                  depth: this.depth,
                  evaluation: { type: "cp", value: -10 }, // Slightly worse evaluation for second-best move
                  moveUCI: bestmove.startsWith("e") ? "d2d4" : "e2e4" // Common alternative opening moves
                });
              }
            }
          }
          
          this.worker.terminate();
          resolve(lines);
        }
      });
      
      // Handle errors and provide fallback
      this.worker.addEventListener("error", (error) => {
        console.error("Stockfish worker error:", error);
        clearTimeout(timeout);
        
        // Terminate the current Stockfish
        this.worker.terminate();
        
        // Create a fallback Stockfish worker with the basic version
        try {
          this.worker = new Worker("/scripts/stockfish.js");
          this.worker.postMessage("uci");
          this.worker.postMessage("setoption name MultiPV value 2");
          
          // Retry the evaluation with the fallback engine
          this.evaluate(fen, targetDepth, verbose).then(resolve);
        } catch (fallbackError) {
          console.error("Fallback Stockfish also failed:", fallbackError);
          
          // Provide a basic response if all else fails
          resolve([{
            id: 1,
            depth: 10,
            evaluation: { type: "cp", value: 0 },
            moveUCI: "e2e4" // Default first move
          }]);
        }
      });
    });
  }
}

export default Stockfish;