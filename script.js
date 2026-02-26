/**
 * STICKMAN CORNER CLASH - NEON NINJA EDITION
 * Fix: Added Outer Glow to stickmen for visibility in dark themes
 */

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

window.onkeydown = (e) => { keys[e.key.toLowerCase()] = true; };
window.onkeyup = (e) => { keys[e.key.toLowerCase()] = false; };
function setTheme(theme) {
    currentTheme = theme;
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.classList.toggle('active', btn.innerText.toLowerCase().includes(theme));
    });
}

const controlConfigs = [
    { up: 'w', left: 'a', down: 's', right: 'd', attack: 'f', defend: 'g', label: 'P1', neon: '#ff007f' },
    { up: 'arrowup', left: 'arrowleft', down: 'arrowdown', right: 'arrowright', attack: 'control', defend: 'alt', label: 'P2', neon: '#00f2ff' },
    { up: 'i', left: 'j', down: 'k', right: 'l', attack: 'h', defend: 'u', label: 'P3', neon: '#bcff00' },
    { up: '8', left: '4', down: '5', right: '6', attack: '1', defend: '2', label: 'P4', neon: '#ff8800' }
];

class Stickman {
    constructor(id, x, y, config) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.vx = 0; this.vy = 0;
        this.hp = 100;
        this.stamina = 100;
        this.config = config;
        this.facing = x < canvas.width / 2 ? 1 : -1;
        this.attackFrame = 0;
        this.isDefending = false;
        this.stunned = 0;
    }

    update() {
        if (this.hp <= 0) return;
        if (this.stunned > 0) { this.stunned--; this.isDefending = false; return; }

        let dx = 0, dy = 0;
        if (keys[this.config.left]) dx -= 1;
        if (keys[this.config.right]) dx += 1;
        if (keys[this.config.up]) dy -= 1;
        if (keys[this.config.down]) dy += 1;

        if (dx !== 0 || dy !== 0) {
            this.facing = dx !== 0 ? dx : this.facing;
            const len = Math.sqrt(dx * dx + dy * dy);
            this.vx = (dx / len) * 5;
            this.vy = (dy / len) * 5;
        } else {
            this.vx *= 0.8; this.vy *= 0.8;
        }

        this.isDefending = keys[this.config.defend] && this.stamina > 0;
        if (this.isDefending) {
            this.vx *= 0.2; this.vy *= 0.2;
            this.stamina -= 1.8;
            if (this.stamina <= 0) this.stunned = 80;
        } else if (this.stamina < 100) this.stamina += 0.5;

        if (keys[this.config.attack] && this.attackFrame === 0 && this.stamina > 20 && !this.isDefending) {
            this.attackFrame = 15;
            this.stamina -= 20;
            this.checkHit();
        }

        this.x = Math.max(40, Math.min(canvas.width - 40, this.x + this.vx));
        this.y = Math.max(80, Math.min(canvas.height - 40, this.y + this.vy));
        if (this.attackFrame > 0) this.attackFrame--;

        const hpBar = document.getElementById(`hp${this.id}`);
        const stmBar = document.getElementById(`stm${this.id}`);
        if (hpBar) hpBar.style.width = this.hp + '%';
        if (stmBar) stmBar.style.width = this.stamina + '%';
    }

    checkHit() {
        players.forEach(p => {
            if (p === this || p.hp <= 0) return;
            if (Math.hypot(this.x - p.x, this.y - p.y) < 75) {
                p.hp -= p.isDefending ? 2 : 12;
                p.vx += this.facing * (p.isDefending ? 4 : 18);
            }
        });
    }

    draw() {
        if (this.hp <= 0) return;
        ctx.save();
        ctx.translate(this.x, this.y);

        // --- GLOW EFFECT FOR DARK MODE ---
        if (currentTheme === 'neon') {
            ctx.shadowBlur = 15;
            ctx.shadowColor = this.config.neon; // Pink/Blue/Green Glow
        }

        // Identification Label
        ctx.fillStyle = currentTheme === 'neon' ? this.config.neon : "black";
        ctx.font = "bold 18px Arial";
        ctx.textAlign = "center";
        ctx.fillText(this.config.label, 0, -85);

        // Stickman Body (Always black, but glowing now)
        ctx.strokeStyle = "black";
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';

        ctx.beginPath(); ctx.arc(0, -50, 14, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, -36); ctx.lineTo(0, 0); 
        const walk = Math.sin(Date.now() * 0.015) * (Math.abs(this.vx) + Math.abs(this.vy));
        ctx.moveTo(0, 0); ctx.lineTo(-15 - walk, 30);
        ctx.moveTo(0, 0); ctx.lineTo(15 + walk, 30);
        ctx.stroke();

        // Sword
        const armAngle = this.attackFrame > 0 ? -1.0 : 0.6;
        const hX = 25 * this.facing;
        const hY = -25 + (20 * armAngle);
        ctx.beginPath(); ctx.moveTo(0, -28); ctx.lineTo(hX, hY); ctx.stroke();
        
        ctx.strokeStyle = '#888';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(hX, hY);
        ctx.lineTo(hX + (42 * this.facing), hY - (this.attackFrame > 0 ? 0 : 40));
        ctx.stroke();

        // Shield (Clearer Neon Shield)
        if (this.isDefending) {
            ctx.shadowBlur = 20;
            ctx.beginPath(); ctx.arc(0, -20, 55, 0, Math.PI * 2);
            ctx.strokeStyle = currentTheme === 'neon' ? this.config.neon : 'rgba(0, 150, 255, 0.4)';
            ctx.lineWidth = 3;
            ctx.stroke();
        }

        ctx.restore();
    }
}

