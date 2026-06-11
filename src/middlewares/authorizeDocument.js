const prisma = require("../config/db");

const authorizeDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: "Document ID is required." });
    }

    const doc = await prisma.document.findUnique({
      where: { id: Number(id) },
    });

    if (!doc) {
      return res.status(404).json({ error: "Document not found." });
    }

    const { role, id: userId } = req.user;

    if (role.toLowerCase() === "admin") {
      req.document = doc;
      return next();
    }

    const isOwner = doc.createdBy === userId;
    const approverIds = JSON.parse(doc.approverIds || "[]").map(String);
    const isApprover = approverIds.includes(String(userId));

    if (!isOwner && !isApprover) {
      return res.status(403).json({ error: "Access denied. You do not have permission to access this document." });
    }

    req.document = doc;
    next();
  } catch (err) {
    console.error("authorizeDocument Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = authorizeDocument;
