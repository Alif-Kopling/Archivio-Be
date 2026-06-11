const path = require("path");
const fs = require("fs");
const sertifikatService = require("../services/sertifikat.service");
const notificationService = require("../services/notification.service");
const auditService = require("../services/audit.service");
const { getInitialStatus, sanitizeDocumentUpdate } = require("../utils/documentStatus");
const { getDownloadFileNameFromPath } = require("../utils/fileName");
const { getBulkFieldValue } = require("../utils/bulkUploadFields");

// list all certificates
exports.getAll = async (req, res) => {
  try {
    const { search, page = 1, limit = 10, sortBy, sortOrder, status } = req.query;
    const { id: userId, role } = req.user;

    const data = await sertifikatService.getAll({
      search,
      page: Number(page),
      limit: Number(limit),
      sortBy,
      sortOrder,
      status,
      userId,
      role,
    });

    res.json(data);
  } catch (err) {
    console.error("Sertifikat Controller Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// create single certificate
exports.create = async (req, res) => {
  try {
    const filePath = req.file ? req.file.path : null;
    const { role, id: userId } = req.user;
    const status = getInitialStatus(role);
    const approverIds = req.body.approverIds ? JSON.parse(req.body.approverIds) : [];

    const data = await sertifikatService.create({
      ...req.body,
      filePath,
      status,
      createdBy: userId,
      approverIds,
    });

    if (approverIds && approverIds.length > 0) {
      await notificationService.createNotifications({
        documentId: data.id,
        title: data.title,
        approverIds,
        type: "sertifikat",
      });
    }

    await auditService.log({ userId, action: "create", documentId: data.id, detail: data.title });
    res.json(data);
  } catch (err) {
    console.error("Sertifikat Controller Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// update certificate
exports.update = async (req, res) => {
  try {
    const dataToUpdate = sanitizeDocumentUpdate(req.body);

    if (!Object.keys(dataToUpdate).length) {
      return res.status(400).json({ error: "No valid data provided for update." });
    }

    const data = await sertifikatService.update(req.document.id, dataToUpdate);
    res.json(data);
  } catch (err) {
    console.error("Sertifikat Controller Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// update certificate status (admin or staff approver)
exports.updateStatus = async (req, res) => {
  try {
    const { id: userId, role } = req.user;
    const { status } = req.body;
    const doc = req.document;

    if (!status) {
      return res.status(400).json({ error: "New status must be provided." });
    }

    if (role.toLowerCase() === 'admin') {
      const updated = await sertifikatService.update(doc.id, { status });
      await auditService.log({ userId, action: status === "rejected" ? "reject" : "approve", documentId: doc.id, detail: doc.title });
      return res.json({ message: "Status updated.", data: updated });
    }

    // Logic untuk user staf (approver)
    const approverIds = JSON.parse(doc.approverIds || "[]").map(String);
    if (!approverIds.includes(String(userId))) {
      return res.status(403).json({ error: "Not authorized to approve." });
    }

    if (status === 'rejected') {
      const updated = await sertifikatService.update(doc.id, { status: 'rejected' });
      await auditService.log({ userId, action: "reject", documentId: doc.id, detail: doc.title });
      return res.json({ message: "Document rejected.", data: updated });
    }

    let approvedByIds = JSON.parse(doc.approvedByIds || "[]");
    const isApproving = status === 'verified' || status === 'final';
    if (isApproving && !approvedByIds.includes(String(userId))) {
      approvedByIds.push(String(userId));
    } else if (status === 'pending' && approvedByIds.includes(String(userId))) {
      approvedByIds = approvedByIds.filter(id => id !== String(userId));
    }

    const isFullyApproved = approverIds.length > 0 && approverIds.every(id => approvedByIds.includes(id));
    const finalStatus = isFullyApproved ? 'final' : 'pending';

    const updated = await sertifikatService.update(doc.id, {
      status: finalStatus,
      approvedByIds: JSON.stringify(approvedByIds)
    });

    await auditService.log({ userId, action: isApproving ? "approve" : "withdraw", documentId: doc.id, detail: doc.title });
    res.json({
      message: "Approval recorded.",
      data: updated,
      progress: `${approvedByIds.length}/${approverIds.length}`
    });
  } catch (err) {
    console.error("Sertifikat Controller Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// approve certificate
exports.approve = async (req, res) => {
  req.body = { ...req.body, status: "final" };
  return exports.updateStatus(req, res);
};

// reject certificate
exports.reject = async (req, res) => {
  req.body = { ...req.body, status: "rejected" };
  return exports.updateStatus(req, res);
};

// delete certificate and its file
exports.remove = async (req, res) => {
  try {
    const document = req.document;

    await sertifikatService.remove(document.id);

    const absolutePath = path.join(__dirname, "../../", document.filePath);
    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
    }

    await auditService.log({ userId: req.user.id, action: "delete", documentId: document.id, detail: document.title });
    res.json({ message: "Certificate archive successfully removed." });
  } catch (err) {
    console.error("Sertifikat Controller Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// preview certificate file (inline, no download button)
exports.preview = async (req, res) => {
  try {
    const document = req.document;

    let finalPath = document.filePath;
    if (!finalPath.includes("sertifikat")) {
      const fileName = path.basename(finalPath);
      finalPath = path.join("uploads/sertifikat", fileName);
    }

    const absolutePath = path.join(__dirname, "../../", finalPath);
    res.setHeader("Content-Disposition", "inline");
    res.setHeader("X-Content-Type-Options", "nosniff");
    await auditService.log({ userId: req.user.id, action: "preview", documentId: document.id, detail: document.title });
    res.sendFile(absolutePath);
  } catch (err) {
    console.error("Sertifikat Controller Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// download certificate file
exports.download = async (req, res) => {
  try {
    const document = req.document;

    let finalPath = document.filePath;
    if (!finalPath.includes("sertifikat")) {
      const fileName = path.basename(finalPath);
      finalPath = path.join("uploads/sertifikat", fileName);
    }

    const absolutePath = path.join(__dirname, "../../", finalPath);
    await auditService.log({ userId: req.user.id, action: "download", documentId: document.id, detail: document.title });
    res.download(absolutePath, getDownloadFileNameFromPath(finalPath, document.title || "certificate.pdf"));
  } catch (err) {
    console.error("Sertifikat Controller Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// bulk upload certificates
exports.createBulk = async (req, res) => {
  try {
    const { role, id: userId } = req.user;
    const status = getInitialStatus(role);
    const files = req.files || [];

    if (!files.length) {
      return res.status(400).json({ error: "At least one certificate file is required." });
    }

    const results = [];
    const errors = [];

    for (const [index, file] of files.entries()) {
      try {
        const title = getBulkFieldValue(req.body, "title", file, index, file.originalname);
        const issuer = getBulkFieldValue(req.body, "issuer", file, index);

        const approverIds = req.body.approverIds ? JSON.parse(req.body.approverIds) : [];

        const data = await sertifikatService.create({
          title: title.trim(),
          issuer: issuer.trim() || null,
          filePath: file.path,
          status,
          createdBy: userId,
          approverIds,
        });

        if (approverIds && approverIds.length > 0) {
          await notificationService.createNotifications({
            documentId: data.id,
            title,
            approverIds,
            type: "sertifikat",
          });
        }

        await auditService.log({ userId, action: "create", documentId: data.id, detail: title });
        results.push(data);
      } catch (err) {
        errors.push({ file: file.originalname, error: err.message });
      }
    }

    res.json({ data: results, errors, total: files.length, success: results.length });
  } catch (err) {
    console.error("Sertifikat Controller Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
