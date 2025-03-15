import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faArrowRight } from '@fortawesome/free-solid-svg-icons';
import { fetchChessComGames, fetchLichessGames } from '../../services/apiService';
import './GameSelectModal.css';

const GameListing = ({ game, onSelect }) => {
  // Format player names and ratings for display
  const getPlayersString = () => {
    if (game.type === 'chesscom') {
      return `${game.white.username} (${game.white.rating}) vs. ${game.black.username} (${game.black.rating})`;
    } else if (game.type === 'lichess') {
      if (game.white.aiLevel) {
        return `AI level ${game.white.aiLevel} vs. ${game.black.username} (${game.black.rating})`;
      } else if (game.black.aiLevel) {
        return `${game.white.username} (${game.white.rating}) vs. AI level ${game.black.aiLevel}`;
      } else {
        return `${game.white.username} (${game.white.rating}) vs. ${game.black.username} (${game.black.rating})`;
      }
    }
    return '';
  };
  
  return (
    <div className="game-listing" onClick={() => onSelect(game.pgn)}>
      <b>{game.timeClass}</b>
      <span>{getPlayersString()}</span>
    </div>
  );
};

const GameSelectModal = ({ isOpen, onClose, onSelectGame, source, username }) => {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1
  });
  
  const padMonth = (month) => {
    return month.toString().padStart(2, '0');
  };
  
  // Fetch games when source, username, or period changes
  useEffect(() => {
    if (!isOpen || !username) return;
    
    const fetchGames = async () => {
      setLoading(true);
      
      try {
        let fetchedGames = [];
        
        if (source === 'chesscom') {
          const data = await fetchChessComGames(username, period);
          fetchedGames = data.map(game => ({
            ...game,
            type: 'chesscom',
            timeClass: game.time_class || 'Standard'
          }));
        } else if (source === 'lichess') {
          const data = await fetchLichessGames(username, period);
          fetchedGames = data.map(game => ({
            ...game,
            type: 'lichess',
            timeClass: game.speed || 'Standard',
            white: {
              username: game.players.white.user?.name,
              rating: game.players.white.rating,
              aiLevel: game.players.white.aiLevel
            },
            black: {
              username: game.players.black.user?.name,
              rating: game.players.black.rating,
              aiLevel: game.players.black.aiLevel
            }
          }));
        }
        
        setGames(fetchedGames);
      } catch (error) {
        console.error('Error fetching games:', error);
        setGames([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchGames();
  }, [isOpen, source, username, period]);
  
  const handlePreviousMonth = () => {
    setPeriod(prev => {
      if (prev.month === 1) {
        return { year: prev.year - 1, month: 12 };
      }
      return { year: prev.year, month: prev.month - 1 };
    });
  };
  
  const handleNextMonth = () => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    
    // Don't allow going beyond current month
    if (period.year === currentYear && period.month === currentMonth) {
      return;
    }
    
    setPeriod(prev => {
      if (prev.month === 12) {
        return { year: prev.year + 1, month: 1 };
      }
      return { year: prev.year, month: prev.month + 1 };
    });
  };
  
  if (!isOpen) {
    return null;
  }
  
  return (
    <div className="game-select-overlay">
      <div className="game-select-menu">
        <h1>Select a game</h1>
        
        <b className="game-select-period">
          {padMonth(period.month)}/{period.year}
        </b>
        
        <div className="games-list">
          {loading ? (
            <p>Loading games...</p>
          ) : games.length === 0 ? (
            <p>No games found.</p>
          ) : (
            games.map((game, index) => (
              <GameListing 
                key={index}
                game={game}
                onSelect={onSelectGame}
              />
            ))
          )}
        </div>
        
        <div className="game-select-page-buttons">
          <button 
            className="page-button"
            onClick={handlePreviousMonth}
          >
            <FontAwesomeIcon icon={faArrowLeft} />
          </button>
          
          <button 
            className="page-button"
            onClick={handleNextMonth}
          >
            <FontAwesomeIcon icon={faArrowRight} />
          </button>
        </div>
        
        <button 
          className="game-select-cancel-button"
          onClick={onClose}
        >
          <b>Cancel</b>
        </button>
      </div>
    </div>
  );
};

export default GameSelectModal;