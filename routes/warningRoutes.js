const express = require("express");
const router = express.Router();
const {
  verifyToken,
  authorizeRoles,
} = require("../middlewares/authMiddleware");
const warningController = require("../controllers/warningController");

router.get(
  "/low-attendance",
  verifyToken,
  authorizeRoles("teacher"),
  warningController.getLowAttendanceStudents
);
router.post(
  "/",
  verifyToken,
  authorizeRoles("teacher"),
  warningController.sendWarning
);
router.get(
  "/",
  verifyToken,
  authorizeRoles("student"),
  warningController.getStudentWarnings
);

module.exports = router;
