const jwt = require('jsonwebtoken');
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const { Server } = require('socket.io');

const User = require('./models/User');
const Quiz = require('./models/Quiz');
const QuizAttempt = require('./models/QuizAttempt');
const attemptRoutes = require('./routes/attemptRoutes');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');

dotenv.config();
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

// Global State
const roomUsers = {};
const roomScores = {};
const roomQuestions = {};
const roomIndexes = {};
const socketRoomMap = {};

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on('join_room', async ({ username, room, token }) => {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const userId = decoded.userId || decoded.id;

            socket.join(room);
            socketRoomMap[socket.id] = room;

            if (!roomUsers[room]) roomUsers[room] = [];
            roomUsers[room].push({ socketId: socket.id, username, userId });

            io.to(room).emit('room_users', roomUsers[room]);
        } catch (err) {
            console.error('❌ Invalid token:', err.message);
            socket.emit('error', 'Authentication failed');
        }
    });

    socket.on('start_quiz', async (room) => {
        try {
            const quiz = await Quiz.findOne({ title: room }).populate('questions');
            if (!quiz) return io.to(room).emit('error', 'Quiz not found');

            roomScores[room] = {};
            roomQuestions[room] = quiz.questions;
            roomIndexes[room] = 0;

            io.to(room).emit('redirect_to_quiz');
        } catch (err) {
            console.error('🔥 Quiz start error:', err.message);
            io.to(room).emit('error', 'Internal server error');
        }
    });

    socket.on('ready_for_questions', ({ room }) => {
        const currentRoom = room || socketRoomMap[socket.id];
        const questions = roomQuestions[currentRoom];
        const index = roomIndexes[currentRoom];

        if (!questions || typeof index === 'undefined') return;

        socket.emit('new_question', {
            question: questions[index].questionText,
            options: questions[index].options,
            correctAnswer: questions[index].correctAnswer,
            index,
            total: questions.length
        });
    });

    socket.on('submit_answer', ({ answer, index, room }) => {
        const questions = roomQuestions[room];
        if (!questions || !questions[index]) return;

        const correct = questions[index].correctAnswer;
        if (answer === correct) {
            roomScores[room][socket.id] = (roomScores[room][socket.id] || 0) + 1;
        }

        io.to(room).emit('update_leaderboard', roomScores[room]);
    });

    socket.on('next_question', ({ room }) => {
        const questions = roomQuestions[room];
        if (!questions) return;

        roomIndexes[room] += 1;
        const index = roomIndexes[room];

        if (index < questions.length) {
            socket.emit('new_question', {
                question: questions[index].questionText,
                options: questions[index].options,
                correctAnswer: questions[index].correctAnswer,
                index,
                total: questions.length
            });
        } else {
            const scores = roomScores[room] || {};
            const score = scores[socket.id] || 0;
            socket.emit('quiz_ended', { [socket.id]: score });
        }
    });

    socket.on('end_quiz', ({ room }) => {
        const scores = roomScores[room] || {};
        const score = scores[socket.id] || 0;
        const total = roomQuestions[room]?.length || 0;

        console.log(`📤 end_quiz called for room: ${room}, Socket: ${socket.id}, Score: ${score}/${total}`);

        // Emit to current socket only
        socket.emit('quiz_ended', { score, room, total });

        // Optional: save to DB using JWT
        const token = socket.handshake.auth?.token;
        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                const userId = decoded.userId || decoded.id;

                const userObj = (roomUsers[room] || []).find(u => u.socketId === socket.id);
                const username = userObj?.username || "Anonymous";

                QuizAttempt.create({
                    userId,
                    username,
                    room, // Save room name
                    score,
                    totalQuestions: total,
                    quizTitle: room // 🔥 NEW FIELD
                }).then(() => {
                    console.log(`💾 Saved attempt for ${username} (${userId}) - Score: ${score}/${total}`);
                }).catch(err => {
                    console.error("❌ DB Save Failed:", err.message);
                });
            } catch (err) {
                console.error("❌ JWT Decode Failed:", err.message);
            }
        } else {
            console.warn("⚠️ No token found in handshake.auth.token");
        }
    });






    socket.on('disconnect', () => {
        const room = socketRoomMap[socket.id];
        if (room && roomUsers[room]) {
            roomUsers[room] = roomUsers[room].filter(u => u.socketId !== socket.id);
            io.to(room).emit('room_users', roomUsers[room]);
        }
        delete socketRoomMap[socket.id];
        console.log(`User disconnected: ${socket.id}`);
    });
});

app.get('/', (req, res) => res.send('Quiz Game API Running'));

mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('MongoDB Connected');
        server.listen(process.env.PORT, () =>
            console.log(`Server running on http://localhost:${process.env.PORT}`)
        );
    })
    .catch(err => console.error('MongoDB connection error:', err));
