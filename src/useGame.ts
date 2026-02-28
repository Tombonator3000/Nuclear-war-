import { useState, useEffect, useCallback } from 'react';
import { GameState, Player, WEAPONS, LEADERS } from './types';

const INITIAL_POPULATION = 100; // Millions

const createInitialState = (): GameState => {
  // Initial empty state for start screen
  return {
    turn: 0,
    players: [],
    currentPlayerId: '',
    phase: 'start',
    selectedAction: null,
    selectedWeapon: { carrier: null, payload: null },
    targetId: null,
    logs: [],
    winnerId: null,
    activeAttacks: [],
  };
};

export const useGame = () => {
  const [gameState, setGameState] = useState<GameState>(createInitialState());

  const startGame = (selectedLeaderId: string) => {
    // 1. Find selected leader
    const humanLeader = LEADERS.find(l => l.id === selectedLeaderId)!;
    
    // 2. Select 4 random opponents from the remaining leaders
    // (Since we only have 5 total, it's just the other 4)
    const opponents = LEADERS.filter(l => l.id !== selectedLeaderId);
    
    // 3. Create Player objects
    const humanPlayer: Player = {
      id: humanLeader.id,
      name: humanLeader.name,
      isHuman: true,
      population: INITIAL_POPULATION,
      avatar: humanLeader.avatar,
      stockpile: {
        missiles: { 'polaris': 2, 'atlas': 1, 'saturn': 0 },
        bombers: 1,
        warheads: { '10mt': 2, '20mt': 1, '50mt': 0, '100mt': 0 },
        defenses: 1,
      },
      isDead: false,
    };

    const aiPlayers: Player[] = opponents.map(leader => ({
      id: leader.id,
      name: leader.name,
      isHuman: false,
      population: INITIAL_POPULATION,
      avatar: leader.avatar,
      stockpile: {
        missiles: { 'polaris': 2, 'atlas': 1, 'saturn': 0 },
        bombers: 1,
        warheads: { '10mt': 2, '20mt': 1, '50mt': 0, '100mt': 0 },
        defenses: 1,
      },
      isDead: false,
    }));

    const players = [humanPlayer, ...aiPlayers];

    setGameState({
      turn: 1,
      players,
      currentPlayerId: humanPlayer.id,
      phase: 'planning',
      selectedAction: null,
      selectedWeapon: { carrier: null, payload: null },
      targetId: null,
      logs: [`Welcome, President ${humanPlayer.name}! The world is on the brink.`],
      winnerId: null,
      activeAttacks: [],
    });
  };

  const addLog = (message: string) => {
    setGameState(prev => ({
      ...prev,
      logs: [message, ...prev.logs].slice(0, 5)
    }));
  };

  const handlePropaganda = () => {
    // Steal population from random enemy
    const enemies = gameState.players.filter(p => !p.isHuman && !p.isDead);
    if (enemies.length === 0) return;
    
    const target = enemies[Math.floor(Math.random() * enemies.length)];
    const amount = Math.floor(Math.random() * 5) + 2; // 2-6 million

    setGameState(prev => {
      const newPlayers = prev.players.map(p => {
        if (p.id === target.id) return { ...p, population: Math.max(0, p.population - amount) };
        if (p.isHuman) return { ...p, population: p.population + amount };
        return p;
      });
      return {
        ...prev,
        players: newPlayers,
        phase: 'execution', // Move to execution (AI turns)
        logs: [`Propaganda successful! ${amount} million defected from ${target.name}.`, ...prev.logs].slice(0, 5)
      };
    });
    
    // Trigger AI turns after a delay
    setTimeout(processAiTurns, 1000);
  };

  const handleBuild = (itemType: string, itemId?: string) => {
    // Simple build logic: Add 1 to stockpile
    setGameState(prev => {
      const player = prev.players.find(p => p.isHuman)!;
      const newStockpile = { ...player.stockpile };

      if (itemType === 'missile' && itemId) {
        newStockpile.missiles[itemId] = (newStockpile.missiles[itemId] || 0) + 1;
      } else if (itemType === 'bomber') {
        newStockpile.bombers += 1;
      } else if (itemType === 'warhead' && itemId) {
        newStockpile.warheads[itemId] = (newStockpile.warheads[itemId] || 0) + 1;
      } else if (itemType === 'defense') {
        newStockpile.defenses += 1;
      }

      const newPlayers = prev.players.map(p => p.isHuman ? { ...p, stockpile: newStockpile } : p);
      
      return {
        ...prev,
        players: newPlayers,
        phase: 'execution',
        logs: [`Production complete.`, ...prev.logs].slice(0, 5)
      };
    });
    setTimeout(processAiTurns, 1000);
  };

  const handleAttack = (targetId: string, carrierId: string, payloadId: string) => {
    const attacker = gameState.players.find(p => p.isHuman)!;
    
    // 1. Start Animation Phase
    setGameState(prev => ({
      ...prev,
      phase: 'execution',
      activeAttacks: [{
        id: `attack-${Date.now()}`,
        attackerId: attacker.id,
        targetId: targetId,
        weaponId: carrierId === 'bomber' ? 'bomber' : 'missile'
      }]
    }));

    // 2. Resolve Impact after animation delay
    setTimeout(() => {
      setGameState(prev => {
        const attacker = prev.players.find(p => p.isHuman)!;
        const target = prev.players.find(p => p.id === targetId)!;
        
        // Consume weapons
        const newStockpile = { ...attacker.stockpile };
        if (carrierId === 'bomber') {
          newStockpile.bombers -= 1;
        } else {
          newStockpile.missiles[carrierId] -= 1;
        }
        newStockpile.warheads[payloadId] -= 1;

        // Calculate Damage
        let damage = 0;
        let intercepted = false;
        
        if (target.stockpile.defenses > 0 && Math.random() > 0.5) {
           intercepted = true;
        } else {
           const warhead = WEAPONS.warheads.find(w => w.id === payloadId);
           damage = warhead ? warhead.yield : 0;
           damage = Math.floor(damage * (0.8 + Math.random() * 0.4));
        }

        const newPlayers = prev.players.map(p => {
          if (p.id === attacker.id) return { ...p, stockpile: newStockpile };
          if (p.id === target.id && !intercepted) return { ...p, population: Math.max(0, p.population - damage) };
          if (p.id === target.id && intercepted) return { ...p, stockpile: { ...p.stockpile, defenses: p.stockpile.defenses - 1 } }; 
          return p;
        });

        const logMsg = intercepted 
          ? `Attack on ${target.name} INTERCEPTED!` 
          : `Attack on ${target.name} successful! ${damage} million casualties.`;

        return {
          ...prev,
          players: newPlayers,
          activeAttacks: [], // Clear animation
          logs: [logMsg, ...prev.logs].slice(0, 5)
        };
      });
      
      // 3. Trigger AI turns
      setTimeout(processAiTurns, 1000);
    }, 2000); // Animation duration
  };

  const processAiTurns = () => {
    setGameState(prev => {
      let currentLogs = [...prev.logs];
      
      // Create a deep copy of players to modify
      let newPlayers = prev.players.map(p => ({
        ...p,
        stockpile: {
          ...p.stockpile,
          missiles: { ...p.stockpile.missiles },
          warheads: { ...p.stockpile.warheads }
        }
      }));

      // Filter for living AI players
      const aiPlayers = newPlayers.filter(p => !p.isHuman && !p.isDead);

      aiPlayers.forEach(ai => {
        const actionRoll = Math.random();
        
        if (actionRoll < 0.3) {
           // Propaganda
           // Find a target (Human or other AI)
           const targets = newPlayers.filter(p => p.id !== ai.id && !p.isDead);
           if (targets.length > 0) {
             const target = targets[Math.floor(Math.random() * targets.length)];
             const stealAmount = Math.floor(Math.random() * 4) + 1;
             
             // Update target
             target.population = Math.max(0, target.population - stealAmount);
             // Update AI
             ai.population += stealAmount;
             
             currentLogs.unshift(`${ai.name} spreads propaganda against ${target.name}!`);
           }
        } else if (actionRoll < 0.6) {
           // Build
           // Simple build logic: Add a random missile and warhead
           const missiles = Object.keys(WEAPONS.missiles);
           const randomMissile = WEAPONS.missiles[Math.floor(Math.random() * WEAPONS.missiles.length)];
           ai.stockpile.missiles[randomMissile.id] = (ai.stockpile.missiles[randomMissile.id] || 0) + 1;
           
           const randomWarhead = WEAPONS.warheads[Math.floor(Math.random() * WEAPONS.warheads.length)];
           ai.stockpile.warheads[randomWarhead.id] = (ai.stockpile.warheads[randomWarhead.id] || 0) + 1;

           // currentLogs.unshift(`${ai.name} is building arms.`);
        } else {
           // Attack
           // Find a target
           const targets = newPlayers.filter(p => p.id !== ai.id && !p.isDead);
           if (targets.length > 0) {
             const target = targets[Math.floor(Math.random() * targets.length)];
             
             // Check if AI has weapons
             const availableMissiles = Object.entries(ai.stockpile.missiles).filter(([_, count]) => (count as number) > 0);
             const availableWarheads = Object.entries(ai.stockpile.warheads).filter(([_, count]) => (count as number) > 0);
             
             if (availableMissiles.length > 0 && availableWarheads.length > 0) {
               // Fire!
               const missileId = availableMissiles[0][0];
               const warheadId = availableWarheads[0][0];
               
               // Add to active attacks for animation (we can't easily do async delay inside this loop for each AI)
               // For MVP, we will just show the log. 
               // OR, we can queue the attacks?
               // Let's keep it simple: The AI logic runs instantly, but we can *fake* the animation by setting activeAttacks
               // and then clearing them. But since we are inside a loop, it's tricky.
               // Better approach: AI turns generate a "queue" of actions that are played out one by one.
               // But that requires a major refactor.
               // Alternative: Just show the log for AI.
               
               // Let's try to support AI animation by just setting the state, but since we return the *final* state
               // immediately, the animation won't play if we clear it immediately.
               
               // Refactor: AI logic should probably be:
               // 1. Determine action
               // 2. Set state to "AI Attacking" with activeAttack
               // 3. Wait
               // 4. Resolve damage
               
               // Since we are in a "processAiTurns" function that does all AI at once, let's just do the calculation
               // and skip animation for AI for now to avoid breaking the game loop, 
               // OR we can just add the attack to activeAttacks and NOT clear it here, 
               // but then who clears it?
               
               // Let's skip AI missile animation for this step to ensure stability, 
               // or if the user really wants it, we need a sequential AI turn processor.
               
               // User asked for "visual animations... showing the path".
               // Let's try to hack it: We can't easily animate 4 AI turns simultaneously without a queue.
               // I will stick to Human animation first as implemented above.
               
               // Consume
               ai.stockpile.missiles[missileId]--;
               ai.stockpile.warheads[warheadId]--;
               
               // Resolve
               let damage = 0;
               let intercepted = false;
               
               if (target.stockpile.defenses > 0 && Math.random() > 0.6) {
                 intercepted = true;
                 target.stockpile.defenses--;
               } else {
                 const warhead = WEAPONS.warheads.find(w => w.id === warheadId);
                 damage = warhead ? warhead.yield : 10;
                 damage = Math.floor(damage * (0.8 + Math.random() * 0.4));
                 target.population = Math.max(0, target.population - damage);
               }
               
               const logMsg = intercepted 
                ? `${ai.name}'s attack on ${target.name} INTERCEPTED!` 
                : `${ai.name} nukes ${target.name} for ${damage}M casualties!`;
               currentLogs.unshift(logMsg);
             } else {
               // Failed to attack, build instead
               ai.stockpile.defenses++;
             }
           }
        }
      });

      // Check for deaths
      newPlayers.forEach(p => {
        if (p.population <= 0 && !p.isDead) {
          p.isDead = true;
          currentLogs.unshift(`${p.name} has been WIPED OUT!`);
        }
      });

      // Check for winner
      const survivors = newPlayers.filter(p => !p.isDead);
      let winnerId = null;
      let phase = 'planning';
      
      if (survivors.length <= 1) {
        phase = 'gameover';
        winnerId = survivors.length === 1 ? survivors[0].id : 'nobody'; // Mutually Assured Destruction
        if (winnerId === 'nobody') {
          currentLogs.unshift("GAME OVER. Everyone is dead. There are no winners in Nuclear War.");
        } else {
          const winner = survivors[0];
          currentLogs.unshift(`GAME OVER. ${winner.name} is the supreme ruler of the radioactive wasteland!`);
        }
      }

      return {
        ...prev,
        players: newPlayers,
        turn: prev.turn + 1,
        phase: phase as any,
        winnerId,
        selectedAction: null,
        selectedWeapon: { carrier: null, payload: null },
        targetId: null,
        logs: currentLogs.slice(0, 5)
      };
    });
  };

  return {
    gameState,
    startGame,
    handlePropaganda,
    handleBuild,
    handleAttack,
    setGameState // Expose for finer control if needed
  };
};
