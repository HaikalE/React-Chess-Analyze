import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faArrowLeft, 
  faArrowRight, 
  faSpinner,
  faChessKnight,
  faClock,
  faXmark
} from '@fortawesome/free-solid-svg-icons';
import { fetchChessComGames, fetchLichessGames } from '../../services/apiService';

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
  
  // Format time control
  const getTimeControl = () => {
    if (game.timeClass) {
      const timeClass = game.timeClass.charAt(0).toUpperCase() + game.timeClass.slice(1);
      return timeClass;
    }
    return 'Standard';
  };
  
  return (
    <div 
      className="flex flex-col sm:flex-row sm:items-center justify-between w-full p-3 bg-secondary-700 hover:bg-secondary-600 rounded-lg mb-2 cursor-pointer transition-colors"
      onClick={() => onSelect(game.pgn)}
    >
      <div className="flex items-center mb-1 sm:mb-0">
        <div className="bg-primary-700 text-white rounded-md p-1.5 mr-3">
          <FontAwesomeIcon icon={faClock} className="text-sm" />
        </div>
        <div className="text-sm">{getPlayersString()}</div>
      </div>
      <div className="flex items-center text-xs font-semibold text-primary-300">
        {getTimeControl()}
      </div>
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
  
  const getMonthName = (month) => {
    return new Date(2000, month - 1, 1).toLocaleString('default', { month: 'long' });
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
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-secondary-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-secondary-700">
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faChessKnight} className="text-xl text-primary-400" />
            <h2 className="text-xl font-bold">
              {source === 'chesscom' ? 'Chess.com' : 'Lichess'} Games
            </h2>
          </div>
          
          <button 
            onClick={onClose}
            className="text-secondary-400 hover:text-white bg-secondary-700 hover:bg-secondary-600 rounded-full p-1.5 transition-colors"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>
        
        <div className="p-4 border-b border-secondary-700">
          <div className="flex items-center justify-between">
            <div className="text-sm text-secondary-300">
              User: <span className="text-white font-medium">{username}</span>
            </div>
            
            <div className="flex items-center">
              <button 
                className="bg-secondary-700 hover:bg-secondary-600 p-2 rounded-l-md transition-colors"
                onClick={handlePreviousMonth}
              >
                <FontAwesomeIcon icon={faArrowLeft} />
              </button>
              
              <div className="bg-secondary-700 px-4 py-2 font-medium">
                {getMonthName(period.month)} {period.year}
              </div>
              
              <button 
                className="bg-secondary-700 hover:bg-secondary-600 p-2 rounded-r-md transition-colors"
                onClick={handleNextMonth}
              >
                <FontAwesomeIcon icon={faArrowRight} />
              </button>
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-40">
              <FontAwesomeIcon icon={faSpinner} className="text-2xl text-primary-400 animate-spin mb-3" />
              <p>Loading games...</p>
            </div>
          ) : games.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-secondary-400">
              <p className="mb-2">No games found for this period.</p>
              <p className="text-sm">Try a different month or check the username.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {games.map((game, index) => (
                <GameListing 
                  key={index}
                  game={game}
                  onSelect={onSelectGame}
                />
              ))}
            </div>
          )}
        </div>
        
        <div className="p-4 border-t border-secondary-700">
          <button 
            className="w-full bg-secondary-700 hover:bg-secondary-600 py-2 rounded-md transition-colors"
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameSelectModal;