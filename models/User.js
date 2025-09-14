const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"] 
  },
  password: { type: String, required: true },
  role: { type: String, enum: ["doctor", "staff"], required: true }
});

module.exports = mongoose.model("User", UserSchema);
