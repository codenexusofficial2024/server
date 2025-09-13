const admin = require("firebase-admin");

const { isWithinRadius } = require("../utils/locationUtils");
const { generateUUID } = require("../utils/uuidUtils");
const { generateQRCode } = require("../utils/qrUtils");

// This function activates the QR Code session for a teacher
exports.activateQR = async (req, res) => {
  const db = admin.firestore();
  try {
    const { classId } = req.params;
    const { teacherLocation } = req.body;

    if (!teacherLocation) {
      return res.status(400).json({
        message: "Teacher location is required to activate a session.",
      });
    }

    const classRef = db.collection("classes").doc(classId);
    const classDoc = await classRef.get();
    if (!classDoc.exists)
      return res.status(404).json({ message: "Class not found" });

    const classData = classDoc.data();
    if (classData.teacherId !== req.user.uid)
      return res.status(403).json({
        message: "Forbidden: You are not the teacher for this class.",
      });

    const startTime = classData.startTime.toDate();
    const endTime = classData.endTime.toDate();
    const now = new Date();
    const classDurationMs = endTime - startTime;
    const timeElapsedMs = now - startTime;

    if (timeElapsedMs < classDurationMs / 2)
      return res.status(400).json({
        message: "Cannot activate QR before 50% of class time has passed.",
      });
    if (now > endTime)
      return res
        .status(400)
        .json({ message: "Cannot activate QR after the class has ended." });

    const uuid = generateUUID();
    const qrCodeDataUrl = await generateQRCode(uuid);
    const expiryTime = new Date(endTime.getTime() + 30 * 60000);

    // --- MODIFIED LOGIC STARTS HERE ---
    const updatePayload = {
      sessionActive: true,
      sessionUUID: uuid,
      sessionActivatedAt: admin.firestore.FieldValue.serverTimestamp(),
      sessionExpiresAt: admin.firestore.Timestamp.fromDate(expiryTime),
      teacherLocation: teacherLocation,
    };

    // Conditionally reset attendance ONLY if no one has been marked present yet.
    const currentAttendance = classData.attendance || {};
    if (Object.keys(currentAttendance).length === 0) {
      updatePayload.attendance = {};
    }
    // --- MODIFIED LOGIC ENDS HERE ---

    await classRef.update(updatePayload);

    res.json({ message: "QR activated", qrCode: qrCodeDataUrl, uuid });
  } catch (error) {
    console.error("Activate QR error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// This function marks a student's attendance via QR Code scan
exports.markAttendance = async (req, res) => {
  const db = admin.firestore();
  try {
    const { classId } = req.params;
    const studentId = req.user.uid;
    const { qrUUID, location } = req.body;

    const classRef = db.collection("classes").doc(classId);
    const classDoc = await classRef.get();
    if (!classDoc.exists)
      return res.status(404).json({ message: "Class session not found" });

    const classData = classDoc.data();
    if (!classData.sessionActive)
      return res
        .status(403)
        .json({ message: "Attendance session is not active." });
    if (qrUUID !== classData.sessionUUID)
      return res.status(400).json({ message: "Invalid QR code." });
    if (new Date() > classData.sessionExpiresAt.toDate())
      return res.status(403).json({ message: "QR code has expired." });

    if (!location || !isWithinRadius(classData.teacherLocation, location, 5))
      return res
        .status(403)
        .json({
          message: "You are not within the required 5-meter location range.",
        });

    const attendanceMap = classData.attendance || {};
    if (attendanceMap[studentId])
      return res.status(400).json({ message: "Attendance already marked." });

    const attendanceField = `attendance.${studentId}`;
    await classRef.update({
      [attendanceField]: {
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        status: "present",
        method: "QR Scan",
      },
    });
    res.json({ message: "Attendance marked successfully." });
  } catch (error) {
    console.error("Mark attendance error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
// To end session manually
exports.endSession = async (req, res) => {
  const db = admin.firestore();
  try {
    const { classId } = req.params;
    const teacherId = req.user.uid;

    const classRef = db.collection("classes").doc(classId);
    const classDoc = await classRef.get();

    if (!classDoc.exists) {
      return res.status(404).json({ message: "Class not found." });
    }
    const classData = classDoc.data();

    // Security Check: Only the assigned teacher can end the session
    if (classData.teacherId !== teacherId) {
      return res.status(403).json({ message: "Forbidden: You are not the teacher of this class." });
    }

    // End the session by setting sessionActive to false
    await classRef.update({
      sessionActive: false
    });

    res.json({ message: "Attendance session has been manually ended." });
  } catch (error) {
    console.error("End session error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// This function allows a teacher to manually mark a single student
exports.manualMarkSingleStudent = async (req, res) => {
  const db = admin.firestore();
  try {
    const { classId } = req.params;
    const { studentId } = req.body;

    if (!studentId)
      return res.status(400).json({ message: "Student ID is required." });

    const classRef = db.collection("classes").doc(classId);
    const classDoc = await classRef.get();
    if (!classDoc.exists)
      return res.status(404).json({ message: "Class session not found." });

    const classData = classDoc.data();
    if (classData.teacherId !== req.user.uid)
      return res.status(403).json({
        message: "Forbidden: You are not the teacher for this class.",
      });
    if (!classData.sessionActive)
      return res
        .status(403)
        .json({ message: "This attendance session is not active." });
    if (new Date() > classData.sessionExpiresAt.toDate())
      return res
        .status(403)
        .json({ message: "This attendance session has expired." });

    const attendanceMap = classData.attendance || {};
    if (attendanceMap[studentId])
      return res.status(400).json({
        message: "This student's attendance has already been marked.",
      });

    const attendanceField = `attendance.${studentId}`;
    await classRef.update({
      [attendanceField]: {
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        status: "present",
        method: "Manual by Teacher",
      },
    });
    res.json({ message: `Successfully marked ${studentId} as present.` });
  } catch (error) {
    console.error("Manual mark student error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * This is the function that reads the JSON response from your AIML model.
 * It expects a JSON body like: { "recognizedStudents": [{ "rollNo": "...", "timestamp": "..." }] }
 */
// This function receives the results from the frontend and marks attendance.
// It NO LONGER calls the AI model itself.
exports.markAttendanceByFace = async (req, res) => {
  const db = admin.firestore();
  try {
    const { classId } = req.params;
    const { recognizedStudents } = req.body; // Expects results from frontend

    if (!recognizedStudents || !Array.isArray(recognizedStudents)) {
      return res
        .status(400)
        .json({
          message: "An array of recognized student objects is required.",
        });
    }

    const classRef = db.collection("classes").doc(classId);
    const classDoc = await classRef.get();
    if (!classDoc.exists)
      return res.status(404).json({ message: "Class not found." });

    const classData = classDoc.data();
    if (classData.teacherId !== req.user.uid)
      return res
        .status(403)
        .json({
          message: "Forbidden: You are not the teacher for this class.",
        });

    const batch = db.batch();
    let successfulMarks = 0;
    let notFoundRolls = [];

    // Initialize attendance field if it doesn't exist
    if (!classData.attendance) {
        batch.update(classRef, { attendance: {} });
    }

    for (const student of recognizedStudents) {
      const { rollNo, timestamp } = student;
      if (!rollNo || !timestamp) continue;

      const studentQuery = await db
        .collection("users")
        .where("rollNo", "==", rollNo)
        .limit(1)
        .get();

      if (!studentQuery.empty) {
        const studentDoc = studentQuery.docs[0];
        const studentId = studentDoc.id;

        const attendanceField = `attendance.${studentId}`;
        batch.update(classRef, {
          [attendanceField]: {
            serverTimestamp: admin.firestore.FieldValue.serverTimestamp(),
            recognitionTimestamp: new Date(timestamp),
            status: "present",
            method: "Face Recognition",
          },
        });
        successfulMarks++;
      } else {
        notFoundRolls.push(rollNo);
      }
    }

    await batch.commit();
    res.json({
      message: `Attendance marked for ${successfulMarks} students via face recognition.`,
      notFoundRollNumbers: notFoundRolls,
    });
  } catch (error) {
    console.error("Mark attendance by face error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};