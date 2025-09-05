const admin = require("firebase-admin");


const verifyToken = async (req, res, next) => {
const db = admin.firestore();
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const idToken = authHeader.split("Bearer ")[1];
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken;

    const userDoc = await db.collection("users").doc(decodedToken.uid).get();
    if (!userDoc.exists) {
      // Allow user to proceed to create their profile
      if (req.path === "/profile" && req.method === "POST") {
        req.user.role = "student"; // Assign temporary role
        return next();
      }
      return res.status(401).json({ message: "User not found in database" });
    }
    req.user.role = userDoc.data().role;

    next();
  } catch (error) {
    console.error("Token verification error:", error);
    return res.status(401).json({ message: "Unauthorized" });
  }
};

const authorizeRoles =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ message: "Forbidden: You do not have the required role." });
    }
    next();
  };

module.exports = { verifyToken, authorizeRoles };
