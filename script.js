const REPO_OWNER = "CoolDude2349";
const REPO_NAME = "Offline-HTML-Games-Pack";
const COMMIT_HASH = "67cb0723e2dd8e723e3ecda3ba40727656bc4a05";
const FOLDER_PATH = "offline";
const API_URL = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FOLDER_PATH}?ref=${COMMIT_HASH}`;
const RAW_BASE_URL = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${COMMIT_HASH}/${FOLDER_PATH}/`;
const CACHE_NAME = "offline-html-game-active-cache-v1";

const gameListEl = document.getElementById("game-list");
const searchInput = document.getElementById("game-search");
const gameContainer = document.getElementById("game-container");
const statusOverlay = document.getElementById("status-overlay");
const fullscreenBtn = document.getElementById("fullscreen-btn");
const downloadBtn = document.getElementById("download-btn");
const currentGameTitle = document.getElementById("current-game-title");

const settingsBtn = document.getElementById("settings-btn");
const settingsModal = document.getElementById("settings-modal");
const closeSettingsBtn = document.getElementById("close-settings-btn");
const themeButtons = document.querySelectorAll("[data-set-theme]");

const tabBtns = document.querySelectorAll(".tab-btn");
const tabPanes = document.querySelectorAll(".tab-pane");
const swatchesLayer1 = document.getElementById("swatches-layer1");
const swatchesLayer2 = document.getElementById("swatches-layer2");
const glowLayer1 = document.getElementById("glow-layer1");
const glowLayer2 = document.getElementById("glow-layer2");

const creditsToggle = document.getElementById("credits-toggle");
const creditsContent = document.getElementById("credits-content");
const dlHtml = document.getElementById("dl-html");
const dlCss = document.getElementById("dl-css");
const dlJs = document.getElementById("dl-js");
const dlZip = document.getElementById("dl-zip");

let allGames = [];
let currentBlobUrl = null;
let currentGameFileName = null;
let activeGameFileName = null;

const COLORS = [
  "reset", "#ffffff", "#000000", "#333333", "#777777", "#aaaaaa",
  "#ff0000", "#ff4500", "#ff8800", "#ffcc00", "#ffff00", "#ccff00",
  "#88ff00", "#00ff00", "#00ff88", "#00ffff", "#0088ff", "#0000ff",
  "#8800ff", "#ff00ff", "#ff0088"
];

const SMART_DICTIONARY = {
  minecraft: ["1.5", "1.8", "1.12", "alpha", "eagler", "craft", "mine", "wasm"],
  craft: ["1.5", "1.8", "1.12", "alpha", "craft", "mine", "terraria"],
  blocks: ["1.5", "1.8", "1.12", "alpha", "2048", "tetris", "block"],
  soccer: ["soccer", "free-kick", "football", "goal", "fifa", "penalty"],
  football: ["soccer", "free-kick", "football", "retro-bowl", "bowl"],
  sports: ["soccer", "tennis", "8-ball", "pool", "basket", "golf", "bowl", "free-kick", "skate"],
  tennis: ["tennis", "pong", "badminton"],
  pool: ["8-ball", "billiard", "pool"],
  shooter: ["1v1", "dawn", "doom", "quake", "gun", "shoot", "sniper", "combat", "strike", "superhot", "time-shooter"],
  fps: ["1v1", "doom", "quake", "superhot", "shooter", "wolfenstein", "halo"],
  gun: ["1v1", "dawn", "gun", "shoot", "recoil", "pistol", "battle"],
  battle: ["1v1", "battles", "dawn", "war", "fight", "smash", "brawl"],
  multiplayer: ["1-on-1", "12-mini-battles", "1v1", "2-player", "pong", "tank", "rooftop"],
  twoplayer: ["1-on-1", "12-mini-battles", "2-player", "pong", "getaway", "rooftop"],
  puzzle: ["2048", "9007199254740992", "cut-the-rope", "minesweeper", "sudoku", "tetris", "wordle", "portal", "chess"],
  math: ["2048", "9007199254740992", "sudoku", "minesweeper", "calc"],
  numbers: ["2048", "9007199254740992", "minesweeper"],
  flying: ["flight", "simulator", "plane", "jet", "flappy", "heli", "rocket", "space"],
  plane: ["flight", "simulator", "plane", "jet"],
  racing: ["car", "drift", "drive", "moto", "race", "racing", "kart", "track", "highway", "traffic"],
  car: ["car", "drift", "drive", "parking", "kart", "race", "madalin", "polytrack"],
  driving: ["car", "drift", "drive", "Simulator", "truck", "moto"],
  platformer: ["mario", "sonic", "vex", "celeste", "geometry", "ovO", "run", "jump", "knight", "fireboy"],
  mario: ["mario", "sm64", "kart", "luigi", "nes"],
  horror: ["fnaf", "five-nights", "granny", "baldi", "scary", "backrooms", "zombie", "dawn"],
  scary: ["fnaf", "five-nights", "granny", "baldi", "backrooms"],
  arcade: ["pac", "tetris", "pong", "flappy", "dino", "snake", "space", "atari", "classic"],
  idle: ["clicker", "cookie", "idle", "tycoon", "doge", "monkey"],
  clicker: ["clicker", "cookie", "idle", "merge"],
  strategy: ["chess", "tower", "defense", "bloons", "btd", "civilization", "plants"],
  food: ["cupcakes", "cookie", "papa", "pizza", "burger", "sushi", "fruit"]
};

