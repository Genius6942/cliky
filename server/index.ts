import { Server } from "socket.io";
import { createRoom, joinRoom, removePlayer } from "./roomHandler";

const io = new Server(3000, {
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
