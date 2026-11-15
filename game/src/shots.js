// Deterministic scenario builder for the 3 required game screenshots.
import * as THREE from 'three';
import { TEAMS } from './config.js';

export function setupShotScenario(name, game) {
  const { player, bots, weapons, round, hud, bomb, camera } = game;

  if (name === 'start') {
    // 1-start.jpg: Spawn buy phase with team, ready to deploy
    round.state.phase = 'BUY';
    round.state.timer = 12;
    round.state.ctScore = 0;
    round.state.tScore = 0;
    round.state.playerCash = 800;

    player.state.position.set(0, 0, 14.5);
    player.state.yaw = Math.PI; // Face north toward Depot
    player.state.pitch = -0.05;

    // Position teammates beside player
    if (bots.bots[0]) {
      bots.bots[0].group.position.set(-2.5, 0, 13.5);
      bots.bots[0].group.rotation.y = Math.PI;
    }
    if (bots.bots[1]) {
      bots.bots[1].group.position.set(2.5, 0, 13.5);
      bots.bots[1].group.rotation.y = Math.PI;
    }

    hud.setVitals(100, 100, 800);
    hud.setMatchState(0, 0, 12, 'BUY', 3, 3);
    hud.setWeaponName(weapons.current.name, 1);
    hud.setAmmo(weapons.current.mag, weapons.current.reserve);
    hud.hideRoundBanner();
    hud.showOverlay('start', 0);
  } else if (name === 'play') {
    // 2-play.jpg: Combat action in Long A corridor with muzzle flash, hitmarker and enemy engagement
    round.state.phase = 'ACTION';
    round.state.timer = 84;
    round.state.ctScore = 2;
    round.state.tScore = 1;
    round.state.playerCash = 2400;

    player.state.position.set(-10.2, 0, 4.2);
    player.state.yaw = Math.PI; // Aim down Long A lane
    player.state.pitch = 0.02;

    // Position enemy bot in crosshair down the lane taking fire
    if (bots.bots[2]) {
      bots.bots[2].group.position.set(-10.2, 0, -3.8);
      bots.bots[2].group.rotation.y = 0; // Facing player
      bots.bots[2].health = 66;
    }
    // Ally providing crossfire from cover
    if (bots.bots[0]) {
      bots.bots[0].group.position.set(-8.5, 0, 2.0);
      bots.bots[0].group.rotation.y = Math.PI * 0.9;
    }

    // Trigger active weapon muzzle flash & hitmarker
    weapons.state.flash = 0.06;
    weapons.state.kick = 0.05;
    hud.hitMarker(true, 10000); // persistent hitmarker for shot

    hud.setVitals(82, 64, 2400);
    hud.setMatchState(2, 1, 84, 'ACTION', 3, 2);
    hud.setWeaponName(weapons.current.name, 1);
    hud.setAmmo(weapons.current.mag - 4, weapons.current.reserve);
    hud.addKillFeed('Player', 'M4A1', 'Cobra', true);
    hud.hideOverlay();
    hud.hideRoundBanner();
  } else if (name === 'end') {
    // 3-end.jpg: Round victory celebration screen with bomb secured, team scores and cash reward
    round.state.phase = 'ROUND_END';
    round.state.timer = 3.5;
    round.state.ctScore = 4;
    round.state.tScore = 2;
    round.state.playerCash = 5650;

    player.state.position.set(8.5, 0, -3.5);
    player.state.yaw = Math.PI * 0.6; // View overlooking Bomb Site Alpha
    player.state.pitch = -0.12;

    // Planted & defused bomb model at site
    bomb.plant(new THREE.Vector3(9.5, 0, -5.0));
    bomb.defuse();

    // Allies celebrating nearby
    if (bots.bots[0]) bots.bots[0].group.position.set(7.2, 0, -5.5);
    if (bots.bots[1]) bots.bots[1].group.position.set(11.2, 0, -4.5);

    hud.setVitals(100, 85, 5650);
    hud.setMatchState(4, 2, 0, 'VICTORY', 3, 0);
    hud.setWeaponName(weapons.current.name, 0);
    hud.setAmmo(weapons.current.mag, weapons.current.reserve);
    hud.addKillFeed('Ghost', 'M4A1', 'Wolf', false);
    hud.addKillFeed('Player', 'M4A1', 'Viper', true);
    hud.showRoundBanner('ROUND WON', 'COUNTER-TERRORISTS WIN (+$3,250)', true);
    hud.hideOverlay();
  }
}
