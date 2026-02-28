import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Rocket, Plane } from 'lucide-react';
import { PLAYER_POSITIONS, ASSETS } from '../constants';

interface MissileAnimProps {
  attackerId: string;
  targetId: string;
  weaponId: string;
  players: { id: string, isHuman: boolean }[];
}

export const MissileAnim: React.FC<MissileAnimProps> = ({ attackerId, targetId, weaponId, players }) => {
  const [imgError, setImgError] = useState(false);

  // Find positions
  const getPos = (id: string) => {
    const playerIndex = players.findIndex(p => p.id === id);
    const player = players[playerIndex];
    
    if (player.isHuman) {
      return PLAYER_POSITIONS['human'];
    } else {
      const opponents = players.filter(p => !p.isHuman);
      const oppIndex = opponents.findIndex(p => p.id === id);
      const keys = ['p1', 'p2', 'p3', 'p4'] as const;
      return PLAYER_POSITIONS[keys[oppIndex]];
    }
  };

  const start = getPos(attackerId);
  const end = getPos(targetId);

  // Calculate rotation
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90; // +90 because icon points up

  const iconSrc = weaponId === 'bomber' ? ASSETS.icons.bomber : ASSETS.icons.missile;

  return (
    <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
      <motion.div
        initial={{ 
          left: `${start.x}%`, 
          top: `${start.y}%`, 
          opacity: 1,
          scale: 0.5
        }}
        animate={{ 
          left: `${end.x}%`, 
          top: `${end.y}%`, 
          opacity: [1, 1, 0],
          scale: [0.5, 1.5, 2] // Grow as it hits
        }}
        transition={{ duration: 1.5, ease: "easeIn" }}
        className="absolute w-16 h-16 flex items-center justify-center drop-shadow-[0_0_10px_rgba(255,0,0,0.8)]"
      >
        <div style={{ transform: `rotate(${angle}deg)` }} className="w-full h-full flex items-center justify-center">
          {!imgError ? (
            <img 
              src={iconSrc} 
              alt={weaponId} 
              className="w-full h-full object-contain"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="text-red-500">
               {weaponId === 'bomber' ? <Plane size={48} /> : <Rocket size={48} />}
            </div>
          )}
        </div>
      </motion.div>
      
      {/* Trail line */}
      <svg className="absolute inset-0 w-full h-full">
        <motion.line
          x1={`${start.x}%`}
          y1={`${start.y}%`}
          x2={`${end.x}%`}
          y2={`${end.y}%`}
          stroke="red"
          strokeWidth="2"
          strokeDasharray="10,10"
          initial={{ pathLength: 0, opacity: 0.5 }}
          animate={{ pathLength: 1, opacity: 0 }}
          transition={{ duration: 1.5 }}
        />
      </svg>
    </div>
  );
};
