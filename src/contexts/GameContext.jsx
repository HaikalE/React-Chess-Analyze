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
  
  // Expose state and dispatch functions
  const value = {
    ...state,
    currentPosition,
    dispatch,
    traverseMoves,
    goToStart: () => traverseMoves(-Infinity),
    goToEnd: () => traverseMoves(Infinity),
    nextMove: () => traverseMoves(1),
    prevMove: () => traverseMoves(-1),
    flipBoard: () => dispatch({ type: 'FLIP_BOARD' }),
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