'use client';

import { Play, Pause, Loader2 } from 'lucide-react';
import { useRef, useState, useEffect } from 'react';

export default function AudioPlayer({ src }: { src: string }) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const togglePlayPause = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play().catch(e => {
                setError('Could not play audio.');
                console.error("Audio play error:", e);
            });
        }
    };
    
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const handleCanPlay = () => setIsLoading(false);
        const handlePlay = () => setIsPlaying(true);
        const handlePause = () => setIsPlaying(false);
        const handleError = () => {
            setError('Error loading audio file.');
            setIsLoading(false);
        }

        audio.addEventListener('canplaythrough', handleCanPlay);
        audio.addEventListener('play', handlePlay);
        audio.addEventListener('pause', handlePause);
        audio.addEventListener('ended', handlePause);
        audio.addEventListener('error', handleError);

        // Check if audio is already loaded
        if (audio.readyState >= 3) {
            handleCanPlay();
        }

        return () => {
            audio.removeEventListener('canplaythrough', handleCanPlay);
            audio.removeEventListener('play', handlePlay);
            audio.removeEventListener('pause', handlePause);
            audio.removeEventListener('ended', handlePause);
            audio.removeEventListener('error', handleError);
        };

    }, []);

    return (
        <div className="flex items-center gap-3 w-full text-white">
            <audio ref={audioRef} src={src} preload="metadata" />
            <button onClick={togglePlayPause} disabled={isLoading || !!error} className="focus:outline-none disabled:opacity-50">
                {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                ) : isPlaying ? (
                    <Pause className="h-5 w-5" />
                ) : (
                    <Play className="h-5 w-5" />
                )}
            </button>
            <div className="flex-1 text-xs">
                {error ? (
                    <span className="text-red-400">{error}</span>
                ) : (
                    <span>Voice Message</span>
                )}
            </div>
        </div>
    );
}
