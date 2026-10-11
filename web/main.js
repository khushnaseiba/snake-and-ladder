import init, { Game, snake_tail, ladder_top } from "./pkg/snake_and_ladder.js";

const boardEl = document.getElementById("board");
const diceEl = document.getElementById("dice");
const diceCaptionEl = document.getElementById("dice-caption");
const rollCountEl = document.getElementById("roll-count");
const rollBtn = document.getElementById("roll-btn");
const newGameBtn = document.getElementById("new-game-btn");
const countEl = document.getElementById("player-count");
const playersEl = document.getElementById("players");
const turnCardEl = document.getElementById("turn-card");
const turnOrbEl = document.getElementById("turn-orb");
const turnTitleEl = document.getElementById("turn-title");
const turnHintEl = document.getElementById("turn-hint");
const celebrationEl = document.getElementById("celebration");
const confettiEl = document.getElementById("confetti-field");
const winnerTitleEl = document.getElementById("winner-title");
const winnerCopyEl = document.getElementById("winner-copy");
const winnerScoreEl = document.getElementById("winner-score");
const playAgainBtn = document.getElementById("play-again-btn");
const closeCelebrationBtn = document.getElementById("close-celebration-btn");

const STEP_MS = 90;
const PLAYER_COLORS = ["#3478d4", "#e4554f", "#2e9b70", "#8b63d9"];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let game;
let tokens = [];
let rolling = false;
let resizeFrame = 0;

function squareToRowCol(n) {
  if (n <= 0) return { row: 9, col: 0 };
  const i = n - 1;
  const rowFromBottom = Math.floor(i / 10);
  let col = i % 10;
  if (rowFromBottom % 2 === 1) col = 9 - col;
  return { row: 9 - rowFromBottom, col };
}

function cellIndex(n) {
  const { row, col } = squareToRowCol(n);
  return row * 10 + col;
}

function setTokenPos(token, square, playerIdx) {
  const { row, col } = squareToRowCol(square);
  const offsets = [[-22, -22], [22, -22], [-22, 22], [22, 22]];
  const [dx, dy] = offsets[playerIdx];
  token.style.transform = `translate(${col * 100 + dx}%, ${row * 100 + dy}%)`;
  token.dataset.square = String(square);
}

function squareCenter(square, boardRect) {
  const { row, col } = squareToRowCol(square);
  const size = boardRect.width / 10;
  return {
    x: (col + 0.5) * size,
    y: (row + 0.5) * size,
    size
  };
}

function makeFeature(type, from, to, boardRect) {
  const start = squareCenter(from, boardRect);
  const end = squareCenter(to, boardRect);
  const image = document.createElement("img");
  image.className = `board-feature ${type}-feature`;
  image.src = type === "snake" ? "./assets/snake.png" : "./assets/ladder.png";
  image.alt = "";
  image.draggable = false;
  image.setAttribute("aria-hidden", "true");
  image.style.left = `${(start.x + end.x) / 2}px`;
  image.style.top = `${(start.y + end.y) / 2}px`;

  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const distance = Math.max(Math.hypot(dx, dy), start.size * 1.1);

  if (type === "snake") {
    const angle = Math.atan2(-dx, dy) * 180 / Math.PI;
    image.style.width = `${start.size * 0.9}px`;
    image.style.height = `${distance * 1.02}px`;
    image.style.transform = `translate(-50%, -50%) rotate(${angle}deg)`;
    image.style.zIndex = "0";
  } else {
    const angle = Math.atan2(dx, -dy) * 180 / Math.PI;
    image.style.width = `${start.size * 0.8}px`;
    image.style.height = `${distance * 1.03}px`;
    image.style.transform = `translate(-50%, -50%) rotate(${angle}deg)`;
    image.style.zIndex = "0";
  }

  return image;
}

function buildBoard() {
  boardEl.replaceChildren();
  tokens = [];

  const artEl = document.createElement("div");
  artEl.className = "board-art";
  artEl.setAttribute("aria-hidden", "true");
  boardEl.appendChild(artEl);

  const cells = new Array(100);
  for (let n = 1; n <= 100; n++) {
    const cell = document.createElement("div");
    cell.className = `cell ${n % 2 === 0 ? "dark" : "light"}`;
    cell.dataset.square = String(n);

    const number = document.createElement("span");
    number.className = "cell-number";
    number.textContent = String(n);
    cell.appendChild(number);

    const tail = snake_tail(n);
    const top = ladder_top(n);
    if (tail !== 0) {
      cell.classList.add("snake-start");
      cell.title = `Snake from ${n} to ${tail}`;
    } else if (top !== 0) {
      cell.classList.add("ladder-start");
      cell.title = `Ladder from ${n} to ${top}`;
    }
    if (n === 1) cell.classList.add("start-square");
    if (n === 100) cell.classList.add("finish-square");
    cells[cellIndex(n)] = cell;
  }
  cells.forEach((cell) => boardEl.appendChild(cell));

  for (let i = 0; i < 4; i++) {
    const token = document.createElement("div");
    token.className = `token p${i}`;
    token.style.display = "none";
    token.setAttribute("aria-hidden", "true");
    const dot = document.createElement("div");
    dot.className = "dot";
    const number = document.createElement("span");
    number.className = "token-number";
    number.textContent = String(i + 1);
    dot.appendChild(number);
    token.appendChild(dot);
    boardEl.appendChild(token);
    tokens.push(token);
  }

  drawBoardFeatures();
}

