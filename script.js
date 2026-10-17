
(() => {
  const canvas = document.getElementById("game");
  if (!canvas) {
    console.error("Pocket Planet: missing canvas with id='game'");
    return;
  }

  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  const TILE = 16;
  const COLS = 30;
  const ROWS = 20;

  const seedStart = [
    [8, 4], [14, 7], [5, 13], [25, 15], [17, 3]
  ];

  const treePositions = [
    [2,2],[3,2],[8,2],[13,2],[18,2],[27,2],
    [4,5],[10,5],[16,5],[28,6],[2,8],[7,9],
    [13,10],[27,10],[3,15],[10,16],[19,16],
    [28,17],[14,14],[24,4]
  ];

  const gardenPositions = [
    [7,6],[11,12],[21,14],[25,7]
  ];
  
const villageHouses = [
  { x: 4, y: 4, wall: "#f5c98b", roof: "#cf735e" },
  { x: 12, y: 3, wall: "#b8d8f2", roof: "#7776bd" },
  { x: 15, y: 13, wall: "#f4b6cc", roof: "#b96d91" }
];

const treasureChest = { x: 26, y: 16, opened: false };
function addXP(amount){

    xp += amount;

    while(xp>=100){
        xp-=100;
        level++;

        coinCount += 20;

        say(`🎉 Level ${level}! +20 Coins`);
    }

    document.getElementById("xp").textContent=xp;
    document.getElementById("level").textContent=level;
    document.getElementById("xp-fill").style.width=(xp)+"%";

    saveGame();
}

let xp = 0;
let level = 1;

let coins = [
  { x: 8, y: 10, collected: false },
  { x: 17, y: 6, collected: false },
  { x: 26, y: 8, collected: false },
  { x: 5, y: 17, collected: false },
  { x: 18, y: 17, collected: false }
];

let coinCount = 0;


  let keys = {};
  let seeds = [];
  let gardens = [];
  let flowers = 0;
  let rescued = false;
  let selectedCharacter = "forest";
  let walkFrame = 0;
  let lastTime = 0;
  let collectedSeedTotal = 0;
  let plantedFlowerTotal = 0;
  let enchantedUnlocked = false;

  let questClaims = {
    seeds: false,
    flowers: false,
    bunny: false
  };

  const player = { x: 5*TILE, y: 5*TILE, speed: 2 };
  const bunny = { x: 23*TILE, y: 5*TILE };
  const fox={
    x:390,
    y:50
};
  
const SAVE_KEY = "pocketPlanetSaveV1";

function saveGame() {
  try {
    const saveData = {
      version: 1,
      player: { x: player.x, y: player.y },
      selectedCharacter,
      seeds,
      gardens,
      flowers,
      rescued,
      coins,
      coinCount,
      treasureChest
    };
    

    localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
  } catch (error) {
    console.warn("Pocket Planet could not save progress:", error);
  }
}

function loadGame() {
  try {
    const savedText = localStorage.getItem(SAVE_KEY);
    if (!savedText) return false;

    const data = JSON.parse(savedText);

    if (
      data.version !== 1 ||
      !data.player ||
      !Number.isFinite(data.player.x) ||
      !Number.isFinite(data.player.y) ||
      !["forest", "star", "flower"].includes(data.selectedCharacter) ||
      !Array.isArray(data.seeds) ||
      !Array.isArray(data.gardens) ||
      !Array.isArray(data.coins)
    ) {
      return false;
    }

    player.x = data.player.x;
    player.y = data.player.y;
    selectedCharacter = data.selectedCharacter;

    seeds = seedStart.map(([x, y], i) => ({
      x, y,
      taken: data.seeds[i]?.taken === true
    }));

    gardens = gardenPositions.map(([x, y], i) => ({
      x, y,
      planted: data.gardens[i]?.planted === true
    }));

    flowers = Number.isFinite(data.flowers)
      ? Math.max(0, data.flowers)
      : 0;

    rescued = data.rescued === true;

    coins = coins.map((coin, i) => ({
      ...coin,
      collected: data.coins[i]?.collected === true
    }));

    coinCount = Number.isFinite(data.coinCount)
      ? Math.max(0, data.coinCount)
      : 0;

    treasureChest.opened = data.treasureChest?.opened === true;

    document.querySelectorAll(".character-choice").forEach(button => {
      button.classList.toggle(
        "selected",
        button.dataset.character === selectedCharacter
      );
    });

    say("Welcome back, explorer! Your adventure has been restored. 🌱");
    updateHUD();
    return true;
  } catch (error) {
    console.warn("Pocket Planet could not load saved progress:", error);
    return false;
  }
}


  const outfits = {
    forest: {
      shirt: "#4d9e9a", hat: "#3f9365",
      light: "#65b879", bag: "#b66b48", hair: "#6b493a"
    },
    star: {
      shirt: "#8b79cf", hat: "#f0c85c",
      light: "#ffe88a", bag: "#5276bd", hair: "#49354f"
    },
    flower: {
      shirt: "#e88cae", hat: "#df8cba",
      light: "#ffc4df", bag: "#9b7651", hair: "#754333"
    }
  };

  function say(message) {
    const element = document.getElementById("message");
    if (element) element.textContent = message;
  }

  function updateHUD() {
    document.getElementById("seeds").textContent =
      seeds.filter(s => s.taken).length;
    document.getElementById("flowers").textContent = flowers;
    document.getElementById("quest").textContent =
      rescued ? "Complete! 💚" : "Find me!";
    document.getElementById("coins").textContent = coinCount;
    saveGame();  
  }

  function resetGame() {
    player.x = 5*TILE;
    player.y = 5*TILE;
    bunny.x = 23*TILE;
    bunny.y = 5*TILE;

    seeds = seedStart.map(([x,y]) => ({x,y,taken:false}));
    gardens = gardenPositions.map(([x,y]) => ({x,y,planted:false}));
    flowers = 0;
    rescued = false;
    keys = {};

    say("Welcome, explorer! Collect 3 seeds and find the bunny. 🌷");
    updateHUD();
  }

  function water(x,y) {
    return x >= 20 && x <= 24 && y >= 10 && y <= 13;
  }

  function blocked(x,y) {
    const corners = [
      [x+3,y+5],[x+12,y+5],[x+3,y+13],[x+12,y+13]
    ];

    return corners.some(([px,py]) => {
      const tx = Math.floor(px/TILE);
      const ty = Math.floor(py/TILE);

      return tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS ||
        water(tx,ty) ||
        treePositions.some(([a,b]) => a===tx && b===ty);
    });
  }

  function movePlayer(dx,dy) {
    const nx = player.x + dx;
    const ny = player.y + dy;

    if (!blocked(nx,player.y)) player.x = nx;
    if (!blocked(player.x,ny)) player.y = ny;
  }

  function beep(freq=660,duration=0.1) {
    try {
      const audio = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();

      oscillator.frequency.value = freq;
      gain.gain.value = 0.035;
      oscillator.connect(gain);
      gain.connect(audio.destination);
      oscillator.start();
      gain.gain.exponentialRampToValueAtTime(
        0.001,audio.currentTime+duration
      );
      oscillator.stop(audio.currentTime+duration);
      oscillator.onended = () => audio.close();
    } catch (error) {}
  }

  function collectSeeds() {
    for (const seed of seeds) {
      if (seed.taken) continue;

      const sx = seed.x*TILE+8;
      const sy = seed.y*TILE+8;

      if (Math.hypot(player.x+8-sx,player.y+8-sy)<13) {
        seed.taken = true;
        addXP(10);
  
      if(level>=3 && !enchantedUnlocked){

          enchantedUnlocked=true;

          say("🌲 The Enchanted Forest has opened!");
       }
        say("You found a magical seed! ✨");
        beep();
        updateHUD();
      }
    }
  }

function collectCoins() {
  for (const coin of coins) {
    if (coin.collected) continue;

    const x = coin.x * TILE + 8;
    const y = coin.y * TILE + 8;

    if (Math.hypot(player.x + 8 - x, player.y + 8 - y) < 14) {
      coin.collected = true;
      coinCount++;

      say(`You found a gold coin! 🪙 Total: ${coinCount}`);
      beep(900, 0.12);
      updateHUD();
    }
  }
}

  function interact() {
    
    if (
      Math.hypot(
        player.x - treasureChest.x * TILE,
        player.y - treasureChest.y * TILE
      ) < 30
    ) {
      if (!treasureChest.opened) {
        treasureChest.opened = true;
        coinCount += 5;
        say("TREASURE FOUND! 🎉 You earned 5 bonus coins!");
        beep(1000, 0.25);
        updateHUD();
      } else {
        say("Your treasure chest is already open! 💛");
      }
      return;
      if(
    enchantedUnlocked &&
    Math.hypot(player.x-fox.x,player.y-fox.y)<28
){
    say("🦊 Fox: The stars reward kind explorers.");
    return;
}
    }

    const distance = obj =>
      Math.hypot(player.x-obj.x,player.y-obj.y);

    if (distance(bunny)<30) {
      const count = seeds.filter(s=>s.taken).length;

      if (!rescued && count>=3) {
        rescued = true;
        flowers++;
        say("Bunny: You helped me! Our island can bloom! 🌸");
        beep(880,0.16);
      } else if (!rescued) {
        say(`Bunny: Please find 3 seeds! You have ${count}. 🐰`);
      } else {
        say("Bunny: Thank you, explorer! 💚");
      }

      updateHUD();
      return;
    }

    const patch = gardens.find(g =>
      Math.hypot(player.x-g.x*TILE,player.y-g.y*TILE)<27
    );

    if (!patch) {
      say("Explore the island and look for seeds, gardens and the bunny!");
      return;
    }

    if (patch.planted) {
      say("Your flower is growing happily! 🌼");
      return;
    }

    const seed = seeds.find(s=>s.taken);
    if (!seed) {
      say("Find a magical seed before planting here. 🌱");
      return;
    }

    seed.taken = false;
    patch.planted = true;
    flowers++;
    say("You planted a magical flower! 🌷");
    beep(740,0.12);
    updateHUD();
  }

  function rect(x,y,w,h,color) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x),Math.round(y),w,h);
  }

  function drawTile(x,y) {
    const px=x*TILE, py=y*TILE;

    if (water(x,y)) {
      rect(px,py,16,16,"#65bce5");
      rect(px+3,py+4,5,2,"#b7f0ef");
      rect(px+9,py+11,4,2,"#86d9ec");
      return;
    }

    rect(px,py,16,16,"#83c96e");

    if ((x+y)%3===0) rect(px+3,py+5,2,2,"#a5df81");
    if ((x*7+y*3)%7===0) rect(px+11,py+12,2,2,"#65ae61");

    if ((x>=12 && x<=16 && y===8) ||
        (x===15 && y>=8 && y<=12)) {
      rect(px+2,py+3,12,10,"#d8c69a");
      rect(px+4,py+5,3,2,"#eee0b9");
    }
  }

  function drawTree(tx,ty) {
    const x=tx*TILE,y=ty*TILE;
    rect(x+6,y+8,5,8,"#885238");
    rect(x+2,y+3,12,10,"#287d52");
    rect(x+4,y,8,10,"#36985a");
    rect(x+5,y+2,3,3,"#65bf69");
    rect(x+2,y+8,3,3,"#65bf69");
  }
  
