const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const QuizAttempt = require('../models/QuizAttempt');
const User = require('../models/User');

router.post('/submit', async (req, res) => {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) return res.status(401).json({ msg: "No token provided" });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const { quizTitle, score, totalQuestions, roomCode } = req.body;

        const attempt = await QuizAttempt.create({
            userId: decoded.id,
            quizTitle,
            score,
            totalQuestions,
            roomCode
        });

        res.status(201).json({ msg: "Score saved", attempt });
    } catch (err) {
        res.status(500).json({ msg: "Failed to save score", error: err.message });
    }
});

module.exports = router;
