const REPO_OWNER = "CoolDude2349";
const REPO_NAME = "Offline-HTML-Games-Pack";
const COMMIT_HASH = "67cb0723e2dd8e723e3ecda3ba40727656bc4a05";
const FOLDER_PATH = "offline";

const API_URL = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FOLDER_PATH}?ref=${COMMIT_HASH}`;
const RAW_BASE_URL = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${COMMIT_HASH}/${FOLDER_PATH}/`;
const CACHE_NAME = "offline-html-game-active-cache-v1";

const gameListEl = document.getElementById("game-list");
const searchInput = document.getElementById("game-search");
const gameFrame = document.getElementById("game-frame");
const gameContainer = document.getElementById("game-container");
const statusOverlay = document.getElementById("status-overlay");
const fullscreenBtn = document.getElementById("fullscreen-btn");
const downloadBtn = document.getElementById("download-btn");
const currentGameTitle = document.getElementById("current-game-title");

const settingsBtn = document.getElementById("settings-btn");
const settingsModal = document.getElementById("settings-modal");
const closeSettingsBtn = document.getElementById("close-settings-btn");
const themeButtons = document.querySelectorAll("[data-set-theme]");
const colorButtons = document.querySelectorAll("[data-set-color]");

let allGames = [];
let currentBlobUrl = null;
let currentGameFileName = null;
let activeGameFileName = null;

// Smart Dictionary: Maps intent, genres, and slang to filename keywords
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

// Levenshtein distance for typo tolerance (e.g. "socer" -> "soccer", "fligt" -> "flight")
function editDistance(a, b) {
  const dp = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[a.length][b.length];
}

// Smart Score Function: Evaluates direct matches, dictionary synonyms, and fuzzy typos
function getSmartScore(gameDisplayName, rawQuery) {
  const query = rawQuery.toLowerCase().trim();
  if (!query) return 1;

  const name = gameDisplayName.toLowerCase();
  const nameTokens = name.split(/[-_.\s]+/);
  const queryTokens = query.split(/\s+/);

  let totalScore = 0;

  for (const qToken of queryTokens) {
    let tokenScore = 0;

    // 1. Exact or prefix match
    if (name === qToken) {
      tokenScore = Math.max(tokenScore, 120);
    } else if (name.startsWith(qToken)) {
      tokenScore = Math.max(tokenScore, 95);
    } else if (name.includes(qToken)) {
      tokenScore = Math.max(tokenScore, 75);
    }

    // 2. Smart Dictionary lookup (checks if user typed a category/synonym like "minecraft" or "fps")
    for (const [dictKey, relatedTerms] of Object.entries(SMART_DICTIONARY)) {
      if (dictKey.includes(qToken) || qToken.includes(dictKey)) {
        for (const term of relatedTerms) {
          if (name.includes(term.toLowerCase())) {
            tokenScore = Math.max(tokenScore, 65);
          }
        }
      }
    }

    // 3. Fuzzy typo matching against each word in the game's title
    if (tokenScore === 0 && qToken.length >= 3) {
      for (const word of nameTokens) {
        if (word.length < 3) continue;
        const dist = editDistance(qToken, word);
        const allowedTypos = qToken.length >= 6 ? 2 : 1;
        if (dist <= allowedTypos) {
          tokenScore = Math.max(tokenScore, 45 - dist * 10);
        }
      }
    }

    // 4. Subsequence check (letters appear in order)
    if (tokenScore === 0 && qToken.length >= 3) {
      let qi = 0;
      for (let ni = 0; ni < name.length && qi < qToken.length; ni++) {
        if (name[ni] === qToken[qi]) qi++;
      }
      if (qi === qToken.length) {
        tokenScore = Math.max(tokenScore, 20);
      }
    }

    if (tokenScore === 0) return 0; // Every word in the search box must match something
    totalScore += tokenScore;
  }

  return totalScore;
}

