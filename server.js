import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

app.use(cors({ origin: "https://pokerday.vercel.app" }));
app.use(express.json());

const votes = new Map();
const rooms = new Map();
const lockedIn = new Map();

const generateRandomID = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = '';
  for (let i = 0; i < 4; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

/*create new room*/
app.get("/api/rooms/create", (req, res) => {
  const newRoomId = generateRandomID();
  const joiners = new Set();
  const response = {'roomId': newRoomId};

  rooms.set(newRoomId, joiners);
  res.send(response);
})


/*join room*/
app.post("/api/rooms/join", (req, res) => {
  const {roomId, name} = req.body;
  const names = rooms.get(roomId);

  if (!names) {
    return res.status(404).json({error: "Room not found"});
  }
  if (names.has(name)) {
    return res.status(400).json({error: "Name already exists in the room"});
  }

  res.send(rooms.get(roomId));
})

/*socket stuff*/
io.on("connection", (socket) => {
  /*join room*/
  socket.on('joinRoom', ({roomId, name}) => {
    socket.join(roomId);
    rooms.get(roomId).add(name);
    io.to(roomId).emit('roomMembersUpdate', Array.from(rooms.get(roomId)));
  });

  /*leave room*/
  socket.on('leaveRoom', ({roomId, name}) => {
    socket.leave(roomId);
    rooms.has(roomId) && rooms.get(roomId).delete(name);
    io.to(roomId).emit("roomMembersUpdate", Array.from(rooms.get(roomId) || []));
  })

  //* Add Vote */
  socket.on('addVote', ({ roomId, name, vote }) => {
    if (!votes.has(roomId)) {
      votes.set(roomId, []);
    }

    const roomVotes = votes.get(roomId);

    const existingVote = roomVotes.find(v => v.name === name);
    if (existingVote) {
      existingVote.vote = vote;
    } else {
      roomVotes.push({ name, vote });
    }

    io.to(roomId).emit("voteUpdate", roomVotes);
  });

  /* Remove Vote */
  socket.on('removeVote', ({ roomId, name }) => {
    if (!votes.has(roomId)) return;

    const roomVotes = votes.get(roomId);
    const updatedVotes = roomVotes.filter(v => v.name !== name); // Remove user's vote

    if (updatedVotes.length === 0) {
      votes.delete(roomId); // Remove room if no votes left
    } else {
      votes.set(roomId, updatedVotes); // Update room votes
    }

    io.to(roomId).emit("voteUpdate", updatedVotes);
  });

  socket.on('lockVotes', ({ roomId }) => {
    lockedIn.set(roomId, true);
    io.to(roomId).emit("votesLocked");
  });

  socket.on('unlockVotes', ({ roomId }) => {
    console.log(`unocking votes for room ${roomId}`);
    lockedIn.set(roomId, false);
    io.to(roomId).emit("votesUnlocked");
  });


  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});


app.get("/", (req, res) => {
  res.send("Sprint Poker Backend is running");
});


const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
