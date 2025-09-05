const express = require("express");
const router = express.Router();
const {
  verifyToken,
  authorizeRoles,
} = require("../middlewares/authMiddleware");
const teacherController = require("../controllers/teacherController");

router.get(
  "/dashboard",
  verifyToken,
  authorizeRoles("teacher"),
  teacherController.getDashboard
);
router.get(
  "/pending-approvals",
  verifyToken,
  authorizeRoles("teacher"),
  teacherController.getPendingStudentApprovals
);
router.patch(
  "/approve/:studentId",
  verifyToken,
  authorizeRoles("teacher"),
  teacherController.approveStudent
);

module.exports = router;
