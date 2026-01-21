
import React, { useEffect, useRef } from 'react';

interface VoiceVisualizerProps {
  isActive: boolean;
  isSpeaking: boolean; // AI is speaking
}

export const VoiceVisualizer: React.FC<VoiceVisualizerProps> = ({ isActive, isSpeaking }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resize
    const resize = () => {
        canvas.width = canvas.clientWidth * 2; // Retina scaling
        canvas.height = canvas.clientHeight * 2;
    };
    resize();
    window.addEventListener('resize', resize);

    let phase = 0;

    const animate = () => {
        if (!ctx || !isActive) return;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Config based on state
        const amplitude = isSpeaking ? 40 : 10;
        const speed = isSpeaking ? 0.2 : 0.05;
        const color = isSpeaking ? 'rgba(6, 182, 212, ' : 'rgba(139, 92, 246, '; // Cyan (Speaking) vs Violet (Listening/Idle)
        const lines = 3;

        const width = canvas.width;
        const height = canvas.height;
        const centerY = height / 2;

        phase += speed;

        for (let i = 0; i < lines; i++) {
            ctx.beginPath();
            ctx.lineWidth = 4;
            ctx.strokeStyle = `${color}${1 - (i * 0.2)})`; // Fade out secondary lines
            
            for (let x = 0; x < width; x+=5) {
                // Sine wave synthesis
                const y = centerY + 
                          Math.sin(x * 0.01 + phase + (i * 0.5)) * amplitude * Math.sin(x / width * Math.PI) + 
                          (Math.random() * (isSpeaking ? 5 : 1)); // Jitter for "voice" texture

                if (x === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
        }

        animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
        window.removeEventListener('resize', resize);
    };
  }, [isActive, isSpeaking]);

  if (!isActive) return null;

  return (
    <div className="w-full h-24 bg-black/50 border border-white/10 rounded-sm overflow-hidden relative backdrop-blur-md animate-in fade-in slide-in-from-bottom-2">
        <canvas ref={canvasRef} className="w-full h-full" style={{ width: '100%', height: '100%' }} />
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[9px] font-mono uppercase tracking-[0.2em] text-zinc-500">
            {isSpeaking ? 'SAMARITAN_VOICE_OUT' : 'LISTENING...'}
        </div>
    </div>
  );
};
