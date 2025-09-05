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
    const teacherDoc = await db.collection("users").doc(req.user.uid).get();
    const teacherData = teacherDoc.data();

    if (!teacherData || !teacherData.department) {
      return res
        .status(400)
        .json({
          message: "Teacher profile is incomplete or missing department info.",
        });
    }

    const studentsRef = db
      .collection("users")
      .where("role", "==", "student")
      .where("approved", "==", false)
      .where("department", "==", teacherData.department);

    const snapshot = await studentsRef.get();
    const pendingStudents = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    res.json(pendingStudents);
  } catch (error) {
    console.error("Get pending approvals error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Teacher approves a student.
exports.approveStudent = async (req, res) => {
  const db = admin.firestore();
  try {
    const { studentId } = req.params;
    const teacherId = req.user.uid;

    // UPDATED: Added security validation
    // 1. Get the teacher's profile to find their department.
    const teacherDoc = await db.collection("users").doc(teacherId).get();
    const teacherData = teacherDoc.data();

    // 2. Get the student's profile to find their department.
    const studentDoc = await db.collection("users").doc(studentId).get();
    if (!studentDoc.exists) {
      return res.status(404).json({ message: "Student not found." });
    }
    const studentData = studentDoc.data();

    // 3. Compare the departments.
    if (teacherData.department !== studentData.department) {
      return res.status(403).json({ message: "Forbidden: You can only approve students from your own department." });
    }

    // 4. If departments match, proceed with the approval.
    await db.collection("users").doc(studentId).update({ approved: true });

    res.json({ message: "Student approved successfully" });
  } catch (error) {
    console.error("Approve student error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