function editDistance(a, b) {
  const dp = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[a.length][b.length];
}

function getSmartScore(gameDisplayName, rawQuery) {
  const query = rawQuery.toLowerCase().trim();
  if (!query) return 1;
  const name = gameDisplayName.toLowerCase();
  const nameTokens = name.split(/[-_.\s]+/);
  const queryTokens = query.split(/\s+/);
  let totalScore = 0;
  for (const qToken of queryTokens) {
    let tokenScore = 0;
    if (name === qToken) tokenScore = Math.max(tokenScore, 120);
    else if (name.startsWith(qToken)) tokenScore = Math.max(tokenScore, 95);
    else if (name.includes(qToken)) tokenScore = Math.max(tokenScore, 75);
    for (const [dictKey, relatedTerms] of Object.entries(SMART_DICTIONARY)) {
      if (dictKey.includes(qToken) || qToken.includes(dictKey)) {
        for (const term of relatedTerms) {
          if (name.includes(term.toLowerCase())) tokenScore = Math.max(tokenScore, 65);
        }
      }
    }
    if (tokenScore === 0 && qToken.length >= 3) {
      for (const word of nameTokens) {
        if (word.length < 3) continue;
        const dist = editDistance(qToken, word);
        const allowedTypos = qToken.length >= 6 ? 2 : 1;
        if (dist <= allowedTypos) tokenScore = Math.max(tokenScore, 45 - dist * 10);
      }
    }
    if (tokenScore === 0 && qToken.length >= 3) {
      let qi = 0;
      for (let ni = 0; ni < name.length && qi < qToken.length; ni++) {
        if (name[ni] === qToken[qi]) qi++;
      }
      if (qi === qToken.length) tokenScore = Math.max(tokenScore, 20);
    }
    if (tokenScore === 0) return 0;
    totalScore += tokenScore;
  }
  return totalScore;
}

function renderGameList(query = "") {
  gameListEl.innerHTML = "";
  const scoredGames = allGames
    .map((game) => ({ ...game, score: getSmartScore(game.displayName, query) }))
    .filter((item) => item.score > 0);
  if (query.trim() !== "") {
    scoredGames.sort((a, b) => b.score - a.score || a.displayName.localeCompare(b.displayName));
  }
  if (scoredGames.length === 0) {
    gameListEl.innerHTML = `<div class="loading-item">No matching games found.</div>`;
    return;
  }
  scoredGames.forEach((game) => {
    const btn = document.createElement("button");
    btn.className = "game-item";
    if (game.fileName === activeGameFileName) btn.classList.add("active");
    btn.textContent = game.displayName;
    btn.addEventListener("click", () => {
      activeGameFileName = game.fileName;
      document.querySelectorAll(".game-item").forEach((el) => el.classList.remove("active"));
      btn.classList.add("active");
      cacheAndRunGame(game.fileName, game.displayName);
    });
    gameListEl.appendChild(btn);
  });
}

