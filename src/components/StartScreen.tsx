import React, { useState } from 'react';
import { LEADERS } from '../types';
import { motion } from 'motion/react';
import { Radiation } from 'lucide-react';

interface StartScreenProps {
  onStart: (leaderId: string) => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({ onStart }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleStart = () => {
    if (selectedId) {
      onStart(selectedId);
    }
  };

  return (
    <div className="w-full h-screen bg-slate-950 flex flex-col items-center justify-center p-8 relative overflow-hidden">
      {/* Background Effect */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black opacity-80" />
      
      {/* Title */}
      <motion.div 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="z-10 text-center mb-12"
      >
        <div className="flex items-center justify-center gap-4 mb-4">
          <Radiation size={64} className="text-yellow-500 animate-spin-slow" />
          <h1 className="text-6xl font-black text-yellow-500 tracking-tighter uppercase drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]">
            Nuclear War
          </h1>
          <Radiation size={64} className="text-yellow-500 animate-spin-slow" />
        </div>
        <p className="text-slate-400 text-xl font-mono">Select your Supreme Leader</p>
      </motion.div>

      {/* Leader Grid */}
      <div className="z-10 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-12 w-full max-w-7xl">
        {LEADERS.map((leader, index) => (
          <motion.div
            key={leader.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => setSelectedId(leader.id)}
            className={`
              cursor-pointer relative group
              bg-slate-800 border-4 rounded-xl overflow-hidden transition-all duration-300
              ${selectedId === leader.id 
                ? 'border-yellow-500 scale-105 shadow-[0_0_30px_rgba(234,179,8,0.3)]' 
                : 'border-slate-700 hover:border-slate-500 hover:scale-102'}
            `}
          >
            {/* Portrait */}
            <div className="h-48 bg-slate-900 relative overflow-hidden">
              <img 
                src={leader.avatar} 
                alt={leader.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                onError={(e) => {
                  // Fallback to DiceBear if local asset missing
                  e.currentTarget.src = `https://api.dicebear.com/9.x/avataaars/svg?seed=${leader.name}`;
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent opacity-60" />
            </div>

            {/* Info */}
            <div className="p-4">
              <h3 className={`font-bold text-lg mb-2 truncate ${selectedId === leader.id ? 'text-yellow-400' : 'text-white'}`}>
                {leader.name}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed h-20 overflow-y-auto scrollbar-hide">
                {leader.bio}
              </p>
            </div>

            {/* Selection Indicator */}
            {selectedId === leader.id && (
              <div className="absolute top-2 right-2 bg-yellow-500 text-black font-bold px-2 py-1 rounded text-xs">
                SELECTED
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Start Button */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: selectedId ? 1 : 0.5 }}
        disabled={!selectedId}
        onClick={handleStart}
        whileHover={selectedId ? { scale: 1.05 } : {}}
        whileTap={selectedId ? { scale: 0.95 } : {}}
        className={`
          z-10 px-12 py-4 rounded-full font-black text-2xl tracking-widest uppercase
          transition-all duration-300
          ${selectedId 
            ? 'bg-red-600 text-white shadow-[0_0_30px_rgba(220,38,38,0.6)] hover:bg-red-500' 
            : 'bg-slate-800 text-slate-500 cursor-not-allowed'}
        `}
      >
        Launch Game
      </motion.button>
    </div>
  );
};
