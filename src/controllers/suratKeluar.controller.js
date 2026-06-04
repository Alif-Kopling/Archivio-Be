const path = require("path");
const fs = require("fs");
const suratKeluarService = require("../services/suratKeluar.service");
const notificationService = require("../services/notification.service");
const auditService = require("../services/audit.service");
const { sendDocumentEmail } = require("../services/email.service");
const { getInitialStatus, normalizeDocumentDate, sanitizeDocumentUpdate } = require("../utils/documentStatus");
const { getDownloadFileNameFromPath } = require("../utils/fileName");
const { getBulkFieldValue } = require("../utils/bulkUploadFields");

// list all outgoing letters
exports.getAll = async (req, res) => {
  try {
    const { search, page = 1, limit = 10, sortBy, sortOrder, status } = req.query;

    const data = await suratKeluarService.getAll({
      search,
      page: Number(page),
      limit: Number(limit),
      sortBy,
      sortOrder,
      status,
    });

    res.json(data);
  } catch (err) {
    console.error("Surat Keluar Controller Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// create single outgoing letter
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

    const data = await suratKeluarService.create({
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
        type: "keluar",
      });
    }

    await auditService.log({ userId, action: "create", documentId: data.id, detail: title });
    res.json(data);
  } catch (err) {
    console.error("Surat Keluar Controller Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// update outgoing letter
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const dataToUpdate = sanitizeDocumentUpdate(req.body);

    if (!Object.keys(dataToUpdate).length) {
      return res.status(400).json({ error: "No valid data provided for update." });
    }

    const existingDocument = await suratKeluarService.getById(id);
    if (!existingDocument) {
      return res.status(404).json({ error: "Document not found." });
    }

    const data = await suratKeluarService.update(id, dataToUpdate);
    res.json(data);
  } catch (err) {
    console.error("Surat Keluar Controller Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// update outgoing letter status (admin or staff approver)
exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { id: userId, role } = req.user;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: "New status must be provided." });
    }

    const doc = await suratKeluarService.getById(id);
    if (!doc) return res.status(404).json({ error: "Document not found." });

    if (role.toLowerCase() === 'admin') {
      const updated = await suratKeluarService.update(id, { status });
      await auditService.log({ userId, action: status === "rejected" ? "reject" : "approve", documentId: id, detail: doc.title });
      return res.json({ message: "Status updated.", data: updated });
    }

    // Logic untuk user staf (approver)
    const approverIds = JSON.parse(doc.approverIds || "[]").map(String);
    if (!approverIds.includes(String(userId))) {
      return res.status(403).json({ error: "Not authorized to approve." });
    }

    if (status === 'rejected') {
      const updated = await suratKeluarService.update(id, { status: 'rejected' });
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

    const updated = await suratKeluarService.update(id, {
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
    console.error("Surat Keluar Controller Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// approve outgoing letter
exports.approve = async (req, res) => {
  req.body = { ...req.body, status: "final" };
  return exports.updateStatus(req, res);
};

// reject outgoing letter
exports.reject = async (req, res) => {
  req.body = { ...req.body, status: "rejected" };
  return exports.updateStatus(req, res);
};

// delete outgoing letter and its file
exports.remove = async (req, res) => {
  try {
    const { id } = req.params;
    const document = await suratKeluarService.getById(id);

    if (!document) {
      return res.status(404).json({ error: "Archive not found" });
    }

    await suratKeluarService.remove(id);

    const absolutePath = path.join(__dirname, "../../", document.filePath);
    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
    }

    await auditService.log({ userId: req.user.id, action: "delete", documentId: id, detail: document.title });
    res.json({ message: "Outgoing mail archive successfully removed." });
  } catch (err) {
    console.error("Surat Keluar Controller Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// preview outgoing letter file (inline, no download button)
exports.preview = async (req, res) => {
  try {
    const { id } = req.params;
    const document = await suratKeluarService.getById(id);

    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    let finalPath = document.filePath;
    if (!finalPath.includes("surat-keluar")) {
      const fileName = path.basename(finalPath);
      finalPath = path.join("uploads/surat-keluar", fileName);
    }

    const absolutePath = path.join(__dirname, "../../", finalPath);
    res.setHeader("Content-Disposition", "inline");
    res.setHeader("X-Content-Type-Options", "nosniff");
    await auditService.log({ userId: req.user.id, action: "preview", documentId: id, detail: document.title });
    res.sendFile(absolutePath);
  } catch (err) {
    console.error("Surat Keluar Controller Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// download outgoing letter file
exports.download = async (req, res) => {
  try {
    const { id } = req.params;
    const document = await suratKeluarService.getById(id);

    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    let finalPath = document.filePath;
    if (!finalPath.includes("surat-keluar")) {
      const fileName = path.basename(finalPath);
      finalPath = path.join("uploads/surat-keluar", fileName);
    }

    const absolutePath = path.join(__dirname, "../../", finalPath);
    await auditService.log({ userId: req.user.id, action: "download", documentId: id, detail: document.title });
    res.download(absolutePath, getDownloadFileNameFromPath(finalPath, document.title || "document.pdf"));
  } catch (err) {
    console.error("Surat Keluar Controller Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// send outgoing letter via email
exports.sendEmail = async (req, res) => {
  try {
    const id = req.params.id || req.body.id;
    const { to, subject, message } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: "Document ID must be provided.",
      });
    }

    if (!to || typeof to !== "string") {
      return res.status(400).json({
        success: false,
        error: "Recipient email must be provided.",
      });
    }

    const document = await suratKeluarService.getById(id);
    if (!document) {
      return res.status(404).json({
        success: false,
        error: "Document not found.",
      });
    }

    const normalizedStatus = document.status?.toLowerCase();
    if (normalizedStatus !== "final" && normalizedStatus !== "approved") {
      return res.status(400).json({
        success: false,
        error: "Document can only be sent after admin approval.",
      });
    }

    let finalPath = document.filePath;
    if (!finalPath.includes("surat-keluar")) {
      const fileName = path.basename(finalPath);
      finalPath = path.join("uploads/surat-keluar", fileName);
    }

    const absolutePath = path.join(__dirname, "../../", finalPath);
    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({
        success: false,
        error: "Document file not found on server.",
      });
    }

    const info = await sendDocumentEmail({
      to: to.trim(),
      subject: typeof subject === "string" && subject.trim() ? subject.trim() : `Document: ${document.title}`,
      text: typeof message === "string" && message.trim()
        ? message.trim()
        : `Attached is the document ${document.title}.`,
      attachmentPath: absolutePath,
      attachmentName: getDownloadFileNameFromPath(finalPath, document.title || "document.pdf"),
    });

    await auditService.log({ userId: req.user.id, action: "send-email", documentId: id, detail: `to: ${to}, subject: ${subject}` });
    return res.status(200).json({
      success: true,
      message: "Email sent successfully",
      info,
    });
  } catch (err) {
    console.error("[surat-keluar][send-email] failed", {
      id: req.params.id || req.body.id,
      error: err.message,
    });

    const errorMessage = err.message || "Failed to send email.";
    const lowered = errorMessage.toLowerCase();
    
    if (lowered.includes("not found") || lowered.includes("tidak ditemukan")) {
      return res.status(404).json({ success: false, error: "Document or file not found." });
    }
    
    if (lowered.includes("invalid") || lowered.includes("tidak valid") || lowered.includes("incomplete") || lowered.includes("empty")) {
      return res.status(400).json({ success: false, error: "Invalid request data." });
    }

    return res.status(500).json({
      success: false,
      error: "Internal server error while sending email.",
    });
  }
};

// bulk upload outgoing letters
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

        const data = await suratKeluarService.create({
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
            type: "keluar",
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
    console.error("Surat Keluar Controller Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