function drawBoardFeatures() {
  const artEl = boardEl.querySelector(".board-art");
  if (!artEl || !game) return;
  artEl.replaceChildren();
  const rect = boardEl.getBoundingClientRect();
  if (!rect.width) return;

  for (let n = 1; n <= 100; n++) {
    const tail = snake_tail(n);
    const top = ladder_top(n);
    if (tail) artEl.appendChild(makeFeature("snake", n, tail, rect));
    if (top) artEl.appendChild(makeFeature("ladder", n, top, rect));
  }
}

function describeRoll(r) {
  const name = `Player ${r.player() + 1}`;
  const dice = r.dice();
  if (r.won()) return `${name} rolled ${dice} and reached 100. What a finish!`;
  if (r.hit_snake()) return `${name} rolled ${dice} and slid down the snake from ${r.landed()} to ${r.to()}.`;
  if (r.hit_ladder()) return `${name} rolled ${dice} and climbed the ladder from ${r.landed()} to ${r.to()}.`;
  if (r.landed() > 100) return `${name} rolled ${dice}. Needs exactly ${100 - r.from()} to finish, so stays on ${r.from()}.`;
  const from = r.from() === 0 ? "the start" : `square ${r.from()}`;
  return `${name} rolled ${dice} and moved from ${from} to ${r.to()}.`;
}

function updatePlayerPanel() {
  const positions = game.positions();
  const current = game.current_player();
  const cards = playersEl.querySelectorAll(".player-card");

  cards.forEach((card, index) => {
    const active = !game.is_over() && index === current;
    card.classList.toggle("active", active);
    card.classList.toggle("finished", positions[index] === 100);
    card.setAttribute("aria-current", active ? "true" : "false");
    const positionEl = card.querySelector(".player-position");
    const badgeEl = card.querySelector(".player-turn-badge");
    positionEl.textContent = positions[index] === 0 ? "At the start" : positions[index] === 100 ? "Finished!" : `Square ${positions[index]}`;
    badgeEl.textContent = active ? "UP NEXT" : positions[index] === 100 ? "WINNER" : "";
  });

  turnCardEl.dataset.player = String(current);
  turnOrbEl.textContent = String(current + 1);
  turnTitleEl.textContent = game.is_over() ? "Game complete" : `Player ${current + 1}`;
  turnHintEl.textContent = game.is_over() ? "Everyone played well." : "It's your turn. Make it count.";
  turnCardEl.classList.remove("turn-change");
  void turnCardEl.offsetWidth;
  turnCardEl.classList.add("turn-change");
}

function updateMeta() {
  updatePlayerPanel();
}

function renderPlayerCards() {
  const count = game.player_count();
  playersEl.replaceChildren();

  for (let i = 0; i < count; i++) {
    const card = document.createElement("div");
    card.className = `player-card p${i}`;
    card.dataset.player = String(i);

    const badge = document.createElement("span");
    badge.className = "player-badge";
    badge.textContent = String(i + 1);

    const details = document.createElement("div");
    details.className = "player-details";
    const name = document.createElement("strong");
    name.textContent = `Player ${i + 1}`;
    const position = document.createElement("span");
    position.className = "player-position";
    details.append(name, position);

    const turnBadge = document.createElement("span");
    turnBadge.className = "player-turn-badge";
    card.append(badge, details, turnBadge);
    playersEl.appendChild(card);
  }

  updatePlayerPanel();
}

async function animateToken(r, player) {
  const start = r.from();
  const landed = r.landed();
  const target = landed <= 100 ? landed : start;
  const token = tokens[player];

  for (let square = start + 1; square <= target; square++) {
    setTokenPos(token, square, player);
    await sleep(STEP_MS);
  }

  if (r.hit_snake() || r.hit_ladder()) {
    await sleep(180);
    setTokenPos(token, r.to(), player);
    await sleep(430);
  }
}

