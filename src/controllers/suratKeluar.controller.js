const path = require("path");
const fs = require("fs");
const suratKeluarService = require("../services/suratKeluar.service");
const notificationService = require("../services/notification.service");
const auditService = require("../services/audit.service");
const googleDrive = require("../utils/googleDrive");
const { sendDocumentEmail } = require("../services/email.service");
const { getInitialStatus, normalizeDocumentDate, sanitizeDocumentUpdate } = require("../utils/documentStatus");
const { getDownloadFileNameFromPath } = require("../utils/fileName");
const { getBulkFieldValue } = require("../utils/bulkUploadFields");

const MIME_MAP = {
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
};

const streamFromGDrive = async (res, fileId, document, action, actionLabel, fallbackName) => {
  const meta = await googleDrive.getFileMetadata(fileId);
  const fileStream = await googleDrive.getFileStream(fileId);
  const ext = path.extname(meta.name || "").toLowerCase();

  res.setHeader("Content-Type", MIME_MAP[ext] || meta.mimeType || "application/octet-stream");
  res.setHeader("Content-Disposition", `${action === "download" ? "attachment" : "inline"}; filename="${getDownloadFileNameFromPath(meta.name, document.title || fallbackName)}"`);
  res.setHeader("X-Content-Type-Options", "nosniff");

  fileStream.pipe(res);
};

