// Match and round manager: economy, buy phase, win conditions and team scoring.
import { ROUND_CONFIG, ECONOMY, TEAMS } from './config.js';
import { playRoundWon, playRoundLost } from './audio.js';

export function createRoundManager() {
  const state = {
    roundNumber: 1,
    ctScore: 0,
    tScore: 0,
    phase: 'BUY', // BUY, ACTION, ROUND_END, MATCH_OVER
    timer: ROUND_CONFIG.buySeconds,
    winner: null,
    reason: '',
    playerCash: ECONOMY.startCash,
    playerArmor: 0,
    playerHelmet: false,
    playerGrenades: 1,
    kills: 0,
    deaths: 0,
    matchWon: false,
  };

  function startRound(spawns, respawnCallback) {
    state.phase = 'BUY';
    state.timer = ROUND_CONFIG.buySeconds;
    state.winner = null;
    state.reason = '';

    if (respawnCallback) {
      respawnCallback(spawns);
    }
  }

  function buyItem(itemKey, cost) {
    if (state.phase !== 'BUY' || state.playerCash < cost) return false;
    state.playerCash -= cost;
    return true;
  }

  function endRound(winnerTeam, reasonText, nextRoundCallback) {
    if (state.phase === 'ROUND_END' || state.phase === 'MATCH_OVER') return;

    state.phase = 'ROUND_END';
    state.winner = winnerTeam;
    state.reason = reasonText;
    state.timer = 4.0; // 4s debrief delay

    if (winnerTeam === TEAMS.CT) {
      state.ctScore++;
      state.playerCash += ECONOMY.roundWinReward;
      playRoundWon();
    } else {
      state.tScore++;
      state.playerCash += ECONOMY.roundLossReward;
      playRoundLost();
    }

    // Check match victory
    if (state.ctScore >= ROUND_CONFIG.targetWins) {
      state.phase = 'MATCH_OVER';
      state.matchWon = true;
    } else if (state.tScore >= ROUND_CONFIG.targetWins) {
      state.phase = 'MATCH_OVER';
      state.matchWon = false;
    }
  }

  function step(dt, onPhaseChange, nextRoundCallback) {
    state.timer -= dt;

    if (state.phase === 'BUY' && state.timer <= 0) {
      state.phase = 'ACTION';
      state.timer = ROUND_CONFIG.roundSeconds;
      if (onPhaseChange) onPhaseChange('ACTION');
    } else if (state.phase === 'ACTION' && state.timer <= 0) {
      // Time expired: CTs defend successfully
      endRound(TEAMS.CT, 'TIME EXPIRED - DEFENSE SUCCESS');
    } else if (state.phase === 'ROUND_END' && state.timer <= 0) {
      state.roundNumber++;
      if (nextRoundCallback) nextRoundCallback();
    }
  }

  function addKillReward() {
    state.kills++;
    state.playerCash += ECONOMY.killReward;
  }

  return {
    state,
    startRound,
    endRound,
    step,
    buyItem,
    addKillReward,
  };
}
