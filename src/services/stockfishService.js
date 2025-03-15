/**
 * Service to interact with the Stockfish chess engine
 */
export class Stockfish {
    constructor() {
      this.worker = new Worker(
        typeof WebAssembly === "object"
          ? "/scripts/stockfish-nnue-16.js"
          : "/scripts/stockfish.js"
      );
      
      this.depth = 0;
      
      // Initialize Stockfish
      this.worker.postMessage("uci");
      this.worker.postMessage("setoption name MultiPV value 2");
    }
    
    /**
     * Evaluate a chess position using Stockfish
     * @param {string} fen - The FEN string representing the position
     * @param {number} targetDepth - The depth to search to
     * @param {boolean} verbose - Whether to log verbose output
     * @returns {Promise<Array>} - Array of engine lines with evaluations
     */
    async evaluate(fen, targetDepth = 16, verbose = false) {
      this.worker.postMessage("position fen " + fen);
      this.worker.postMessage("go depth " + targetDepth);
      
      const messages = [];
      const lines = [];
      
      return new Promise(resolve => {
        this.worker.addEventListener("message", event => {
          const message = event.data;
          messages.unshift(message);
          
          if (verbose) console.log(message);
          
          // Get latest depth for progress monitoring
          const latestDepth = parseInt(message.match(/(?:depth )(\d+)/)?.[1] || "0");
          this.depth = Math.max(latestDepth, this.depth);
          
          // Best move or checkmate log indicates end of search
          if (message.startsWith("bestmove") || message.includes("depth 0")) {
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
            
            this.worker.terminate();
            resolve(lines);
          }
        });
        
        this.worker.addEventListener("error", () => {
          // Terminate the current Stockfish, switch to Stockfish 11 as fallback engine
          this.worker.terminate();
          this.worker = new Worker("/scripts/stockfish.js");
          
          this.worker.postMessage("uci");
          this.worker.postMessage("setoption name MultiPV value 2");
          
          this.evaluate(fen, targetDepth, verbose).then(resolve);
        });
      });
    }
  }
  
  export default Stockfish;