"use client";

import { useEffect, useRef } from "react";

export default function BackgroundParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d")!;

    const resize = () => {
      // Usar window.innerWidth em vez de documentElement.clientWidth
      // e garantir que o canvas nunca ultrapasse a viewport
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resize();
    window.addEventListener("resize", resize);

    // Reduzir número de partículas para melhor performance
    const particles = Array.from({ length: 100 }).map(() => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 2 + 0.5,
      speed: Math.random() * 0.3 + 0.1,
      opacity: Math.random() * 0.3 + 0.1,
    }));

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach(p => {
        p.y -= p.speed;
        if (p.y < 0) p.y = canvas.height;

        // Usar gradiente para partículas mais suaves
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2);
        gradient.addColorStop(0, `rgba(168, 85, 247, ${p.opacity})`);
        gradient.addColorStop(1, `rgba(168, 85, 247, 0)`);

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      });

      requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 -z-10 pointer-events-none"
      style={{
        width: '100vw',
        height: '100vh',
        maxWidth: '100%',
        maxHeight: '100%',
        display: 'block'
      }}
    />
  );
}
