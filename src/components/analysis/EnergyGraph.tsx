import { useRef, useEffect } from 'react';

interface EnergyGraphProps {
  energyCurve: number[];
}

export function EnergyGraph({ energyCurve }: EnergyGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || energyCurve.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const step = width / energyCurve.length;

    ctx.clearRect(0, 0, width, height);

    // Draw gradient fill
    const gradient = ctx.createLinearGradient(0, height, 0, 0);
    gradient.addColorStop(0, 'rgba(139, 92, 246, 0.05)');
    gradient.addColorStop(1, 'rgba(139, 92, 246, 0.3)');

    ctx.beginPath();
    ctx.moveTo(0, height);
    for (let i = 0; i < energyCurve.length; i++) {
      ctx.lineTo(i * step, height - energyCurve[i] * height * 0.9);
    }
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Draw line
    ctx.beginPath();
    for (let i = 0; i < energyCurve.length; i++) {
      const x = i * step;
      const y = height - energyCurve[i] * height * 0.9;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = 'rgba(139, 92, 246, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }, [energyCurve]);

  if (energyCurve.length === 0) return null;

  return (
    <div className="bg-bg-card rounded-xl p-4 border border-border">
      <h3 className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-3">Energy Level</h3>
      <canvas ref={canvasRef} className="w-full h-16" />
      <div className="flex justify-between mt-1">
        <span className="text-[10px] text-text-muted">Low</span>
        <span className="text-[10px] text-text-muted">High</span>
      </div>
    </div>
  );
}
