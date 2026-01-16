
'use client';

export default function AudioPlayer({ src }: { src: string }) {
  return (
    <audio controls src={src} className="w-full max-w-xs h-10">
      Your browser does not support the audio element.
    </audio>
  );
}
