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

app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

// ======= Room-Level Global State =======
const roomUsers = {};            // { room: [{ socketId, username }] }
const roomScores = {};           // { room: { socketId: score } }
const roomQuestions = {};        // { room: [questions] }
const roomIndexes = {};          // { room: currentQuestionIndex }

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on('join_room', ({ username, room }) => {
        socket.join(room);
        if (!roomUsers[room]) roomUsers[room] = [];
        roomUsers[room].push({ socketId: socket.id, username });

        io.to(room).emit('room_users', roomUsers[room]);
    });

    socket.on('start_quiz', async (room) => {
        console.log(`Starting quiz in room: ${room}`);
        try {
            const quiz = await Quiz.findOne({ title: room }).populate('questions');
            if (!quiz) {
                io.to(room).emit('error', 'Quiz not found for this room');
                return;
            }

            roomScores[room] = {};
            roomQuestions[room] = quiz.questions;
            roomIndexes[room] = 0;

            sendQuestion(room);
        } catch (error) {
            console.error('Error starting quiz:', error);
            io.to(room).emit('error', 'Internal server error');
        }
    });

    socket.on('submit_answer', ({ answer, index, room }) => {
        const questions = roomQuestions[room];
        const correct = questions?.[index]?.correctAnswer;
        if (!correct) return;

        if (answer === correct) {
            roomScores[room][socket.id] = (roomScores[room][socket.id] || 0) + 1;
        }

        io.to(room).emit('update_leaderboard', roomScores[room]);
    });

    socket.on('disconnect', () => {
        for (const room in roomUsers) {
            roomUsers[room] = roomUsers[room].filter(user => user.socketId !== socket.id);
            io.to(room).emit('room_users', roomUsers[room]);
        }
        console.log(`User disconnected: ${socket.id}`);
    });
});

// ======= Shared Question Sender Function =======
const sendQuestion = (room) => {
    const questions = roomQuestions[room];
    const index = roomIndexes[room];

    if (index < questions.length) {
        io.to(room).emit('new_question', {
            question: questions[index].questionText,
            options: questions[index].options,
            correctAnswer: questions[index].correctAnswer,
            index
        });

        setTimeout(() => {
            io.to(room).emit('reveal_answer', {
                correctAnswer: questions[index].correctAnswer
            });

            setTimeout(() => {
                roomIndexes[room]++;
                sendQuestion(room);
            }, 3000);
        }, 15000);
    } else {
        io.to(room).emit('quiz_ended', roomScores[room]);
    }
};

app.get('/', (req, res) => res.send('Quiz Game API Running'));

mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('MongoDB Connected');
        server.listen(process.env.PORT, () =>
            console.log(`Server running on http://localhost:${process.env.PORT}`)
        );
    })
    .catch(err => console.error('MongoDB connection error:', err));
