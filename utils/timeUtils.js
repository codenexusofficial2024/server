// utils/timeUtils.js

// Check if current time is after 50% of the class duration but before class ends
function isQrButtonEnabled(startTime, endTime) {
  const now = new Date();
  const totalDuration = endTime - startTime;
  const elapsed = now - startTime;
  return elapsed >= totalDuration / 2 && now < endTime;
}

module.exports = { isQrButtonEnabled };
