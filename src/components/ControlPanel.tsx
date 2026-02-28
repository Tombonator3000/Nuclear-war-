import React from 'react';
import { WEAPONS, Player } from '../types';
import { motion } from 'motion/react';
import { Rocket, Shield, Megaphone, Hammer, Skull } from 'lucide-react';

interface ControlPanelProps {
  player: Player;
  turn: number;
  onAction: (action: 'propaganda' | 'build' | 'attack') => void;
  onBuild: (type: string, id?: string) => void;
  onSelectWeapon: (type: 'carrier' | 'payload', id: string) => void;
  selectedAction: string | null;
  selectedWeapon: { carrier: string | null, payload: string | null };
  phase: string;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({ 
  player, 
  turn,
  onAction, 
  onBuild,
  onSelectWeapon,
  selectedAction,
  selectedWeapon,
  phase
}) => {
  
  if (phase !== 'planning' && phase !== 'targeting') {
    return (
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-800/90 p-8 rounded-xl border-2 border-slate-500 text-white font-mono animate-pulse">
        PROCESSING TURN {turn}...
      </div>
    );
  }

  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-slate-800 border-8 border-slate-600 rounded-xl shadow-2xl flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-slate-700 p-2 text-center font-bold text-white border-b-4 border-slate-600 flex justify-between px-4 items-center">
        <span>STRATEGIC COMMAND</span>
        <span className="text-yellow-400 font-mono">TURN {turn}</span>
      </div>

      <div className="flex-1 flex">
        {/* Left: Actions */}
        <div className="w-1/3 bg-slate-900 p-2 flex flex-col gap-2 border-r-4 border-slate-600">
          <button 
            onClick={() => onAction('propaganda')}
            className={`p-3 rounded border-2 flex flex-col items-center gap-1 transition-all
              ${selectedAction === 'propaganda' ? 'bg-yellow-600 border-yellow-400 text-white' : 'bg-slate-800 border-slate-600 text-slate-400 hover:bg-slate-700'}
            `}
          >
            <Megaphone size={24} />
            <span className="text-xs font-bold">PROPAGANDA</span>
          </button>
          
          <button 
            onClick={() => onAction('build')}
            className={`p-3 rounded border-2 flex flex-col items-center gap-1 transition-all
              ${selectedAction === 'build' ? 'bg-blue-600 border-blue-400 text-white' : 'bg-slate-800 border-slate-600 text-slate-400 hover:bg-slate-700'}
            `}
          >
            <Hammer size={24} />
            <span className="text-xs font-bold">BUILD</span>
          </button>

          <button 
            onClick={() => onAction('attack')}
            className={`p-3 rounded border-2 flex flex-col items-center gap-1 transition-all
              ${selectedAction === 'attack' ? 'bg-red-600 border-red-400 text-white' : 'bg-slate-800 border-slate-600 text-slate-400 hover:bg-slate-700'}
            `}
          >
            <Rocket size={24} />
            <span className="text-xs font-bold">ATTACK</span>
          </button>
        </div>

        {/* Right: Contextual Menu */}
        <div className="flex-1 bg-slate-800 p-4 overflow-y-auto">
          
          {/* PROPAGANDA VIEW */}
          {selectedAction === 'propaganda' && (
            <div className="text-center space-y-4">
              <h3 className="text-yellow-400 font-mono text-lg">DEPLOY PROPAGANDA</h3>
              <p className="text-slate-300 text-sm">
                Broadcast radio messages to enemy populations to induce defection.
              </p>
              <p className="text-xs text-slate-500">Risk: Low | Reward: Population Gain</p>
            </div>
          )}

          {/* BUILD VIEW */}
          {selectedAction === 'build' && (
            <div className="grid grid-cols-2 gap-2">
              <h3 className="col-span-2 text-blue-400 font-mono text-lg mb-2">PRODUCTION</h3>
              
              {WEAPONS.missiles.map(m => (
                <button key={m.id} onClick={() => onBuild('missile', m.id)} className="bg-slate-700 p-2 rounded hover:bg-slate-600 text-left text-xs text-white border border-slate-600 flex justify-between items-center">
                  <div>
                    <div className="font-bold">{m.name}</div>
                    <div className="text-slate-400">Cap: {m.capacity}MT</div>
                  </div>
                  <div className="text-blue-300 font-mono text-lg">
                    {player.stockpile.missiles[m.id] || 0}
                  </div>
                </button>
              ))}
              
              {WEAPONS.warheads.map(w => (
                <button key={w.id} onClick={() => onBuild('warhead', w.id)} className="bg-slate-700 p-2 rounded hover:bg-slate-600 text-left text-xs text-white border border-slate-600 flex justify-between items-center">
                  <div>
                    <div className="font-bold">{w.name}</div>
                    <div className="text-slate-400">Yield: {w.yield}MT</div>
                  </div>
                  <div className="text-red-300 font-mono text-lg">
                    {player.stockpile.warheads[w.id] || 0}
                  </div>
                </button>
              ))}

              <button onClick={() => onBuild('bomber')} className="bg-slate-700 p-2 rounded hover:bg-slate-600 text-left text-xs text-white border border-slate-600 flex justify-between items-center">
                <div>
                  <div className="font-bold">Bomber</div>
                  <div className="text-slate-400">Reusable</div>
                </div>
                <div className="text-green-300 font-mono text-lg">
                  {player.stockpile.bombers}
                </div>
              </button>

              <button onClick={() => onBuild('defense')} className="bg-slate-700 p-2 rounded hover:bg-slate-600 text-left text-xs text-white border border-slate-600 flex justify-between items-center">
                <div>
                  <div className="font-bold">Defense</div>
                  <div className="text-slate-400">Anti-Missile</div>
                </div>
                <div className="text-yellow-300 font-mono text-lg">
                  {player.stockpile.defenses}
                </div>
              </button>
            </div>
          )}

          {/* ATTACK VIEW */}
          {selectedAction === 'attack' && (
            <div className="space-y-4">
              <h3 className="text-red-400 font-mono text-lg">LAUNCH SEQUENCE</h3>
              
              {/* Carrier Selection */}
              <div className="space-y-1">
                <div className="text-xs text-slate-400 uppercase">1. Select Delivery System</div>
                <div className="flex gap-2 flex-wrap">
                  {WEAPONS.missiles.map(m => (
                    <button 
                      key={m.id}
                      disabled={!player.stockpile.missiles[m.id]}
                      onClick={() => onSelectWeapon('carrier', m.id)}
                      className={`px-2 py-1 text-xs rounded border ${
                        selectedWeapon.carrier === m.id 
                          ? 'bg-red-900 border-red-500 text-white' 
                          : 'bg-slate-700 border-slate-600 text-slate-300 disabled:opacity-30'
                      }`}
                    >
                      {m.name} ({player.stockpile.missiles[m.id] || 0})
                    </button>
                  ))}
                  <button 
                    disabled={player.stockpile.bombers <= 0}
                    onClick={() => onSelectWeapon('carrier', 'bomber')}
                    className={`px-2 py-1 text-xs rounded border ${
                      selectedWeapon.carrier === 'bomber' 
                        ? 'bg-red-900 border-red-500 text-white' 
                        : 'bg-slate-700 border-slate-600 text-slate-300 disabled:opacity-30'
                    }`}
                  >
                    Bomber ({player.stockpile.bombers})
                  </button>
                </div>
              </div>

              {/* Payload Selection */}
              <div className="space-y-1">
                <div className="text-xs text-slate-400 uppercase">2. Select Warhead</div>
                <div className="flex gap-2 flex-wrap">
                  {WEAPONS.warheads.map(w => (
                    <button 
                      key={w.id}
                      disabled={!player.stockpile.warheads[w.id]}
                      onClick={() => onSelectWeapon('payload', w.id)}
                      className={`px-2 py-1 text-xs rounded border ${
                        selectedWeapon.payload === w.id 
                          ? 'bg-red-900 border-red-500 text-white' 
                          : 'bg-slate-700 border-slate-600 text-slate-300 disabled:opacity-30'
                      }`}
                    >
                      {w.name} ({player.stockpile.warheads[w.id] || 0})
                    </button>
                  ))}
                </div>
              </div>

              {selectedWeapon.carrier && selectedWeapon.payload && (
                <div className="mt-4 p-2 bg-red-900/50 border border-red-500 text-red-200 text-xs text-center animate-pulse">
                  WEAPON ARMED. SELECT TARGET ON MAP.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
