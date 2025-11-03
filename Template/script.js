/*
 * IDB Programming: Code Playground
 */

import * as Util from "./util.js";

// Settings that don't change
const settings = Object.freeze({
  blobSize: 40,

  // baseline movement/feel
  randomShake: 90,   // tiny wiggle movement each second
  pushPower: 420,    // keyboard push strength
  slowDown: 0.97,    // friction (closer to 1 = slides longer)

  // H pull (panic key)
  pullPower: 8,
  hMax: 3,
  hRegen: 0.6,
  hCooldown: 1,

  // Simple auto drift (keeps blob moving even with no keys) 
  driftPower: 160,       // strength of drift
  driftChangeMin: 0.6,   // drift direction changes every 0.6..1.4 sec
  driftChangeMax: 1.4,

  flashTime: 200
});

// Game state (changes during play)
const game = {
  playing: true,

  // position + speed
  x: window.innerWidth / 2,
  y: window.innerHeight / 2,
  sx: 0,
  sy: 0,

  // keyboard + H power
  keys: new Set(),
  hLeft: settings.hMax,
  hCooling: 0,
  hOverheat: false,

  // timer/frame
  time: 0,
  lastFrame: performance.now(),

  // Drift state
  driftX: 0,
  driftY: 0,
  driftTimer: 0
};

// Keyboard map for directions
const rows = ["qwertyuiop","asdfghjkl","zxcvbnm"];
const directions = makeKeyMap(rows);

// Find keyboard positions
function makeKeyMap(rows){
  const map = new Map();
  const widest = Math.max(...rows.map(r=>r.length));
  rows.forEach((row, r)=>{
    [...row].forEach((key, c)=>{
      const x = (c/(widest-1))*2 - 1;           // -1..+1 (left..right)
      const y = (r/(rows.length-1))*2 - 1;      // -1..+1 (top..bottom)
      map.set(key, {x, y});
    });
  });
  return map;
}

// First valid pressed key decides direction (ignore H)
function getKeyDirection(){
  for (const k of game.keys){
    if (k === "h") continue;
    if (directions.has(k)) return directions.get(k);
  }
  return {x:0, y:0};
}

function center(){ return {x: window.innerWidth/2, y: window.innerHeight/2}; }
function radius(){ return Math.min(window.innerWidth, window.innerHeight) * 0.35; }

// Pick a fresh drift vector and next change time 
function pickNewDrift(){
  game.driftX = (Math.random()*2 - 1) * settings.driftPower;
  game.driftY = (Math.random()*2 - 1) * settings.driftPower;
  const span = settings.driftChangeMax - settings.driftChangeMin;
  game.driftTimer = settings.driftChangeMin + Math.random()*span;
}

let arena, timeBox;
const blob = document.querySelector("#thing0");

// Code that runs over and over again
function loop(now){
  const dt = (now - game.lastFrame)/1000;
  game.lastFrame = now;
  if (!game.playing) return;

  const c = center();
  const canUseH = !game.hOverheat && game.hLeft > 0;
  const usingH = game.keys.has("h") && canUseH;

  // Drift is always applied; direction changes sometimes
  game.driftTimer -= dt;
  if (game.driftTimer <= 0) pickNewDrift();
  game.sx += game.driftX * dt;
  game.sy += game.driftY * dt;

  // tiny random wiggle (skip while using H for clean control)
  if (!usingH){
    game.sx += (Math.random()-0.5) * settings.randomShake * dt;
    game.sy += (Math.random()-0.5) * settings.randomShake * dt;
  }

  // keyboard push
  const d = getKeyDirection();
  game.sx += d.x * settings.pushPower * dt;
  game.sy += d.y * settings.pushPower * dt;

  // H pull to center with battery + overheat
  if (usingH){
    game.sx += (c.x - game.x) * settings.pullPower * dt;
    game.sy += (c.y - game.y) * settings.pullPower * dt;

    game.hLeft = Math.max(0, game.hLeft - dt);
    if (game.hLeft === 0){
      game.hOverheat = true;
      game.hCooling = settings.hCooldown;
    }

    blob.classList.add("flash");
    setTimeout(()=>blob.classList.remove("flash"), 80);
  } else {
    if (game.hOverheat){
      game.hCooling = Math.max(0, game.hCooling - dt);
      if (game.hCooling === 0) game.hOverheat = false;
    } else {
      game.hLeft = Math.min(settings.hMax, game.hLeft + settings.hRegen * dt);
    }
  }

  // move + friction
  game.x += game.sx * dt;
  game.y += game.sy * dt;
  game.sx *= settings.slowDown;
  game.sy *= settings.slowDown;

  // out of circle = game over
  if (Math.hypot(game.x - c.x, game.y - c.y) > radius() - settings.blobSize/2){
    game.playing = false;
    arena.classList.add("flash");
    setTimeout(()=>arena.classList.remove("flash"), settings.flashTime);
    timeBox.textContent += " — Game Over";
    return;
  }

  // draw blob (centered)
  Util.setPositionPixels(
    game.x - settings.blobSize/2,
    game.y - settings.blobSize/2,
    blob
  );

  // timer
  game.time += dt;
  timeBox.textContent = `Time: ${game.time.toFixed(1)}s`;

  requestAnimationFrame(loop);
}

// Setup is run once, at the start of the program. It sets everything up for us!
function setup(){
  // circle arena
  arena = document.createElement("div");
  arena.id = "arena";
  document.body.appendChild(arena);

  // timer under circle
  timeBox = document.createElement("div");
  timeBox.id = "hud";
  timeBox.textContent = "Time: 0.0s";
  document.body.appendChild(timeBox);

  // blob look + start
  Util.setSize(settings.blobSize, settings.blobSize, blob);
  Util.setRoundedness(1, blob);
  Util.setColour(330, 80, 55, 1, blob);
  Util.setPositionPixels(
    game.x - settings.blobSize/2,
    game.y - settings.blobSize/2,
    blob
  );

  // keyboard tracking
  window.addEventListener("keydown", e=>{
    if (!e.repeat) game.keys.add(e.key.toLowerCase());
  });
  window.addEventListener("keyup", e=>{
    game.keys.delete(e.key.toLowerCase());
  });

  // start initial drift and loop
  pickNewDrift();
  requestAnimationFrame(loop);
}

setup(); // Always remember to call setup()!
