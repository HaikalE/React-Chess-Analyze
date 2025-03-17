import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-secondary-800 border-t border-secondary-700 py-4 px-4">
      <div className="max-w-7xl mx-auto flex justify-center items-center text-sm text-secondary-400">
        <div>
          <p>© {new Date().getFullYear()} ChessAnalyzer. A website by Muhammad Haikal Rahman</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;