exports.getAll = async (req, res) => {
  try {
    const { search, page = 1, limit = 10, sortBy, sortOrder, status } = req.query;
    const { id: userId, role } = req.user;

    const data = await suratKeluarService.getAll({
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
    console.error("Surat Keluar Controller Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.create = async (req, res) => {
  try {
    const filePath = req.file ? req.file.path : null;
    const fileId = req.file?.gdriveFileId || null;
    const storageType = fileId ? "gdrive" : "local";
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
      fileId,
      storageType,
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

exports.update = async (req, res) => {
  try {
    const dataToUpdate = sanitizeDocumentUpdate(req.body);

    if (!Object.keys(dataToUpdate).length) {
      return res.status(400).json({ error: "No valid data provided for update." });
    }

    const data = await suratKeluarService.update(req.document.id, dataToUpdate);
    res.json(data);
  } catch (err) {
    console.error("Surat Keluar Controller Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { id: userId, role } = req.user;
    const { status } = req.body;
    const doc = req.document;

    if (!status) {
      return res.status(400).json({ error: "New status must be provided." });
    }

    if (role.toLowerCase() === 'admin') {
      const updated = await suratKeluarService.update(doc.id, { status });
      await auditService.log({ userId, action: status === "rejected" ? "reject" : "approve", documentId: doc.id, detail: doc.title });
      return res.json({ message: "Status updated.", data: updated });
    }

    const approverIds = JSON.parse(doc.approverIds || "[]").map(String);
    if (!approverIds.includes(String(userId))) {
      return res.status(403).json({ error: "Not authorized to approve." });
    }

    if (status === 'rejected') {
      const updated = await suratKeluarService.update(doc.id, { status: 'rejected' });
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

    const updated = await suratKeluarService.update(doc.id, {
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
    console.error("Surat Keluar Controller Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.approve = async (req, res) => {
  req.body = { ...req.body, status: "final" };
  return exports.updateStatus(req, res);
};

exports.reject = async (req, res) => {
  req.body = { ...req.body, status: "rejected" };
  return exports.updateStatus(req, res);
};

exports.remove = async (req, res) => {
  try {
    const document = req.document;

    await suratKeluarService.remove(document.id);

    if (document.storageType === "gdrive" && document.fileId) {
      await googleDrive.deleteFile(document.fileId).catch(err => {
        console.warn("[gdrive] delete failed:", err.message);
      });
    } else {
      const absolutePath = path.join(__dirname, "../../", document.filePath);
      if (fs.existsSync(absolutePath)) {
        fs.unlinkSync(absolutePath);
      }
    }

    await auditService.log({ userId: req.user.id, action: "delete", documentId: document.id, detail: document.title });
    res.json({ message: "Outgoing mail archive successfully removed." });
  } catch (err) {
    console.error("Surat Keluar Controller Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.preview = async (req, res) => {
  try {
    const document = req.document;

    if (document.storageType === "gdrive" && document.fileId) {
      await auditService.log({ userId: req.user.id, action: "preview", documentId: document.id, detail: document.title });
      return await streamFromGDrive(res, document.fileId, document, "preview", "preview", "document.pdf");
    }

    let finalPath = document.filePath;
    if (!finalPath.includes("surat-keluar")) {
      const fileName = path.basename(finalPath);
      finalPath = path.join("uploads/surat-keluar", fileName);
    }

    const absolutePath = path.join(__dirname, "../../", finalPath);
    res.setHeader("Content-Disposition", "inline");
    res.setHeader("X-Content-Type-Options", "nosniff");
    await auditService.log({ userId: req.user.id, action: "preview", documentId: document.id, detail: document.title });
    res.sendFile(absolutePath);
  } catch (err) {
    console.error("Surat Keluar Controller Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.download = async (req, res) => {
  try {
    const document = req.document;

    if (document.storageType === "gdrive" && document.fileId) {
      await auditService.log({ userId: req.user.id, action: "download", documentId: document.id, detail: document.title });
      return await streamFromGDrive(res, document.fileId, document, "download", "download", document.title || "document.pdf");
    }

    let finalPath = document.filePath;
    if (!finalPath.includes("surat-keluar")) {
      const fileName = path.basename(finalPath);
      finalPath = path.join("uploads/surat-keluar", fileName);
    }

    const absolutePath = path.join(__dirname, "../../", finalPath);
    await auditService.log({ userId: req.user.id, action: "download", documentId: document.id, detail: document.title });
    res.download(absolutePath, getDownloadFileNameFromPath(finalPath, document.title || "document.pdf"));
  } catch (err) {
    console.error("Surat Keluar Controller Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.sendEmail = async (req, res) => {
  try {
    const document = req.document || await suratKeluarService.getById(req.params.id || req.body.id);
    const { to, subject, message } = req.body;

    if (!document) {
      return res.status(404).json({
        success: false,
        error: "Document not found.",
      });
    }

    if (!to || typeof to !== "string") {
      return res.status(400).json({
        success: false,
        error: "Recipient email must be provided.",
      });
    }

    const normalizedStatus = document.status?.toLowerCase();
    if (normalizedStatus !== "final" && normalizedStatus !== "approved") {
      return res.status(400).json({
        success: false,
        error: "Document can only be sent after admin approval.",
      });
    }

    let attachmentPath;
    let attachmentName;

    if (document.storageType === "gdrive" && document.fileId) {
      attachmentPath = await googleDrive.downloadToTemp(document.fileId);
      attachmentName = getDownloadFileNameFromPath(path.basename(attachmentPath), document.title || "document.pdf");
    } else {
      let finalPath = document.filePath;
      if (!finalPath.includes("surat-keluar")) {
        const fileName = path.basename(finalPath);
        finalPath = path.join("uploads/surat-keluar", fileName);
      }

      attachmentPath = path.join(__dirname, "../../", finalPath);
      attachmentName = getDownloadFileNameFromPath(finalPath, document.title || "document.pdf");

      if (!fs.existsSync(attachmentPath)) {
        return res.status(404).json({
          success: false,
          error: "Document file not found on server.",
        });
      }
    }

    const info = await sendDocumentEmail({
      to: to.trim(),
      subject: typeof subject === "string" && subject.trim() ? subject.trim() : `Document: ${document.title}`,
      text: typeof message === "string" && message.trim()
        ? message.trim()
        : `Attached is the document ${document.title}.`,
      attachmentPath,
      attachmentName,
    });

    const id = req.params.id || req.body.id;
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
          fileId: file.gdriveFileId || null,
          storageType: file.gdriveFileId ? "gdrive" : "local",
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
