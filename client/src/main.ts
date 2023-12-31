import { io } from "socket.io-client";
import { switchScreen } from "./screens";
import { $, $$, bindEnter } from "./dom";
import {
  click,
  explodeBoost,
  incrementPlayer,
  lockPlayers,
  setBoost,
  setPlayers,
  unlockPlayers,
  updateCountdown,
} from "./render";
import { toast } from "./toast";
import Choices from "choices.js";
import { GameSettings } from "../../server/room";
import { config } from "../../server/config";

const err = (message: string) => toast({ text: message, level: "error" });

const socket = io(import.meta.env.DEV ? "http://localhost:3000" : location.href, {
  transports: ["websocket"],
  reconnection: false,
});

socket.on("disconnect", (reason) => {
  console.log("disconnected", reason);
  let reasonText = "";
  switch (reason) {
    case "io server disconnect":
      reasonText = "Disconnected by server";
      break;
    case "io client disconnect":
      reasonText = "Disconnected by client";
      break;
    case "transport close":
      reasonText = "Connection error";
      break;
    case "ping timeout":
      reasonText = "Connection timed out";
      break;
    case "transport error":
      reasonText = "Connection error";
      break;
    case "parse error":
      reasonText = "Connection error";
      break;
    default:
      reasonText = "Connection error";
      break;
  }
  $("#disconnectedReason").innerText = reasonText;
  switchScreen("disconnected");
});
["join", "name", "chat"].forEach((name) => bindEnter(name));

socket.on("connect", () => {
  console.log("connected");
  switchScreen("name");
  pingLoop([]);
});

socket.on("version", (version: string) => {
  $("#version").innerText = version;
});

const pingsNeeded = 10;
const pingLoop = (pings: number[]) => {
  const start = performance.now();
  socket.emit("ping");
  socket.once("pong", () => {
    const latency = performance.now() - start;
    pings.push(latency);
    if (pings.length >= pingsNeeded) {
      $("#ping").innerText = (pings.reduce((a, b) => a + b) / pings.length).toFixed(0);
      pings.splice(0, pings.length);
    }
    setTimeout(() => pingLoop(pings), 100);
  });
};

socket.on("ban", (reason: string) => {
  toast({ text: "You have been banned: " + reason, level: "error" });
});

$("#button-name").addEventListener("click", () => {
  const value = $<HTMLInputElement>("#input-name").value;
  if (!value || value === "") return err("Please enter a valid name");
  if (value.length > 20) return err("Please enter a name shorter than 20 characters");
  if (value.length < 3) return err("Please enter a name longer than 3 characters");
  if (/[^a-zA-Z0-9]/.test(value))
    return err("Name may only include alphanumeric characters");
  socket.emit("name", value);
  socket.once("ready", () => switchScreen("menu"));
  $("#button-create").addEventListener("click", () => {
    socket.emit("room.create");
  });

  $("#button-join").addEventListener("click", () => {
    const code = $<HTMLInputElement>("#input-join").value.toUpperCase();
    if (!code || code.length !== 4)
      return err("Please enter a valid room code (4 characters)");
    socket.emit("room.join", code);
  });
});

socket.on("err", (err: string) => {
  toast({ text: err, level: "error" });
});
// let host = false;

let numPlayers = 0;
export interface Player {
  clicks: number;
  color: string;
  host: boolean;
  name: string;
  score: number;
  id: string;
}
let players: Player[] = [];

let settings: GameSettings;

socket.on("room.host", () => {
  $("#button-start").style.display = "";
});

socket.on("room.join", ({ id }: { id: string }) => {
  switchScreen("lobby");
  $("#roomID").innerHTML = id + '<span class="text-2xl ml-1">📋</span>';
  $("#roomID").addEventListener("click", () => {
    navigator.clipboard.writeText(id);
    toast({ text: "Copied room code to clipboard", level: "info" });
  });

  $("#button-leave").addEventListener("click", () => {
    history.go(0);
  });

  $("#button-start").addEventListener("click", () => {
    if (numPlayers < 2) {
      err("You need at least 2 players to start the game");
    } else {
      socket.emit("room.start");
    }
  });

  updateScreen();
  window.addEventListener("resize", updateScreen);
});

const updateScreen = () => {
  socket.emit("screen", { width: window.innerWidth, height: window.innerHeight });
};

socket.on("room.update", ({ players: newPlayers }: { players: Player[] }) => {
  players = newPlayers;
  $("#players").innerHTML = "";
  for (const { clicks, color, host, name, score } of players) {
    const div = document.createElement("div");
    div.className = "p-3 flex fancyborder items-center";
    const icon = document.createElement("div");
    icon.className = "w-10 h-10 rounded-full mr-2";
    icon.style.backgroundColor = color;
    div.appendChild(icon);
    const stats = document.createElement("div");
    stats.innerText = `${score} 🏆 ${clicks} 🖱️`;
    const detailsWrapper = document.createElement("div");
    detailsWrapper.className = "flex flex-col";
    const nameElement = document.createElement("div");
    nameElement.className = "flex items-center gap-3";
    nameElement.innerText += name;
    nameElement.innerHTML += host ? '<div class="italic px-1 font-bold">HOST</div>' : "";
    detailsWrapper.appendChild(nameElement);
    detailsWrapper.appendChild(stats);
    div.appendChild(detailsWrapper);

    $("#players").appendChild(div);
  }
  $("#player-count").innerText = players.length.toString();
  numPlayers = players.length;
  setPlayers(players);
});

