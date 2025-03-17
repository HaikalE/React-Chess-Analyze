import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChessKing } from '@fortawesome/free-solid-svg-icons';

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
            <span className="font-medium">Muhammad Haikal Rahman</span>
          </p>
        </div>
      </div>
    </header>
  );
};

export default Header;