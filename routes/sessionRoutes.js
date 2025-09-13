const express = require("express");
const router = express.Router();
const {
  verifyToken,
  authorizeRoles,
} = require("../middlewares/authMiddleware");
const sessionController = require("../controllers/sessionController");

// Existing route for activating QR
router.patch(
  "/activate/:classId",
  verifyToken,
  authorizeRoles("teacher"),
  sessionController.activateQR
);

// Existing route for student marking attendance via QR
router.post(
  "/mark-attendance/:classId",
  verifyToken,
  authorizeRoles("student"),
  sessionController.markAttendance
);


// Route for a TEACHER to manually end an active attendance session
router.patch(
    "/end/:classId",
    verifyToken,
    authorizeRoles("teacher"),
    sessionController.endSession
);

// Existing route for teacher to manually mark one student
router.post(
  "/manual-mark/:classId",
  verifyToken,
  authorizeRoles("teacher"),
  sessionController.manualMarkSingleStudent
);

// NEW: Route for a TEACHER to mark attendance using face recognition data
router.post(
  "/mark-by-face/:classId",
  verifyToken,
  authorizeRoles("teacher"),
  sessionController.markAttendanceByFace
);

module.exports = router;
