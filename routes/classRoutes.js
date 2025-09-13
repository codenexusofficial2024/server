const express = require("express");
const router = express.Router();
const {
  verifyToken,
  authorizeRoles,
} = require("../middlewares/authMiddleware");
const classController = require("../controllers/classController");

router.post(
  "/",
  verifyToken,
  authorizeRoles("teacher"),
  classController.addClass
);


// Route for a TEACHER to get the detailed attendance summary for a single class
router.get(
  "/:classId/attendance",
  verifyToken,
  authorizeRoles("teacher"),
  classController.getClassAttendanceSummary
);

router.get(
  "/",
  verifyToken,
  authorizeRoles("student"),
  classController.getStudentClasses
);
router.get(
  "/teacher",
  verifyToken,
  authorizeRoles("teacher"),
  classController.getTeacherClasses
);

module.exports = router;
