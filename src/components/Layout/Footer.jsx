import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-secondary-800 border-t border-secondary-700 py-4 px-4">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center text-sm text-secondary-400">
        <div className="mb-2 sm:mb-0">
          <p>© {new Date().getFullYear()} ChessAnalyzer. A website by wintrcat</p>
        </div>
        <div className="flex gap-4">
          <a 
            href="/privacy" 
            className="hover:text-primary-400 transition-colors duration-150"
          >
            Privacy Policy
          </a>
          <a 
            href="/terms" 
            className="hover:text-primary-400 transition-colors duration-150"
          >
            Terms of Service
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;