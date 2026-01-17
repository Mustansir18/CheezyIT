'use client';

import { useRef, useCallback, useEffect } from 'react';

/**
 * A robust hook for playing sound effects.
 * This hook handles creating the audio element and provides a stable `play` function.
 * It uses a ref to store the audio element, preventing re-renders, and includes
 * a cleanup effect to pause sound and release resources on unmount.
 * @param src The path to the audio file.
 * @returns A stable function to play the sound.
 */
export const useSound = (src: string) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // This effect creates the Audio object on the client-side when the component mounts.
  useEffect(() => {
    const audio = new Audio(src);
    audio.preload = 'auto'; // Explicitly tell the browser to download the whole file
    audioRef.current = audio;


    // Cleanup function to run when the component unmounts.
    return () => {
      if (audioRef.current) {
        // Pause the audio to stop it from playing in the background.
        audioRef.current.pause();
        // Nullify the ref to allow for garbage collection.
        audioRef.current = null;
      }
    };
  }, [src]);

  // The play function is memoized with an empty dependency array.
  // This means the same function instance is returned on every render,
  // making it safe to use in other hooks' dependency arrays.
  const play = useCallback(() => {
    if (audioRef.current) {
      // Reset the sound to the beginning to allow it to be re-played.
      audioRef.current.currentTime = 0;
      // Play the sound and catch any errors, which are common due to
      // browser autoplay policies.
      audioRef.current.play().catch(err => {
        console.warn(
          `Sound playback was prevented for ${src}. This is usually due to browser autoplay policies requiring user interaction.`,
          err
        );
      });
    }
  }, [src]);

  return play;
};
