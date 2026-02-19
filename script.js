const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const uiContainer = document.getElementById('ui');
const startScreen = document.getElementById('startScreen');
const winScreen = document.getElementById('winScreen');
const winText = document.getElementById('winnerText');

let players = [];
let gameActive = false;
let currentTheme = 'neon';
const keys = {};
const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

window.onkeydown = (e) => keys[e.key.toLowerCase()] = true;
window.onkeyup = (e) => keys[e.key.toLowerCase()] = false;

function setTheme(t) {
    currentTheme = t;
    document.querySelectorAll('.theme-btn').forEach(b => b.classList.toggle('active', b.innerText.toLowerCase().includes(t)));
}

const controlConfigs = [
    { up: 'w', left: 'a', down: 's', right: 'd', attack: 'f', defend: 'g', label: 'P1', moveKeys: 'WASD', neon: '#ff007f' },
    { up: 'arrowup', left: 'arrowleft', down: 'arrowdown', right: 'arrowright', attack: 'k', defend: 'l', label: 'P2', moveKeys: 'ARROWS', neon: '#00f2ff' },
    { up: 'i', left: 'j', down: 'k', right: 'l', attack: 'h', defend: 'u', label: 'P3', moveKeys: 'IJKL', neon: '#bcff00' },
    { up: '8', left: '4', down: '5', right: '6', attack: '1', defend: '2', label: 'P4', moveKeys: 'NUM 8456', neon: '#ff8800' }
];

class Stickman {
    constructor(id, x, y, config) {
        this.id = id; this.x = x; this.y = y;
        this.vx = 0; this.vy = 0;
        this.hp = 100; this.stamina = 100;
        this.config = config;
        this.facing = x < canvas.width / 2 ? 1 : -1;
        this.attackFrame = 0; this.isDefending = false; this.stunned = 0;
        this.touchMove = { dx: 0, dy: 0 }; this.touchAtk = false; this.touchDef = false;
    }

    update() {
        if (this.hp <= 0) return;
        if (this.stunned > 0) { this.stunned--; this.isDefending = false; return; }

        let dx = 0, dy = 0;
        if (isTouchDevice) {
            dx = this.touchMove.dx; dy = this.touchMove.dy;
            this.isDefending = this.touchDef && this.stamina > 0;
            if (this.touchAtk && this.attackFrame === 0 && this.stamina > 20) this.attack();
        } else {
            if (keys[this.config.left]) dx -= 1; if (keys[this.config.right]) dx += 1;
            if (keys[this.config.up]) dy -= 1; if (keys[this.config.down]) dy += 1;
            this.isDefending = keys[this.config.defend] && this.stamina > 0;
            if (keys[this.config.attack] && this.attackFrame === 0 && this.stamina > 20 && !this.isDefending) this.attack();
        }

        if (dx !== 0 || dy !== 0) {
            this.facing = dx !== 0 ? (dx > 0 ? 1 : -1) : this.facing;
            const len = Math.sqrt(dx*dx + dy*dy);
            this.vx = (dx/len) * 5.5; this.vy = (dy/len) * 5.5;
        } else { this.vx *= 0.82; this.vy *= 0.82; }

        if (this.isDefending) { this.vx *= 0.2; this.vy *= 0.2; this.stamina -= 1.8; if(this.stamina<=0) this.stunned=80; }
        else if (this.stamina < 100) this.stamina += 0.55;

        this.x = Math.max(40, Math.min(canvas.width - 40, this.x + this.vx));
        this.y = Math.max(80, Math.min(canvas.height - 40, this.y + this.vy));
        if (this.attackFrame > 0) this.attackFrame--;

        document.getElementById(`hp${this.id}`).style.width = this.hp + '%';
        document.getElementById(`stm${this.id}`).style.width = this.stamina + '%';
    }

    attack() { this.attackFrame = 15; this.stamina -= 20; this.touchAtk = false; this.checkHit(); }

    checkHit() {
        players.forEach(p => {
            if (p === this || p.hp <= 0) return;
            if (Math.hypot(this.x - p.x, this.y - p.y) < 75) {
                p.hp -= p.isDefending ? 2 : 12;
                p.vx += this.facing * (p.isDefending ? 5 : 20);
            }
        });
    }

