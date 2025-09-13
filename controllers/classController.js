const admin = require("firebase-admin");


exports.addClass = async (req, res) => {
  const db = admin.firestore();
  try {
    const { subjectName, semester, department, section, startTime, endTime } =
      req.body;
    const teacherId = req.user.uid;
    if (
      !subjectName ||
      !semester ||
      !department ||
      !section ||
      !startTime ||
      !endTime
    ) {
      return res
        .status(400)
        .json({ message: "Missing required class fields." });
    }
    const newClass = {
      teacherId,
      subjectName,
      semester,
      department,
      section,
      startTime: admin.firestore.Timestamp.fromDate(new Date(startTime)),
      endTime: admin.firestore.Timestamp.fromDate(new Date(endTime)),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    const docRef = await db.collection("classes").add(newClass);
    await db
      .collection("users")
      .doc(teacherId)
      .update({
        assignedClasses: admin.firestore.FieldValue.arrayUnion(docRef.id),
      });
    res.status(201).json({ message: "Class added", classId: docRef.id });
  } catch (error) {
    console.error("Add class error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getTeacherClasses = async (req, res) => {
  const db = admin.firestore();
  try {
    const teacherId = req.user.uid;
    const classesSnap = await db
      .collection("classes")
      .where("teacherId", "==", teacherId)
      .orderBy("startTime", "desc")
      .get();
    const classes = classesSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    res.json(classes);
  } catch (error) {
    console.error("Get teacher classes error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ... the other functions (addClass, getTeacherClasses, etc.) are the same ...

exports.getClassAttendanceSummary = async (req, res) => {
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
    const attendanceMap = classData.attendance || {};

    if (classData.teacherId !== teacherId) {
      return res.status(403).json({ message: "Forbidden: You are not the teacher of this class." });
    }

    const batchesSnap = await db.collection("batches").where("currentSemester", "==", classData.semester).limit(1).get();
    if (batchesSnap.empty) {
        return res.status(404).json({ message: `No active batch found for semester ${classData.semester}`});
    }
    const batchYear = parseInt(batchesSnap.docs[0].id);

    const studentsSnap = await db.collection("users")
      .where("role", "==", "student")
      .where("department", "==", classData.department)
      .where("section", "==", classData.section)
      .where("batchYear", "==", batchYear)
      .get();

    const summary = studentsSnap.docs.map(doc => {
      const studentData = doc.data();
      const studentId = doc.id;
      
      const attendanceRecord = attendanceMap[studentId];
      
      // UPDATED: Added a safety check for serverTimestamp
      const markedAt = (attendanceRecord && attendanceRecord.serverTimestamp) 
        ? attendanceRecord.serverTimestamp.toDate() 
        : null;

      return {
        studentId: studentId,
        name: studentData.name,
        rollNo: studentData.rollNo,
        attendanceStatus: attendanceRecord ? "Present" : "Absent",
        markedAt: markedAt, // Use the safe variable
        method: attendanceRecord ? attendanceRecord.method : null
      };
    });
    
    res.json({
        totalStudents: summary.length,
        presentCount: Object.keys(attendanceMap).length,
        absentCount: summary.length - Object.keys(attendanceMap).length,
        attendanceList: summary
    });
  } catch (error) {
    console.error("Get class attendance summary error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
exports.getStudentClasses = async (req, res) => {
  const db = admin.firestore();
  try {
    const userDoc = await db.collection("users").doc(req.user.uid).get();
    if (!userDoc.exists)
      return res.status(404).json({ message: "User profile not found." });

    const { department, section, batchYear } = userDoc.data();
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

    const classesSnap = await db
      .collection("classes")
      .where("department", "==", department)
      .where("semester", "==", currentSemester)
      .where("section", "==", section)
      .orderBy("startTime", "desc")
      .get();

    const classes = classesSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    res.json(classes);
  } catch (error) {
    console.error("Get student classes error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
