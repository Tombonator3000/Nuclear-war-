import React from 'react';
import { Player } from '../types';
import { motion } from 'motion/react';

interface LeaderCardProps {
  player: Player;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  isCurrentTurn?: boolean;
}

export const LeaderCard: React.FC<LeaderCardProps> = ({ player, position, isCurrentTurn }) => {
  const isDead = player.population <= 0;

  // Position styles
  const positionClasses = {
    'top-left': 'absolute top-2 left-2',
    'top-right': 'absolute top-2 right-2',
    'bottom-left': 'absolute bottom-32 left-2', // Above console
    'bottom-right': 'absolute bottom-32 right-2', // Above console
    'center': 'hidden', // Should not happen for cards
  };

  return (
    <motion.div 
      className={`
        ${positionClasses[position]} 
        w-48 bg-slate-800 border-4 border-slate-600 rounded-lg p-2 
        shadow-xl flex flex-col items-center gap-2
        ${isCurrentTurn ? 'ring-2 ring-yellow-400' : ''}
        ${isDead ? 'opacity-50 grayscale' : ''}
      `}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
    >
      <div className="relative w-full aspect-square bg-slate-900 rounded border-2 border-slate-700 overflow-hidden">
        {/* Avatar Placeholder */}
        <div className="absolute inset-0 flex items-center justify-center text-6xl bg-slate-800">
           {isDead ? '☠️' : '👤'}
        </div>
        
        {/* Dead Overlay */}
        {isDead && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <span className="text-red-600 font-bold text-2xl -rotate-12 border-4 border-red-600 px-2">ELIMINATED</span>
          </div>
        )}

        {/* Name Tag */}
        <div className="absolute bottom-0 w-full bg-slate-700 text-white text-xs font-bold text-center py-1 truncate">
          {player.name}
        </div>
      </div>

      {/* Stats */}
      <div className="w-full bg-slate-900 p-2 rounded border border-slate-700 font-mono text-green-400 text-sm">
        <div className="flex justify-between">
          <span>POP:</span>
          <span>{player.population}M</span>
        </div>
      </div>
    </motion.div>
  );
};
