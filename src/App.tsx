import React, { useState, useEffect } from 'react';
import { useGame } from './useGame';
import { LeaderCard } from './components/LeaderCard';
import { RetroConsole } from './components/RetroConsole';
import { ControlPanel } from './components/ControlPanel';
import { MissileAnim } from './components/MissileAnim';
import { StartScreen } from './components/StartScreen';
import { motion, AnimatePresence } from 'motion/react';
import { ASSETS, PLAYER_POSITIONS } from './constants';

function App() {
  const { gameState, handlePropaganda, handleBuild, handleAttack, setGameState, startGame } = useGame();
  
  // Show Start Screen if in start phase
  if (gameState.phase === 'start') {
    return <StartScreen onStart={startGame} />;
  }

  // Derived state for UI
  const humanPlayer = gameState.players.find(p => p.isHuman)!;
  const opponents = gameState.players.filter(p => !p.isHuman);

  // Map positions for 4 opponents
  const positions = ['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const;

  const onAction = (action: 'propaganda' | 'build' | 'attack') => {
    if (gameState.phase !== 'planning') return;
    
    setGameState(prev => ({
      ...prev,
      selectedAction: action,
      // If propaganda, we can execute immediately or select target? 
      // Original game: Propaganda is general or targeted. Let's make it general for now or auto-target.
      // Actually, let's keep it simple: Propaganda is an immediate action for this version.
    }));

    if (action === 'propaganda') {
      handlePropaganda();
    }
  };

  const onBuild = (type: string, id?: string) => {
    handleBuild(type, id);
  };

  const onSelectWeapon = (type: 'carrier' | 'payload', id: string) => {
    setGameState(prev => ({
      ...prev,
      selectedWeapon: {
        ...prev.selectedWeapon,
        [type]: id
      }
    }));
  };

  const onTargetSelect = (targetId: string) => {
    if (gameState.selectedAction === 'attack' && 
        gameState.selectedWeapon.carrier && 
        gameState.selectedWeapon.payload) {
      handleAttack(targetId, gameState.selectedWeapon.carrier, gameState.selectedWeapon.payload);
    }
  };

  return (
    <div className="w-full h-screen bg-slate-950 overflow-hidden relative select-none font-sans">
      {/* Background World Map (Decorative) */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <img 
            src={ASSETS.bg}
            className="w-full h-full object-cover grayscale"
            alt="World Map"
            onError={(e) => {
              // Fallback to wiki map if generation failed
              e.currentTarget.src = "https://upload.wikimedia.org/wikipedia/commons/8/80/World_map_-_low_resolution.svg";
            }}
        />
      </div>

      {/* Opponents */}
      {opponents.map((opp, idx) => (
        <div 
          key={opp.id} 
          onClick={() => onTargetSelect(opp.id)} 
          className={`cursor-pointer transition-transform hover:scale-105 ${gameState.selectedAction === 'attack' && gameState.selectedWeapon.carrier && gameState.selectedWeapon.payload ? 'cursor-crosshair ring-4 ring-red-500 rounded-lg' : ''}`}
          // Use absolute positioning to match the constants for missile targeting
          // We need to override the LeaderCard's internal positioning or wrap it
          // Actually, LeaderCard handles its own positioning via the 'position' prop which maps to CSS classes.
          // The MissileAnim uses percentages. We should ensure they align roughly.
          // PLAYER_POSITIONS in constants.ts uses percentages.
          // LeaderCard.tsx uses absolute classes like top-2 left-2.
          // We should probably update LeaderCard to use the same constants for perfect alignment, 
          // but for now let's just render them.
        >
           <LeaderCard 
             player={opp} 
             position={positions[idx]} 
           />
        </div>
      ))}

      {/* Center Console / Control Panel */}
      <ControlPanel 
        player={humanPlayer}
        turn={gameState.turn}
        onAction={onAction}
        onBuild={onBuild}
        onSelectWeapon={onSelectWeapon}
        selectedAction={gameState.selectedAction}
        selectedWeapon={gameState.selectedWeapon}
        phase={gameState.phase}
      />

      {/* Player Stats (Bottom Center - Hidden in favor of Console, but we need to see our own stats) */}
      {/* We'll put player stats in the control panel or a separate card */}
      <div className="absolute bottom-32 left-1/2 -translate-x-1/2 translate-y-full z-10">
         {/* Maybe a small status bar for the player? */}
      </div>
      
      {/* Actually, let's put the player card somewhere visible or integrate into the console */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2">
        <div className="bg-slate-800 border-2 border-slate-600 px-4 py-2 rounded-full text-white font-mono flex gap-4 shadow-lg">
           <span className="text-yellow-400 font-bold">{humanPlayer.name}</span>
           <span className="text-green-400">Pop: {humanPlayer.population}M</span>
           <span className="text-blue-400">Defenses: {humanPlayer.stockpile.defenses}</span>
        </div>
      </div>

      {/* Retro Console Log */}
      <RetroConsole logs={gameState.logs} />

      {/* Visual Effects Layer (Missiles, Explosions) */}
      <AnimatePresence>
         {gameState.activeAttacks.map(attack => (
           <MissileAnim 
             key={attack.id}
             attackerId={attack.attackerId}
             targetId={attack.targetId}
             weaponId={attack.weaponId}
             players={gameState.players}
           />
         ))}
      </AnimatePresence>

      {/* Game Over Screen */}
      {gameState.phase === 'gameover' && (
        <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center">
          <div className="bg-slate-800 border-4 border-red-600 p-8 rounded-xl max-w-md text-center shadow-2xl">
            <h1 className="text-4xl font-bold text-red-500 mb-4 font-mono">GAME OVER</h1>
            <p className="text-white text-xl mb-6">
              {gameState.winnerId === 'nobody' 
                ? "Mutually Assured Destruction. Everyone died." 
                : gameState.winnerId === humanPlayer.id 
                  ? "VICTORY! You have conquered the world!" 
                  : `${gameState.players.find(p => p.id === gameState.winnerId)?.name} has won.`
              }
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded uppercase tracking-widest"
            >
              Play Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
