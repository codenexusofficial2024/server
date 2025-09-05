
// Calculate attendance percentage
function calculateAttendancePercentage(attendedClasses, totalClasses) {
  if (totalClasses === 0) return 0;
  return (attendedClasses / totalClasses) * 100;
}

// Filter students below attendance threshold (e.g., 50%)
function getLowAttendanceStudents(attendanceRecords, threshold = 50) {
  return attendanceRecords.filter((record) => {
    const percentage = calculateAttendancePercentage(
      record.attended,
      record.total
    );
    return percentage < threshold;
  });
}

module.exports = {
  calculateAttendancePercentage,
  getLowAttendanceStudents,
};
