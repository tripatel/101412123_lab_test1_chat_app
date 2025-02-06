import mongoose, { Schema } from 'mongoose';

const messageSchema = new Schema(
  {
    fromUser: {
      type: String,
      required: [true, 'Sender is required'],
      trim: true,
    },
    room: {
      type: String,
      trim: true,
      default: 'general', // Default room if not provided
    },
    toUser: {
      type: String,
      trim: true,
    },
    message: {
      type: String,
      required: [true, 'Message content cannot be empty'],
      maxlength: [500, 'Message cannot exceed 500 characters'], // Validation on message length
    },
    dateSent: {
      type: Date,
      default: () => Date.now(),
    },
  },
  { timestamps: true } // Automatically adds createdAt and updatedAt fields
);

messageSchema.methods.formatMessage = function () {
  return `${this.fromUser} says: ${this.message}`;
};

export default mongoose.model('Message', messageSchema);
