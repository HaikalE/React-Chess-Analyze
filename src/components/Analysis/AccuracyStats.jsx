import React from 'react';
import { useGameContext } from '../../contexts/GameContext';
import { classificationColors } from '../../utils/boardUtils';
import './AccuracyStats.css';

const ClassificationCount = ({ classification, whiteCount, blackCount }) => {
  return (
    <div className="classification-count-row">
      <div 
        className="classification-count-white"
        style={{ color: classificationColors[classification] }}
      >
        {whiteCount}
      </div>
      
      <div className="classification-count-content">
        <img 
          src={`/static/media/${classification}.png`}
          alt={classification}
        />
        <div style={{ color: classificationColors[classification] }}>
          {classification}
        </div>
      </div>
      
      <div 
        className="classification-count-black"
        style={{ color: classificationColors[classification] }}
      >
        {blackCount}
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
    <div className="accuracy-stats">
      <div className="accuracies-container">
        <h2 className="accuracies-title">
          Accuracies
          <div className="accuracy-values">
            <span className="accuracy white-accuracy">
              {accuracies.white.toFixed(1)}%
            </span>
            <span className="accuracy black-accuracy">
              {accuracies.black.toFixed(1)}%
            </span>
          </div>
        </h2>
        
        {opening && (
          <span className="opening-name">{opening}</span>
        )}
      </div>
      
      <div className="classification-count-container">
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