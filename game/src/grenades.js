// Throwable HE Grenade physics, bounce collisions and explosion splash damage.
import * as THREE from 'three';
import { PALETTE } from './palette.js';
import { GRENADE_CONFIG } from './config.js';
import { playExplosion } from './audio.js';

export function createGrenadeSystem(scene, colliders) {
  const activeGrenades = [];
  const particles = [];

  const grenadeGeom = new THREE.CylinderGeometry(0.045, 0.045, 0.12, 8);
  const grenadeMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(PALETTE.hairline),
    roughness: 0.6,
    metalness: 0.5,
  });

  const particleGeom = new THREE.BufferGeometry();
  const particleMat = new THREE.PointsMaterial({
    color: new THREE.Color(PALETTE.accent),
    size: 0.25,
    transparent: true,
    opacity: 0.9,
  });

  function throwGrenade(origin, direction, countDamageCallback) {
    const mesh = new THREE.Mesh(grenadeGeom, grenadeMat);
    mesh.position.copy(origin);
    mesh.castShadow = true;
    scene.add(mesh);

    const velocity = direction.clone().normalize().multiplyScalar(GRENADE_CONFIG.throwSpeed);
    velocity.y += 3.5; // slight upward pitch

    activeGrenades.push({
      mesh,
      velocity,
      timeLeft: GRENADE_CONFIG.fuseSeconds,
      countDamageCallback,
    });
  }

  function triggerExplosion(pos, countDamageCallback) {
    playExplosion();

    // Shockwave light
    const blastLight = new THREE.PointLight(new THREE.Color(PALETTE.accent), 25, 12);
    blastLight.position.copy(pos);
    scene.add(blastLight);

    // Particle flash debris
    const count = 30;
    const positions = new Float32Array(count * 3);
    const vels = [];
    for (let i = 0; i < count; i++) {
      positions[i * 3] = pos.x;
      positions[i * 3 + 1] = pos.y + 0.2;
      positions[i * 3 + 2] = pos.z;
      vels.push(new THREE.Vector3(
        (Math.random() - 0.5) * 12,
        Math.random() * 8 + 2,
        (Math.random() - 0.5) * 12
      ));
    }

    const pGeom = new THREE.BufferGeometry();
    pGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const pSystem = new THREE.Points(pGeom, particleMat);
    scene.add(pSystem);

    particles.push({
      light: blastLight,
      system: pSystem,
      vels,
      life: 0.6,
      maxLife: 0.6,
    });

    if (countDamageCallback) {
      countDamageCallback(pos, GRENADE_CONFIG.damageRadius, GRENADE_CONFIG.maxDamage);
    }
  }

  function step(dt) {
    // Step grenades
    for (let i = activeGrenades.length - 1; i >= 0; i--) {
      const g = activeGrenades[i];
      g.timeLeft -= dt;

      // Gravity
      g.velocity.y -= 22 * dt;

      // Position update
      const nextPos = g.mesh.position.clone().addScaledVector(g.velocity, dt);

      // Simple collision against world boxes
      const probe = new THREE.Box3();
      probe.min.set(nextPos.x - 0.1, nextPos.y - 0.1, nextPos.z - 0.1);
      probe.max.set(nextPos.x + 0.1, nextPos.y + 0.1, nextPos.z + 0.1);

      let collided = false;
      for (const col of colliders) {
        if (probe.intersectsBox(col)) {
          collided = true;
          // Rebound
          g.velocity.multiplyScalar(0.55);
          g.velocity.y = -g.velocity.y * 0.5;
          break;
        }
      }

      if (!collided) {
        g.mesh.position.copy(nextPos);
      }
      g.mesh.rotation.x += dt * 8;
      g.mesh.rotation.z += dt * 6;

      if (g.timeLeft <= 0) {
        triggerExplosion(g.mesh.position, g.countDamageCallback);
        scene.remove(g.mesh);
        activeGrenades.splice(i, 1);
      }
    }

    // Step explosion particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      p.light.intensity = (p.life / p.maxLife) * 25;

      const posAttr = p.system.geometry.attributes.position;
      const arr = posAttr.array;
      for (let j = 0; j < p.vels.length; j++) {
        p.vels[j].y -= 18 * dt;
        arr[j * 3] += p.vels[j].x * dt;
        arr[j * 3 + 1] += p.vels[j].y * dt;
        arr[j * 3 + 2] += p.vels[j].z * dt;
      }
      posAttr.needsUpdate = true;

      if (p.life <= 0) {
        scene.remove(p.light);
        scene.remove(p.system);
        particles.splice(i, 1);
      }
    }
  }

  function reset() {
    for (const g of activeGrenades) scene.remove(g.mesh);
    activeGrenades.length = 0;
    for (const p of particles) {
      scene.remove(p.light);
      scene.remove(p.system);
    }
    particles.length = 0;
  }

  return {
    throwGrenade,
    step,
    reset,
  };
}
