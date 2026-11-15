// Bomb plant, countdown beeps, defusal mechanics and site explosion.
import * as THREE from 'three';
import { PALETTE } from './palette.js';
import { ROUND_CONFIG } from './config.js';
import { playBombBeep, playExplosion } from './audio.js';

export function createBombSystem(scene, bombSite) {
  const bombGroup = new THREE.Group();
  bombGroup.visible = false;
  scene.add(bombGroup);

  // C4 Block
  const c4Mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(PALETTE.hairline),
    roughness: 0.8,
    metalness: 0.2,
  });
  const c4Mesh = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.15, 0.25), c4Mat);
  c4Mesh.position.y = 0.075;
  c4Mesh.castShadow = true;

  // Keypad & LED
  const ledMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(PALETTE.accent) });
  const led = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.04), ledMat);
  led.position.set(0.1, 0.16, 0.08);

  const ledLight = new THREE.PointLight(new THREE.Color(PALETTE.accent), 0, 4);
  ledLight.position.set(0.1, 0.2, 0.08);

  bombGroup.add(c4Mesh, led, ledLight);

  const state = {
    isPlanted: false,
    timer: ROUND_CONFIG.bombTimer,
    planterProgress: 0,
    defuseProgress: 0,
    lastBeep: 0,
    detonated: false,
    defused: false,
    position: new THREE.Vector3(),
  };

  function plant(atPosition) {
    state.isPlanted = true;
    state.timer = ROUND_CONFIG.bombTimer;
    state.detonated = false;
    state.defused = false;
    state.position.copy(atPosition);
    bombGroup.position.copy(atPosition);
    bombGroup.visible = true;
    playBombBeep(1200);
  }

  function defuse() {
    state.isPlanted = false;
    state.defused = true;
    bombGroup.visible = false;
  }

  function step(dt, onDetonate) {
    if (!state.isPlanted || state.defused || state.detonated) return;

    state.timer -= dt;

    // Accelerating beep rate as timer decreases
    const beepInterval = Math.max(0.15, state.timer / ROUND_CONFIG.bombTimer * 1.0);
    state.lastBeep += dt;

    if (state.lastBeep >= beepInterval) {
      state.lastBeep = 0;
      const pitch = 800 + (1 - state.timer / ROUND_CONFIG.bombTimer) * 600;
      playBombBeep(pitch);
      ledLight.intensity = 8;
    } else {
      ledLight.intensity = Math.max(0, ledLight.intensity - dt * 25);
    }

    if (state.timer <= 0) {
      state.detonated = true;
      state.isPlanted = false;
      bombGroup.visible = false;
      playExplosion();
      if (onDetonate) onDetonate(state.position);
    }
  }

  function reset() {
    state.isPlanted = false;
    state.timer = ROUND_CONFIG.bombTimer;
    state.planterProgress = 0;
    state.defuseProgress = 0;
    state.lastBeep = 0;
    state.detonated = false;
    state.defused = false;
    bombGroup.visible = false;
  }

  return {
    state,
    plant,
    defuse,
    step,
    reset,
    isAtSite(pos) {
      return pos.distanceTo(bombSite.position) <= bombSite.radius;
    },
  };
}
