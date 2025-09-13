const admin = require("firebase-admin");

exports.getDashboard = async (req, res) => {
  const db = admin.firestore();
  try {
    const teacherId = req.user.uid;
    const classesSnapshot = await db
      .collection("classes")
      .where("teacherId", "==", teacherId)
      .get();
    const classes = classesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    res.json({ classes });
  } catch (error) {
    console.error("getDashboard error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.getPendingStudentApprovals = async (req, res) => {
  const db = admin.firestore();
  try {
    const teacherId = req.user.uid;

    const teacherClassesSnap = await db
      .collection("classes")
      .where("teacherId", "==", teacherId)
      .get();
    if (teacherClassesSnap.empty) {
      return res.json([]);
    }

    const uniqueGroups = new Set();
    teacherClassesSnap.forEach((doc) => {
      const classData = doc.data();
      uniqueGroups.add(
        `${classData.department}-${classData.semester}-${classData.section}`
      );
    });

    const batchesSnap = await db.collection("batches").get();
    const semesterToBatchMap = {};
    batchesSnap.forEach((doc) => {
      semesterToBatchMap[doc.data().currentSemester] = parseInt(doc.id);
    });

    const studentPromises = [];
    for (const group of uniqueGroups) {
      const [department, semester, section] = group.split("-");
      const batchYear = semesterToBatchMap[semester];

      if (!batchYear) continue;

      const studentQuery = db
        .collection("users")
        .where("role", "==", "student")
        .where("approved", "==", false)
        .where("department", "==", department)
        .where("batchYear", "==", batchYear)
        .where("section", "==", section)
        .get();
      studentPromises.push(studentQuery);
    }

    const studentSnapshots = await Promise.all(studentPromises);
    const pendingStudentsMap = new Map();
    studentSnapshots.forEach((snapshot) => {
      snapshot.forEach((doc) => {
        pendingStudentsMap.set(doc.id, { id: doc.id, ...doc.data() });
      });
    });

    res.json(Array.from(pendingStudentsMap.values()));
  } catch (error) {
    console.error("Get pending approvals error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Simplified approval function without AI/ML enrollment
exports.approveStudent = async (req, res) => {
  const db = admin.firestore();
  try {
    const { studentId } = req.params;
    const teacherId = req.user.uid;

    const studentDoc = await db.collection("users").doc(studentId).get();
    if (!studentDoc.exists) {
      return res.status(404).json({ message: "Student not found." });
    }
    const studentData = studentDoc.data();

    const batchDoc = await db
      .collection("batches")
      .doc(String(studentData.batchYear))
      .get();
    if (!batchDoc.exists) {
      return res
        .status(404)
        .json({ message: "Student's batch year not found." });
    }
    const studentCurrentSemester = batchDoc.data().currentSemester;

    const teacherClassesSnap = await db
      .collection("classes")
      .where("teacherId", "==", teacherId)
      .where("department", "==", studentData.department)
      .where("semester", "==", studentCurrentSemester)
      .where("section", "==", studentData.section)
      .limit(1)
      .get();

    if (teacherClassesSnap.empty) {
      return res
        .status(403)
        .json({
          message:
            "Forbidden: You are not assigned to teach this student's class.",
        });
    }

    // Simply approve the student in the database
    await db.collection("users").doc(studentId).update({ approved: true });

    res.json({ message: "Student approved successfully." });
  } catch (error) {
    console.error("Approve student error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