function startGame(num) {
    gameActive = true;
    startScreen.style.display = 'none';
    canvas.style.display = 'block';
    canvas.width = window.innerWidth * 0.95;
    canvas.height = window.innerHeight * 0.85;
    uiContainer.innerHTML = '';
    players = [];

    for (let i = 0; i < num; i++) {
        const config = controlConfigs[i];
        const statsDiv = document.createElement('div');
        statsDiv.className = `stats p-pos-${i}`;
        
        if(currentTheme === 'neon') statsDiv.style.borderColor = config.neon;

        // Updated HTML to include Movement Controls
        statsDiv.innerHTML = `
            <div style="font-size:14px; font-weight:bold; margin-bottom:5px; color:${currentTheme === 'neon' ? config.neon : 'white'}">${config.label}</div>
            <div class="bar-container"><div id="hp${i}" class="hp-bar" style="width:100%; background:${currentTheme === 'neon' ? config.neon : '#ff4444'}"></div></div>
            <div class="bar-container"><div id="stm${i}" class="stamina-bar" style="width:100%"></div></div>
            <div class="key-hints">
                MOVE: ${config.up.toUpperCase()}-${config.left.toUpperCase()}-${config.down.toUpperCase()}-${config.right.toUpperCase()} 
                <br>
                ATK: ${config.attack.toUpperCase()} | DEF: ${config.defend.toUpperCase()}
            </div>
        `;
        uiContainer.appendChild(statsDiv);
        players.push(new Stickman(i, (i % 2 === 0 ? 200 : canvas.width - 200), (i < 2 ? 200 : canvas.height - 200), config));
    }
    requestAnimationFrame(loop);
}

function loop() {
    if (!gameActive) return;

    if (currentTheme === 'neon') {
        ctx.fillStyle = '#220022'; // Darker Deep Purple for contrast
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#440044'; // Slightly visible dark grid
    } else {
        ctx.fillStyle = '#d1d1d1';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#bcbcbc';
    }

    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.width; i += 70) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke(); }
    for (let i = 0; i < canvas.height; i += 70) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(canvas.width, i); ctx.stroke(); }

    players.forEach(p => { p.update(); p.draw(); });

    const alive = players.filter(p => p.hp > 0);
    if (alive.length <= 1) {
        gameActive = false;
        winScreen.style.display = 'block';
        winText.innerText = alive.length === 1 ? alive[0].config.label + " WINS!" : "DRAW!";
    } else {
        requestAnimationFrame(loop);
    }

}
