import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';

export const Firework = ({ delay = 0, x = '50%', y = '50%', scale = 1 }: { delay?: number, x?: string | number, y?: string | number, scale?: number }) => {
  const [stage, setStage] = useState<'hidden' | 'trail' | 'explode'>('hidden');
  const [iteration, setIteration] = useState(0);

  useEffect(() => {
    let trailTimer: NodeJS.Timeout;
    let explodeTimer: NodeJS.Timeout;
    let loopTimer: NodeJS.Timeout;

    const runAnimation = () => {
      setStage('hidden');
      setIteration(i => i + 1);
      trailTimer = setTimeout(() => setStage('trail'), 50);
      explodeTimer = setTimeout(() => setStage('explode'), 650);
    };

    const initialTimer = setTimeout(() => {
      runAnimation();
      loopTimer = setInterval(runAnimation, 3500); // Repeat every 3.5 seconds
    }, delay * 1000);

    return () => {
      clearTimeout(initialTimer);
      clearTimeout(trailTimer);
      clearTimeout(explodeTimer);
      clearInterval(loopTimer);
    };
  }, [delay]);

  if (stage === 'hidden') return null;

  const colors = ['#f472b6', '#60a5fa', '#34d399', '#fbbf24', '#f97316'];
  const layers = [
    { count: 8, radius: 20, size: 0.6 },
    { count: 12, radius: 40, size: 0.8 },
    { count: 16, radius: 65, size: 1 },
    { count: 20, radius: 95, size: 1.2 },
  ];

  return (
    <div 
      key={iteration}
      className="absolute pointer-events-none z-50 flex flex-col items-center justify-end" 
      style={{ left: x, top: y, transform: `translate(-50%, -50%) scale(${scale})`, width: 200, height: 300 }}
    >
      {/* Trail */}
      {stage === 'trail' && (
        <motion.div
          initial={{ height: 0, opacity: 1 }}
          animate={{ height: 150, opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-1 border-r-2 border-dotted border-white/80 origin-bottom"
        />
      )}
      
      {/* Explosion */}
      {stage === 'explode' && (
        <motion.div
          initial={{ scale: 0, opacity: 1 }}
          animate={{ scale: 1, opacity: 0 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="relative w-full h-full flex items-center justify-center -mt-[150px]"
        >
          {/* Central dot */}
          <div className="absolute w-4 h-4 bg-red-500 rounded-full z-10" />
          
          {/* Particles */}
          {layers.map((layer, layerIdx) => (
            <React.Fragment key={layerIdx}>
              {Array.from({ length: layer.count }).map((_, i) => {
                const angle = (i * (360 / layer.count)) * (Math.PI / 180);
                const color = colors[(i + layerIdx) % colors.length];
                const xPos = Math.cos(angle) * layer.radius;
                const yPos = Math.sin(angle) * layer.radius;
                const rotation = angle * (180 / Math.PI) + 90;
                
                return (
                  <motion.div
                    key={`${layerIdx}-${i}`}
                    initial={{ x: 0, y: 0, scale: 0 }}
                    animate={{ x: xPos, y: yPos, scale: layer.size }}
                    transition={{ duration: 0.8, ease: "easeOut", delay: layerIdx * 0.05 }}
                    className="absolute"
                    style={{ rotate: rotation }}
                  >
                    {/* Teardrop shape */}
                    <svg width="12" height="20" viewBox="0 0 12 20" className="drop-shadow-md">
                      <path 
                        d="M6 0 C6 0 12 10 12 14 C12 17.3137 9.31371 20 6 20 C2.68629 20 0 17.3137 0 14 C0 10 6 0 6 0 Z" 
                        fill={color} 
                      />
                    </svg>
                  </motion.div>
                );
              })}
            </React.Fragment>
          ))}
        </motion.div>
      )}
    </div>
  );
};
