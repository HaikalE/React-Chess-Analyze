import { Chess } from 'chess.js';
import React, { createContext, useContext, useState, useReducer, useEffect } from 'react';

// Initial state
const initialState = {
  positions: [],
  reportResults: null,
  currentMoveIndex: 0,
  boardFlipped: false,
  whitePlayer: { username: "White Player", rating: "?" },
  blackPlayer: { username: "Black Player", rating: "?" },
  isAnalysisRunning: false,
  analysisProgress: 0,
  analysisStatus: '',
  evaluatedPositions: [],
  showEngineMoves: false, // New state for engine move visibility
  activeEngineLine: null, // Track which engine line is being viewed
  engineMoveIndex: 0, // Track position in engine line sequence
};

// Reducer function to handle state changes
function gameReducer(state, action) {
  switch (action.type) {
    case 'SET_POSITIONS':
      return { ...state, positions: action.payload };
    case 'SET_REPORT_RESULTS':
      return { ...state, reportResults: action.payload };
    case 'SET_CURRENT_MOVE_INDEX':
      return { ...state, currentMoveIndex: action.payload };
    case 'FLIP_BOARD':
      return { ...state, boardFlipped: !state.boardFlipped };
    case 'TOGGLE_ENGINE_MOVES':
      return { ...state, showEngineMoves: !state.showEngineMoves };
    case 'SET_ENGINE_MOVES_VISIBILITY':
      return { ...state, showEngineMoves: action.payload };
    case 'SET_ACTIVE_ENGINE_LINE':
      return { 
        ...state, 
        activeEngineLine: action.payload,
        engineMoveIndex: 0 // Reset to start of line
      };
    case 'CLEAR_ACTIVE_ENGINE_LINE':
      return { 
        ...state, 
        activeEngineLine: null,
        engineMoveIndex: 0
      };
    case 'SET_ENGINE_MOVE_INDEX':
      return { ...state, engineMoveIndex: action.payload };
    case 'INCREMENT_ENGINE_MOVE_INDEX':
      if (state.activeEngineLine) {
        const maxMoves = state.activeEngineLine.futureMoves ? 
                        state.activeEngineLine.futureMoves.length : 0;
        return { 
          ...state, 
          engineMoveIndex: Math.min(state.engineMoveIndex + 1, maxMoves)
        };
      }
      return state;
    case 'DECREMENT_ENGINE_MOVE_INDEX':
      if (state.activeEngineLine) {
        return { 
          ...state, 
          engineMoveIndex: Math.max(state.engineMoveIndex - 1, 0)
        };
      }
      return state;
    case 'SET_PLAYERS':
      return { 
        ...state, 
        whitePlayer: action.payload.whitePlayer,
        blackPlayer: action.payload.blackPlayer
      };
    case 'SET_ANALYSIS_RUNNING':
      return { ...state, isAnalysisRunning: action.payload };
    case 'SET_ANALYSIS_PROGRESS':
      return { ...state, analysisProgress: action.payload };
    case 'SET_ANALYSIS_STATUS':
      return { ...state, analysisStatus: action.payload };
    case 'SET_EVALUATED_POSITIONS':
      return { ...state, evaluatedPositions: action.payload };
    case 'RESET_ANALYSIS':
      return {
        ...state,
        positions: [],
        reportResults: null,
        currentMoveIndex: 0,
        isAnalysisRunning: false,
        analysisProgress: 0,
        analysisStatus: '',
        evaluatedPositions: [],
        activeEngineLine: null,
        engineMoveIndex: 0
      };
    default:
      return state;
  }
}

// Create context
const GameContext = createContext();

