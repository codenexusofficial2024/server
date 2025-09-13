require("dotenv").config();
const express = require("express");
const admin = require("firebase-admin");
const cors = require("cors"); // You already have this import

// Route Imports
const userRoutes = require("./routes/userRoutes");
const classRoutes = require("./routes/classRoutes");
const sessionRoutes = require("./routes/sessionRoutes");
const warningRoutes = require("./routes/warningRoutes");
const studentRoutes = require("./routes/studentRoutes");
const teacherRoutes = require("./routes/teacherRoutes");

const app = express();

app.use(cors());

app.use(express.json());

// --- FIREBASE INITIALIZATION ---
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`,
});

// --- API ROUTES ---

app.use("/api/users", userRoutes);
app.use("/api/classes", classRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/warnings", warningRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/teachers", teacherRoutes);

// --- SERVER PORT ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
