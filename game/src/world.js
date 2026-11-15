// Original tactical map: Depot 7. Two lanes, mid courtyard, bomb site Alpha and tactical cover.
import * as THREE from 'three';
import { PALETTE } from './palette.js';

export function createWorld(scene) {
  const group = new THREE.Group();
  scene.add(group);

  const materials = {};
  for (const name of Object.keys(PALETTE)) {
    materials[name] = new THREE.MeshStandardMaterial({
      color: new THREE.Color(PALETTE[name]),
      roughness: name === 'accent' || name === 'ink' ? 0.45 : 0.88,
      metalness: name === 'hairline' ? 0.35 : 0.08,
    });
  }

  // Accent warning stripe material
  materials.hazard = new THREE.MeshStandardMaterial({
    color: new THREE.Color(PALETTE.accent),
    roughness: 0.4,
    metalness: 0.2,
  });

  const colliders = [];
  const shootables = [];

  function box(width, height, depth, x, y, z, material, isCover = true) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), materials[material]);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    if (isCover) colliders.push(new THREE.Box3().setFromObject(mesh));
    shootables.push(mesh);
    return mesh;
  }

  // Perimeter Arena: 32 x 38 m tactical facility, 5m concrete walls
  box(32.4, 0.4, 38.4, 0, -0.2, 0, 'canvas'); // Floor
  box(0.5, 5.0, 38.4, -16.2, 2.5, 0, 'surface'); // West wall
  box(0.5, 5.0, 38.4, 16.2, 2.5, 0, 'surface'); // East wall
  box(32.4, 5.0, 0.5, 0, 2.5, -19.2, 'surface'); // North wall (T spawn)
  box(32.4, 5.0, 0.5, 0, 2.5, 19.2, 'surface'); // South wall (CT spawn)

  // Mid Lane dividing barriers & shipping container
  box(2.8, 2.6, 6.2, 0, 1.3, 0, 'hairline'); // Central steel container
  box(1.2, 1.1, 2.4, -2.4, 0.55, 3.2, 'surface'); // Mid crates south
  box(1.2, 1.1, 2.4, 2.4, 0.55, -3.2, 'surface'); // Mid crates north

  // Long A Lane (West, X = -10): Sniper corridor with chokepoints
  box(0.6, 4.0, 14.0, -6.0, 2.0, 0, 'hairline'); // Long A partition wall
  box(2.2, 1.2, 1.2, -10.5, 0.6, 5.5, 'surface'); // A long sandbag barricade
  box(1.6, 1.8, 1.6, -11.0, 0.9, -6.0, 'surface'); // A long corner crate
  box(4.0, 0.3, 1.8, -10.5, 2.2, -12.0, 'hairline'); // Sniper catwalk A
  box(0.4, 2.2, 1.8, -8.5, 1.1, -12.0, 'hairline'); // Catwalk support

  // B Connector & Bomb Site Alpha (East, X = 8 to 12, Z = -4)
  box(0.6, 4.0, 12.0, 6.0, 2.0, 2.0, 'hairline'); // B site partition wall
  box(2.4, 2.4, 2.4, 11.5, 1.2, 6.0, 'surface'); // Large generator crate
  box(1.5, 1.1, 3.2, 8.5, 0.55, 2.0, 'hairline'); // B doorway cover

  // Bomb Site Alpha Pad (X = 9.5, Z = -5)
  const pad = box(6.0, 0.08, 6.0, 9.5, 0.04, -5.0, 'surface', false);
  // Hazard corner markers
  box(0.4, 0.12, 6.0, 6.5, 0.06, -5.0, 'hazard', false);
  box(0.4, 0.12, 6.0, 12.5, 0.06, -5.0, 'hazard', false);
  box(6.0, 0.12, 0.4, 9.5, 0.06, -8.0, 'hazard', false);
  box(6.0, 0.12, 0.4, 9.5, 0.06, -2.0, 'hazard', false);

  // Bomb pedestal terminal
  const bombTerminal = box(0.8, 1.0, 0.8, 9.5, 0.5, -5.0, 'hairline');

  // Site Alpha pulsating beacon light
  const beaconLight = new THREE.PointLight(new THREE.Color(PALETTE.accent), 2.5, 8);
  beaconLight.position.set(9.5, 1.8, -5.0);
  scene.add(beaconLight);

  // Lighting & Atmosphere
  const sky = new THREE.HemisphereLight(new THREE.Color(PALETTE.surface), new THREE.Color(PALETTE.canvas), 1.2);
  scene.add(sky);

  const sun = new THREE.DirectionalLight(new THREE.Color(PALETTE.ink), 2.2);
  sun.position.set(12, 18, 10);
  sun.target.position.set(0, 0, 0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -22;
  sun.shadow.camera.right = 22;
  sun.shadow.camera.top = 22;
  sun.shadow.camera.bottom = -22;
  sun.shadow.camera.far = 60;
  sun.shadow.bias = -0.0005;
  scene.add(sun, sun.target);

  const fill = new THREE.DirectionalLight(new THREE.Color(PALETTE.muted), 0.65);
  fill.position.set(-10, 12, -14);
  scene.add(fill);

  // Strategic AI Waypoints
  const waypoints = [
    { id: 'ct_spawn', pos: new THREE.Vector3(0, 0, 14.5) },
    { id: 'ct_mid', pos: new THREE.Vector3(0, 0, 7.0) },
    { id: 'ct_a_entry', pos: new THREE.Vector3(-10.0, 0, 9.0) },
    { id: 'ct_b_entry', pos: new THREE.Vector3(9.5, 0, 8.0) },
    { id: 'mid_center', pos: new THREE.Vector3(0, 0, 0) },
    { id: 'a_long_mid', pos: new THREE.Vector3(-10.5, 0, 0) },
    { id: 'b_connector', pos: new THREE.Vector3(9.0, 0, 1.0) },
    { id: 'site_alpha', pos: new THREE.Vector3(9.5, 0, -5.0) },
    { id: 't_mid', pos: new THREE.Vector3(0, 0, -7.0) },
    { id: 't_a_entry', pos: new THREE.Vector3(-10.5, 0, -9.0) },
    { id: 't_b_entry', pos: new THREE.Vector3(9.5, 0, -11.0) },
    { id: 't_spawn', pos: new THREE.Vector3(0, 0, -15.5) },
  ];

  return {
    colliders,
    shootables,
    group,
    beaconLight,
    bombSite: {
      position: new THREE.Vector3(9.5, 0, -5.0),
      radius: 3.5,
    },
    spawns: {
      CT: [
        new THREE.Vector3(0, 0, 14.5),
        new THREE.Vector3(-2.5, 0, 15.0),
        new THREE.Vector3(2.5, 0, 15.0),
      ],
      T: [
        new THREE.Vector3(0, 0, -15.5),
        new THREE.Vector3(-3.0, 0, -16.0),
        new THREE.Vector3(3.0, 0, -16.0),
      ],
    },
    waypoints,
  };
}
