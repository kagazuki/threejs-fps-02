// Master tactical shooter engine: fixed 60Hz loop, combat raycasts, objective loop and deterministic capture.
import * as THREE from 'three';
import { PALETTE } from './palette.js';
import { TEAMS, ECONOMY } from './config.js';
import { createWorld } from './world.js';
import { createInput } from './input.js';
import { createPlayer } from './player.js';
import { createWeapons } from './weapons.js';
import { createBotSquad } from './bots.js';
import { createGrenadeSystem } from './grenades.js';
import { createBombSystem } from './bomb.js';
import { createRoundManager } from './round.js';
import { createHud } from './hud.js';
import { setupShotScenario } from './shots.js';

const FIXED_STEP = 1 / 60;
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('game').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(PALETTE.canvas);
scene.fog = new THREE.Fog(new THREE.Color(PALETTE.canvas), 20, 60);

const camera = new THREE.PerspectiveCamera(74, window.innerWidth / window.innerHeight, 0.05, 150);
scene.add(camera);

// Core Modules
const world = createWorld(scene);
const weapons = createWeapons(camera);
const player = createPlayer(world.colliders);
const bots = createBotSquad(scene, world.colliders, world.waypoints);
const grenades = createGrenadeSystem(scene, world.colliders);
const bomb = createBombSystem(scene, world.bombSite);
const round = createRoundManager();
const hud = createHud();
const input = createInput(renderer.domElement, onLockChange);

const raycaster = new THREE.Raycaster();
raycaster.far = 120;
const direction = new THREE.Vector3();

let started = false;
let frozen = false;
let buyMenuOpen = false;
let accumulator = 0;
let lastTime = performance.now();

// Initial HUD & Round Setup
hud.setAmmo(weapons.current.mag, weapons.current.reserve);
hud.setVitals(player.state.health, player.state.armor, round.state.playerCash);
hud.setWeaponName(weapons.current.name, round.state.playerGrenades);

round.startRound(world.spawns, (spawns) => {
  player.respawn(spawns.CT[0]);
  bots.respawnAll(spawns);
  weapons.refillAll();
  bomb.reset();
  grenades.reset();
});

hud.onPlay(() => {
  if (shot) return;
  input.requestLock();
});

function onLockChange(locked) {
  if (shot) return;
  if (locked) {
    started = true;
    hud.hideOverlay();
  } else {
    hud.showOverlay(started ? 'paused' : 'start', round.state.kills * 100);
  }
}

function syncCamera() {
  const p = player.state;
  camera.position.set(p.position.x, p.position.y + p.eye, p.position.z);
  camera.rotation.set(p.pitch, p.yaw, 0, 'YXZ');
}

function shoot(spread) {
  if (!weapons.takeRound()) return false;

  camera.getWorldDirection(direction);
  direction.x += (Math.random() * 2 - 1) * spread;
  direction.y += (Math.random() * 2 - 1) * spread;
  direction.z += (Math.random() * 2 - 1) * spread;
  direction.normalize();

  scene.updateMatrixWorld(true);
  raycaster.set(camera.position, direction);

  const shootables = world.shootables.concat(bots.hitMeshes);
  const hits = raycaster.intersectObjects(shootables, false);

  if (hits.length > 0) {
    const hit = hits[0];
    if (hit.object.userData.bot) {
      const res = bots.damage(hit.object, weapons.current.damageBody, 'Player');
      if (res.hit) {
        hud.hitMarker(res.isHead, shot ? 5000 : 120);
        if (res.killed) {
          round.addKillReward();
          hud.addKillFeed('Player', weapons.current.name.split(' ')[0], res.bot.name, res.isHead);
        }
      }
    }
  }

  weapons.pullTrigger();
  player.recoil(weapons.current.recoilPitch, (Math.random() * 2 - 1) * weapons.current.recoilYaw);
  hud.setAmmo(weapons.current.mag, weapons.current.reserve);
  return true;
}

