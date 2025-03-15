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

app.use(cors());
app.use(express.json());

const votes = {};
const rooms = new Map();

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
    const joiners = [];
    const response = {'roomId': newRoomId};

    rooms.set(newRoomId, joiners);
    console.log(rooms);
    res.send(response);
})

/*join room*/
app.post("/api/rooms/join", (req, res) => {
    const {roomId, name}  = req.body;
    const names = rooms.get(roomId);

    if (names.includes(name)) {
        return res.status(400).json({ error: "Name already exists in the room" });
    } else {
        rooms.set(roomId, [...names, name]);
        res.send(rooms.get(roomId));
    }
})












io.on("connection", (socket) => {
    socket.on("joinRoom", ({ roomId, name }) => {
        console.log(`User ${name} joined room ${roomId}`);
        // io.to(roomId).emit("updateJoiners", name);
        io.emit("updateJoiners", name);
    });
});


app.get("/", (req, res) => {
    res.send("Sprint Poker Backend is running");
});


const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
