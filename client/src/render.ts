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

// frames
const clickFadeTime = 30;
const clickFinalRadius = 100;

export interface ClickFrame {
  x: number;
  y: number;
  color: string;
  time: number;
}

const clickFrames: ClickFrame[] = [];

const loop = () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let i = clickFrames.length - 1; i >= 0; i--) {
    const frame = clickFrames[i];
    clickFrames[i].time++;
    if (frame.time >= clickFadeTime) {
      clickFrames.splice(i, 1);
    }
  }

  for (const { x, y, time, color } of clickFrames) {
    const alpha = (clickFadeTime - time) / clickFadeTime;
    if (alpha === 0) continue;
    const radius = (time / clickFadeTime) * clickFinalRadius;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fillStyle = color + Math.floor(alpha * 255).toString(16);
    ctx.fill();
  }

  requestAnimationFrame(loop);
};

requestAnimationFrame(loop);

export const click = (frame: ClickFrame) => {
  clickFrames.push(frame);
};
