


const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middlewares/authMiddleware");
const userController = require("../controllers/userController");

router.post("/profile", verifyToken, userController.updateStudentProfile);

module.exports = router;