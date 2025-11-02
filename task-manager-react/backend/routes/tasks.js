import express from "express";
import jwt from "jsonwebtoken";
import Task from "../models/Task.js";

const router = express.Router();

// ✅ Middleware to verify token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token provided" });

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ message: "Invalid token" });
    req.userId = decoded.id;
    next();
  });
};

// ✅ Get all tasks for logged-in user
router.get("/", verifyToken, async (req, res) => {
  const tasks = await Task.find({ userId: req.userId }).sort({ createdAt: -1 });
  res.json(tasks);
});

// ✅ Create task
router.post("/", verifyToken, async (req, res) => {
  const newTask = new Task({ ...req.body, userId: req.userId });
  const saved = await newTask.save();
  res.json(saved);
});

// ✅ Update task
router.put("/:id", verifyToken, async (req, res) => {
  const task = await Task.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId },
    req.body,
    { new: true }
  );
  res.json(task);
});

// ✅ Delete task
router.delete("/:id", verifyToken, async (req, res) => {
  await Task.findOneAndDelete({ _id: req.params.id, userId: req.userId });
  res.json({ message: "Deleted successfully" });
});

export default router;
