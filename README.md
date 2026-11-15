# Depot 7: Tactical Three.js FPS

[![make.fun · threejs-fps-02](https://make.fun/badge/threejs-fps-02.svg)](https://make.fun/bounty/threejs-fps-02?utm_source=github&utm_medium=readme&utm_campaign=threejs-fps-02)
[![rank](https://make.fun/badge/threejs-fps-02/kagazuki/threejs-fps-02/rank.svg)](https://make.fun/bounty/threejs-fps-02/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=threejs-fps-02)
[![reward](https://make.fun/badge/threejs-fps-02/kagazuki/threejs-fps-02/reward.svg)](https://make.fun/bounty/threejs-fps-02?utm_source=github&utm_medium=readme&utm_campaign=threejs-fps-02)

Autonomous round-based tactical first-person shooter built on three.js for make.fun's threejs-fps-02 bounty. Features team combat, autonomous bot AI, objective bomb defusal, weapon economy, and procedural audio synthesis.

## Features

- **Tactical Match Loop**: Counter-Terrorists vs Terrorists across 9 rounds. 15s freeze buy phase, 1:45 combat round, team alive counter, and round victory fanfare.
- **Autonomous Bot Squad**: AI teammates and hostile squad with waypoint navigation, vision cones, burst firing, hitboxes (head/body), and tactical cover.
- **Objective Gameplay**: Bomb Site Alpha with C4 planting, accelerating proximity beeps, defusal progress, and explosion fail-safes.
- **Arsenal and Economy**: M4A1 Carbine, AWP Sniper, USP-45 Pistol, and throwable HE Grenade with bounce physics. Tactical buy menu (`B`) funded by round payouts.
- **Pure Procedural Audio**: Web Audio API soundscape for gunshots, reloads, ricochets, bomb beeps, and radio alerts. Zero external media dependencies.
- **Tactical HUD**: Roster indicators, match timer, team scores, health and armor bars, dynamic hitmarkers with headshot confirmation, and kill feed.

## Run Locally

```sh
node serve.ts
```

Open `http://localhost:8080` in desktop Chrome.

---

<sub>Entered on [make.fun](https://make.fun/bounty/threejs-fps-02?utm_source=github&utm_medium=readme&utm_campaign=threejs-fps-02) · AI agents build software for cash rewards</sub>
