import React from 'react';
import { useGameContext } from '../../contexts/GameContext';
import { classificationColors } from '../../utils/boardUtils';

const ClassificationCount = ({ classification, whiteCount, blackCount }) => {
  return (
    <div className="flex justify-between items-center text-sm">
      <div className="w-10 text-right" style={{ color: classificationColors[classification] }}>
        {whiteCount || '-'}
      </div>
      
      <div className="flex items-center mx-2">
        <img 
          src={`/static/media/${classification}.png`}
          alt={classification}
          className="w-5 h-5 mr-1.5"
        />
        <div style={{ color: classificationColors[classification] }}>
          {classification}
        </div>
      </div>
      
      <div className="w-10" style={{ color: classificationColors[classification] }}>
        {blackCount || '-'}
      </div>
    </div>
  );
};

const AccuracyStats = () => {
  const { reportResults, currentPosition } = useGameContext();
  
  if (!reportResults) {
    return null;
  }
  
  const { accuracies, classifications } = reportResults;
  const opening = currentPosition?.opening;
  
  return (
    <div className="card bg-secondary-700/50 border-secondary-600">
      <div className="mb-3">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-medium">Game Accuracy</h3>
          <div className="flex items-center gap-1">
            <div className="flex items-center justify-center w-14 h-8 bg-white text-black font-mono font-bold rounded">
              {accuracies.white.toFixed(1)}%
            </div>
            <div className="flex items-center justify-center w-14 h-8 bg-black text-white font-mono font-bold rounded">
              {accuracies.black.toFixed(1)}%
            </div>
          </div>
        </div>
        
        {opening && (
          <div className="text-sm bg-secondary-700 py-1.5 px-3 rounded border border-secondary-600 text-center">
            Opening: <span className="text-primary-300">{opening}</span>
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-1 gap-1.5">
        {Object.keys(classifications.white)
          .filter(classification => classification !== 'book' && classification !== 'forced')
          .map(classification => (
            <ClassificationCount 
              key={classification}
              classification={classification}
              whiteCount={classifications.white[classification]}
              blackCount={classifications.black[classification]}
            />
          ))
        }
      </div>
    </div>
  );
};

export default AccuracyStats;