import React from 'react';
import { motion } from 'motion/react';

interface RetroConsoleProps {
  logs: string[];
}

export const RetroConsole: React.FC<RetroConsoleProps> = ({ logs }) => {
  return (
    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-[95%] max-w-4xl h-28 bg-slate-900 border-4 border-slate-600 rounded-lg p-2 font-mono text-green-400 overflow-hidden shadow-2xl">
      <div className="h-full flex flex-col justify-end">
        {logs.map((log, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1 - (i * 0.2), x: 0 }}
            className="truncate"
          >
            {i === 0 ? '> ' : '  '} {log}
          </motion.div>
        ))}
      </div>
    </div>
  );
};