// Render filtered and sorted game buttons in the right sidebar
function renderGameList(query = "") {
  gameListEl.innerHTML = "";

  const scoredGames = allGames
    .map((game) => ({
      ...game,
      score: getSmartScore(game.displayName, query)
    }))
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
    if (game.fileName === activeGameFileName) {
      btn.classList.add("active");
    }
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

// 1. Fetch repository game list from GitHub API
async function loadGameList() {
  try {
    const response = await fetch(API_URL);
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

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

// 2. Cache selected game and run it in the top-left screen
async function cacheAndRunGame(fileName, displayName) {
  statusOverlay.textContent = `Caching ${displayName}...`;
  statusOverlay.classList.remove("hidden");
  currentGameTitle.textContent = `Caching: ${displayName}...`;
  downloadBtn.disabled = true;

  gameFrame.removeAttribute("srcdoc");
  gameFrame.src = "about:blank";

  const rawGameUrl = `${RAW_BASE_URL}${encodeURIComponent(fileName)}`;

  try {
    let htmlText = "";

    if ("caches" in window) {
      const cache = await caches.open(CACHE_NAME);
      const keys = await cache.keys();
      await Promise.all(keys.map((key) => cache.delete(key)));

      const networkResponse = await fetch(rawGameUrl, { cache: "reload" });
      if (!networkResponse.ok) {
        throw new Error(`Failed to fetch game (${networkResponse.status})`);
      }

      await cache.put(rawGameUrl, networkResponse.clone());
      const cachedResponse = await cache.match(rawGameUrl);
      htmlText = await cachedResponse.text();
    } else {
      const response = await fetch(rawGameUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch game (${response.status})`);
      }
      htmlText = await response.text();
    }

    if (currentBlobUrl) {
      URL.revokeObjectURL(currentBlobUrl);
    }

    const blob = new Blob([htmlText], { type: "text/html" });
    currentBlobUrl = URL.createObjectURL(blob);
    currentGameFileName = fileName;

    gameFrame.srcdoc = htmlText;
    statusOverlay.classList.add("hidden");

    // Update the under-game bar with the active game's name and enable the download button
    currentGameTitle.textContent = displayName;
    downloadBtn.disabled = false;
  } catch (error) {
    statusOverlay.textContent = `Failed to load ${displayName}: ${error.message}`;
    currentGameTitle.textContent = `Error loading ${displayName}`;
  }
}

// 3. Smart Search input listener
searchInput.addEventListener("input", (e) => {
  renderGameList(e.target.value);
});

// 4. Download the currently cached game
downloadBtn.addEventListener("click", () => {
  if (!currentBlobUrl || !currentGameFileName) return;

  const tempLink = document.createElement("a");
  tempLink.href = currentBlobUrl;
  tempLink.download = currentGameFileName;
  document.body.appendChild(tempLink);
  tempLink.click();
  document.body.removeChild(tempLink);
});

// 5. Fullscreen toggle for the game box
fullscreenBtn.addEventListener("click", () => {
  if (!document.fullscreenElement) {
    gameContainer.requestFullscreen().catch((err) => {
      console.error("Fullscreen error:", err);
    });
  } else {
    document.exitFullscreen();
  }
});

// 6. Settings Modal & Theme/Color Switching (Saved in localStorage)
function applySavedPreferences() {
  const savedTheme = localStorage.getItem("papo_ui_theme") || "classic";
  const savedColor = localStorage.getItem("papo_ui_color") || "default";

  document.body.setAttribute("data-theme", savedTheme);
  document.body.setAttribute("data-color", savedColor);

  themeButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.setTheme === savedTheme);
  });
  colorButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.setColor === savedColor);
  });
}

settingsBtn.addEventListener("click", () => {
  settingsModal.classList.remove("hidden");
});

closeSettingsBtn.addEventListener("click", () => {
  settingsModal.classList.add("hidden");
});

settingsModal.addEventListener("click", (e) => {
  if (e.target === settingsModal) {
    settingsModal.classList.add("hidden");
  }
});

themeButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const chosenTheme = btn.dataset.setTheme;
    document.body.setAttribute("data-theme", chosenTheme);
    localStorage.setItem("papo_ui_theme", chosenTheme);

    themeButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
  });
});

colorButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const chosenColor = btn.dataset.setColor;
    document.body.setAttribute("data-color", chosenColor);
    localStorage.setItem("papo_ui_color", chosenColor);

    colorButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
  });
});

// Initialize preferences and load games
applySavedPreferences();
loadGameList();
