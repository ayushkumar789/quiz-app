const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const { Server } = require('socket.io');
const Quiz = require('./models/Quiz');

const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');

dotenv.config();

const app = express();
const server = http.createServer(app);

// Apply middleware BEFORE routes
app.use(cors());
app.use(express.json());

// Register routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);



const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

// Room state
const roomUsers = {};

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on('join_room', ({ username, room }) => {
        socket.join(room);
        if (!roomUsers[room]) roomUsers[room] = [];
        roomUsers[room].push({ socketId: socket.id, username });

        console.log(`${username} joined room ${room}`);
        io.to(room).emit('room_users', roomUsers[room]);
    });

    socket.on('start_quiz', async (room) => {
        console.log(`Starting quiz in room: ${room}`);
        let currentQuestionIndex = 0;
        let scores = {};

        try {
            const quiz = await Quiz.findOne({ title: room }).populate('questions');

            if (!quiz) {
                io.to(room).emit('error', 'Quiz not found for this room');
                return;
            }

            const questions = quiz.questions;

            const sendQuestion = () => {
                if (currentQuestionIndex < questions.length) {
                    io.to(room).emit('new_question', {
                        question: questions[currentQuestionIndex].questionText,
                        options: questions[currentQuestionIndex].options,
                        index: currentQuestionIndex
                    });

                    setTimeout(() => {
                        currentQuestionIndex++;
                        sendQuestion();
                    }, 15000);
                } else {
                    io.to(room).emit('quiz_ended', scores);
                }
            };

            socket.on('submit_answer', ({ answer, index }) => {
                const correct = questions[index].correctAnswer;
                if (correct === answer) {
                    scores[socket.id] = (scores[socket.id] || 0) + 1;
                }
            });

            sendQuestion();
        } catch (error) {
            console.error('Error fetching quiz:', error);
            io.to(room).emit('error', 'Internal server error');
        }
    });


    socket.on('disconnect', () => {
        for (const room in roomUsers) {
            roomUsers[room] = roomUsers[room].filter(user => user.socketId !== socket.id);
            io.to(room).emit('room_users', roomUsers[room]);
        }
        console.log(`User disconnected: ${socket.id}`);
    });
});

// Test route
app.get('/', (req, res) => res.send('Quiz Game API Running'));

// MongoDB connection + start server
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('MongoDB Connected');
        server.listen(process.env.PORT, () =>
            console.log(`Server running on http://localhost:${process.env.PORT}`)
        );
    })
    .catch(err => console.error('MongoDB connection error:', err));
