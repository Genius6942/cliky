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
  let name: string;

  const checkName = () => {
    if (!name || name === "") {
      socket.emit("err", "Please set a name");
      return true;
    }
    return false;
  };

  socket.on("disconnect", () => {
    removePlayer(socket.id);
    // console.log("user disconnected at id", socket.id);
  });

  socket.on("name", (newName: string) => {
    name = newName;
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
