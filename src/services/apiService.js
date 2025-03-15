/**
 * Service for making API calls
 */

/**
 * Parse a PGN string to get positions
 * @param {string} pgn - PGN notation of the game
 * @returns {Promise<object>} - The parsed positions data or error
 */
export const parsePgn = async (pgn) => {
    try {
      const response = await fetch("/api/parse", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pgn }),
      });
  
      // Check if response is ok first
      if (!response.ok) {
        const contentType = response.headers.get("content-type");
        
        // If it's HTML (error page), provide a clearer error
        if (contentType && contentType.includes("text/html")) {
          throw new Error(`Server returned HTML instead of JSON. Status: ${response.status}`);
        }
        
        // Otherwise try to get the error message from JSON
        try {
          const errorData = await response.json();
          throw new Error(errorData.message || `API error: ${response.status}`);
        } catch (parseError) {
          throw new Error(`Failed to parse error response. Status: ${response.status}`);
        }
      }
      
      // Now try to parse the JSON
      try {
        const data = await response.json();
        return data;
      } catch (parseError) {
        console.error("Failed to parse response as JSON:", parseError);
        throw new Error("Server returned invalid JSON. This could be a server configuration issue.");
      }
    } catch (error) {
      console.error("Error in parsePgn:", error);
      throw new Error(error.message || "Failed to parse PGN.");
    }
  };
  
  /**
   * Generate a report from evaluated positions
   * @param {Array} positions - Array of evaluated positions
   * @param {string} captchaToken - reCAPTCHA token
   * @returns {Promise<object>} - The report data or error
   */
  export const generateReport = async (positions, captchaToken) => {
    try {
      const response = await fetch("/api/report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          positions: positions.map(pos => {
            if (pos.worker !== "cloud") {
              pos.worker = "local";
            }
            return pos;
          }),
          captchaToken: captchaToken || "none",
        }),
      });
      
      // Check if response is ok first
      if (!response.ok) {
        const contentType = response.headers.get("content-type");
        
        // If it's HTML (error page), provide a clearer error
        if (contentType && contentType.includes("text/html")) {
          throw new Error(`Server returned HTML instead of JSON. Status: ${response.status}`);
        }
        
        // Otherwise try to get the error message from JSON
        try {
          const errorData = await response.json();
          throw new Error(errorData.message || `API error: ${response.status}`);
        } catch (parseError) {
          throw new Error(`Failed to parse error response. Status: ${response.status}`);
        }
      }
      
      // Now try to parse the JSON
      try {
        const data = await response.json();
        return data;
      } catch (parseError) {
        console.error("Failed to parse response as JSON:", parseError);
        throw new Error("Server returned invalid JSON. This could be a server configuration issue.");
      }
    } catch (error) {
      console.error("Error in generateReport:", error);
      throw new Error(error.message || "Failed to generate report.");
    }
  };
  
  /**
   * Fetch games from Chess.com for a given username and period
   * @param {string} username - The Chess.com username
   * @param {object} period - The year and month to fetch games for
   * @returns {Promise<Array>} - Array of games
   */
  export const fetchChessComGames = async (username, period) => {
    try {
      const paddedMonth = period.month.toString().padStart(2, '0');
      const response = await fetch(
        `https://api.chess.com/pub/player/${username}/games/${period.year}/${paddedMonth}`,
        { method: "GET" }
      );
      
      if (!response.ok) {
        console.error(`Failed to fetch Chess.com games: ${response.status}`);
        return [];
      }
      
      const data = await response.json();
      
      if (!data.games) {
        return [];
      }
      
      return data.games.reverse();
    } catch (error) {
      console.error("Error fetching Chess.com games:", error);
      return [];
    }
  };
  
  /**
   * Fetch games from Lichess.org for a given username and period
   * @param {string} username - The Lichess.org username
   * @param {object} period - The year and month to fetch games for
   * @returns {Promise<Array>} - Array of games
   */
  export const fetchLichessGames = async (username, period) => {
    const monthLengths = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    
    // Adjust for leap years
    let monthLength = monthLengths[period.month - 1];
    if (period.month === 2 && period.year % 4 === 0) {
      monthLength = 29;
    }
    
    const paddedMonth = period.month.toString().padStart(2, '0');
    
    const monthBeginning = new Date(
      `${period.year}-${paddedMonth}-01T00:00:00Z`
    ).getTime();
    
    const monthEnding = new Date(
      `${period.year}-${paddedMonth}-${monthLength}T23:59:59Z`
    ).getTime();
    
    try {
      const response = await fetch(
        `https://lichess.org/api/games/user/${username}?since=${monthBeginning}&until=${monthEnding}&pgnInJson=true`,
        {
          method: "GET",
          headers: {
            "Accept": "application/x-ndjson"
          }
        }
      );
      
      if (!response.ok) {
        console.error(`Failed to fetch Lichess games: ${response.status}`);
        return [];
      }
      
      const gamesNdJson = await response.text();
      
      if (!gamesNdJson.trim()) {
        return [];
      }
      
      try {
        const games = gamesNdJson
          .split("\n")
          .filter(game => game.length > 0)
          .map(game => JSON.parse(game));
        
        return games;
      } catch (parseError) {
        console.error("Error parsing Lichess games:", parseError);
        return [];
      }
    } catch (error) {
      console.error("Error fetching Lichess games:", error);
      return [];
    }
  };
  
  /**
   * Fetch cloud evaluations for a position from Lichess
   * @param {string} fen - FEN string of the position
   * @returns {Promise<object|null>} - Cloud evaluation data or null if not available
   */
  export const fetchCloudEvaluation = async (fen) => {
    try {
      const queryFen = fen.replace(/\s/g, "%20");
      const response = await fetch(
        `https://lichess.org/api/cloud-eval?fen=${queryFen}&multiPv=2`,
        { method: "GET" }
      );
      
      if (!response.ok) {
        return null;
      }
      
      return await response.json();
    } catch (error) {
      console.error("Error fetching cloud evaluation:", error);
      return null;
    }
  };