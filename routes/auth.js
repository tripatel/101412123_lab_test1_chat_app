import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { body, validationResult } from 'express-validator';

const router = express.Router();

// Signup route with validation
router.post(
  '/signup',
  [
    body('username').isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('firstname').notEmpty().withMessage('First name is required'),
    body('lastname').notEmpty().withMessage('Last name is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { username, firstname, lastname, password } = req.body;
      const existingUser = await User.findOne({ username });

      if (existingUser) {
        return res.status(400).json({ error: 'Username already exists' });
      }

      const user = new User({ username, firstname, lastname, password });
      await user.save();
      res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Login route with enhanced error handling and JWT token generation
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const user = await User.findOne({ username });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token with extended expiry time
    const token = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRY || '1h' } // Dynamically set expiration based on environment
    );

    res.json({
      message: 'Login successful',
      token,
      user: { username: user.username, firstname: user.firstname, lastname: user.lastname },
    });
  } catch (error) {
    res.status(500).json({ error: 'Login failed. Please try again later.' });
  }
});

export default router;
