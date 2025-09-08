// script.js — frontend module (ESM)
// ПОЛНОЕ РАБОЧЕЕ ПРИЛОЖЕНИЕ с Firebase Realtime DB (лидерборд).
// ЗАМЕНИТЕ FIREBASE_CONFIG на свои данные из Firebase Console.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, set, onValue, query, orderByChild, limitToLast, get } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

/* ================== ВСТАВЬ СВОЙ FIREBASE CONFIG ==================
В Firebase Console -> Project settings -> SDK -> Realtime Database (или Web app)
Скопируй объект конфигурации сюда.
================================================================== */
const FIREBASE_CONFIG = {
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT.firebaseio.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
/* ================================================================= */

const app = initializeApp(FIREBASE_CONFIG);
const db = getDatabase(app);

// ---- Game state ----
let coins = parseInt(localStorage.getItem("coins") || "0", 10);
let coinsPerClick = parseFloat(localStorage.getItem("cpc") || "1");
let autoClick = parseFloat(localStorage.getItem("auto") || "0");
let level = parseInt(localStorage.getItem("level") || "1", 10);
let isPremium = false; // ставим в false, можно изменить через Firebase

const coinsDisplay = document.getElementById("coins");
const levelDisplay = document.getElementById("level");
const coinImg = document.getElementById("coin");
const shopDiv = document.getElementById("shop");
const memeShopDiv = document.getElementById("meme-shop");
const achievementsList = document.getElementById("achievements");
const leaderboardList = document.getElementById("leaderboard");
const playerNameEl = document.getElementById("playerName");

// Telegram WebApp user
let tg = window.Telegram?.WebApp;
if (tg && tg.expand) tg.expand();
const player = tg?.initDataUnsafe?.user || { first_name: "Аноним", id: 0 };
const playerId = player.id || 0;
let playerName = (player.first_name || "Аноним") + (isPremium ? " ⭐" : "");
playerNameEl.textContent = playerName;

// ---- Upgrades ----
const upgrades = [
  { id: "laptop", name: "💻 Ноутбук", cost: 10, type: "click", value: 1 },
  { id: "pc", name: "🖥️ Геймерский ПК", cost: 50, type: "click", value: 5 },
  { id: "garage", name: "🗄️ Сервер в гараже", cost: 100, type: "auto", value: 1 },
  { id: "dc", name: "🏢 Дата-центр", cost: 500, type: "auto", value: 10 },
  { id: "gpt", name: "🤖 GPT++", cost: 2000, type: "click-mult", value: 2 },
  { id: "ipo", name: "📈 IPO", cost: 10000, type: "global-mult", value: 2 }
];

const memeUpgrades = [
  { id: "scamcoin", name: "🪙 Скам-токен (мем)", cost: 300, type: "click", value: 10 },
  { id: "tiktok_investor", name: "📱 Инвестор из TikTok", cost: 750, type: "auto", value: 25 },
  { id: "ai_cat", name: "😺 ИИ-кот (эксклюзив)", cost: 2000, type: "click-mult", value: 2, premiumOnly: true },
];

// ---- Helpers ----
function saveLocal() {
  localStorage.setItem("coins", Math.floor(coins));
  localStorage.setItem("cpc", coinsPerClick);
  localStorage.setItem("auto", autoClick);
  localStorage.setItem("level", level);
}

function updateUI() {
  coinsDisplay.textContent = Math.floor(coins);
  levelDisplay.textContent = level;
  playerNameEl.textContent = (player.first_name || "Аноним") + (isPremium ? " ⭐" : "");
  saveLocal();
}

// Achievements
function addAchievement(text) {
  const li = document.createElement("li");
  li.className = "ach-badge";
  li.textContent = text;
  achievementsList.appendChild(li);
}

// Spawn floating token
function spawnTokenEffect(x, y, amount) {
  const node = document.createElement("div");
  node.className = "token-float";
  node.style.left = `${x}px`;
  node.style.top = `${y}px`;
  node.textContent = `+${amount}`;
  document.body.appendChild(node);
  setTimeout(() => node.remove(), 1000);
}

// ---- Shop / buy ----
function buyUpgrade(item) {
  if (item.premiumOnly && !isPremium) {
    addAchievement("🔒 Нужно Премиум для: " + item.name);
    return;
  }
  if (coins < item.cost) {
    addAchievement("Недостаточно токенов для " + item.name);
    return;
  }
  coins -= item.cost;
  if (item.type === "click") coinsPerClick += item.value;
  if (item.type === "auto") autoClick += item.value;
  if (item.type === "click-mult") coinsPerClick *= item.value;
  if (item.type === "global-mult") { coinsPerClick *= item.value; autoClick *= item.value; }
  addAchievement("Куплен: " + item.name);
  updateUI();
  saveScoreToFirebase();
}

function renderShop() {
  shopDiv.innerHTML = "";
  upgrades.forEach(u => {
    const btn = document.createElement("button");
    btn.className = "shop-btn";
    btn.textContent = `${u.name} — ${u.cost}🪙`;
    btn.onclick = () => buyUpgrade(u);
    shopDiv.appendChild(btn);
  });
  memeShopDiv.innerHTML = "";
  memeUpgrades.forEach(m => {
    const btn = document.createElement("button");
    btn.className = "shop-btn";
    btn.textContent = `${m.name} — ${m.cost}🪙` + (m.premiumOnly ? " (Премиум)" : "");
    btn.onclick = () => buyUpgrade(m);
    memeShopDiv.appendChild(btn);
  });
}

// ---- Click handling ----
coinImg.addEventListener("click", (e) => {
  const crit = Math.random() < 0.12; // 12% crit chance
  const multiplier = crit ? (2 + Math.floor(Math.random() * 4)) : 1; // x2-x5
  const gainBase = coinsPerClick * (isPremium ? 1.5 : 1);
  const gain = Math.floor(gainBase * multiplier);
  coins += gain;
  spawnTokenEffect(e.pageX, e.pageY, gain);
  updateUI();
  saveScoreToFirebase();
});

// ---- Autoclick ----
setInterval(() => {
  const gain = autoClick * (isPremium ? 1.5 : 1);
  if (gain > 0) {
    coins += gain;
    updateUI();
    saveScoreToFirebase();
  }
}, 1000);

// ---- Levels ----
function checkLevelUp() {
  const nextLevel = Math.floor(Math.log2(coins + 1)) + 1;
  if (nextLevel > level) {
    level = nextLevel;
    addAchievement(`🎉 Новый уровень: ${level}`);
    updateUI();
  }
}
setInterval(checkLevelUp, 2000);

// ---- Firebase leaderboard ----
function saveScoreToFirebase() {
  if (!playerId) return; // если нет телеграм id
  const playerRef = ref(db, "players/" + playerId);
  // сохраняем: id, name, coins, level, premium (0/1)
  set(playerRef, {
    id: playerId,
    name: player.first_name || "Аноним",
    coins: Math.floor(coins),
    level: level,
    premium: isPremium ? 1 : 0
  }).catch(err => console.warn("Firebase save error:", err));
}

function loadLeaderboard() {
  const topPlayers = query(ref(db, "players"), orderByChild("coins"), limitToLast(10));
  onValue(topPlayers, (snapshot) => {
    const arr = [];
    snapshot.forEach(child => arr.push(child.val()));
    arr.sort((a,b) => b.coins - a.coins);
    leaderboardList.innerHTML = "";
    arr.forEach((p, i) => {
      const li = document.createElement("li");
      li.textContent = `${i+1}. ${p.name}${p.premium ? " ⭐" : ""} — ${p.coins}🪙 (LVL ${p.level})`;
      leaderboardList.appendChild(li);
    });
  });
}

// ---- Premium check (read from Firebase) ----
// Если хочешь включать премиум вручную через Firebase Console, функция проверит это здесь:
async function refreshPremiumFromFirebase() {
  if (!playerId) return;
  try {
    const snap = await get(ref(db, "players/" + playerId));
    const val = snap.val();
    if (val && val.premium) {
      isPremium = true;
    } else {
      isPremium = false;
    }
    updateUI();
  } catch (err) {
    console.warn("Ошибка чтения премиума:", err);
  }
}
setInterval(refreshPremiumFromFirebase, 15000);

// ---- Init ----
renderShop();
updateUI();
loadLeaderboard();
saveScoreToFirebase();
refreshPremiumFromFirebase();
