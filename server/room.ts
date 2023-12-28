import { Server, Socket } from "socket.io";

export interface GameSettings {
  mode: "clicks" | "time";
  target: number;
}

export class Room {
  io: Server;
  players: {
    socket: Socket;
    color: string;
    host: boolean;
    name: string;
    score: number;
    clicks: number;
  }[];
  id: string;

  ingame = false;

  settings: GameSettings;

  constructor(io: Server, id: string) {
    this.io = io;
    this.players = [];
    this.id = id;

    this.settings = {
      mode: "clicks",
      target: 100,
    };
  }

  get host() {
    return this.players.find(({ host }) => host) as (typeof Room.prototype.players)[0];
  }

  emitPlayers() {
    this.io.to(this.id).emit("room.update", {
      players: this.players.map(({ clicks, color, host, name, score, socket }) => ({
        clicks,
        color,
        host,
        name,
        score,
        id: socket.id,
      })),
    });
  }

  addPlayer({ socket, host, name }: { socket: Socket; host?: boolean; name: string }) {
    if (this.players.map((player) => player.socket.id).includes(socket.id))
      throw new Error("You are already in this room");

    this.players.push({
      socket,
      color:
        "#" +
        Math.floor(Math.random() * 0xffffff)
          .toString(16)
          .padStart(6, "0"),
      host: !!host,
      name,
      score: 0,
      clicks: 0,
    });

    socket.emit("room.join", { id: this.id });
    socket.join(this.id);
    this.emitPlayers();
    if (host) {
      socket.emit("room.host");
    }

    socket.on("room.start", () => {
      if (socket.id === this.host.socket.id) {
        this.startGame();
      }
    });
  }

  removePlayer({ socketID }: { socketID: string }) {
    this.players = this.players.filter((player) => player.socket.id !== socketID);

    if (this.players.length <= 0) {
      return true;
    } else if ((this.host as any) === undefined) {
      this.players[0].host = true;
      this.players[0].socket.emit("room.host");
    }
    this.emitPlayers();
    return false;
  }

  startGame() {
    if (this.ingame) return this.host.socket.emit("err", "Game already in progress");
    this.ingame = true;
    this.io.to(this.id).emit("game.start");

    const players = this.players.map((p) => ({
      ...p,
      clicks: [] as number[],
      susLevel: 0,
    }));
    let gameOver = false; // hi

    setTimeout(() => {
      players.forEach((player) => {
        const socket = player.socket;
        socket.on("game.click", ({ x, y }: { x: number; y: number }) => {
          if (gameOver) return;
          const now = performance.now();
          player.clicks.push(now);
          this.players.find((player) => player.socket.id === socket.id)!.clicks++;

          // anticheat here

          // cps cap:

          // if variance < 0.5
          let alreadyFlagged = false;
          if (player.clicks.length > 3) {
            const cps =
              player.clicks.length / ((now - player.clicks[0]) / 1000);
            if (cps > 25) {
              player.susLevel++;
              alreadyFlagged = true;
            }

            const meanDifference =
              player.clicks
                .slice(1)
                .map((x, i) => x - player.clicks[i])
                .reduce((a, b) => a + b) / player.clicks.length;
            let variance = 0;
            for (
              let i = player.clicks.length - Math.min(player.clicks.length, 30) + 1;
              i < player.clicks.length;
              i++
            ) {
              // e
              variance += Math.pow(
                player.clicks[i] - player.clicks[i - 1] - meanDifference,
                2
              );
            }

            variance /= Math.min(player.clicks.length, 30) - 1;
            variance /= 1000;
            console.log(variance);
            if (variance < 0.1) {
              if (!alreadyFlagged) player.susLevel++;
              console.log(`variance is ${variance}!`);
            }
          }
          if (player.susLevel > 10) {
            console.log(`stop being a bad person :'(`);
            console.log("you hurt my feelwings 🥺");
            socket.emit("ban", "Kicked by anticheat. Infractions: " + player.susLevel);
            socket.disconnect();
          }

          this.io
            .to(this.id)
            .emit("game.click", { x, y, color: player.color, id: socket.id });

          if (this.settings.mode === "clicks") {
            if (player.clicks.length >= this.settings.target) {
              this.io
                .to(this.id)
                .emit("game.end", { winner: player.color, x, y, winnerID: socket.id });
              this.players.find((player) => player.socket.id === socket.id)!.score++;
              this.emitPlayers();
              gameOver = true;
              this.ingame = false;
            }
          }
        });
      });
    }, 3000);

    if (this.settings.mode === "time") {
      setTimeout(() => {
        let winner = players[0];
        for (const player of players) {
          if (player.clicks > winner.clicks) {
            winner = player;
          }
        }
        this.io
          .to(this.id)
          .emit("game.end", { winner: winner.color, winnerID: winner.socket.id });
        this.players.find((player) => player.socket.id === winner.socket.id)!.score++;
        this.emitPlayers();
        gameOver = true;
        this.ingame = false;
      }, this.settings.target + 3000);
    }
  }
}
