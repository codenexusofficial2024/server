// utils/qrUtils.js

const QRCode = require("qrcode");

// Generate QR code as DataURL from string data
async function generateQRCode(data) {
  try {
    const qrDataURL = await QRCode.toDataURL(data);
    return qrDataURL;
  } catch (error) {
    console.error("QR code generation error:", error);
    throw error;
  }
}

module.exports = { generateQRCode };
