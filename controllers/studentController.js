const admin = require("firebase-admin");


exports.getAttendanceSummary = async (req, res) => {
  const db = admin.firestore();
  try {
    const studentId = req.user.uid;
    const studentDoc = await db.collection("users").doc(studentId).get();
    if (!studentDoc.exists)
      return res.status(404).json({ message: "Student profile not found." });

    const { department, section, batchYear } = studentDoc.data();
    if (!batchYear)
      return res
        .status(400)
        .json({ message: "Student is not assigned to a batch." });

    const batchDoc = await db
      .collection("batches")
      .doc(String(batchYear))
      .get();
    if (!batchDoc.exists)
      return res
        .status(404)
        .json({ message: `Batch information for ${batchYear} not found.` });

    const { currentSemester } = batchDoc.data();

    const classesSnapshot = await db
      .collection("classes")
      .where("department", "==", department)
      .where("semester", "==", currentSemester)
      .where("section", "==", section)
      .get();

    if (classesSnapshot.empty) {
      return res.json({
        message: "No classes found for this student.",
        overall: { total: 0, attended: 0, percentage: 0 },
        bySubject: {},
      });
    }

    const summary = {
      overall: { total: 0, attended: 0 },
      bySubject: {},
    };

    classesSnapshot.docs.forEach((doc) => {
      const classData = doc.data();
      const subject = classData.subjectName;
      if (!summary.bySubject[subject]) {
        summary.bySubject[subject] = { total: 0, attended: 0 };
      }
      summary.bySubject[subject].total += 1;
      summary.overall.total += 1;
      if (classData.attendance && classData.attendance[studentId]) {
        summary.bySubject[subject].attended += 1;
        summary.overall.attended += 1;
      }
    });

    summary.overall.percentage =
      summary.overall.total > 0
        ? ((summary.overall.attended / summary.overall.total) * 100).toFixed(2)
        : 0;

    for (const subject in summary.bySubject) {
      const subjectData = summary.bySubject[subject];
      subjectData.percentage =
        subjectData.total > 0
          ? ((subjectData.attended / subjectData.total) * 100).toFixed(2)
          : 0;
    }

    res.json(summary);
  } catch (error) {
    console.error("Get attendance summary error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
