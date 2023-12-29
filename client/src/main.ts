import { io } from "socket.io-client";
import { switchScreen } from "./screens";
import { $, bindEnter } from "./dom";
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
["join", "name"].forEach((name) => bindEnter(name));

socket.on("connect", () => {
  console.log("connected");
  switchScreen("name");
	pingLoop();
});

socket.on("version", (version: string) => {
	$("#version").innerText = version;
})

const pingLoop = () => {
	const start = performance.now();
	socket.emit("ping");
	socket.once("pong", () => {
		const latency = performance.now() - start;
		$("#ping").innerText = latency.toFixed(0);
		setTimeout(pingLoop, 100);
	});
}

socket.on("ban", (reason: string) => {
  toast({ text: "You have been banned: " + reason, level: "error" });
});

$("#button-name").addEventListener("click", () => {
  const value = $<HTMLInputElement>("#input-name").value;
  if (!value || value === "") return alert("Please enter a valid name");
  socket.emit("name", value);

  switchScreen("menu");
  $("#button-create").addEventListener("click", () => {
    socket.emit("room.create");
  });

  $("#button-join").addEventListener("click", () => {
    const code = $<HTMLInputElement>("#input-join").value.toUpperCase();
    if (!code || code.length !== 4)
      return alert("Please enter a valid room code (4 characters)");
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

socket.on("room.host", () => {
  $("#button-start").style.display = "";
});

socket.on("room.join", ({ id }: { id: string }) => {
  switchScreen("lobby");
  $("#roomID").innerText = id;
  $("#roomID").addEventListener("click", () => {
    navigator.clipboard.writeText(id);
    toast({ text: "Copied room code to clipboard", level: "info" });
  });

  $("#button-leave").addEventListener("click", () => {
    history.go(0);
  });

  $("#button-start").addEventListener("click", () => {
    if (numPlayers < 2) {
      alert("You need at least 2 players to start the game");
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
    nameElement.innerHTML =
      name + (host ? '<div class="italic px-1 font-bold">HOST</div>' : "");
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