socket.on("game.start", () => {
  setPlayers(players);
  lockPlayers();
  switchScreen("game");
  updateCountdown({ count: 3 });
  const listener = (e: MouseEvent) => {
    socket.emit("game.click", { x: e.clientX, y: e.clientY });
  };

  setTimeout(() => {
    document.addEventListener("click", listener);
  }, 3000);

  socket.on(
    "game.end",
    ({ winner, x, y }: { winner: string; x: number; y: number; winnerID: string }) => {
      document.removeEventListener("click", listener);
      click({
        x,
        y,
        color: winner,
        time: 0,
        overrideConfig: {
          finalRadius: Math.max(window.innerWidth, window.innerHeight) * 2,
          fadeTime: 180,
        },
      });
    }
  );
});

socket.on(
  "game.click",
  ({ x, y, color, id }: { x: number; y: number; color: string; id: string }) => {
    click({ x, y, color, time: 0 });
    incrementPlayer(id);
  }
);

socket.on(
  "game.boost.add",
  ({
    points,
    x,
    y,
    radius,
    edges,
  }: {
    points: number;
    x: number;
    y: number;
    radius: number;
    edges: number;
  }) => {
    setBoost({
      points,
      x: window.innerWidth * x,
      y: window.innerHeight * y,
      radius: radius,
      edges,
    });
  }
);

socket.on("game.boost.click", ({ color, id }: { color: string; id: string }) => {
  explodeBoost(color, id);
});

socket.on("game.end", ({ winnerID }: { winnerID: string }) => {
  setTimeout(() => {
    const endScreen = $("#endScreen");
    endScreen.className = "endScreen";
    endScreen.innerText = winnerID === socket.id ? "You win!" : "You lose!";
    setTimeout(() => {
      unlockPlayers();
      switchScreen("lobby");
      endScreen.className = "hidden";
    }, 2010);
  }, 1000);
});

socket.on("room.chat", ({ name, message }: { name: string; message: string }) => {
  const div = document.createElement("div");
  const span = document.createElement("span");
  span.innerText = name;
  span.classList.add("font-bold");
  div.appendChild(span);
  const text = document.createElement("span");
  text.innerText = ": " + message.toString();
  div.appendChild(text);
  $("#chat").appendChild(div);
  $("#chat").scrollTop = $("#chat").scrollHeight;
});

$("#button-chat").addEventListener("click", () => {
  const message = $<HTMLInputElement>("#input-chat").value;
  if (!message || message === "") return;
  socket.emit("room.chat", message);
  $<HTMLInputElement>("#input-chat").value = "";
});

$$(".fancy-select").forEach((item) => {
  new Choices(item, { searchEnabled: false });
});

const settingsItems = $$<HTMLInputElement>(".setting");

const boostToggle = $<HTMLInputElement>("#settings-boosts");

const generateDeepKeys = (obj: any) => {
  const keys: string[] = [];
  for (const key in obj) {
    if (typeof obj[key] === "object" && obj[key] !== null && !Array.isArray(obj[key])) {
      for (const subKey of generateDeepKeys(obj[key])) {
        keys.push(key + "." + subKey);
      }
    } else {
      keys.push(key);
    }
  }
  return keys;
};

const getDeepKeyValue = (obj: any, key: string) => {
  const keys = key.split(".");
  let value = obj;
  for (const key of keys) {
    value = value[key];
  }
  return value;
};

const updateSettingsUI = () => {
  if (!settings) return;
  if (settings.boosts) {
    $("#settings-boosts-container").style.display = "";
    $<HTMLInputElement>("#settings-boosts").checked = true;
  } else {
    $("#settings-boosts-container").style.display = "none";
    $<HTMLInputElement>("#settings-boosts").checked = false;
  }

  const keys = generateDeepKeys(settings);
  for (const key of keys) {
    const setting = getDeepKeyValue(settings, key);
    if (key === "boosts") continue;
    const input = $<HTMLInputElement>("#settings-" + key.replaceAll(".", "-"));
    if (!input) return;
    if (input.type === "checkbox") {
      input.checked = setting;
    } else {
      input.value = setting;
    }
  }
};

socket.on("room.settings", (newSettings: GameSettings) => {
  settings = newSettings;
  updateSettingsUI();
  toast({ text: "Room config updated", level: "info" });
});

settingsItems.forEach((item) => {
  item.addEventListener("blur", () => {
    const key = item.id.replace("settings-", "").replaceAll("-", ".");
    if (item.type === "checkbox") {
      socket.emit("room.settings", { key, value: item.checked });
    } else if (item.type === "number") {
      socket.emit("room.settings", { key, value: parseInt(item.value) });
    } else {
      socket.emit("room.settings", { key, value: item.value });
    }
  });
});

$("#settings-boosts").addEventListener("change", () => {
  socket.emit("room.settings", {
    key: "boosts",
    value: $<HTMLInputElement>("#settings-boosts").checked
      ? config.defaultSettings.boosts
      : false,
  });
});
