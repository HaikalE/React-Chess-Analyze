import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHeart, faMessage, faChessKing } from '@fortawesome/free-solid-svg-icons';

const Header = () => {
  return (
    <header className="bg-secondary-800 border-b border-secondary-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-3 md:py-4">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <FontAwesomeIcon 
              icon={faChessKing} 
              className="text-primary-400 text-2xl md:text-3xl" 
            />
            <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
              Chess<span className="text-primary-400">Analyzer</span>
            </h1>
          </div>
          
          {/* Support message */}
          <p className="hidden md:block text-sm text-secondary-300">
            <span className="font-medium">Free chess analysis for everyone </span>
            <FontAwesomeIcon icon={faHeart} className="text-error-500 ml-1" />
          </p>
          
          {/* Action buttons */}
          <div className="flex gap-2 md:gap-3">
            <a
              href="https://ko-fi.com/N4N7SORCC"
              target="_blank"
              rel="noopener noreferrer"
              className="btn bg-primary-600 hover:bg-primary-700 text-white text-xs md:text-sm px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="currentColor"
                viewBox="0 0 24 24"
                role="img"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M23.881 8.948c-.773-4.085-4.859-4.593-4.859-4.593H.723c-.604 0-.679.798-.679.798s-.082 7.324-.022 11.822c.164 2.424 2.586 2.672 2.586 2.672s8.267-.023 11.966-.049c2.438-.426 2.683-2.566 2.658-3.734 4.352.24 7.422-2.831 6.649-6.916zm-11.062 3.511c-1.246 1.453-4.011 3.976-4.011 3.976s-.121.119-.31.023c-.076-.057-.108-.09-.108-.09-.443-.441-3.368-3.049-4.034-3.954-.709-.965-1.041-2.7-.091-3.71.951-1.01 3.005-1.086 4.363.407 0 0 1.565-1.782 3.468-.963 1.904.82 1.832 3.011.723 4.311zm6.173.478c-.928.116-1.682.028-1.682.028V7.284h1.77s1.971.551 1.971 2.638c0 1.913-.985 2.667-2.059 3.015z" />
              </svg>
              <span className="hidden sm:inline">Support</span>
            </a>
            
            <a
              href="https://discord.com/invite/XxtsAzPyCb"
              target="_blank"
              rel="noopener noreferrer"
              className="btn bg-secondary-700 hover:bg-secondary-600 text-white text-xs md:text-sm px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors"
            >
              <FontAwesomeIcon icon={faMessage} />
              <span className="hidden sm:inline">Discord</span>
            </a>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;