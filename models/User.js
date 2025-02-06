import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new Schema(
  {
    username: {
      type: String,
      unique: true,
      required: [true, 'Username is required'],
      trim: true,
      minlength: [3, 'Username should be at least 3 characters long'], // Validation for username length
    },
    firstname: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
    },
    lastname: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password should be at least 6 characters long'], // Password length validation
    },
    createdOn: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true } // Adds createdAt and updatedAt fields automatically
);

// Hash the password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next(); // Proceed if password is not modified
  try {
    const hashedPassword = await bcrypt.hash(this.password, 10); // Hash password with salt rounds
    this.password = hashedPassword;
    next();
  } catch (err) {
    next(err); // Pass error to next middleware
  }
});

// Custom method to compare passwords during login
userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    const isMatch = await bcrypt.compare(candidatePassword, this.password);
    return isMatch;
  } catch (err) {
    throw new Error('Password comparison failed');
  }
};

export default mongoose.model('User', userSchema);
