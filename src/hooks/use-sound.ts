'use client';

import { useState, useCallback, useEffect } from 'react';

// This hook handles playing a sound effect. It's designed to be robust
// and handle browser limitations around audio autoplay.
export const useSound = (src: string) => {
  // We use state to hold the audio object. We initialize it in a function
  // to ensure it's only created once and only on the client-side.
  const [audio, setAudio] = useState<HTMLAudioElement | undefined>(undefined);

  useEffect(() => {
    // This effect runs only once on the client to create the Audio object.
    // This avoids "document is not defined" errors during server-side rendering.
    setAudio(new Audio(src));
  }, [src]);

  // The play function is memoized with useCallback for performance.
  const play = useCallback(() => {
    if (audio) {
      // We ensure the sound plays from the beginning every time.
      audio.currentTime = 0;
      audio.play().catch(err => {
        // Modern browsers often block audio from playing without user interaction.
        // We log a warning instead of throwing an error because it's a
        // browser policy, not a code bug. The app can continue without the sound.
        console.warn(`Sound playback was prevented for ${src}. This is usually due to browser autoplay policies.`, err);
      });
    }
  }, [audio]);

  return play;
};
