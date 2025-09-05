const admin = require("firebase-admin");


exports.getLowAttendanceStudents = async (req, res) => {
  const db = admin.firestore();
  try {
    const teacherId = req.user.uid;
    const threshold = 50.0;

    const teacherClassesSnap = await db
      .collection("classes")
      .where("teacherId", "==", teacherId)
      .get();
    if (teacherClassesSnap.empty) return res.json([]);

    const classes = teacherClassesSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    const batchesSnap = await db.collection("batches").get();
    const semesterToBatchMap = {};
    batchesSnap.forEach((doc) => {
      semesterToBatchMap[doc.data().currentSemester] = doc.id;
    });

    const studentGroups = [
      ...new Set(
        classes.map((c) => `${c.department}-${c.semester}-${c.section}`)
      ),
    ];

    const studentPromises = studentGroups.map((group) => {
      const [department, semester, section] = group.split("-");
      const batchYear = semesterToBatchMap[semester];
      if (!batchYear) return Promise.resolve({ docs: [] });

      return db
        .collection("users")
        .where("role", "==", "student")
        .where("department", "==", department)
        .where("batchYear", "==", parseInt(batchYear))
        .where("section", "==", section)
        .get();
    });

    const studentSnaps = await Promise.all(studentPromises);
    const allStudents = new Map();
    studentSnaps.forEach((snap) =>
      snap.docs.forEach((doc) =>
        allStudents.set(doc.id, { id: doc.id, ...doc.data() })
      )
    );

    const attendanceData = {};
    for (const student of allStudents.values()) {
      const batchDoc = await db
        .collection("batches")
        .doc(String(student.batchYear))
        .get();
      const studentCurrentSemester = batchDoc.data().currentSemester;

      attendanceData[student.id] = { total: 0, attended: 0 };
      const relevantClasses = classes.filter(
        (c) =>
          c.department === student.department &&
          c.semester === studentCurrentSemester &&
          c.section === student.section
      );
      for (const c of relevantClasses) {
        attendanceData[student.id].total++;
        if (c.attendance && c.attendance[student.id]) {
          attendanceData[student.id].attended++;
        }
      }
    }

    const lowAttendanceStudents = [];
    for (const studentId in attendanceData) {
      const data = attendanceData[studentId];
      if (data.total > 0) {
        const percentage = (data.attended / data.total) * 100;
        if (percentage < threshold) {
          const studentInfo = allStudents.get(studentId);
          const batchDoc = await db
            .collection("batches")
            .doc(String(studentInfo.batchYear))
            .get();
          const semester = batchDoc.data().currentSemester;
          lowAttendanceStudents.push({
            studentId: studentInfo.id,
            name: studentInfo.name,
            department: studentInfo.department,
            semester: semester,
            section: studentInfo.section,
            attendancePercentage: percentage.toFixed(2),
          });
        }
      }
    }
    res.json(lowAttendanceStudents);
  } catch (error) {
    console.error("Get low attendance students error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.sendWarning = async (req, res) => {
  const db = admin.firestore();
  try {
    const teacherId = req.user.uid;
    const { studentId, classId, message } = req.body;
    if (!studentId || !message)
      return res
        .status(400)
        .json({ message: "Student ID and message are required." });

    const warning = {
      studentId,
      teacherId,
      message,
      classId: classId || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await db.collection("warnings").add(warning);
    res.json({ message: "Warning sent to student" });
  } catch (error) {
    console.error("Send warning error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getStudentWarnings = async (req, res) => {
  const db = admin.firestore();
  try {
    const studentId = req.user.uid;
    const warningsSnap = await db
      .collection("warnings")
      .where("studentId", "==", studentId)
      .orderBy("createdAt", "desc")
      .get();
    const warnings = warningsSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    res.json(warnings);
  } catch (error) {
    console.error("Get student warnings error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
