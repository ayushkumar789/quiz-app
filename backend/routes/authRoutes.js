const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const QuizAttempt = require('../models/QuizAttempt');

// Register
router.post('/register', async (req, res) => {
    const { name, username, email, password, phone } = req.body;

    try {
        const exists = await User.findOne({ $or: [{ email }, { username }] });
        if (exists) return res.status(400).json({ msg: 'Email or username already exists' });

        const hash = await bcrypt.hash(password, 10);
        const user = await User.create({ name, username, email, password: hash, phone });

        res.status(201).json({ msg: 'Registered', user });
    } catch (err) {
        res.status(500).json({ msg: 'Registration failed', error: err });
    }
});


// Login
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await User.findOne({ $or: [{ email: username }, { username }] });
        if (!user) return res.status(404).json({ msg: 'User not found' });

        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(400).json({ msg: 'Wrong password' });

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.json({ token, user });
    } catch (err) {
        res.status(500).json({ msg: 'Login failed', error: err });
    }
});



router.get('/history', async (req, res) => {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) return res.status(401).json({ msg: "Unauthorized" });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const attempts = await QuizAttempt.find({ userId: decoded.id }).sort({ createdAt: -1 });
        res.json({ attempts });
    } catch (err) {
        res.status(401).json({ msg: "Invalid token", error: err.message });
    }
});



module.exports = router;
