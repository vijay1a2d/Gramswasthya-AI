import React, { useEffect, useRef } from 'react';

export default function NeuralBrain() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = 280;
    const height = 280;
    
    // Scale for high DPI displays
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    
    // Brain-like node distribution
    const nodes = [];
    const numNodes = 140;
    
    for (let i = 0; i < numNodes; i++) {
        // Brain shape approximated by two slightly overlapping ellipsoids
       let hemisphere = Math.random() > 0.5 ? 1 : -1;
       let u = Math.random();
       let v = Math.random();
       let theta = u * 2.0 * Math.PI;
       let phi = Math.acos(2.0 * v - 1.0);
       let r = Math.cbrt(Math.random()) * 65; // radius
       
       let x = r * Math.sin(phi) * Math.cos(theta);
       let y = r * Math.sin(phi) * Math.sin(theta);
       let z = r * Math.cos(phi);
       
       // Shape adjustments
       x = x * 1.1 + (hemisphere * 22); // Separate hemispheres
       y = y * 0.85; // Flatten slightly
       z = z * 1.25; // Elongate
       
       nodes.push({x, y, z});
    }

    let angle = 0;
    let reqId;

    const draw = () => {
      ctx.clearRect(0,0,width,height);
      angle += 0.004; // Slow rotation

      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);

      // Rotate and project
      let projected = nodes.map(n => {
         // Rotate around Y
         let rx = n.x * cosA - n.z * sinA;
         let rz = n.x * sinA + n.z * cosA;
         let ry = n.y;
         
         // Add slight tilt (X axis)
         let tiltCos = Math.cos(0.2);
         let tiltSin = Math.sin(0.2);
         let finalY = ry * tiltCos - rz * tiltSin;
         let finalZ = ry * tiltSin + rz * tiltCos;
         
         let scale = 250 / (250 + finalZ); 
         return {
           x: rx * scale + width/2,
           y: finalY * scale + height/2,
           z: finalZ,
           scale
         };
      });

      // Draw connections
      ctx.lineWidth = 0.6;
      for(let i=0; i<projected.length; i++) {
         for(let j=i+1; j<projected.length; j++) {
            let p1 = projected[i];
            let p2 = projected[j];
            let dx = p1.x - p2.x;
            let dy = p1.y - p2.y;
            let dist = Math.sqrt(dx*dx + dy*dy);
            
            if(dist < 35) {
               ctx.beginPath();
               ctx.moveTo(p1.x, p1.y);
               ctx.lineTo(p2.x, p2.y);
               // Alpha based on distance and depth
               let alpha = (1 - dist/35) * p1.scale;
               ctx.strokeStyle = `rgba(168, 85, 247, ${alpha * 0.8})`; // Purple-ish network lines
               ctx.stroke();
            }
         }
      }

      // Draw nodes
      projected.forEach(p => {
         ctx.beginPath();
         let radius = Math.max(0.5, 1.5 * p.scale);
         ctx.arc(p.x, p.y, radius, 0, Math.PI*2);
         ctx.fillStyle = `rgba(56, 189, 248, ${p.scale})`; // Cyan glowing nodes
         ctx.shadowBlur = 6;
         ctx.shadowColor = '#38bdf8';
         ctx.fill();
         ctx.shadowBlur = 0;
      });

      reqId = requestAnimationFrame(draw);
    };
    
    draw();
    
    return () => cancelAnimationFrame(reqId);
  }, []);

  return (
    <div className="flex items-center justify-center pointer-events-none">
      <canvas 
        ref={canvasRef} 
        style={{ width: 280, height: 280 }}
        className="mix-blend-screen opacity-75"
      />
    </div>
  );
}
