import React, { useState, useEffect } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
} from "recharts";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
} from "./api"; // Connects to backend
import "./styles.css";

export default function TaskManager({ onLogout }) {
  const [tasks, setTasks] = useState([]);
  const [text, setText] = useState("");
  const [due, setDue] = useState("");
  const [priority, setPriority] = useState("medium");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("default");
  const [theme, setTheme] = useState(localStorage.getItem("tm_theme") || "light");
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem("tm_theme", theme);
    document.body.className = theme === "dark" ? "dark" : "";
  }, [theme]);

  // Load tasks from backend
  useEffect(() => {
    fetchTasks();
  }, []);

  async function fetchTasks() {
    try {
      const res = await getTasks();
      setTasks(res.data);
    } catch (err) {
      console.error("❌ Failed to load tasks:", err);
      alert("Could not load tasks. Please log in again.");
      onLogout();
    }
  }

  async function addTask() {
    if (!text.trim()) return;
    try {
      const res = await createTask({
        title: text,
        description: "",
        priority,
        dueDate: due || null,
      });
      setTasks([res.data, ...tasks]);
      setText("");
      setDue("");
      setPriority("medium");
    } catch (err) {
      console.error("❌ Failed to add task:", err);
      alert("Failed to add task");
    }
  }

  async function toggleComplete(id, completed) {
    try {
      const res = await updateTask(id, { completed: !completed });
      setTasks(tasks.map((t) => (t._id === id ? res.data : t)));
    } catch (err) {
      console.error("❌ Update error:", err);
    }
  }

  async function removeTask(id) {
    if (!window.confirm("Delete this task?")) return;
    try {
      await deleteTask(id);
      setTasks(tasks.filter((t) => t._id !== id));
    } catch (err) {
      console.error("❌ Delete error:", err);
    }
  }

  async function saveEdit() {
    if (!editing) return;
    try {
      const res = await updateTask(editing._id, {
        title: text,
        priority,
        dueDate: due,
      });
      setTasks(tasks.map((t) => (t._id === editing._id ? res.data : t)));
      setEditing(null);
      setText("");
      setDue("");
      setPriority("medium");
    } catch (err) {
      console.error("❌ Edit error:", err);
    }
  }

  function startEdit(task) {
    setEditing(task);
    setText(task.title);
    setDue(task.dueDate ? task.dueDate.split("T")[0] : "");
    setPriority(task.priority);
  }

  function isOverdue(d) {
    if (!d) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dt = new Date(d);
    dt.setHours(0, 0, 0, 0);
    return dt < today;
  }

  function onDragEnd(result) {
    if (!result.destination) return;
    const items = Array.from(tasks);
    const [reordered] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reordered);
    setTasks(items);
  }

  // --- Filtering, Searching, Sorting ---
  let list = tasks.filter((t) => {
    if (filter === "pending") return !t.completed;
    if (filter === "completed") return t.completed;
    if (filter === "overdue") return t.dueDate && isOverdue(t.dueDate) && !t.completed;
    return true;
  });

  if (search) {
    const q = search.toLowerCase();
    list = list.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.priority || "").toLowerCase().includes(q)
    );
  }

  if (sort === "priority") {
    const order = { high: 1, medium: 2, low: 3 };
    list.sort((a, b) => order[a.priority] - order[b.priority]);
  } else if (sort === "due") {
    list.sort(
      (a, b) =>
        new Date(a.dueDate || "9999-12-31") -
        new Date(b.dueDate || "9999-12-31")
    );
  } else {
    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  const total = tasks.length;
  const completed = tasks.filter((t) => t.completed).length;
  const overdue = tasks.filter((t) => t.dueDate && isOverdue(t.dueDate) && !t.completed).length;
  const progress = total ? Math.round((completed / total) * 100) : 0;

  const pieData = [
    { name: "Completed", value: completed },
    { name: "Pending", value: total - completed - overdue },
    { name: "Overdue", value: overdue },
  ];

  const COLORS_LIGHT = ["#60a5fa", "#fbbf24", "#ef4444"];
  const COLORS_DARK = ["#3b82f6", "#f59e0b", "#dc2626"];
  const chartColors = theme === "dark" ? COLORS_DARK : COLORS_LIGHT;
  const textColor = theme === "dark" ? "#f3f4f6" : "#1f2937";

  // --- UI ---
  return (
    <div className="wrap">
      <header>
        <div className="brand">
          <div className="logo">TM</div>
          <div>
            <div className="title">Task Manager — Premium</div>
            <div className="subtitle">React + MongoDB Version</div>
          </div>
        </div>

        <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
          ☰ Menu
        </button>

        <div className="controls">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (editing ? saveEdit() : addTask())}
            placeholder="Add a task..."
            className="input"
          />
          <input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
          <select value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          {editing ? (
            <button className="accent-btn" onClick={saveEdit}>
              Save
            </button>
          ) : (
            <button className="accent-btn" onClick={addTask}>
              Add
            </button>
          )}
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="default">Sort: Default</option>
            <option value="priority">Priority</option>
            <option value="due">Due date</option>
          </select>
        </div>
      </header>

      <main>
        <div className="panel">
          <div className="stats">
            <div className="stat-card"><div className="stat-title">Total</div><div className="stat-num">{total}</div></div>
            <div className="stat-card"><div className="stat-title">Completed</div><div className="stat-num">{completed}</div></div>
            <div className="stat-card"><div className="stat-title">Overdue</div><div className="stat-num">{overdue}</div></div>
          </div>

          <div className="task-controls">
            <div className="filters">
              {["all", "pending", "completed", "overdue"].map((f) => (
                <button
                  key={f}
                  className={`filter-btn ${filter === f ? "active" : ""}`}
                  onClick={() => setFilter(f)}
                >
                  {f[0].toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
            <div className="search center">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tasks..."
              />
            </div>
          </div>

          <div className="panel" style={{ padding: "10px 12px" }}>
            <div className="progress" style={{ height: "18px", borderRadius: "12px" }}>
              <div
                style={{
                  height: "100%",
                  width: progress + "%",
                  background: "linear-gradient(90deg,#60a5fa,#7c3aed)",
                  transition: "width 0.8s ease-in-out",
                }}
              ></div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
              <small className="muted">Progress</small>
              <small className="muted">{progress}%</small>
            </div>
          </div>

          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="tasks">
              {(provided) => (
                <div className="task-list" {...provided.droppableProps} ref={provided.innerRef}>
                  {list.map((t, index) => (
                    <Draggable key={t._id} draggableId={t._id} index={index}>
                      {(provided) => (
                        <article
                          className="task-card"
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                        >
                          <div className="left-check">
                            <input
                              type="checkbox"
                              checked={t.completed}
                              onChange={() => toggleComplete(t._id, t.completed)}
                            />
                          </div>
                          <div className="task-main">
                            <div className="task-title">
                              <span style={{ textDecoration: t.completed ? "line-through" : "" }}>
                                {t.title}
                              </span>
                              <span
                                className={`badge ${
                                  t.priority === "high"
                                    ? "priority-high"
                                    : t.priority === "medium"
                                    ? "priority-medium"
                                    : "priority-low"
                                }`}
                              >
                                {t.priority.toUpperCase()}
                              </span>
                            </div>
                            <div className="meta">
                              {t.dueDate && (
                                <span
                                  className={`task-due ${
                                    isOverdue(t.dueDate) && !t.completed ? "overdue" : ""
                                  }`}
                                >
                                  📅 {t.dueDate.split("T")[0]}
                                </span>
                              )}
                              <small>Added: {new Date(t.createdAt).toLocaleString()}</small>
                            </div>
                          </div>
                          <div className="task-actions">
                            <button className="icon-btn" onClick={() => startEdit(t)}>✏️</button>
                            <button className="icon-btn" onClick={() => removeTask(t._id)}>🗑️</button>
                          </div>
                        </article>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>

          <div className="panel" style={{ marginTop: 20 }}>
            <h4 style={{ marginBottom: 10 }}>Task Overview</h4>
            <PieChart width={250} height={250}>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={{ fill: textColor }}
                isAnimationActive={true}
                animationDuration={800}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: theme === "dark" ? "#1f2937" : "#fff",
                  color: textColor,
                }}
              />
              <Legend verticalAlign="bottom" height={36} wrapperStyle={{ color: textColor }} />
            </PieChart>
          </div>
        </div>
      </main>

      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Theme</div>
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="filter-btn"
          >
            {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
          </button>
          <button onClick={onLogout} className="filter-btn">
            Logout
          </button>
          <button
            onClick={() => setSidebarOpen(false)}
            className="filter-btn"
            style={{ marginTop: 10 }}
          >
            Close
          </button>
        </div>
      </aside>
    </div>
  );
}
