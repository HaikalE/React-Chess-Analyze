import React, { useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faVolumeHigh, 
  faVolumeXmark
} from '@fortawesome/free-solid-svg-icons';
import { useGameContext } from '../../contexts/GameContext';
import { setVolume } from '../../utils/soundService';

const SoundSettings = () => {
  const { soundEnabled, soundVolume, toggleSound, setSoundVolume } = useGameContext();
  
  // Update sound service when settings change
  useEffect(() => {
    // Apply volume setting (0 if disabled, otherwise use soundVolume)
    setVolume(soundEnabled ? soundVolume : 0);
  }, [soundEnabled, soundVolume]);
  
  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setSoundVolume(newVolume);
  };
  
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={toggleSound}
        className="p-2 rounded-full hover:bg-secondary-700 transition-colors"
        title={soundEnabled ? "Mute sounds" : "Enable sounds"}
      >
        <FontAwesomeIcon 
          icon={soundEnabled ? faVolumeHigh : faVolumeXmark} 
          className={`text-lg ${soundEnabled ? 'text-primary-400' : 'text-secondary-400'}`}
        />
      </button>
      
      {soundEnabled && (
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={soundVolume}
          onChange={handleVolumeChange}
          className="w-20 accent-primary-500"
          title={`Volume: ${Math.round(soundVolume * 100)}%`}
        />
      )}
    </div>
  );
};

export default SoundSettings;