// Context provider component
export const GameProvider = ({ children }) => {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  
  // Get current position based on move index from reportResults, fall back to positions
  const currentPosition = state.reportResults?.positions?.[state.currentMoveIndex] || 
                          state.positions[state.currentMoveIndex] || null;
  
  // Function to traverse moves
  const traverseMoves = (moveCount) => {
    if (state.isAnalysisRunning || !state.reportResults) return;
    
    const previousMoveIndex = state.currentMoveIndex;
    const positionsArray = state.reportResults?.positions || state.positions;
    let newIndex = Math.max(
      Math.min(state.currentMoveIndex + moveCount, positionsArray.length - 1),
      0
    );
    
    dispatch({ type: 'SET_CURRENT_MOVE_INDEX', payload: newIndex });
  };
  
  // Handle moves based on whether we're viewing an engine line or not
  const handleNextMove = () => {
    if (state.activeEngineLine) {
      dispatch({ type: 'INCREMENT_ENGINE_MOVE_INDEX' });
    } else {
      traverseMoves(1);
    }
  };
  
  const handlePrevMove = () => {
    if (state.activeEngineLine && state.engineMoveIndex > 0) {
      dispatch({ type: 'DECREMENT_ENGINE_MOVE_INDEX' });
    } else if (state.activeEngineLine) {
      // If we're at the start of an engine line, go back to the game
      dispatch({ type: 'CLEAR_ACTIVE_ENGINE_LINE' });
    } else {
      traverseMoves(-1);
    }
  };
  
  // Get the position to display based on whether we're showing an engine line
  // Fix for the getDisplayPosition function in GameContext.jsx
const getDisplayPosition = () => {
  if (!state.activeEngineLine) {
    return currentPosition;
  }
  
  try {
    // Start with the current game position
    const basePosition = currentPosition;
    if (!basePosition) return null;
    
    // Create a chess instance to apply engine moves
    const chess = new Chess(basePosition.fen);
    
    // Apply the initial engine move
    const line = state.activeEngineLine;
    if (line.moveUCI) {
      const from = line.moveUCI.slice(0, 2);
      const to = line.moveUCI.slice(2, 4);
      const promotion = line.moveUCI.length > 4 ? line.moveUCI.slice(4) : undefined;
      
      try {
        chess.move({ from, to, promotion });
      } catch (moveError) {
        console.warn("Failed to apply initial engine move:", moveError);
        return currentPosition;
      }
    }
    
    // Apply future moves up to engineMoveIndex
    if (line.futureMoves && state.engineMoveIndex > 0) {
      for (let i = 0; i < state.engineMoveIndex && i < line.futureMoves.length; i++) {
        try {
          // First try applying the move directly (SAN format)
          chess.move(line.futureMoves[i]);
        } catch (sanMoveError) {
          // If that fails and we have UCI format, try that
          if (line.futureMoveUCIs && line.futureMoveUCIs[i]) {
            try {
              const futureMoveUCI = line.futureMoveUCIs[i];
              const from = futureMoveUCI.slice(0, 2);
              const to = futureMoveUCI.slice(2, 4);
              const promotion = futureMoveUCI.length > 4 ? futureMoveUCI.slice(4) : undefined;
              
              chess.move({ from, to, promotion });
            } catch (uciMoveError) {
              console.warn(`Failed to apply future move at index ${i}:`, uciMoveError);
              // Stop applying moves if one fails
              break;
            }
          } else {
            console.warn(`Failed to apply future move at index ${i}:`, sanMoveError);
            // Stop applying moves if one fails
            break;
          }
        }
      }
    }
    
    // Return a position object with the calculated FEN
    return {
      ...basePosition,
      fen: chess.fen(),
      isEngineLine: true,
      activeVariation: line.id,
      variationDepth: state.engineMoveIndex
    };
  } catch (error) {
    console.error("Error calculating engine line position:", error);
    return currentPosition;
  }
}
  const displayPosition = getDisplayPosition();
  
  // Expose state and dispatch functions
  const value = {
    ...state,
    currentPosition, // Original game position
    displayPosition, // Position to display (may be from engine line)
    dispatch,
    traverseMoves,
    goToStart: () => {
      if (state.activeEngineLine) {
        dispatch({ type: 'SET_ENGINE_MOVE_INDEX', payload: 0 });
      } else {
        traverseMoves(-Infinity);
      }
    },
    goToEnd: () => {
      if (state.activeEngineLine && state.activeEngineLine.futureMoves) {
        dispatch({ 
          type: 'SET_ENGINE_MOVE_INDEX', 
          payload: state.activeEngineLine.futureMoves.length 
        });
      } else {
        traverseMoves(Infinity);
      }
    },
    nextMove: handleNextMove,
    prevMove: handlePrevMove,
    flipBoard: () => dispatch({ type: 'FLIP_BOARD' }),
    toggleEngineMoves: () => dispatch({ type: 'TOGGLE_ENGINE_MOVES' }),
    setEngineMoves: (visible) => dispatch({ 
      type: 'SET_ENGINE_MOVES_VISIBILITY', 
      payload: visible 
    }),
    setActiveEngineLine: (line) => dispatch({
      type: 'SET_ACTIVE_ENGINE_LINE',
      payload: line
    }),
    clearActiveEngineLine: () => dispatch({ type: 'CLEAR_ACTIVE_ENGINE_LINE' }),
    isViewingEngineLine: !!state.activeEngineLine,
  };
  
  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
};

// Custom hook to use the GameContext
export const useGameContext = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGameContext must be used within a GameProvider');
  }
  return context;
};