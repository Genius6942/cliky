import { io } from "socket.io-client";
import { switchScreen } from "./screens";
import { $ } from "./dom";
import { click, incrementPlayer, setPlayers } from "./render";

const socket = io(import.meta.env.DEV ? "http://localhost:3000" : location.href);

socket.on("connect", () => {
  console.log("connected");
  switchScreen("first");
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
  alert(err);
});
// let host = false;

let numPlayers = 0;
let players: string[] = [];

socket.on("room.host", () => {
  $("#button-start").style.display = "";
});

socket.on("room.join", ({ id }: { id: string }) => {
  switchScreen("lobby");
  $("#roomID").innerText = id;

  $("#button-leave").addEventListener("click", () => {
    history.go(0);
  });

  $("#button-start").addEventListener("click", () => {
    if (numPlayers < 2) {
      alert("You need at least 2 players to start the game");
    } else {
      socket.emit("room.start");
      console.log("starting??");
    }
  });
});

socket.on("room.update", ({ players: newPlayers }: { players: string[] }) => {
  players = newPlayers;
  $("#players").innerHTML = "";
  for (const color of players) {
    const div = document.createElement("div");
    div.style.backgroundColor = color;
    div.className = "w-10 h-10 rounded-full";
    $("#players").appendChild(div);
  }
  $("#player-count").innerText = players.length.toString();
  numPlayers = players.length;
  setPlayers(players);
});

socket.on("game.start", () => {
  setPlayers(players);
  switchScreen("game");
  const listener = (e: MouseEvent) => {
    socket.emit("game.click", { x: e.clientX, y: e.clientY });
  };

  setTimeout(() => {
    document.addEventListener("click", listener);
  }, 3000);

  socket.on(
    "game.end",
    ({
      winner,
      x,
      y,
      winnerID,
    }: {
      winner: string;
      x: number;
      y: number;
      winnerID: string;
    }) => {
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
      if (winnerID === socket.id) {
        // alert("You won!");
      } else {
        alert("You lost!");
      }
    }
  );
});

socket.on("game.click", ({ x, y, color }: { x: number; y: number; color: string }) => {
  click({ x, y, color, time: 0 });
  incrementPlayer(color);
});

socket.on("game.end", () => setTimeout(() => switchScreen("lobby"), 3000));
