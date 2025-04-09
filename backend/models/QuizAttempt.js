const mongoose = require('mongoose');

const quizAttemptSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    username: String,
    room: String,                  // Room ID or Code
    quizTitle: String,             // ✅ Added for better dashboard display
    score: Number,
    totalQuestions: Number,        // ✅ Renamed and used in frontend
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('QuizAttempt', quizAttemptSchema);
