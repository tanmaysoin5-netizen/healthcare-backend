const mongoose = require("mongoose");

// ✅ Updated Patient Schema
const patientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  age: Number,
  condition: String,
  medicalHistory: String,
  carePlan: String,
});

// ✅ Unique model name
const PatientModel = mongoose.model("PatientModel", patientSchema);

module.exports = PatientModel;