async function loadGameList() {
  try {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error(`GitHub API error: ${response.status}`);
    const files = await response.json();
    allGames = files
      .filter((file) => file.type === "file" && file.name.toLowerCase().endsWith(".html"))
      .map((file) => ({
        fileName: file.name,
        displayName: file.name.replace(/\.html$/i, "")
      }));
    renderGameList();
  } catch (error) {
    gameListEl.innerHTML = `<div class="loading-item">Error loading games: ${error.message}</div>`;
  }
}

function recreateIframe() {
  const oldFrame = document.getElementById("game-frame");
  if (oldFrame) oldFrame.remove();
  const newFrame = document.createElement("iframe");
  newFrame.id = "game-frame";
  newFrame.title = "Game Screen";
  newFrame.sandbox = "allow-scripts allow-same-origin allow-pointer-lock allow-forms";
  gameContainer.insertBefore(newFrame, fullscreenBtn);
  return newFrame;
}

async function cacheAndRunGame(fileName, displayName) {
  statusOverlay.textContent = `Caching ${displayName}...`;
  statusOverlay.classList.remove("hidden");
  currentGameTitle.textContent = `Caching: ${displayName}...`;
  downloadBtn.disabled = true;
  const frame = recreateIframe();
  const rawGameUrl = `${RAW_BASE_URL}${encodeURIComponent(fileName)}`;
  try {
    let htmlText = "";
    if ("caches" in window) {
      const cache = await caches.open(CACHE_NAME);
      const keys = await cache.keys();
      await Promise.all(keys.map((key) => cache.delete(key)));
      const networkResponse = await fetch(rawGameUrl, { cache: "reload" });
      if (!networkResponse.ok) throw new Error(`Failed to fetch game`);
      await cache.put(rawGameUrl, networkResponse.clone());
      const cachedResponse = await cache.match(rawGameUrl);
      htmlText = await cachedResponse.text();
    } else {
      const response = await fetch(rawGameUrl);
      if (!response.ok) throw new Error(`Failed to fetch game`);
      htmlText = await response.text();
    }
    if (currentBlobUrl) URL.revokeObjectURL(currentBlobUrl);
    const blob = new Blob([htmlText], { type: "text/html" });
    currentBlobUrl = URL.createObjectURL(blob);
    currentGameFileName = fileName;
    frame.srcdoc = htmlText;
    statusOverlay.classList.add("hidden");
    currentGameTitle.textContent = displayName;
    downloadBtn.disabled = false;
  } catch (error) {
    statusOverlay.textContent = `Failed to load ${displayName}: ${error.message}`;
    currentGameTitle.textContent = `Error loading ${displayName}`;
  }
}

searchInput.addEventListener("input", (e) => {
  renderGameList(e.target.value);
});

downloadBtn.addEventListener("click", () => {
  if (!currentBlobUrl || !currentGameFileName) return;
  const tempLink = document.createElement("a");
  tempLink.href = currentBlobUrl;
  tempLink.download = currentGameFileName;
  document.body.appendChild(tempLink);
  tempLink.click();
  document.body.removeChild(tempLink);
});

fullscreenBtn.addEventListener("click", () => {
  if (!document.fullscreenElement) {
    gameContainer.requestFullscreen().catch((err) => console.error(err));
  } else {
    document.exitFullscreen();
  }
});

function applyColorToElement(cssVar, value, storageKey) {
  if (value === "reset") {
    document.body.style.removeProperty(cssVar);
    localStorage.removeItem(storageKey);
  } else {
    document.body.style.setProperty(cssVar, value);
    localStorage.setItem(storageKey, value);
  }
}

function buildSwatches(container, cssVar, storageKey) {
  const saved = localStorage.getItem(storageKey) || "reset";
  container.innerHTML = "";
  COLORS.forEach(c => {
    const s = document.createElement("div");
    s.className = "swatch" + (c === "reset" ? " reset" : "");
    if (c !== "reset") s.style.backgroundColor = c;
    if (c === saved) s.classList.add("active");
    s.addEventListener("click", () => {
      container.querySelectorAll(".swatch").forEach(el => el.classList.remove("active"));
      s.classList.add("active");
      applyColorToElement(cssVar, c, storageKey);
    });
    container.appendChild(s);
  });
}

