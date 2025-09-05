const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");
const teachers = require("./teacher");

// Directly load your service account key file
const serviceAccount = require("C:/Users/akash/Downloads/upasthiti-e3135-firebase-adminsdk-fbsvc-ac6533abe2.json");

// Initialize the app with the loaded credentials
initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

const getNextClassDateTime = (day, timeString) => {
  const dayMapping = {
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
    sunday: 0,
  };
  const [startTime, endTime] = timeString.split("-");
  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [endHour, endMinute] = endTime.split(":").map(Number);
  const targetDay = dayMapping[day.toLowerCase()];
  if (targetDay === undefined) throw new Error(`Invalid day: ${day}`);

  const now = new Date();
  const today = now.getDay();
  let daysUntilTarget = targetDay - today;
  if (daysUntilTarget <= 0) daysUntilTarget += 7;

  const startDate = new Date();
  startDate.setDate(now.getDate() + daysUntilTarget);
  startDate.setHours(startHour, startMinute, 0, 0);

  const endDate = new Date();
  endDate.setDate(now.getDate() + daysUntilTarget);
  endDate.setHours(endHour, endMinute, 0, 0);

  return { startTime: startDate, endTime: endDate };
};

async function seedData() {
  console.log("Starting to seed data with the Batch Model...");

  const collections = ["users", "classes", "batches", "warnings"];
  for (const col of collections) {
    const snapshot = await db.collection(col).get();
    for (const doc of snapshot.docs) {
      await doc.ref.delete();
    }
    console.log(`Cleared existing ${col} collection.`);
  }

  const batchData = {
    2025: { currentSemester: 1 },
    2024: { currentSemester: 3 },
    2023: { currentSemester: 5 },
    2022: { currentSemester: 7 },
  };
  for (const [year, data] of Object.entries(batchData)) {
    await db.collection("batches").doc(year).set(data);
  }
  console.log("✅ Created 'batches' collection.");

  for (const teacherName of Object.keys(teachers)) {
    const teacherData = {
      name: teacherName,
      email: `${teacherName
        .toLowerCase()
        .replace(/\s|\./g, "")}@university.com`,
      role: "teacher",
      department: "Computer Science",
    };
    const teacherRef = await db.collection("users").add(teacherData);
    console.log(
      `✅ Created teacher ${teacherName} in 'users' collection with ID: ${teacherRef.id}`
    );

    const classList = teachers[teacherName];
    for (const c of classList) {
      const { startTime, endTime } = getNextClassDateTime(c.day, c.time);
      const classData = {
        subjectName: c.subject,
        department: c.dept,
        semester: c.sem,
        section: c.section,
        teacherId: teacherRef.id,
        startTime: Timestamp.fromDate(startTime),
        endTime: Timestamp.fromDate(endTime),
      };
      await db.collection("classes").add(classData);
    }
    console.log(`  -> Seeded ${classList.length} classes for ${teacherName}`);
  }
  console.log("🎉 All data seeded successfully!");
}

seedData().catch(console.error);
