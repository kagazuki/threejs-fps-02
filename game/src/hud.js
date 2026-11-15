// Comprehensive tactical HUD: match timer, team scores, alive roster, health/armor, killfeed and buy menu.

export function createHud() {
  const crosshair = document.getElementById('crosshair');
  const hitmarker = document.getElementById('hitmarker');
  const ammoMag = document.getElementById('ammo-mag');
  const ammoReserve = document.getElementById('ammo-reserve');
  const overlay = document.getElementById('overlay');
  const overlayTitle = document.getElementById('overlay-title');
  const overlayCopy = document.getElementById('overlay-copy');
  const playButton = document.getElementById('play');

  // Inject tactical elements into HUD container if not present
  const hudRoot = document.getElementById('hud');

  let matchBar = document.getElementById('match-bar');
  if (!matchBar) {
    matchBar = document.createElement('div');
    matchBar.id = 'match-bar';
    matchBar.innerHTML = `
      <div class="team-ct">
        <span class="team-label">CT</span>
        <span id="score-ct" class="team-score">0</span>
        <div id="roster-ct" class="roster-dots"><i></i><i></i><i></i></div>
      </div>
      <div id="timer-box">
        <span id="round-timer">01:45</span>
        <span id="phase-badge">ACTION</span>
      </div>
      <div class="team-t">
        <div id="roster-t" class="roster-dots"><i></i><i></i><i></i></div>
        <span id="score-t" class="team-score">0</span>
        <span class="team-label">T</span>
      </div>
    `;
    hudRoot.appendChild(matchBar);
  }

  let vitals = document.getElementById('vitals');
  if (!vitals) {
    vitals = document.createElement('div');
    vitals.id = 'vitals';
    vitals.innerHTML = `
      <div class="vital-item"><span class="vital-icon">+</span><span id="hp-val">100</span></div>
      <div class="vital-item"><span class="vital-icon">&#x1F6E1;</span><span id="armor-val">100</span></div>
      <div class="vital-item"><span class="vital-icon">$</span><span id="cash-val">800</span></div>
    `;
    hudRoot.appendChild(vitals);
  }

  let killfeed = document.getElementById('killfeed');
  if (!killfeed) {
    killfeed = document.createElement('div');
    killfeed.id = 'killfeed';
    hudRoot.appendChild(killfeed);
  }

  let weaponBadge = document.getElementById('weapon-badge');
  if (!weaponBadge) {
    weaponBadge = document.createElement('div');
    weaponBadge.id = 'weapon-badge';
    weaponBadge.innerHTML = `<span id="current-weapon-name">M4A1 Carbine</span> <span id="grenade-count">💣 x1</span>`;
    hudRoot.appendChild(weaponBadge);
  }

  let roundBanner = document.getElementById('round-banner');
  if (!roundBanner) {
    roundBanner = document.createElement('div');
    roundBanner.id = 'round-banner';
    roundBanner.className = 'hidden';
    hudRoot.appendChild(roundBanner);
  }

  let buyMenu = document.getElementById('buy-menu');
  if (!buyMenu) {
    buyMenu = document.createElement('div');
    buyMenu.id = 'buy-menu';
    buyMenu.className = 'hidden';
    buyMenu.innerHTML = `
      <div class="buy-panel">
        <h2>TACTICAL REQUISITION (B)</h2>
        <div class="buy-grid">
          <div class="buy-card" data-buy="M4A1"><kbd>1</kbd> M4A1 Carbine <span>$3,100</span></div>
          <div class="buy-card" data-buy="AWP"><kbd>2</kbd> AWP Sniper <span>$4,750</span></div>
          <div class="buy-card" data-buy="USP"><kbd>3</kbd> USP-45 Pistol <span>$500</span></div>
          <div class="buy-card" data-buy="HE"><kbd>4</kbd> HE Grenade <span>$300</span></div>
          <div class="buy-card" data-buy="KEVLAR"><kbd>5</kbd> Kevlar + Helmet <span>$1,000</span></div>
        </div>
      </div>
    `;
    document.body.appendChild(buyMenu);
  }

  let markerTimeout = null;

  return {
    setAmmo(mag, reserve) {
      if (ammoMag) ammoMag.textContent = mag;
      if (ammoReserve) ammoReserve.textContent = `/ ${reserve}`;
    },
    setVitals(hp, armor, cash) {
      const hpEl = document.getElementById('hp-val');
      const armEl = document.getElementById('armor-val');
      const cashEl = document.getElementById('cash-val');
      if (hpEl) hpEl.textContent = Math.max(0, Math.ceil(hp));
      if (armEl) armEl.textContent = Math.max(0, Math.ceil(armor));
      if (cashEl) cashEl.textContent = cash;
    },
    setMatchState(ctScore, tScore, timerSec, phase, ctAlive, tAlive) {
      const ctEl = document.getElementById('score-ct');
      const tEl = document.getElementById('score-t');
      const timerEl = document.getElementById('round-timer');
      const badgeEl = document.getElementById('phase-badge');

      if (ctEl) ctEl.textContent = ctScore;
      if (tEl) tEl.textContent = tScore;
      if (badgeEl) badgeEl.textContent = phase;

      if (timerEl) {
        const mins = Math.floor(Math.max(0, timerSec) / 60);
        const secs = Math.floor(Math.max(0, timerSec) % 60);
        timerEl.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      }

      // Roster dots
      const ctDots = document.getElementById('roster-ct')?.children;
      if (ctDots) {
        for (let i = 0; i < ctDots.length; i++) {
          ctDots[i].className = i < ctAlive ? 'alive' : 'dead';
        }
      }
      const tDots = document.getElementById('roster-t')?.children;
      if (tDots) {
        for (let i = 0; i < tDots.length; i++) {
          tDots[i].className = i < tAlive ? 'alive' : 'dead';
        }
      }
    },
    setWeaponName(name, grenades = 1) {
      const el = document.getElementById('current-weapon-name');
      const gEl = document.getElementById('grenade-count');
      if (el) el.textContent = name;
      if (gEl) gEl.textContent = `💣 x${grenades}`;
    },
    showRoundBanner(title, subtitle, isWin = true) {
      if (!roundBanner) return;
      roundBanner.innerHTML = `<h1>${title}</h1><p>${subtitle}</p>`;
      roundBanner.className = isWin ? 'win' : 'lose';
      roundBanner.classList.remove('hidden');
    },
    hideRoundBanner() {
      if (roundBanner) roundBanner.classList.add('hidden');
    },
    addKillFeed(killer, weapon, victim, isHead = false) {
      if (!killfeed) return;
      const row = document.createElement('div');
      row.className = 'kill-row';
      row.innerHTML = `<span class="killer">${killer}</span> <span class="weapon">[${weapon}]</span> ${isHead ? '<span class="headshot">🎯</span>' : ''} <span class="victim">${victim}</span>`;
      killfeed.appendChild(row);
      setTimeout(() => {
        row.remove();
      }, 4500);
    },
    hitMarker(headshot = false, durationMs = 120) {
      if (!hitmarker) return;
      clearTimeout(markerTimeout);
      hitmarker.classList.add('on');
      if (headshot) hitmarker.classList.add('headshot');
      else hitmarker.classList.remove('headshot');

      markerTimeout = setTimeout(() => {
        hitmarker.classList.remove('on');
      }, durationMs);
    },
    toggleBuyMenu(show) {
      if (!buyMenu) return;
      if (show) buyMenu.classList.remove('hidden');
      else buyMenu.classList.add('hidden');
    },
    onPlay(handler) {
      if (playButton) playButton.addEventListener('click', handler);
    },
    showOverlay(mode, score) {
      if (!overlay) return;
      overlay.removeAttribute('hidden');
      if (mode === 'end') {
        overlayTitle.textContent = 'MATCH FINISHED';
        overlayCopy.textContent = `Final Score: ${score}. Outstanding tactical performance. Click to restart.`;
        playButton.textContent = 'Play again';
      } else if (mode === 'paused') {
        overlayTitle.textContent = 'TACTICAL PAUSE';
        overlayCopy.textContent = 'Click to resume pointer lock.';
        playButton.textContent = 'Resume';
      } else {
        overlayTitle.textContent = 'OPERATION DEPOT 7';
        overlayCopy.textContent = 'Round-based tactical FPS. Eliminate hostile bots or secure Site Alpha. Click to deploy.';
        playButton.textContent = 'Deploy (Click to play)';
      }
    },
    hideOverlay() {
      if (overlay) overlay.setAttribute('hidden', '');
    },
  };
}
