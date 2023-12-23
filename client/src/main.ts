import { io } from "socket.io-client";
import { switchScreen } from "./screens";
import { $ } from "./dom";
import { click } from "./render";

const socket = io("http://localhost:3000");

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
let host = false;

let numPlayers = 0;

socket.on("room.host", () => {
  host = true;

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

socket.on("room.update", ({ players }: { players: string[] }) => {
  $("#players").innerHTML = "";
  for (const color of players) {
    const div = document.createElement("div");
    div.style.backgroundColor = color;
    div.className = "w-10 h-10 rounded-full";
    $("#players").appendChild(div);
  }
  $("#player-count").innerText = players.length.toString();
  numPlayers = players.length;
});

socket.on("game.start", () => {
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
      click({ x, y, color: winner, time: 0 });
      if (winnerID === socket.id) {
        alert("You won!");
      } else {
        alert("You lost!");
      }
    }
  );
});
socket.on("game.click", ({ x, y, color }: { x: number; y: number; color: string }) => {
  click({ x, y, color, time: 0 });
});

socket.on("game.end", () => switchScreen("lobby"));
