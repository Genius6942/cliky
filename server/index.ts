import { Server } from "socket.io";
import express from "express";
import { createRoom, joinRoom, removePlayer } from "./roomHandler";
import { join as joinPath } from "path";
import { config } from "./config";

const app = express();
app.use(express.static(joinPath(process.cwd(), "build/client")));

app.get("/status", (_, res) => res.status(200).send("200 ok"));
const port = process.env.PORT || 3000;

const server = app.listen(port, () => console.log(`listening on port ${port}`));

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  socket.emit("version", config.version);

  let name: string;

  const checkName = () => {
    if (!name || name === "") {
      socket.emit("err", "Please set a name");
      return true;
    }

    if (name === "system" || name === "System") {
      socket.emit("err", "Blacklisted name");
      return true;
    }
    return false;
  };

  socket.on("disconnect", () => {
    removePlayer(socket.id);
  });

  socket.on("ping", (id?: string) => {
    if (id) socket.emit("pong", id);
    else socket.emit("pong");
  });

  socket.on("name", (newName: string) => {
    name = newName;
    if (checkName()) name = undefined;
    else socket.emit("ready");
  });

  socket.on("room.create", () => {
    if (checkName()) return;
    createRoom(io, socket, name);
  });

  socket.on("room.join", (roomID: string) => {
    if (checkName()) return;
    joinRoom(socket, roomID, name);
  });

  socket.on("room.leave", () => {
    removePlayer(socket.id);
  });
});

console.log("server started");