function handleInputEvents() {
  const keys = input.state.keys;

  // Weapon slot switching (1: Primary, 2: Secondary)
  if (keys.has('Digit1')) {
    weapons.switchSlot(1);
    hud.setWeaponName(weapons.current.name, round.state.playerGrenades);
    hud.setAmmo(weapons.current.mag, weapons.current.reserve);
  } else if (keys.has('Digit2')) {
    weapons.switchSlot(2);
    hud.setWeaponName(weapons.current.name, round.state.playerGrenades);
    hud.setAmmo(weapons.current.mag, weapons.current.reserve);
  }

  // Reload
  if (keys.has('KeyR')) {
    weapons.reload();
  }

  // Throw Grenade
  if (keys.has('KeyG') && round.state.playerGrenades > 0) {
    keys.delete('KeyG'); // single fire
    round.state.playerGrenades--;
    camera.getWorldDirection(direction);
    grenades.throwGrenade(camera.position, direction, (pos, radius, maxDamage) => {
      // Grenade radial damage
      for (const b of bots.bots) {
        if (!b.alive) continue;
        const d = b.group.position.distanceTo(pos);
        if (d < radius) {
          const dmg = maxDamage * (1 - d / radius);
          const res = bots.damage(b.torso, dmg, 'Grenade');
          if (res.killed) {
            round.addKillReward();
            hud.addKillFeed('Player', 'HE', b.name, false);
          }
        }
      }
    });
    hud.setWeaponName(weapons.current.name, round.state.playerGrenades);
  }

  // Plant or Defuse bomb (E)
  if (keys.has('KeyE')) {
    if (bomb.isAtSite(player.state.position)) {
      if (bomb.state.isPlanted && !bomb.state.defused) {
        bomb.defuse();
        round.endRound(TEAMS.CT, 'BOMB HAS BEEN DEFUSED');
        hud.showRoundBanner('ROUND WON', 'BOMB DEFUSED (+$3,250)', true);
      }
    }
  }

  // Buy Menu (B)
  if (keys.has('KeyB')) {
    keys.delete('KeyB');
    if (round.state.phase === 'BUY') {
      buyMenuOpen = !buyMenuOpen;
      hud.toggleBuyMenu(buyMenuOpen);
    }
  }

  // Buy Hotkeys (1-5 while in buy menu)
  if (buyMenuOpen) {
    if (keys.has('Digit1') && round.buyItem('M4A1', 3100)) weapons.equip('M4A1');
    if (keys.has('Digit2') && round.buyItem('AWP', 4750)) weapons.equip('AWP');
    if (keys.has('Digit3') && round.buyItem('USP', 500)) weapons.equip('USP');
    if (keys.has('Digit4') && round.buyItem('HE', 300)) round.state.playerGrenades = Math.min(2, round.state.playerGrenades + 1);
    if (keys.has('Digit5') && round.buyItem('KEVLAR', 1000)) player.state.armor = 100;
    hud.setVitals(player.state.health, player.state.armor, round.state.playerCash);
    hud.setWeaponName(weapons.current.name, round.state.playerGrenades);
  }
}

function step(dt) {
  round.step(
    dt,
    (phase) => {
      if (phase === 'ACTION') {
        buyMenuOpen = false;
        hud.toggleBuyMenu(false);
      }
    },
    () => {
      // Start Next Round
      round.startRound(world.spawns, (spawns) => {
        player.respawn(spawns.CT[0]);
        bots.respawnAll(spawns);
        weapons.refillAll();
        bomb.reset();
        grenades.reset();
        hud.hideRoundBanner();
      });
    }
  );

  player.step(dt, input.state.keys);
  weapons.step(dt);
  grenades.step(dt);
  bomb.step(dt, (blastPos) => {
    // Bomb detonation: Terrorists win
    round.endRound(TEAMS.T, 'BOMB DETONATED');
    hud.showRoundBanner('ROUND LOST', 'BOMB DETONATED (+$1,400)', false);
  });

  bots.step(
    dt,
    player.state.position,
    player.state.alive,
    (dmg, botName) => {
      // Player takes damage
      const killed = player.takeDamage(dmg);
      hud.setVitals(player.state.health, player.state.armor, round.state.playerCash);
      if (killed) {
        hud.addKillFeed(botName, 'AK-47', 'Player', true);
      }
    },
    (killer, wep, victim, isHead) => {
      hud.addKillFeed(killer, wep, victim, isHead);
    }
  );

  // Tactical Win/Loss Evaluation
  if (round.state.phase === 'ACTION') {
    const tAlive = bots.aliveCount(TEAMS.T);
    const ctAlive = bots.aliveCount(TEAMS.CT) + (player.state.alive ? 1 : 0);

    if (tAlive === 0) {
      round.endRound(TEAMS.CT, 'ENEMY SQUAD ELIMINATED');
      hud.showRoundBanner('ROUND WON', 'TERRORISTS ELIMINATED (+$3,250)', true);
    } else if (ctAlive === 0) {
      round.endRound(TEAMS.T, 'DEFENSE FORCES ELIMINATED');
      hud.showRoundBanner('ROUND LOST', 'ALL ALLIES ELIMINATED (+$1,400)', false);
    }
  }

  // Update HUD readouts
  const tAliveCount = bots.aliveCount(TEAMS.T);
  const ctAliveCount = bots.aliveCount(TEAMS.CT) + (player.state.alive ? 1 : 0);
  hud.setMatchState(round.state.ctScore, round.state.tScore, round.state.timer, round.state.phase, ctAliveCount, tAliveCount);
  hud.setVitals(player.state.health, player.state.armor, round.state.playerCash);
}

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;

  if (!frozen) {
    const look = input.takeLook();
    player.look(look.x, look.y);

    handleInputEvents();

    if (input.state.firing && weapons.ready()) {
      shoot(weapons.spread(player.groundSpeed()));
    }

    accumulator += dt;
    let steps = 0;
    while (accumulator >= FIXED_STEP && steps < 5) {
      step(FIXED_STEP);
      accumulator -= FIXED_STEP;
      steps += 1;
    }
    if (accumulator > FIXED_STEP * 5) accumulator = 0;
    syncCamera();
  }

  renderer.render(scene, camera);
}

function runDeterministicShot(shotName) {
  setupShotScenario(shotName, {
    player,
    bots,
    weapons,
    round,
    hud,
    bomb,
    camera,
  });

  syncCamera();
  scene.updateMatrixWorld(true);

  let renders = 0;
  function capturePaint() {
    requestAnimationFrame(capturePaint);
    syncCamera();
    renderer.render(scene, camera);
    renders++;
    if (renders >= 2) {
      window.__shotReady = true;
      frozen = true;
    }
  }
  requestAnimationFrame(capturePaint);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

syncCamera();

if (shot) {
  runDeterministicShot(shot);
} else {
  requestAnimationFrame(frame);
}
