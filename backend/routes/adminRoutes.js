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

// Create quiz with all questions at once
router.post('/create-quiz', verifyToken, async (req, res) => {
    try {
        const { title, questions } = req.body;

        if (!title || !questions || !Array.isArray(questions)) {
            return res.status(400).json({ error: 'Invalid input' });
        }

        const createdQuestions = await Question.insertMany(questions);

        const quiz = await Quiz.create({
            title,
            questions: createdQuestions.map(q => q._id),
            createdBy: req.user.id
        });

        res.status(201).json({ message: 'Quiz created', quiz });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create quiz' });
    }
});



router.get('/quiz/:title', async (req, res) => {
    try {
        const quiz = await Quiz.findOne({ title: req.params.title }).populate('questions');
        if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
        res.json(quiz);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});
module.exports = router;