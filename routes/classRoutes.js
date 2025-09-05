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
