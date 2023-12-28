import { Server, Socket } from "socket.io";
import { Room } from "./room";

const rooms = new Map<string, Room>();

export const getRoom = (id: string) => rooms.get(id);

export const joinRoom = (socket: Socket, roomID: string, name: string) => {
  const room = rooms.get(roomID);
  if (!room) return socket.emit("err", "Room not found");
  try {
		room.addPlayer({ socket, name });
	} catch (e) {
		socket.emit("err", e);
	}
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

export const createRoom = (io: Server, socket: Socket, name: string) => {
  const id = generateRoomID();
  const room = new Room(io, id);
  rooms.set(id, room);
  room.addPlayer({ socket, host: true, name });
  return id;
};

export const removePlayer = (socketID: string) => {
  for (const room of rooms.values()) {
    if (room.removePlayer({ socketID })) {
      rooms.delete(room.id);
    }
  }
};
