const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

require("dotenv").config();

const app = express();

// ✅ Middlewares
app.use(express.json());
app.use(cors());

require("dotenv").config();

// ✅ Connect MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log("✅ MongoDB Atlas Connected"))
  .catch(err => console.error("❌ MongoDB Error:", err));

/* -------------------- MODELS -------------------- */
// ✅ Patient Model
const PatientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  age: Number,
  condition: String,
  medicalHistory: String,
  carePlan: String,
});
const Patient = mongoose.model("Patient", PatientSchema);

// ✅ User Model
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["doctor", "staff"], default: "staff" }
});
const User = mongoose.model("User", UserSchema);

// ✅ Appointment Model
const AppointmentSchema = new mongoose.Schema({
  patientName: { type: String, required: true },
  date: { type: String, required: true },
  time: { type: String, required: true },
  status: { type: String, enum: ["Scheduled", "Completed", "Cancelled"], default: "Scheduled" }
});
const Appointment = mongoose.model("Appointment", AppointmentSchema);

/* -------------------- AUTH ROUTES -------------------- */
// Register
app.post("/auth/register", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hashedPassword, role });
    await user.save();

    const token = jwt.sign({ id: user._id, role: user.role }, "secretkey", { expiresIn: "1h" });
    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login
app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: "Invalid password" });

    const token = jwt.sign({ id: user._id, role: user.role }, "secretkey", { expiresIn: "1h" });
    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Get all users (without password)
app.get("/auth/users", async (_req, res) => {
  try {
    const users = await User.find({}, "-password");
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Get users count
app.get("/auth/users/count", async (_req, res) => {
  try {
    const count = await User.countDocuments();
    res.json({ totalUsers: count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* -------------------- AUTH MIDDLEWARE -------------------- */
function authMiddleware(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader) return res.status(401).json({ error: "No token provided" });

  const token = authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Invalid token format" });

  jwt.verify(token, "secretkey", (err, decoded) => {
    if (err) return res.status(403).json({ error: "Invalid or expired token" });
    req.user = decoded;
    next();
  });
}

/* -------------------- PATIENT ROUTES -------------------- */
// ➕ Add new patient
app.post("/patients", authMiddleware, async (req, res) => {
  try {
    const patient = new Patient(req.body);
    await patient.save();
    res.status(201).json(patient);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 📄 Get all patients
app.get("/patients", authMiddleware, async (_req, res) => {
  try {
    const patients = await Patient.find();
    res.json(patients);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔎 Get one patient
app.get("/patients/:id", authMiddleware, async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).json({ error: "Patient not found" });
    res.json(patient);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✏️ Update patient
app.put("/patients/:id", authMiddleware, async (req, res) => {
  if (req.user.role !== "doctor") {
    return res.status(403).json({ error: "Access denied. Only doctors can modify patient records." });
  }
  try {
    const patient = await Patient.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!patient) return res.status(404).json({ error: "Patient not found" });
    res.json(patient);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ❌ Delete patient
app.delete("/patients/:id", authMiddleware, async (req, res) => {
  if (req.user.role !== "doctor") {
    return res.status(403).json({ error: "Access denied. Only doctors can delete patient records." });
  }
  try {
    const patient = await Patient.findByIdAndDelete(req.params.id);
    if (!patient) return res.status(404).json({ error: "Patient not found" });
    res.json({ message: "Patient deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* -------------------- APPOINTMENT ROUTES -------------------- */
// ➕ Schedule Appointment
app.post("/appointments", authMiddleware, async (req, res) => {
  try {
    const appointment = new Appointment(req.body);
    await appointment.save();
    res.status(201).json(appointment);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 📄 Get all appointments
app.get("/appointments", authMiddleware, async (_req, res) => {
  try {
    const appointments = await Appointment.find().sort({ date: 1, time: 1 });
    res.json(appointments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✏️ Update appointment status
app.put("/appointments/:id", authMiddleware, async (req, res) => {
  try {
    const appointment = await Appointment.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!appointment) return res.status(404).json({ error: "Appointment not found" });
    res.json(appointment);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ❌ Delete appointment
app.delete("/appointments/:id", authMiddleware, async (req, res) => {
  try {
    const appointment = await Appointment.findByIdAndDelete(req.params.id);
    if (!appointment) return res.status(404).json({ error: "Appointment not found" });
    res.json({ message: "Appointment deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* -------------------- ANALYTICS ROUTES -------------------- */
// 📊 Get Dashboard Analytics
app.get("/analytics/stats", authMiddleware, async (_req, res) => {
  try {
    const totalPatients = await Patient.countDocuments();
    const totalAppointments = await Appointment.countDocuments();
    const upcomingAppointments = await Appointment.countDocuments({ status: "Scheduled" });
    const totalStaff = await User.countDocuments();

    res.json({
      totalPatients,
      totalAppointments,
      upcomingAppointments,
      totalStaff
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* -------------------- FRONTEND -------------------- */
// ✅ Serve frontend (correct path)
app.use(express.static(path.join(__dirname, "frontend")));

app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "frontend", "login.html"));
});

app.get("/redirect", (req, res) => {
  res.redirect("/index.html");
});
app.get("/index.html", (_req, res) => {
  res.sendFile(path.join(__dirname, "frontend", "index.html"));
});

/* -------------------- START SERVER -------------------- */
app.listen(5000, () => console.log(`🚀 API running on http://localhost:5000`));