    draw() {
        if (this.hp <= 0) return;
        ctx.save(); ctx.translate(this.x, this.y);
        
        // Glow for Dark Theme visibility
        if (currentTheme === 'neon') { ctx.shadowBlur = 15; ctx.shadowColor = this.config.neon; }

        ctx.fillStyle = currentTheme === 'neon' ? this.config.neon : "black";
        ctx.font = "bold 18px Arial"; ctx.textAlign = "center";
        ctx.fillText(this.config.label, 0, -85);

        ctx.strokeStyle = "black"; ctx.lineWidth = 8; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(0, -50, 14, 0, Math.PI*2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, -36); ctx.lineTo(0, 0); 
        const walk = Math.sin(Date.now()*0.015) * (Math.abs(this.vx)+Math.abs(this.vy));
        ctx.moveTo(0,0); ctx.lineTo(-15-walk, 30); ctx.moveTo(0,0); ctx.lineTo(15+walk, 30); ctx.stroke();

        const armAngle = this.attackFrame > 0 ? -1.0 : 0.6;
        const hX = 25 * this.facing, hY = -25 + (20 * armAngle);
        ctx.beginPath(); ctx.moveTo(0, -28); ctx.lineTo(hX, hY); ctx.stroke();
        ctx.strokeStyle = '#777'; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.moveTo(hX, hY); ctx.lineTo(hX+(45*this.facing), hY-(this.attackFrame>0?0:40)); ctx.stroke();

        if (this.isDefending) {
            ctx.beginPath(); ctx.arc(0, -20, 55, 0, Math.PI*2);
            ctx.strokeStyle = currentTheme === 'neon' ? this.config.neon : 'rgba(0,150,255,0.4)'; ctx.stroke();
        }
        ctx.restore();
    }
}

async function requestStart(num) {
    if (isTouchDevice) {
        try {
            if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
            if (screen.orientation && screen.orientation.lock) await screen.orientation.lock('landscape');
        } catch(e) {}
    }
    startGame(num);
}

function startGame(num) {
    gameActive = true; startScreen.style.display = 'none'; canvas.style.display = 'block';
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    uiContainer.innerHTML = ''; players = [];
    for (let i = 0; i < num; i++) {
        const c = controlConfigs[i], div = document.createElement('div');
        div.className = `stats p-pos-${i}`;
        if(currentTheme === 'neon') div.style.borderColor = c.neon;
        
        // Added Move Controls to the HUD string
        div.innerHTML = `
            <div style="font-weight:bold; color:${currentTheme==='neon'?c.neon:'white'}">${c.label} (${c.moveKeys})</div>
            <div class="bar-container"><div id="hp${i}" class="hp-bar" style="background:${currentTheme==='neon'?c.neon:'#f44'}"></div></div>
            <div class="bar-container"><div id="stm${i}" class="stamina-bar"></div></div>
            <div class="controls-hint">ATK: ${c.attack.toUpperCase()} | DEF: ${c.defend.toUpperCase()}</div>
        `;
        uiContainer.appendChild(div);
        players.push(new Stickman(i, (i%2==0?200:canvas.width-200), canvas.height/2, c));
    }
    if (isTouchDevice) setupMobileUI(num); 
    requestAnimationFrame(loop);
}

function setupMobileUI(num) {
    const mob = document.getElementById('mobileControls');
    mob.innerHTML = '';
    for (let i = 0; i < num; i++) {
        const zone = document.createElement('div');
        zone.className = `touch-zone ctrl-${i}`;
        zone.innerHTML = `<div class="joystick-base" id="joy-${i}"></div><div class="action-btn" style="right:0;bottom:65px;" id="atk-${i}">ATK</div><div class="action-btn" style="right:0;bottom:0;" id="def-${i}">DEF</div>`;
        mob.appendChild(zone);
        document.getElementById(`atk-${i}`).ontouchstart = (e) => { e.preventDefault(); players[i].touchAtk = true; };
        const dBtn = document.getElementById(`def-${i}`);
        dBtn.ontouchstart = (e) => { e.preventDefault(); players[i].touchDef = true; };
        dBtn.ontouchend = () => players[i].touchDef = false;
        const j = document.getElementById(`joy-${i}`);
        j.ontouchmove = (e) => {
            const t = e.touches[0], r = j.getBoundingClientRect();
            players[i].touchMove = { dx: (t.clientX-(r.left+40))/40, dy: (t.clientY-(r.top+40))/40 };
        };
        j.ontouchend = () => players[i].touchMove = { dx:0, dy:0 };
    }
}

function loop() {
    if (!gameActive) return;
    ctx.fillStyle = currentTheme === 'neon' ? '#1a001a' : '#d1d1d1';
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.strokeStyle = currentTheme === 'neon' ? '#330033' : '#bcbcbc';
    for(let i=0;i<canvas.width;i+=70){ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i,canvas.height);ctx.stroke();}
    players.forEach(p => { p.update(); p.draw(); });
    const alive = players.filter(p => p.hp > 0);
    if (alive.length <= 1) { 
        gameActive = false; winScreen.style.display = 'block'; 
        winText.innerText = alive.length === 1 ? alive[0].config.label + " WINS!" : "DRAW!"; 
    } else requestAnimationFrame(loop);
}