function drawHouse(house) {
  const x = house.x * TILE;
  const y = house.y * TILE;

  // House shadow
  rect(x + 1, y + 12, 17, 8, "#57945a");

  // Walls
  rect(x + 3, y + 5, 13, 12, house.wall);

  // Roof
  rect(x, y + 3, 19, 5, house.roof);
  rect(x + 3, y, 13, 5, house.roof);
  rect(x + 6, y - 2, 7, 3, house.roof);

  // Door
  rect(x + 8, y + 10, 4, 7, "#86553e");
  rect(x + 10, y + 13, 1, 1, "#ffe88a");

  // Windows
  rect(x + 4, y + 8, 3, 3, "#8ed9ed");
  rect(x + 13, y + 8, 2, 3, "#8ed9ed");

  // Window frames
  rect(x + 5, y + 8, 1, 3, "#fff4d6");
  rect(x + 4, y + 9, 3, 1, "#fff4d6");
}

function drawCoin(coin) {
  if (coin.collected) return;

  const x = coin.x * TILE;
  const y = coin.y * TILE;
  const sparkle = Math.sin(performance.now() / 150) > 0;

  rect(x + 5, y + 4, 7, 8, "#d79b30");
  rect(x + 6, y + 3, 5, 9, "#ffe477");
  rect(x + 7, y + 5, 3, 5, "#fff4ad");

  if (sparkle) {
    rect(x + 2, y + 3, 2, 2, "#fff8d0");
    rect(x + 13, y + 10, 2, 2, "#fff8d0");
  }
}

