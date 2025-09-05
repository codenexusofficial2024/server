const admin = require("firebase-admin");


exports.updateStudentProfile = async (req, res) => {
  const db = admin.firestore();
  try {
    const uid = req.user.uid;
    const {
      name,
      rollNo,
      department,
      section,
      collegeId,
      startingSemester,
      academicSession,
      faceImageUrl, // NEW: The URL of the student's uploaded photo
    } = req.body;

    if (
      !name ||
      !rollNo ||
      !department ||
      !section ||
      !collegeId ||
      !startingSemester ||
      !academicSession ||
      !faceImageUrl
    ) {
      return res
        .status(400)
        .json({
          message:
            "All profile fields, including a face image URL, are required.",
        });
    }

    const batchYear = parseInt(academicSession.split("-")[0].trim());

    if (isNaN(batchYear)) {
      return res
        .status(400)
        .json({
          message: "Invalid academic session format. Expected 'YYYY - YYYY'.",
        });
    }

    const studentData = {
      name,
      email: req.user.email,
      rollNo,
      department,
      section,
      collegeId,
      startingSemester,
      academicSession,
      batchYear: batchYear,
      faceImageUrl: faceImageUrl, // NEW: Save the image URL
      approved: false,
      role: "student",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection("users").doc(uid).set(studentData, { merge: true });
    res
      .status(200)
      .json({
        message: "Profile updated successfully. Awaiting teacher approval.",
      });
  } catch (error) {
    console.error("Update student profile error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
