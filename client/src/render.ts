import { Player } from "./main";

const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d")!;

const resize = () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
};
resize();
window.addEventListener("resize", resize);
document.body.appendChild(canvas);
canvas.id = "screen-game";
canvas.style.display = "none";

export interface ClickConfig {
  fadeTime: number;
  finalRadius: number;
}

const defaultConfig: ClickConfig = {
  fadeTime: 30,
  finalRadius: 150,
};

export interface ClickFrame {
  x: number;
  y: number;
  color: string;
  time: number;
  overrideConfig?: Partial<ClickConfig>;
}

const playersQueue: { [k: string]: { score: number; color: string } } = {};
const players: { [k: string]: { score: number; color: string } } = {};
let playersLocked = false;

const updatePlayers = () => {
  for (const player in players) {
    delete players[player];
  }
  for (const player in playersQueue) {
    players[player] = JSON.parse(JSON.stringify(playersQueue[player]));
  }
};

export const lockPlayers = () => {
  playersLocked = true;
};

export const unlockPlayers = () => {
  playersLocked = false;
  updatePlayers();
};

export const setPlayers = (newPlayers: Player[]) => {
  // wipe players
  for (let player in playersQueue) {
    delete playersQueue[player];
  }

  for (const player of newPlayers) {
    playersQueue[player.id] = { score: 0, color: player.color };
  }

  if (!playersLocked) {
    updatePlayers();
  }
};

export const incrementPlayer = (id: string) => {
  if (players[id] === undefined) {
    players[id] = { score: 0, color: "black" };
  }
  players[id].score++;
};

const countdown = {
  count: 3,
  timeGap: 1000,
  fullSize: 300,
  startMS: performance.now(),
};

export const updateCountdown = ({
  count = countdown.count,
  timeGap = countdown.timeGap,
  fullSize = countdown.fullSize,
}: Partial<typeof countdown>) => {
  countdown.count = count;
  countdown.timeGap = timeGap;
  countdown.fullSize = fullSize;
  countdown.startMS = performance.now();
};

const clickFrames: ClickFrame[] = [];

const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
};

const drawPlayers = () => {
  const playerTopMargin = 30;
  const playerGap = 60;
  const playerRadius = 20;
  const textMargin = 10;

  const numPlayers = Object.keys(players).length;

  const totalWidth = numPlayers * (playerRadius * 2) + (numPlayers - 1) * playerGap;
  let currentX = (canvas.width - totalWidth) / 2 + playerRadius;

  for (const key of Object.keys(players)) {
    const player = players[key];
    ctx.beginPath();
    ctx.arc(currentX, playerTopMargin + playerRadius, playerRadius, 0, Math.PI * 2);
    ctx.fillStyle = player.color;
    ctx.fill();

    ctx.fillStyle = "#000000";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.font = "20px Arial";
    ctx.fillText(
      player.score.toString(),
      currentX,
      playerTopMargin + playerRadius * 2 + textMargin
    );

    currentX += playerGap + playerRadius * 2;
  }
};

const tickCountdown = () =>
  countdown.count -
  Math.floor((performance.now() - countdown.startMS) / countdown.timeGap);

const drawCountdown = () => {
  if (countdown.count < 0) return;
  const text = tickCountdown() % countdown.timeGap || "GO";
  if (typeof text === "number" && text < 0) return;
  const progression =
    ((performance.now() - countdown.startMS) % countdown.timeGap) / countdown.timeGap;
  ctx.fillStyle = `rgba(0, 0, 0, ${1 - progression})`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `${progression * countdown.fullSize}px Arial`;
  ctx.fillText(text.toString(), canvas.width / 2, canvas.height / 2);
};

const loop = () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let i = clickFrames.length - 1; i >= 0; i--) {
    const frame = clickFrames[i];

    const config = { ...defaultConfig, ...frame.overrideConfig };

    clickFrames[i].time++;
    if (frame.time >= config.fadeTime) {
      clickFrames.splice(i, 1);
    }
  }

  for (const { x, y, time, color, overrideConfig } of clickFrames) {
    const config = { ...defaultConfig, ...overrideConfig };

    const alpha = (config.fadeTime - time) / config.fadeTime;
    if (alpha <= 0) continue;
    const rgb = hexToRgb(color);
    if (!rgb) continue;
    const radius = (time / config.fadeTime) * config.finalRadius;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.closePath();
    const rgbString = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
    ctx.fillStyle = rgbString;
    ctx.fill();
  }

  drawPlayers();

  drawCountdown();

  requestAnimationFrame(loop);
};

requestAnimationFrame(loop);

export const click = (frame: ClickFrame) => {
  clickFrames.push(frame);
};
