import React, { useEffect, useState } from 'react';
import { useGameContext } from '../../contexts/GameContext';
import { classificationColors } from '../../utils/boardUtils';
import { determineMoveQuality } from '../../utils/moveQualityUtils';

// Klasifikasi langkah terbaik yang tidak memerlukan alternatif
const bestClassifications = [
  "brilliant",
  "great",
  "best",
  "book",
  "forced"
];

// Pesan untuk setiap klasifikasi
const getClassificationMessage = (classification, moveSan) => {
  if (!classification || !moveSan) return "";
  
  const messages = {
    "brilliant": "langkah brilian",
    "great": "langkah hebat",
    "best": "langkah terbaik",
    "excellent": "langkah sangat baik",
    "good": "langkah bagus",
    "inaccuracy": "ketidaktepatan",
    "mistake": "kesalahan",
    "blunder": "blunder",
    "book": "teori",
    "forced": "langkah terpaksa"
  };
  
  return `${moveSan} adalah ${messages[classification] || classification}`;
};

// Penentuan apakah perlu menampilkan alternatif
const shouldShowAlternative = (classification) => {
  return !bestClassifications.includes(classification);
};

const ClassificationDisplay = () => {
  const { 
    reportResults, 
    currentMoveIndex, 
    positions 
  } = useGameContext();
  
  const [iconSrc, setIconSrc] = useState('/static/media/book.png');
  const [message, setMessage] = useState('');
  const [alternativeMessage, setAlternativeMessage] = useState('');
  const [messageColor, setMessageColor] = useState('#a88764');
  
  useEffect(() => {
    if (!reportResults || currentMoveIndex <= 0) {
      setMessage('');
      setAlternativeMessage('');
      return;
    }
    
    const currentPosition = reportResults.positions[currentMoveIndex];
    const lastPosition = reportResults.positions[currentMoveIndex - 1];
    
    if (!currentPosition || !lastPosition) {
      setMessage('');
      setAlternativeMessage('');
      return;
    }
    
    // Tentukan klasifikasi kualitas langkah
    let classification = currentPosition.classification;
    
    // Jika klasifikasi belum ada, tentukan dengan algoritma baru
    if (!classification && currentPosition.move?.uci && lastPosition.topLines && currentPosition.topLines) {
      classification = determineMoveQuality(
        lastPosition.fen,
        currentPosition.fen,
        lastPosition.topLines[0]?.evaluation || { type: "cp", value: 0 },
        currentPosition.topLines[0]?.evaluation || { type: "cp", value: 0 },
        lastPosition.topLines,
        currentPosition.topLines,
        currentPosition.move.uci,
        currentPosition.move.san
      );
      
      // Simpan klasifikasi pada posisi (opsional)
      currentPosition.classification = classification;
    }
    
    if (!classification) {
      setMessage('');
      setAlternativeMessage('');
      return;
    }
    
    // Set the classification icon
    setIconSrc(`/static/media/${classification}.png`);
    
    // Set the classification message
    const formattedMessage = getClassificationMessage(
      classification,
      currentPosition.move?.san
    );
    
    setMessage(formattedMessage);
    setMessageColor(classificationColors[classification]);
    
    // Set alternative move message if needed
    if (shouldShowAlternative(classification) && lastPosition) {
      const topAlternative = lastPosition.topLines?.[0]?.moveSAN;
      
      if (topAlternative) {
        setAlternativeMessage(`Terbaik adalah ${topAlternative}`);
      } else {
        setAlternativeMessage('');
      }
    } else {
      setAlternativeMessage('');
    }
    
  }, [reportResults, currentMoveIndex, positions]);
  
  if (!message) {
    return null;
  }
  
  return (
    <div className="card bg-secondary-700/50 border-secondary-600">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <img 
            src={iconSrc}
            alt="Classification"
            className="w-6 h-6"
          />
          <div className="font-medium" style={{ color: messageColor }}>
            {message}
          </div>
        </div>
        
        {alternativeMessage && (
          <div className="text-sm bg-secondary-700 py-1.5 px-3 rounded text-accent-400 font-medium">
            {alternativeMessage}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClassificationDisplay;