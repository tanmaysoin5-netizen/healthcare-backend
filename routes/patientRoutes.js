const express = require("express");
const PatientModel = require("../models/Patient");
const authMiddleware = require("../middleware/authMiddleware"); // import auth middleware

const router = express.Router();

// ➕ Add new patient (only logged-in users, optionally only doctors)
router.post("/", authMiddleware, async (req, res) => {
  try {
    // Optional: Only allow doctors to add patients
    // if (req.user.role !== "doctor") {
    //   return res.status(403).json({ msg: "Only doctors can add patients" });
    // }

    const patient = new PatientModel(req.body);
    await patient.save();
    res.status(201).json(patient);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 📄 Get all patients (only logged-in users)
router.get("/", authMiddleware, async (req, res) => {
  try {
    const patients = await PatientModel.find();
    res.json(patients);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
