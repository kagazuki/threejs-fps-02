// Tactical FPS configuration and balance constants

export const TEAMS = {
  CT: 'CT',
  T: 'T',
};

export const WEAPONS = {
  M4A1: {
    id: 'm4a1',
    name: 'M4A1 Carbine',
    slot: 1,
    cost: 3100,
    magSize: 30,
    reserve: 90,
    fireGap: 0.095,
    reloadTime: 2.1,
    damageHead: 110,
    damageBody: 34,
    damageLegs: 22,
    spreadStill: 0.002,
    spreadMoving: 0.026,
    recoilPitch: 0.011,
    recoilYaw: 0.004,
    range: 90,
  },
  AWP: {
    id: 'awp',
    name: 'AWP Sniper',
    slot: 1,
    cost: 4750,
    magSize: 5,
    reserve: 25,
    fireGap: 1.25,
    reloadTime: 2.8,
    damageHead: 250,
    damageBody: 115,
    damageLegs: 85,
    spreadStill: 0.0005,
    spreadMoving: 0.085,
    recoilPitch: 0.045,
    recoilYaw: 0.01,
    range: 120,
  },
  USP: {
    id: 'usp',
    name: 'USP-45 Pistol',
    slot: 2,
    cost: 500,
    magSize: 12,
    reserve: 48,
    fireGap: 0.18,
    reloadTime: 1.6,
    damageHead: 70,
    damageBody: 25,
    damageLegs: 18,
    spreadStill: 0.004,
    spreadMoving: 0.018,
    recoilPitch: 0.008,
    recoilYaw: 0.003,
    range: 60,
  },
};

export const GRENADE_CONFIG = {
  cost: 300,
  fuseSeconds: 2.2,
  damageRadius: 6.5,
  maxDamage: 95,
  throwSpeed: 18,
};

export const ECONOMY = {
  startCash: 800,
  killReward: 300,
  roundWinReward: 3250,
  roundLossReward: 1400,
  bombPlantReward: 300,
  bombDefuseReward: 500,
  kevlarCost: 650,
  helmetCost: 350,
};

export const ROUND_CONFIG = {
  roundSeconds: 105, // 1 minute 45 seconds
  buySeconds: 15,
  bombTimer: 35,
  plantTime: 3.5,
  defuseTime: 5.0,
  targetWins: 5,
};
