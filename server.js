const express = require("express");
const mongoose = require("mongoose");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// MongoDB Connection
const MONGO_URI = "mongodb+srv://trisha:trisha%401601@restaurant-cluster.xj0za.mongodb.net/chatapp?retryWrites=true&w=majority&appName=restaurant-cluster";
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("MongoDB Connected"))
    .catch(err => console.log("MongoDB Error:", err));

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "view"))); // Serve frontend files

// User Schema & Model
const User = mongoose.model("User", new mongoose.Schema({
    username: { type: String, unique: true, required: true },
    firstname: String,
    lastname: String,
    password: String,
    createdOn: { type: Date, default: Date.now }
}));

// Message Schema & Model
const Message = mongoose.model("Message", new mongoose.Schema({
    from_user: String,
    to_user: String,
    room: String,
    message: String,
    date_sent: { type: Date, default: Date.now }
}));

// Chatbot responses
const chatbotResponses = {
    "hello": "Hi! How can I help you?",
    "help": "I'm here to assist you! Ask me anything.",
    "bye": "Goodbye! Have a great day!"
};

// Routes
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "view", "signup.html"));
});

// Signup
app.post("/api/auth/signup", async (req, res) => {
    try {
        const { username, firstname, lastname, password } = req.body;
        const user = new User({ username, firstname, lastname, password });
        await user.save();
        res.json({ message: "User registered successfully!" });
    } catch (err) {
        res.status(400).json({ message: "Username already exists" });
    }
});

// Login
app.post("/api/auth/login", async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username, password });
    if (user) {
        res.json({ message: "Login successful", username: user.username });
    } else {
        res.status(401).json({ message: "Invalid credentials" });
    }
});

// Socket.io for real-time chat
const usersInRooms = {}; // Track users in rooms

io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("joinRoom", ({ username, room }) => {
        if (!username || !room) {
            console.log("Invalid username or room:", username, room);
            return;
        }

        socket.join(room);
        usersInRooms[socket.id] = { username, room };

        io.to(room).emit("message", { from_user: "System", message: `${username} has joined ${room}` });
    });

    socket.on("chatMessage", async ({ from_user, room, message }) => {
        if (!from_user || !room || !message) {
            console.log("Invalid message data:", from_user, room, message);
            return;
        }

        console.log(`Received message from ${from_user} in ${room}: ${message}`);

        // Save the message to the database
        const msg = new Message({ from_user, room, message });
        await msg.save();

        const lowerCaseMessage = message.toLowerCase();

        // Check if the message is recognized by the chatbot
        if (chatbotResponses[lowerCaseMessage]) {
            const chatbotMessage = chatbotResponses[lowerCaseMessage];

            // Emit the chatbot response back to the room
            io.to(room).emit("message", { from_user: "Chatbot", message: chatbotMessage });
        }

        // Emit the user message to the room (normal message)
        io.to(room).emit("message", { from_user, message });
    });

    socket.on("typing", ({ room, username }) => {
        if (room && username) {
            socket.to(room).emit("typing", `${username} is typing...`);
        }
    });

    socket.on("disconnect", () => {
        if (usersInRooms[socket.id]) {
            const { username, room } = usersInRooms[socket.id];
            io.to(room).emit("message", { from_user: "System", message: `${username} has left the chat` });
            delete usersInRooms[socket.id];
        }
        console.log("User disconnected:", socket.id);
    });
});

// Start Server
const PORT = 3000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
