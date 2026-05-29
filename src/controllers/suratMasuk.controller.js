const path = require("path");
const fs = require("fs");
const suratMasukService = require("../services/suratMasuk.service");
const notificationService = require("../services/notification.service");
const auditService = require("../services/audit.service");
const { getInitialStatus, normalizeDocumentDate, sanitizeDocumentUpdate } = require("../utils/documentStatus");
const { getDownloadFileNameFromPath } = require("../utils/fileName");
const { getBulkFieldValue } = require("../utils/bulkUploadFields");

// list all incoming letters
exports.getAll = async (req, res) => {
  try {
    const { search, page = 1, limit = 10, sortBy, sortOrder, status } = req.query;

    const data = await suratMasukService.getAll({
      search,
      page: Number(page),
      limit: Number(limit),
      sortBy,
      sortOrder,
      status,
    });

    res.json(data);
  } catch (err) {
    console.error("Surat Masuk Controller Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// create single incoming letter
exports.create = async (req, res) => {
  try {
    const filePath = req.file ? req.file.path : null;
    const { id: userId, role } = req.user;
    const status = getInitialStatus(role);
    const title = typeof req.body.title === "string" ? req.body.title.trim() : "";
    const sender = typeof req.body.sender === "string" ? req.body.sender.trim() : "";
    const documentDate = normalizeDocumentDate(req.body.documentDate);
    const approverIds = req.body.approverIds ? JSON.parse(req.body.approverIds) : [];

    if (!filePath) {
      return res.status(400).json({ error: "Document file is required." });
    }

    if (!title || !sender || !documentDate) {
      return res.status(400).json({
        error: "Title, sender, and document date are required.",
      });
    }

    const data = await suratMasukService.create({
      title,
      sender,
      documentDate,
      filePath,
      status,
      createdBy: userId,
      approverIds,
    });

    if (approverIds && approverIds.length > 0) {
      await notificationService.createNotifications({
        documentId: data.id,
        title,
        approverIds,
        type: "masuk",
      });
    }

    await auditService.log({ userId, action: "create", documentId: data.id, detail: title });
    res.json(data);
  } catch (err) {
    console.error("Surat Masuk Controller Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// bulk upload incoming letters
exports.createBulk = async (req, res) => {
  try {
    const { id: userId, role } = req.user;
    const status = getInitialStatus(role);
    const files = req.files || [];

    if (!files.length) {
      return res.status(400).json({ error: "At least one document file is required." });
    }

    const results = [];
    const errors = [];

    for (const [index, file] of files.entries()) {
      try {
        const title = getBulkFieldValue(req.body, "title", file, index, file.originalname);
        const sender = getBulkFieldValue(req.body, "sender", file, index);
        const documentDate = normalizeDocumentDate(
          getBulkFieldValue(req.body, "documentDate", file, index),
        );

        if (!sender || !documentDate) {
          errors.push({ file: file.originalname, error: "Sender and document date are required." });
          continue;
        }

        const approverIds = req.body.approverIds ? JSON.parse(req.body.approverIds) : [];

        const data = await suratMasukService.create({
          title: title.trim(),
          sender: sender.trim(),
          documentDate,
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
            type: "masuk",
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
    console.error("Surat Masuk Controller Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// update incoming letter
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const dataToUpdate = sanitizeDocumentUpdate(req.body);

    if (!Object.keys(dataToUpdate).length) {
      return res.status(400).json({ error: "No valid data provided for update." });
    }

    const existingDocument = await suratMasukService.getById(id);
    if (!existingDocument) {
      return res.status(404).json({ error: "Document not found." });
    }

    const data = await suratMasukService.update(id, dataToUpdate);
    res.json(data);
  } catch (err) {
    console.error("Surat Masuk Controller Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { id: userId, role } = req.user;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: "New status must be provided." });
    }

    const doc = await suratMasukService.getById(id);
    if (!doc) return res.status(404).json({ error: "Document not found." });

    if (role.toLowerCase() === 'admin') {
      const updated = await suratMasukService.update(id, { status });
      await auditService.log({ userId, action: status === "rejected" ? "reject" : "approve", documentId: id, detail: doc.title });
      return res.json({ message: "Status updated.", data: updated });
    }

    // Logic untuk user staf (approver)
    const approverIds = JSON.parse(doc.approverIds || "[]").map(String);
    if (!approverIds.includes(String(userId))) {
      return res.status(403).json({ error: "Not authorized to approve." });
    }

    if (status === 'rejected') {
      const updated = await suratMasukService.update(id, { status: 'rejected' });
      await auditService.log({ userId, action: "reject", documentId: id, detail: doc.title });
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

    const updated = await suratMasukService.update(id, { 
      status: finalStatus, 
      approvedByIds: JSON.stringify(approvedByIds) 
    });

    await auditService.log({ userId, action: isApproving ? "approve" : "withdraw", documentId: id, detail: doc.title });
    res.json({ 
      message: "Approval recorded.", 
      data: updated,
      progress: `${approvedByIds.length}/${approverIds.length}`
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// approve incoming letter
exports.approve = async (req, res) => {
  req.body = { ...req.body, status: "final" };
  return exports.updateStatus(req, res);
};

// reject incoming letter
exports.reject = async (req, res) => {
  req.body = { ...req.body, status: "rejected" };
  return exports.updateStatus(req, res);
};

// delete incoming letter and its file
exports.remove = async (req, res) => {
  try {
    const { id } = req.params;

    const document = await suratMasukService.getById(id);

    if (!document) {
      return res.status(404).json({ error: "Archive not found" });
    }

    await suratMasukService.remove(id);

    const absolutePath = path.join(__dirname, "../../", document.filePath);
    
    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
    }

    await auditService.log({ userId: req.user.id, action: "delete", documentId: id, detail: document.title });
    res.json({ message: "Archive and its physical file successfully removed." });
  } catch (err) {
    console.error("Surat Masuk Controller Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// download incoming letter file
exports.download = async (req, res) => {
  try {
    const { id } = req.params;
    const document = await suratMasukService.getById(id);

    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    let finalPath = document.filePath;
    if (!finalPath.includes("surat-masuk")) {
      const fileName = path.basename(finalPath);
      finalPath = path.join("uploads/surat-masuk", fileName);
    }

    const absolutePath = path.join(__dirname, "../../", finalPath);
    await auditService.log({ userId: req.user.id, action: "download", documentId: id, detail: document.title });
    res.download(absolutePath, getDownloadFileNameFromPath(finalPath, document.title || "document.pdf"));
  } catch (err) {
    console.error("Surat Masuk Controller Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
