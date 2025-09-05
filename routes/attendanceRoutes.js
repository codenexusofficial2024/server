const express = require("express");
const router = express.Router();
const {
  verifyToken,
  authorizeRoles,
} = require("../middlewares/authMiddleware");
const attendanceController = require("../controllers/attendanceController");

// Students mark attendance by QR scan
router.post(
  "/mark",
  verifyToken,
  authorizeRoles("student"),
  attendanceController.markAttendance
);

// Teacher manual override attendance
router.post(
  "/manual-override",
  verifyToken,
  authorizeRoles("teacher"),
  attendanceController.manualOverrideAttendance
);

// Get student's attendance summary
router.get(
  "/summary/:studentId/:semester/:department/:section",
  verifyToken,
  authorizeRoles("student"),
  attendanceController.getStudentAttendanceSummary
);

// Teacher: get students with less than 50% attendance for a class
router.get(
  "/low-attendance/:classId",
  verifyToken,
  authorizeRoles("teacher"),
  attendanceController.getStudentsWithLowAttendance
);

module.exports = router;
