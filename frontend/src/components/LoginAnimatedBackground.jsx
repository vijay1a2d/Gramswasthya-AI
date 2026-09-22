import React, { useEffect, useRef } from 'react';
import { HeartPulse } from 'lucide-react';

export default function LoginAnimatedBackground({ mousePos = { x: 0, y: 0 } }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let particles = [];
    const numParticles = 80;

    const resize = () => {
      // Create a 20% oversized canvas to allow seamless panning
      canvas.width = window.innerWidth * 1.2;
      canvas.height = window.innerHeight * 1.2;
    };
    window.addEventListener('resize', resize);
    resize();

    // Particle class for neural network and data nodes
    class Particle {
      constructor(isHouseNode = false) {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = (Math.random() - 0.5) * 0.5;
        this.size = isHouseNode ? Math.random() * 3 + 3 : Math.random() * 2 + 1;
        this.isHouseNode = isHouseNode;
        // Cyan for neural nodes, Pink for house nodes
        this.baseColor = isHouseNode ? 'rgba(236, 72, 153' : 'rgba(56, 189, 248';
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;

        if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
        if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
      }

      draw() {
        ctx.beginPath();
        if (this.isHouseNode) {
          // Draw a tiny house shape
          ctx.moveTo(this.x, this.y - this.size);
          ctx.lineTo(this.x - this.size, this.y);
          ctx.lineTo(this.x - this.size, this.y + this.size);
          ctx.lineTo(this.x + this.size, this.y + this.size);
          ctx.lineTo(this.x + this.size, this.y);
          ctx.closePath();
        } else {
          ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        }
        ctx.fillStyle = `${this.baseColor}, 0.8)`;
        ctx.shadowBlur = 10;
        ctx.shadowColor = `${this.baseColor}, 1)`;
        ctx.fill();
        ctx.shadowBlur = 0; // Reset
      }
    }

    // Initialize particles (20% are house nodes)
    for (let i = 0; i < numParticles; i++) {
      particles.push(new Particle(Math.random() > 0.8));
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update and draw particles
      particles.forEach(p => p.update());

      // Draw neural network lines
      for (let i = 0; i < numParticles; i++) {
        for (let j = i + 1; j < numParticles; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 150) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            // Opacity based on distance
            const opacity = 1 - (distance / 150);
            
            // If connecting to a house node, make line purple/pink gradient, otherwise cyan
            if (particles[i].isHouseNode || particles[j].isHouseNode) {
              ctx.strokeStyle = `rgba(168, 85, 247, ${opacity * 0.5})`; // Purple glow
            } else {
              ctx.strokeStyle = `rgba(56, 189, 248, ${opacity * 0.4})`; // Cyan glow
            }
            ctx.lineWidth = 1;
            ctx.stroke();

            // Sometime draw a "data packet" moving along the line
            if (Math.random() > 0.99) {
              const pulseX = particles[i].x + (particles[j].x - particles[i].x) * Math.random();
              const pulseY = particles[i].y + (particles[j].y - particles[i].y) * Math.random();
              ctx.beginPath();
              ctx.arc(pulseX, pulseY, 2, 0, Math.PI * 2);
              ctx.fillStyle = 'white';
              ctx.shadowBlur = 8;
              ctx.shadowColor = 'white';
              ctx.fill();
              ctx.shadowBlur = 0;
            }
          }
        }
      }

      particles.forEach(p => p.draw());

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div 
      className="absolute inset-[-10%] z-0 pointer-events-none"
      style={{
        transform: `translate(${mousePos.x * -40}px, ${mousePos.y * -40}px)`,
        transition: 'transform 0.1s ease-out'
      }}
    >
      {/* 3D Floating Blurred Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/30 rounded-full mix-blend-screen filter blur-[100px] animate-blob" />
      <div className="absolute top-[20%] right-[-10%] w-[35%] h-[35%] bg-cyan-500/20 rounded-full mix-blend-screen filter blur-[100px] animate-blob animation-delay-2000" />
      <div className="absolute bottom-[-20%] left-[20%] w-[50%] h-[50%] bg-pink-600/20 rounded-full mix-blend-screen filter blur-[120px] animate-blob animation-delay-4000" />
      
      {/* Canvas for Neural Network & Particles */}
      <canvas ref={canvasRef} className="absolute inset-0 z-0 opacity-80" />

      {/* SVG Glowing Heartbeat (ECG) */}
      <div className="absolute top-1/2 left-0 w-full h-40 -translate-y-1/2 opacity-30 pointer-events-none overflow-hidden z-0 flex items-center">
        <svg className="w-[200%] h-full flex-shrink-0 animate-ecg-slide stroke-pink-500" viewBox="0 0 1000 100" preserveAspectRatio="none">
          {/* Glowing Drop Shadow filter */}
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <path 
            d="M0,50 L300,50 L315,30 L330,80 L350,10 L370,90 L385,50 L700,50 L715,30 L730,80 L750,10 L770,90 L785,50 L1000,50" 
            fill="none" 
            strokeWidth="2" 
            filter="url(#glow)"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Overlay gradient to darken edges */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(10,15,28,0.8)_100%)] z-0 pointer-events-none" />
    </div>
  );
}
