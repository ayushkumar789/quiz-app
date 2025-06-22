require('dotenv').config();
const jwt = require('jsonwebtoken');
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const { Server } = require('socket.io');

const User = require('./models/User');
const Quiz = require('./models/Quiz');
const QuizAttempt = require('./models/QuizAttempt');
const attemptRoutes = require('./routes/attemptRoutes');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/attempts', attemptRoutes);

const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

const roomUsers = {};
const roomScores = {};
const roomQuestions = {};
const socketRoomMap = {};
const userSocketMap = {};
const userQuestions = {};
const userQuestionIndex = {};
const userQuestionHistory = {};
const roomFinishedUsers = {}; // ✅ Add this

io.on('connection', (socket) => {

    socket.on('join_room', async ({ username, room, token }) => {
        const roomName = room.trim();
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const userId = decoded.userId || decoded.id;

            if (userSocketMap[userId]) {
                socket.emit('error', 'You have already joined the room.');
                return;
            }

            socket.join(roomName);
            socketRoomMap[socket.id] = roomName;
            userSocketMap[userId] = socket.id;

            if (!roomUsers[roomName]) roomUsers[roomName] = [];
            roomUsers[roomName].push({ socketId: socket.id, username, userId });

            userQuestionIndex[socket.id] = 0;
            userQuestionHistory[socket.id] = [];

            // ✅ If quiz has already started, assign questions to this socket
            if (roomQuestions[roomName] && roomQuestions[roomName].length) {
                userQuestions[socket.id] = [...roomQuestions[roomName]];
                console.log(`📩 Assigned existing quiz questions to rejoining socket ${socket.id}`);
            }

            io.to(roomName).emit('room_users', roomUsers[roomName]);
        } catch (err) {
            socket.emit('error', 'Authentication failed');
        }
    });

    socket.on('start_quiz', async (room) => {
        const roomName = room.trim();
        console.log("📥 [start_quiz] received for room:", roomName);

        try {
            const quiz = await Quiz.findOne({ title: roomName }).populate('questions').lean();
            if (!quiz) return io.to(roomName).emit('error', 'Quiz not found');

            roomScores[roomName] = {};
            roomQuestions[roomName] = [...quiz.questions];

            const usersInRoom = roomUsers[roomName] || [];

            usersInRoom.forEach(user => {
                const socketId = user.socketId;
                userQuestions[socketId] = [...quiz.questions];
                userQuestionIndex[socketId] = 0;
                userQuestionHistory[socketId] = [];
            });

            io.to(roomName).emit('redirect_to_quiz');
        } catch (err) {
            io.to(roomName).emit('error', 'Internal server error');
        }
    });

    socket.on('next_question', ({ room }) => {
        console.log("🟢 [next_question] from", socket.id, "in room:", room);

        const questions = userQuestions[socket.id];
        const index = userQuestionIndex[socket.id];

        if (!questions) {
            console.log("❌ No questions for socket:", socket.id);
            return;
        }

        if (index >= questions.length) {
            console.log("⚠️ Quiz already completed for:", socket.id);
            return;
        }

        const q = questions[index];
        console.log(`📤 Sending question ${index + 1} to ${socket.id}`, q);

        socket.emit('new_question', {
            question: q.questionText,
            options: q.options,
            correctAnswer: q.correctAnswer,
            index,
            total: questions.length // ✅ This is what was missing
        });

        if (!userQuestionHistory[socket.id]) userQuestionHistory[socket.id] = [];
        userQuestionHistory[socket.id].push(index);
        userQuestionIndex[socket.id] += 1;
    });


    socket.on('submit_answer', ({ answer, room }) => {
        const roomName = room.trim();
        const questions = userQuestions[socket.id];
        const sentIndexes = userQuestionHistory[socket.id];
        if (!questions || !sentIndexes?.length) return;

        const lastIndex = sentIndexes[sentIndexes.length - 1];
        const question = questions[lastIndex];
        if (!question) return;

        if (!roomScores[roomName]) roomScores[roomName] = {};
        if (!roomScores[roomName][socket.id]) roomScores[roomName][socket.id] = 0;

        if (answer === question.correctAnswer) {
            roomScores[roomName][socket.id] += question.points || 1;
        }

        io.to(roomName).emit('update_leaderboard', roomScores[roomName]);
    });
    socket.on('end_quiz', async ({ room }) => {
        const roomName = room.trim();
        if (!roomFinishedUsers[roomName]) roomFinishedUsers[roomName] = new Set();
        roomFinishedUsers[roomName].add(socket.id);

        const totalUsers = roomUsers[roomName]?.length || 0;
        const completed = roomFinishedUsers[roomName].size;

        const score = roomScores[roomName]?.[socket.id] || 0;
        const totalQuestions = roomQuestions[roomName]?.length || 0;

        // ✅ Extract user info from socket
        const userEntry = Object.entries(userSocketMap).find(([userId, sid]) => sid === socket.id);
        const userId = userEntry ? userEntry[0] : null;

        const user = roomUsers[roomName]?.find(u => u.socketId === socket.id);
        const username = user?.username || 'Anonymous';

        // ✅ Save attempt
        if (userId) {
            try {
                await QuizAttempt.create({
                    userId,
                    username,
                    room: roomName,
                    quizTitle: roomName,
                    score,
                    totalQuestions
                });
                console.log(`✅ QuizAttempt saved for ${username} (${userId}) in room ${roomName}`);
            } catch (err) {
                console.error(`❌ Failed to save QuizAttempt for ${userId}:`, err.message);
            }
        }

        // 🟡 Emit waiting screen to current user
        io.to(socket.id).emit("quiz_waiting", {
            score,
            leaderboard: roomScores[roomName],
            totalUsers,
            completed
        });

        // ✅ All done? Notify everyone
        if (completed === totalUsers) {
            io.to(roomName).emit("quiz_fully_ended", {
                leaderboard: roomScores[roomName]
            });
        }
    });


    socket.on('disconnect', () => {
        const room = socketRoomMap[socket.id];

        if (room) {
            // Remove from roomUsers
            if (roomUsers[room]) {
                roomUsers[room] = roomUsers[room].filter(u => u.socketId !== socket.id);
                io.to(room).emit('room_users', roomUsers[room]);
            }

            // Remove from roomFinishedUsers
            if (roomFinishedUsers[room]) {
                roomFinishedUsers[room].delete(socket.id);
            }

            // Clean up mappings
            const userEntry = Object.entries(userSocketMap).find(([_, sid]) => sid === socket.id);
            if (userEntry) delete userSocketMap[userEntry[0]];

            delete socketRoomMap[socket.id];
            delete userQuestions[socket.id];
            delete userQuestionIndex[socket.id];
            delete userQuestionHistory[socket.id];
        }

        console.log(`❌ Socket disconnected: ${socket.id} from room ${room}`);
    });

});

mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('✅ MongoDB Connected');
        server.listen(process.env.PORT || 5000, () => {
            console.log(`🚀 Server running on http://localhost:${process.env.PORT || 5000}`);
        });
    })
    .catch(err => {
        console.error('❌ MongoDB connection error:', err);
        process.exit(1);
    });