function initSettings() {
  const savedTheme = localStorage.getItem("papo_theme") || "classic";
  document.body.setAttribute("data-theme", savedTheme);
  themeButtons.forEach(b => {
    b.classList.toggle("active", b.dataset.setTheme === savedTheme);
    b.addEventListener("click", () => {
      document.body.setAttribute("data-theme", b.dataset.setTheme);
      localStorage.setItem("papo_theme", b.dataset.setTheme);
      themeButtons.forEach(x => x.classList.remove("active"));
      b.classList.add("active");
    });
  });

  const cBg = localStorage.getItem("papo_layer1") || "reset";
  if (cBg !== "reset") document.body.style.setProperty("--custom-bg", cBg);
  buildSwatches(swatchesLayer1, "--custom-bg", "papo_layer1");

  const cOut = localStorage.getItem("papo_layer2") || "reset";
  if (cOut !== "reset") document.body.style.setProperty("--custom-outline", cOut);
  buildSwatches(swatchesLayer2, "--custom-outline", "papo_layer2");

  const g1 = localStorage.getItem("papo_glow1") === "true";
  glowLayer1.checked = g1;
  document.body.style.setProperty("--custom-glow1", g1 ? (cBg === "reset" ? "rgba(255,255,255,0.2)" : cBg) : "none");
  glowLayer1.addEventListener("change", () => {
    localStorage.setItem("papo_glow1", glowLayer1.checked);
    const col = localStorage.getItem("papo_layer1") || "reset";
    document.body.style.setProperty("--custom-glow1", glowLayer1.checked ? (col === "reset" ? "rgba(255,255,255,0.2)" : col) : "none");
  });

  const g2 = localStorage.getItem("papo_glow2") === "true";
  glowLayer2.checked = g2;
  document.body.style.setProperty("--custom-glow2", g2 ? (cOut === "reset" ? "rgba(255,255,255,0.5)" : cOut) : "none");
  glowLayer2.addEventListener("change", () => {
    localStorage.setItem("papo_glow2", glowLayer2.checked);
    const col = localStorage.getItem("papo_layer2") || "reset";
    document.body.style.setProperty("--custom-glow2", glowLayer2.checked ? (col === "reset" ? "rgba(255,255,255,0.5)" : col) : "none");
  });
}

tabBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    tabBtns.forEach(b => b.classList.remove("active"));
    tabPanes.forEach(p => p.classList.add("hidden"));
    btn.classList.add("active");
    document.getElementById("tab-pane-" + btn.dataset.tab).classList.remove("hidden");
  });
});

settingsBtn.addEventListener("click", () => settingsModal.classList.remove("hidden"));
closeSettingsBtn.addEventListener("click", () => settingsModal.classList.add("hidden"));
settingsModal.addEventListener("click", (e) => {
  if (e.target === settingsModal) settingsModal.classList.add("hidden");
});
creditsToggle.addEventListener("click", () => creditsContent.classList.toggle("hidden"));

async function fetchSourceCode(file) {
  const res = await fetch("./" + file);
  return await res.text();
}

async function triggerDownload(file, name) {
  const text = await fetchSourceCode(file);
  const blob = new Blob([text], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
}

dlHtml.addEventListener("click", () => triggerDownload("index.html", "index.html.txt"));
dlCss.addEventListener("click", () => triggerDownload("style.css", "style.css.txt"));
dlJs.addEventListener("click", () => triggerDownload("script.js", "script.js.txt"));

dlZip.addEventListener("click", async () => {
  if (typeof JSZip === "undefined") return alert("JSZip library not loaded yet.");
  const zip = new JSZip();
  zip.file("index.html.txt", await fetchSourceCode("index.html"));
  zip.file("style.css.txt", await fetchSourceCode("style.css"));
  zip.file("script.js.txt", await fetchSourceCode("script.js"));
  const blob = await zip.generateAsync({ type: "blob" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "source_code_bundle.zip";
  a.click();
});

initSettings();
loadGameList();
