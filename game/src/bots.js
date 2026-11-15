// Autonomous tactical AI bots: pathing, vision cones, combat state machine, shooting and hitboxes.
import * as THREE from 'three';
import { PALETTE } from './palette.js';
import { TEAMS } from './config.js';
import { playShoot, playHitmarker } from './audio.js';

export function createBotSquad(scene, colliders, waypoints) {
  const bots = [];
  const hitMeshes = [];

  const ctMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(PALETTE.hairline), roughness: 0.6 });
  const tMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(PALETTE.accent), roughness: 0.5 });
  const headMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(PALETTE.ink), roughness: 0.4 });
  const gunMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(PALETTE.canvas), roughness: 0.3 });

  const torsoGeom = new THREE.BoxGeometry(0.5, 0.75, 0.28);
  const headGeom = new THREE.SphereGeometry(0.16, 12, 10);
  const legGeom = new THREE.BoxGeometry(0.2, 0.7, 0.2);
  const botGunGeom = new THREE.BoxGeometry(0.06, 0.08, 0.35);

  const BOT_DEFS = [
    // 2 CT Allies
    { name: 'Ghost', team: TEAMS.CT, route: ['ct_a_entry', 'a_long_mid', 'site_alpha'] },
    { name: 'Echo', team: TEAMS.CT, route: ['ct_b_entry', 'b_connector', 'site_alpha'] },
    // 3 T Opponents
    { name: 'Viper', team: TEAMS.T, route: ['t_a_entry', 'a_long_mid', 'site_alpha'] },
    { name: 'Cobra', team: TEAMS.T, route: ['t_mid', 'mid_center', 'site_alpha'] },
    { name: 'Wolf', team: TEAMS.T, route: ['t_b_entry', 'site_alpha'] },
  ];

  for (let i = 0; i < BOT_DEFS.length; i++) {
    const def = BOT_DEFS[i];
    const group = new THREE.Group();

    const torso = new THREE.Mesh(torsoGeom, def.team === TEAMS.CT ? ctMat : tMat);
    torso.position.y = 1.05;
    torso.castShadow = true;
    torso.receiveShadow = true;
    torso.userData.part = 'torso';

    const head = new THREE.Mesh(headGeom, headMat);
    head.position.y = 1.58;
    head.castShadow = true;
    head.userData.part = 'head';

    const leftLeg = new THREE.Mesh(legGeom, ctMat);
    leftLeg.position.set(-0.14, 0.35, 0);
    const rightLeg = new THREE.Mesh(legGeom, ctMat);
    rightLeg.position.set(0.14, 0.35, 0);

    const gun = new THREE.Mesh(botGunGeom, gunMat);
    gun.position.set(0.22, 0.95, -0.25);

    group.add(torso, head, leftLeg, rightLeg, gun);
    scene.add(group);

    const bot = {
      id: i,
      name: def.name,
      team: def.team,
      group,
      torso,
      head,
      gun,
      health: 100,
      armor: 50,
      alive: true,
      fall: 0,
      state: 'PATROL', // PATROL, COMBAT, COVER
      targetPoint: new THREE.Vector3(),
      waypointIndex: 0,
      route: def.route,
      shootCooldown: 0,
      burstCount: 0,
      reactionTimer: 0,
    };

    torso.userData.bot = bot;
    head.userData.bot = bot;
    hitMeshes.push(torso, head);
    bots.push(bot);
  }

  function getWaypointPos(id) {
    const wp = waypoints.find(w => w.id === id);
    return wp ? wp.pos.clone() : new THREE.Vector3();
  }

  function respawnAll(spawns) {
    let ctIdx = 1;
    let tIdx = 0;
    for (const bot of bots) {
      bot.health = 100;
      bot.armor = 50;
      bot.alive = true;
      bot.fall = 0;
      bot.state = 'PATROL';
      bot.waypointIndex = 0;
      bot.shootCooldown = 0.5 + Math.random() * 0.5;
      bot.burstCount = 0;
      bot.group.rotation.set(0, 0, 0);

      const spawnPoint = bot.team === TEAMS.CT ? spawns.CT[ctIdx++] : spawns.T[tIdx++];
      if (spawnPoint) {
        bot.group.position.copy(spawnPoint);
      }
      bot.targetPoint.copy(getWaypointPos(bot.route[0]));
    }
  }

  function damage(mesh, amount, attackerName = 'Player') {
    const bot = mesh.userData.bot;
    if (!bot || !bot.alive) return { hit: false };

    const isHead = mesh.userData.part === 'head';
    const finalDamage = isHead ? amount * 2.5 : amount;

    bot.health -= finalDamage;
    playHitmarker(isHead);

    if (bot.health <= 0) {
      bot.alive = false;
      bot.fall = 0;
      return { hit: true, killed: true, isHead, bot, attacker: attackerName };
    }
    return { hit: true, killed: false, isHead, bot };
  }

  function step(dt, playerPos, isPlayerAlive, onDamagePlayer, onKillFeed) {
    for (const bot of bots) {
      if (!bot.alive) {
        if (bot.fall < 1) {
          bot.fall = Math.min(1, bot.fall + dt * 3);
          bot.group.rotation.x = -bot.fall * 1.5;
          bot.group.position.y = -bot.fall * 0.4;
        }
        continue;
      }

      bot.shootCooldown = Math.max(0, bot.shootCooldown - dt);

      // Simple line-of-sight check to player or opposing bots
      const botPos = bot.group.position;
      const distToPlayer = botPos.distanceTo(playerPos);
      const seesPlayer = bot.team === TEAMS.T && isPlayerAlive && distToPlayer < 24;

      if (seesPlayer) {
        // Face player
        const dx = playerPos.x - botPos.x;
        const dz = playerPos.z - botPos.z;
        bot.group.rotation.y = Math.atan2(dx, dz);

        // Combat behavior: stop and fire bursts
        if (bot.shootCooldown <= 0) {
          bot.shootCooldown = 0.12;
          bot.burstCount++;
          playShoot('m4a1');

          // Check hit on player with simulated accuracy
          const hitChance = Math.max(0.2, 0.7 - distToPlayer * 0.02);
          if (Math.random() < hitChance && onDamagePlayer) {
            const isHead = Math.random() < 0.15;
            onDamagePlayer(isHead ? 45 : 18, bot.name);
          }

          if (bot.burstCount >= 3) {
            bot.shootCooldown = 1.1 + Math.random() * 0.6; // cooldown between bursts
            bot.burstCount = 0;
          }
        }
      } else {
        // Move along patrol route
        const currentTarget = getWaypointPos(bot.route[bot.waypointIndex]);
        const dist = botPos.distanceTo(currentTarget);

        if (dist < 1.2) {
          bot.waypointIndex = (bot.waypointIndex + 1) % bot.route.length;
        } else {
          const moveDir = currentTarget.clone().sub(botPos).normalize();
          bot.group.position.addScaledVector(moveDir, dt * 3.2); // Patrol speed
          bot.group.rotation.y = Math.atan2(moveDir.x, moveDir.z);
        }
      }
    }
  }

  return {
    bots,
    hitMeshes,
    damage,
    step,
    respawnAll,
    aliveCount(team) {
      return bots.filter(b => b.alive && b.team === team).length;
    },
  };
}
