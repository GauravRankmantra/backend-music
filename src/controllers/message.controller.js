const Message = require('../models/message.model.js');
const User = require("../models/user.model.js");

// Get users with messages
exports.getActiveUsers = async (req, res) => {
  try {
    const userIds = await Message.distinct("user");
    const users = await User.find({ _id: { $in: userIds } }).select("fullName email role");
    return res.status(200).json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get all messages by user ID
exports.getMessagesByUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const userExists = await User.exists({ _id: userId });
    if (!userExists) return res.status(404).json({ success: false, error: "User not found" });

    const messages = await Message.find({ user: userId }).sort({ createdAt: 1 });
    return res.status(200).json({ success: true, messages });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Create message from user
exports.createUserMessage = async (req, res) => {
  try {
    const { userId, text } = req.body;

    if (!userId || !text?.trim()) {
      return res.status(400).json({ success: false, error: "User ID and message text are required" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, error: "User not found" });

    const message = await Message.create({
      user: user._id,
      sender: "user",
      text: text.trim()
    });

    return res.status(201).json({ success: true, message });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Create admin reply (now without admin check)
exports.createAdminReply = async (req, res) => {
  try {
    const { userId, text } = req.body;

    if (!userId || !text?.trim()) {
      return res.status(400).json({ success: false, error: "User ID and message text are required" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, error: "User not found" });

    const reply = await Message.create({
      user: user._id,
      sender: "admin",
      text: text.trim()
    });

    return res.status(201).json({ success: true, message: reply });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update message (removed admin only)
exports.updateMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { text } = req.body;

    if (!text?.trim()) return res.status(400).json({ success: false, error: "Message text is required" });

    const updatedMessage = await Message.findByIdAndUpdate(
      messageId,
      { text: text.trim() },
      { new: true }
    );

    if (!updatedMessage) return res.status(404).json({ success: false, error: "Message not found" });

    return res.status(200).json({ success: true, message: updatedMessage });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Delete message (removed admin only)
exports.deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;

    const deleted = await Message.findByIdAndDelete(messageId);

    if (!deleted) return res.status(404).json({ success: false, error: "Message not found" });

    return res.status(200).json({ success: true, message: "Message deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
