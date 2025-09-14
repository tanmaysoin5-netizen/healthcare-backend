const express = require("express");
const PatientModel = require("../models/Patient");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// ➕ Add new patient
router.post("/", authMiddleware, async (req, res) => {
  try {
    const patient = new PatientModel(req.body);
    await patient.save();
    res.status(201).json(patient);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 📄 Get all patients
router.get("/", authMiddleware, async (req, res) => {
  try {
    const patients = await PatientModel.find();
    res.json(patients);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✏️ Update patient by ID
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const patient = await PatientModel.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true } // return updated patient
    );
    if (!patient) {
      return res.status(404).json({ msg: "Patient not found" });
    }
    res.json(patient);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 🗑️ Delete patient by ID
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const patient = await PatientModel.findByIdAndDelete(req.params.id);
    if (!patient) {
      return res.status(404).json({ msg: "Patient not found" });
    }
    res.json({ msg: "Patient deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
