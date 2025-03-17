/**
 * Service to handle chess sound effects
 */

// Sound types
export const SOUND_TYPES = {
    MOVE: 'move',
    CAPTURE: 'capture',
    CHECK: 'check',
    CASTLE: 'castle',
    PROMOTE: 'promote',
    GAME_END: 'game_end'
  };
  
  // Volume settings (0.0 to 1.0)
  const DEFAULT_VOLUME = 0.5;
  
  // Audio elements cache
  const audioElements = {};
  
  /**
   * Initialize sound elements
   */
  export const initSounds = () => {
    Object.values(SOUND_TYPES).forEach(type => {
      const audioId = `sound-fx-${type}`;
      audioElements[type] = document.getElementById(audioId);
      
      // Set default volume
      if (audioElements[type]) {
        audioElements[type].volume = DEFAULT_VOLUME;
      } else {
        console.warn(`Sound element ${audioId} not found`);
      }
    });
  };
  
  /**
   * Play a specific sound effect
   * @param {string} type - Sound type to play
   * @param {number} volume - Optional volume override (0.0 to 1.0)
   */
  export const playSound = (type, volume = DEFAULT_VOLUME) => {
    const audio = audioElements[type];
    
    if (!audio) {
      console.warn(`Sound not found: ${type}`);
      return;
    }
    
    try {
      // Set volume if provided
      if (volume !== DEFAULT_VOLUME) {
        audio.volume = Math.min(Math.max(volume, 0), 1);
      }
      
      // Reset to beginning if already playing
      audio.currentTime = 0;
      
      // Play the sound
      const playPromise = audio.play();
      
      // Handle play promise (required for modern browsers)
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          // Auto-play might be blocked
          console.warn(`Sound playback failed: ${error}`);
        });
      }
    } catch (error) {
      console.error(`Error playing sound: ${error}`);
    }
  };
  
  /**
   * Set global volume for all sounds
   * @param {number} volume - Volume level (0.0 to 1.0)
   */
  export const setVolume = (volume) => {
    const normalizedVolume = Math.min(Math.max(volume, 0), 1);
    
    Object.values(audioElements).forEach(audio => {
      if (audio) {
        audio.volume = normalizedVolume;
      }
    });
  };
  
  /**
   * Determine which sound to play based on a chess move
   * @param {object} moveData - Move data with details about the move
   */
  export const playSoundForMove = (moveData) => {
    if (!moveData) return;
    
    // Extract move details
    const { san = '', flags = '', piece = '', captured = null } = moveData;
    
    // Check for checkmate (game end)
    if (san.includes('#')) {
      playSound(SOUND_TYPES.GAME_END);
      return;
    }
    
    // Check for check
    if (san.includes('+')) {
      playSound(SOUND_TYPES.CHECK);
      return;
    }
    
    // Check for castling
    if (san === 'O-O' || san === 'O-O-O' || flags.includes('k')) {
      playSound(SOUND_TYPES.CASTLE);
      return;
    }
    
    // Check for promotion
    if (san.includes('=') || flags.includes('p')) {
      playSound(SOUND_TYPES.PROMOTE);
      return;
    }
    
    // Check for capture
    if (captured || san.includes('x') || flags.includes('c')) {
      playSound(SOUND_TYPES.CAPTURE);
      return;
    }
    
    // Default move sound
    playSound(SOUND_TYPES.MOVE);
  };