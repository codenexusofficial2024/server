const express = require("express");
const router = express.Router();
const {
  verifyToken,
  authorizeRoles,
} = require("../middlewares/authMiddleware");
const studentController = require("../controllers/studentController");

router.get(
  "/attendance-summary",
  verifyToken,
  authorizeRoles("student"),
  studentController.getAttendanceSummary
);

module.exports = router;
