const express = require('express');
const router = express.Router();
const Quiz = require('../models/Quiz');
const Question = require('../models/Question');
const verifyToken = require('../middlewares/authMiddleware');

// Create a new quiz
router.post('/quiz', verifyToken, async (req, res) => {
    try {
        const { title } = req.body;
        const quiz = await Quiz.create({ title, createdBy: req.user.id });
        res.status(201).json(quiz);
    } catch (err) {
        res.status(500).json({ msg: 'Failed to create quiz', error: err });
    }
});

// Add a question to quiz
router.post('/quiz/:quizId/question', verifyToken, async (req, res) => {
    try {
        const { questionText, options, correctAnswer, points } = req.body;
        const question = await Question.create({ questionText, options, correctAnswer, points });
        const quiz = await Quiz.findByIdAndUpdate(req.params.quizId, {
            $push: { questions: question._id }
        }, { new: true }).populate('questions');

        res.status(200).json(quiz);
    } catch (err) {
        res.status(500).json({ msg: 'Failed to add question', error: err });
    }
});

// Get all quizzes
router.get('/quiz', verifyToken, async (req, res) => {
    const quizzes = await Quiz.find().populate('questions');
    res.json(quizzes);
});

module.exports = router;
