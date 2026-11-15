// Multi-weapon arsenal with viewmodels, recoil, spread bloom and reload mechanics.
import * as THREE from 'three';
import { PALETTE } from './palette.js';
import { WEAPONS } from './config.js';
import { playShoot, playReload } from './audio.js';

export function createWeapons(camera) {
  const grip = new THREE.MeshStandardMaterial({ color: new THREE.Color(PALETTE.hairline), roughness: 0.65, metalness: 0.3 });
  const body = new THREE.MeshStandardMaterial({ color: new THREE.Color(PALETTE.ink), roughness: 0.45, metalness: 0.4 });
  const scopeMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(PALETTE.canvas), roughness: 0.2, metalness: 0.8 });

  const rootGroup = new THREE.Group();
  camera.add(rootGroup);

  // M4A1 Model
  const m4Group = new THREE.Group();
  const m4Receiver = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.11, 0.42), body);
  const m4Barrel = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.38), grip);
  m4Barrel.position.set(0, 0.02, -0.38);
  const m4Stock = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.08, 0.22), grip);
  m4Stock.position.set(0, -0.02, 0.28);
  const m4Mag = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 0.09), grip);
  m4Mag.position.set(0, -0.1, -0.05);
  m4Group.add(m4Receiver, m4Barrel, m4Stock, m4Mag);
  m4Group.position.set(0.22, -0.2, -0.42);

  // AWP Model
  const awpGroup = new THREE.Group();
  const awpBody = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.12, 0.65), body);
  const awpBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.55, 8), grip);
  awpBarrel.rotation.x = Math.PI / 2;
  awpBarrel.position.set(0, 0.03, -0.55);
  const awpScope = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.28, 8), scopeMat);
  awpScope.rotation.x = Math.PI / 2;
  awpScope.position.set(0, 0.11, -0.05);
  awpGroup.add(awpBody, awpBarrel, awpScope);
  awpGroup.position.set(0.24, -0.22, -0.5);
  awpGroup.visible = false;

  // USP Model
  const uspGroup = new THREE.Group();
  const uspSlide = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.07, 0.22), body);
  const uspGrip = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.14, 0.08), grip);
  uspGrip.position.set(0, -0.09, 0.05);
  uspGroup.add(uspSlide, uspGrip);
  uspGroup.position.set(0.18, -0.18, -0.35);
  uspGroup.visible = false;

  rootGroup.add(m4Group, awpGroup, uspGroup);

  // Muzzle flash billboard
  const flash = new THREE.Mesh(
    new THREE.PlaneGeometry(0.26, 0.26),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(PALETTE.accent),
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );
  flash.position.set(0.22, -0.18, -0.92);
  flash.visible = false;
  camera.add(flash);

  const flashLight = new THREE.PointLight(new THREE.Color(PALETTE.accent), 0, 6);
  flashLight.position.set(0.22, -0.18, -0.7);
  camera.add(flashLight);

  // Weapon Inventory
  const inventory = {
    primary: { ...WEAPONS.M4A1, mag: WEAPONS.M4A1.magSize, reserve: WEAPONS.M4A1.reserve },
    secondary: { ...WEAPONS.USP, mag: WEAPONS.USP.magSize, reserve: WEAPONS.USP.reserve },
  };

  let currentSlot = 1; // 1 = primary, 2 = secondary
  let currentWeapon = inventory.primary;

  const state = {
    cooldown: 0,
    reloadLeft: 0,
    flash: 0,
    kick: 0,
    scoped: false,
  };

  function updateActiveModel() {
    m4Group.visible = currentSlot === 1 && currentWeapon.id === 'm4a1';
    awpGroup.visible = currentSlot === 1 && currentWeapon.id === 'awp';
    uspGroup.visible = currentSlot === 2;
  }

  function getActiveGroup() {
    if (currentSlot === 1) return currentWeapon.id === 'awp' ? awpGroup : m4Group;
    return uspGroup;
  }

  function step(dt) {
    state.cooldown = Math.max(0, state.cooldown - dt);
    state.flash = Math.max(0, state.flash - dt);
    state.kick += (0 - state.kick) * Math.min(1, dt * 14);

    const activeModel = getActiveGroup();
    activeModel.position.z = (currentWeapon.id === 'awp' ? -0.5 : (currentWeapon.id === 'usp' ? -0.35 : -0.42)) + state.kick;
    activeModel.rotation.x = state.kick * 2.2;

    flash.visible = state.flash > 0;
    flash.rotation.z = state.flash * 35;
    flashLight.intensity = state.flash > 0 ? 16 : 0;

    if (state.reloadLeft > 0) {
      state.reloadLeft = Math.max(0, state.reloadLeft - dt);
      activeModel.rotation.x = -0.5 * Math.min(1, (currentWeapon.reloadTime - state.reloadLeft) * 2);
      if (state.reloadLeft === 0) {
        const need = currentWeapon.magSize - currentWeapon.mag;
        const take = Math.min(need, currentWeapon.reserve);
        currentWeapon.mag += take;
        currentWeapon.reserve -= take;
      }
    }
  }

  return {
    state,
    get current() {
      return currentWeapon;
    },
    get slot() {
      return currentSlot;
    },
    step,
    ready() {
      return currentWeapon.mag > 0 && state.cooldown === 0 && state.reloadLeft === 0;
    },
    pullTrigger() {
      state.cooldown = currentWeapon.fireGap;
      state.flash = 0.055;
      state.kick = currentWeapon.id === 'awp' ? 0.09 : 0.045;
      playShoot(currentWeapon.id);
    },
    takeRound() {
      if (currentWeapon.mag <= 0) return false;
      currentWeapon.mag -= 1;
      return true;
    },
    reload() {
      if (state.reloadLeft > 0 || currentWeapon.mag === currentWeapon.magSize || currentWeapon.reserve === 0) return;
      state.reloadLeft = currentWeapon.reloadTime;
      playReload();
    },
    spread(speed) {
      const isMoving = speed > 0.5;
      return isMoving ? currentWeapon.spreadMoving : currentWeapon.spreadStill;
    },
    switchSlot(slot) {
      if (slot === currentSlot || state.reloadLeft > 0) return;
      if (slot === 1 && inventory.primary) {
        currentSlot = 1;
        currentWeapon = inventory.primary;
      } else if (slot === 2 && inventory.secondary) {
        currentSlot = 2;
        currentWeapon = inventory.secondary;
      }
      updateActiveModel();
    },
    equip(weaponKey) {
      const config = WEAPONS[weaponKey];
      if (!config) return;
      if (config.slot === 1) {
        inventory.primary = { ...config, mag: config.magSize, reserve: config.reserve };
        if (currentSlot === 1) currentWeapon = inventory.primary;
      } else {
        inventory.secondary = { ...config, mag: config.magSize, reserve: config.reserve };
        if (currentSlot === 2) currentWeapon = inventory.secondary;
      }
      state.reloadLeft = 0;
      updateActiveModel();
    },
    refillAll() {
      if (inventory.primary) {
        inventory.primary.mag = inventory.primary.magSize;
        inventory.primary.reserve = inventory.primary.reserve;
      }
      if (inventory.secondary) {
        inventory.secondary.mag = inventory.secondary.magSize;
        inventory.secondary.reserve = inventory.secondary.reserve;
      }
      state.cooldown = 0;
      state.reloadLeft = 0;
      state.flash = 0;
      state.kick = 0;
    },
  };
}
