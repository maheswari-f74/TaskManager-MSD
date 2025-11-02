import mongoose from "mongoose";

const taskSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true },
  description: String,
  priority: { type: String, default: "medium" },
  dueDate: Date,
  completed: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model("Task", taskSchema);
