import { Server, Socket } from "socket.io";
import { Room } from "./room";

const rooms = new Map<string, Room>();

export const getRoom = (id: string) => rooms.get(id);

export const joinRoom = (socket: Socket, roomID: string) => {
  const room = rooms.get(roomID);
  if (!room) return socket.emit("err", "Room not found");
  room.addPlayer({ socket });
};
export const generateRoomID = () => {
  const length = 4;
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

export const createRoom = (io: Server, socket: Socket) => {
  const id = generateRoomID();
  const room = new Room(io, id);
  rooms.set(id, room);
  room.addPlayer({ socket, host: true });
  return id;
};

export const removePlayer = (socketID: string) => {
  for (const room of rooms.values()) {
    if (room.removePlayer({ socketID })) {
      rooms.delete(room.id);
    }
  }
};