function makeConfetti() {
  confettiEl.replaceChildren();
  const colors = ["#e85d4f", "#f6bd4f", "#4da879", "#4c83d7", "#a482dc", "#f28fb0"];
  for (let i = 0; i < 72; i++) {
    const piece = document.createElement("span");
    piece.className = "confetti-piece";
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.setProperty("--confetti-color", colors[i % colors.length]);
    piece.style.setProperty("--confetti-delay", `${Math.random() * 1.6}s`);
    piece.style.setProperty("--confetti-duration", `${2.4 + Math.random() * 2.6}s`);
    piece.style.setProperty("--confetti-drift", `${Math.round((Math.random() - 0.5) * 260)}px`);
    piece.style.setProperty("--confetti-spin", `${Math.round(Math.random() * 900 - 450)}deg`);
    confettiEl.appendChild(piece);
  }
}

function celebrate(player) {
  makeConfetti();
  winnerTitleEl.textContent = `Player ${player + 1} wins!`;
  winnerCopyEl.textContent = `You made it to 100.`;
  winnerScoreEl.textContent = game.positions().map((position, index) => `P${index + 1} · ${position}`).join("     ");
  celebrationEl.classList.remove("hidden");
  document.body.classList.add("game-won");
  playAgainBtn.focus({ preventScroll: true });
}

function closeCelebration() {
  celebrationEl.classList.add("hidden");
  document.body.classList.remove("game-won");
  rollBtn.focus({ preventScroll: true });
}

async function onRoll() {
  if (rolling || game.is_over()) return;
  rolling = true;
  rollBtn.disabled = true;
  newGameBtn.disabled = true;
  countEl.disabled = true;

  const r = game.roll();
  const player = r.player();
  const playerName = `Player ${player + 1}`;
  turnTitleEl.textContent = `${playerName} is rolling`;
  turnHintEl.textContent = "Let's see where you land.";
  diceCaptionEl.textContent = `${playerName} rolled`;
  diceEl.classList.remove("dice-roll");
  void diceEl.offsetWidth;
  diceEl.classList.add("dice-roll");
  diceEl.textContent = r.dice() || "–";
  diceEl.setAttribute("aria-label", r.dice() ? `Dice roll ${r.dice()}` : "No roll yet");

  await sleep(330);
  await animateToken(r, player);

  updateMeta();

  if (r.won()) {
    tokens[player].classList.add("winning-token");
    rollBtn.innerHTML = `<span>Play again</span><span class="button-arrow" aria-hidden="true">↗</span>`;
    celebrate(player);
  } else {
    const nextPlayer = game.current_player();
    turnTitleEl.textContent = `Player ${nextPlayer + 1}`;
    turnHintEl.textContent = nextPlayer === player ? "Roll again and keep going." : `${playerName} moved. You're up next.`;
  }

  rollBtn.disabled = false;
  newGameBtn.disabled = false;
  countEl.disabled = false;
  rolling = false;
}

function startNewGame() {
  if (rolling) return;
  closeCelebration();
  const count = Number.parseInt(countEl.value, 10);
  game = new Game(BigInt(Date.now()) + BigInt(Math.floor(Math.random() * 1e9)), count);

  tokens.forEach((token, index) => {
    if (index < count) {
      token.style.display = "block";
      token.classList.remove("winning-token");
      setTokenPos(token, 0, index);
    } else {
      token.style.display = "none";
    }
  });

  diceEl.textContent = "–";
  diceEl.setAttribute("aria-label", "No roll yet");
  diceEl.classList.remove("dice-roll");
  diceCaptionEl.textContent = "Ready when you are";
  rollBtn.innerHTML = `<span class="button-icon" aria-hidden="true">⚄</span><span>Roll dice</span><span class="button-arrow" aria-hidden="true">↗</span>`;
  rollBtn.disabled = false;
  newGameBtn.disabled = false;
  countEl.disabled = false;
  renderPlayerCards();
  updateMeta();
  requestAnimationFrame(drawBoardFeatures);
}

async function main() {
  await init();
  buildBoard();
  startNewGame();
  rollBtn.addEventListener("click", () => {
    if (game.is_over()) startNewGame();
    else onRoll();
  });
  newGameBtn.addEventListener("click", startNewGame);
  countEl.addEventListener("change", startNewGame);
  playAgainBtn.addEventListener("click", startNewGame);
  closeCelebrationBtn.addEventListener("click", closeCelebration);
  celebrationEl.querySelector(".celebration-backdrop").addEventListener("click", closeCelebration);
  window.addEventListener("resize", () => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(drawBoardFeatures);
  });
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !celebrationEl.classList.contains("hidden")) closeCelebration();
  });
}

main().catch((error) => {
  console.error(error);
});