function drawTreasureChest() {
  const x = treasureChest.x * TILE;
  const y = treasureChest.y * TILE;

  rect(x + 2, y + 7, 13, 8, "#89512f");
  rect(x + 1, y + 5, 15, 4, "#bd8045");
  rect(x + 3, y + 4, 11, 3, "#e5b45c");
  rect(x + 7, y + 8, 4, 4, "#ffe477");

  if (treasureChest.opened) {
    rect(x + 3, y + 2, 11, 3, "#e5b45c");
    rect(x + 5, y + 9, 7, 3, "#ffe477");
  }
}


  function drawFlower(x,y) {
    const px=x*TILE+8,py=y*TILE+8;
    rect(px-1,py+1,2,6,"#32844c");
    rect(px-5,py-3,3,3,"#ff9acb");
    rect(px+2,py-3,3,3,"#ff9acb");
    rect(px-2,py-6,4,3,"#ff9acb");
    rect(px-2,py,4,3,"#ff9acb");
    rect(px-1,py-3,3,3,"#ffe88a");
  }

  function drawGarden(g) {
    const x=g.x*TILE,y=g.y*TILE;
    rect(x+1,y+5,14,9,"#639e51");
    rect(x+3,y+7,10,5,"#9b744e");

    if (g.planted) drawFlower(g.x,g.y);
    else rect(x+6,y+8,4,2,"#6b4b35");
  }

  function drawSeed(seed) {
    if (seed.taken) return;
    const x=seed.x*TILE,y=seed.y*TILE;
    rect(x+6,y+4,5,7,"#e6b94f");
    rect(x+5,y+6,7,4,"#ffd96d");
    rect(x+7,y+5,2,2,"#fff2a5");
    rect(x+10,y+3,3,2,"#6ebc65");
  }

  function drawBunny() {
    const x=bunny.x;
    const y=bunny.y+Math.sin(performance.now()/180)*2;

    rect(x+3,y-4,4,10,"#fff0df");
    rect(x+10,y-5,4,11,"#fff0df");
    rect(x+4,y-2,2,5,"#f6a9bd");
    rect(x+11,y-3,2,5,"#f6a9bd");
    rect(x+2,y+8,13,9,"#fff0df");
    rect(x+1,y+2,15,10,"#fff8e9");
    rect(x+4,y+5,2,2,"#3a4651");
    rect(x+11,y+5,2,2,"#3a4651");
    rect(x+7,y+8,3,2,"#ef91a9");
    rect(x+4,y+15,4,3,"#fff0df");
    rect(x+11,y+15,4,3,"#fff0df");
  }

  function drawPlayer() {
    const x=Math.round(player.x);
    const y=Math.round(player.y);

    const walking =
      keys.ArrowUp || keys.ArrowDown ||
      keys.ArrowLeft || keys.ArrowRight ||
      keys.w || keys.a || keys.s || keys.d;

    const step=walking ? Math.sin(walkFrame)*2 : 0;
    const c=outfits[selectedCharacter];

    rect(x+1,y+7,4,7,c.bag);
    rect(x+4+step,y+13,4,3,"#754a43");
    rect(x+10-step,y+13,4,3,"#754a43");

    rect(x+3,y+6,11,8,"#f0b56c");
    rect(x+4,y+7,9,6,c.shirt);
    rect(x+2,y+8+step,3,5,"#f2c7a1");
    rect(x+13,y+8-step,3,5,"#f2c7a1");

    rect(x+3,y+1,11,8,"#f2c7a1");
    rect(x+2,y,13,4,c.hair);
    rect(x+3,y-1,10,3,c.hair);

    rect(x+5,y+4,2,2,"#293a42");
    rect(x+10,y+4,2,2,"#293a42");
    rect(x+7,y+7,3,1,"#bd6b60");

    rect(x+2,y-2,13,3,c.hat);
    rect(x+5,y-4,7,3,c.light);

    if (selectedCharacter==="star") {
      rect(x+7,y+8,3,3,"#ffe88a");
    }

    if (selectedCharacter==="flower") {
      rect(x+12,y-3,3,3,"#ffb7d9");
      rect(x+13,y-4,2,2,"#ffe88a");
    }
  }

  function drawWorld() {
    for (let y=0;y<ROWS;y++) {
      for (let x=0;x<COLS;x++) drawTile(x,y);
    }

    for (let x=19;x<=25;x++) {
      for (let y=9;y<=14;y++) {
        if (!water(x,y)) {
          rect(x*TILE,y*TILE,16,16,"#d9ca91");
          if ((x+y)%2===0) {
            rect(x*TILE+5,y*TILE+5,2,2,"#eee0b9");
            if(enchantedUnlocked){
               drawEnchantedForest();
            }
          }
        }
      }
    }
function drawEnchantedForest(){

    rect(330,15,135,90,"#3c7a58");

    for(let i=0;i<12;i++){

        let x=340+i*9;
        let y=30+Math.sin(i)*12;

        rect(x,y,6,6,"#c7ff8f");
    }

    for(let i=0;i<8;i++){

        let x=340+i*14;
        let y=75+Math.cos(i)*8;

        rect(x,y,4,8,"#fff2d8");
        rect(x-3,y-3,10,5,"#ff8ad4");
    }

    let glow=Math.sin(performance.now()/300)*3;

    rect(370,35+glow,3,3,"#fff8b5");
    rect(420,55-glow,3,3,"#fff8b5");
    rect(450,30+glow,3,3,"#fff8b5");
}

villageHouses.forEach(drawHouse);
gardens.forEach(drawGarden);
seeds.forEach(drawSeed);
coins.forEach(drawCoin);
drawTreasureChest();
treePositions.forEach(([x,y]) => drawTree(x,y));
drawBunny();
drawPlayer();


    rect(350,180,3,3,"#fff2a5");
    rect(390,220,3,3,"#fff2a5");
    rect(370,190,2,2,"#ffffff");
  }

  function drawFox(){

    rect(fox.x,fox.y,12,10,"#f28c28");
    rect(fox.x+3,fox.y-4,6,4,"#f28c28");
    rect(fox.x+4,fox.y+3,2,2,"#000");
    rect(fox.x+8,fox.y+3,2,2,"#000");
}
    if(enchantedUnlocked){
        drawFox();
    }
  
  function frame(time) {
    const dt=Math.min((time-lastTime)/16.67 || 1,2);
    lastTime=time;

    let dx=0,dy=0;

    if (keys.ArrowLeft || keys.a) dx--;
    if (keys.ArrowRight || keys.d) dx++;
    if (keys.ArrowUp || keys.w) dy--;
    if (keys.ArrowDown || keys.s) dy++;

    if (dx && dy) {
      dx*=0.7071;
      dy*=0.7071;
    }

    if (dx || dy) {
      walkFrame+=0.35*dt;
      movePlayer(dx*player.speed*dt,dy*player.speed*dt);
    }

    collectSeeds();
    collectCoins();
    drawWorld();
    requestAnimationFrame(frame);
  }

  window.addEventListener("keydown",e=>{
    const key=e.key.length===1 ? e.key.toLowerCase() : e.key;

    if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," "].includes(e.key)) {
      e.preventDefault();
    }

    if ((key==="e" || e.key===" ") && !e.repeat) interact();
    keys[key]=true;
  });

  window.addEventListener("keyup",e=>{
    const key=e.key.length===1 ? e.key.toLowerCase() : e.key;
    keys[key]=false;
    saveGame();
  });

  window.addEventListener("blur",()=>{keys={};});
  window.addEventListener("pagehide", saveGame);

  document.querySelectorAll("[data-key]").forEach(button=>{
    const key=button.dataset.key;

    button.addEventListener("pointerdown",e=>{
      e.preventDefault();
      keys[key]=true;
      button.setPointerCapture(e.pointerId);
    });

    const release=()=>{keys[key]=false;};
    button.addEventListener("pointerup",release);
    button.addEventListener("pointercancel",release);
    button.addEventListener("lostpointercapture",release);
  });

  document.getElementById("interact").addEventListener("click",interact);
  document.getElementById("reset").addEventListener("click",resetGame);

  document.querySelectorAll(".character-choice").forEach(button=>{
    button.addEventListener("click",()=>{
      selectedCharacter=button.dataset.character;

      document.querySelectorAll(".character-choice").forEach(choice=>{
        choice.classList.remove("selected");
      });

      button.classList.add("selected");

      const names={
        forest:"Forest Kid 🌿",
        star:"Star Kid ⭐",
        flower:"Flower Kid 🌸"
      };

      say(`You selected ${names[selectedCharacter]}! Let's explore!`);
    });
  });

  if (!loadGame()) {
  resetGame();
}

requestAnimationFrame(frame);
})();
