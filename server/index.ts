import { Server } from "socket.io";
import express from "express";
import { createRoom, joinRoom, removePlayer } from "./roomHandler";
import { join as joinPath } from "path";

const app = express();
// if (process.env.NODE_ENV !== "development") {
app.use(express.static(joinPath(process.cwd(), "build/client")));
// }

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
  // console.log("a user connected at id", socket.id);

  socket.on("disconnect", () => {
    removePlayer(socket.id);
    // console.log("user disconnected at id", socket.id);
  });

  socket.on("room.create", () => {
    createRoom(io, socket);
  });

  socket.on("room.join", (roomID: string) => {
    joinRoom(socket, roomID);
  });

  socket.on("room.leave", () => {
    removePlayer(socket.id);
  });
});

console.log("server started");
