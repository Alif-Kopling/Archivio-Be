const multer = require("multer");
const path = require("path");
const fs = require("fs");
const googleDrive = require("../utils/googleDrive");

const MAGIC_BYTES = {
  pdf: [0x25, 0x50, 0x44, 0x46],
  jpg: [0xFF, 0xD8, 0xFF],
  jpeg: [0xFF, 0xD8, 0xFF],
  png: [0x89, 0x50, 0x4E, 0x47],
  doc: [0xD0, 0xCF, 0x11, 0xE0],
  docx: [0x50, 0x4B, 0x03, 0x04],
};

const validateLocalFiles = (req, res) => {
  const files = req.file ? [req.file] : req.files || [];
  for (const file of files) {
    const ext = path.extname(file.originalname).toLowerCase().replace(".", "");
    const magic = MAGIC_BYTES[ext];
    if (!magic) continue;

    try {
      const fd = fs.openSync(file.path, 'r');
      const buf = Buffer.alloc(8);
      fs.readSync(fd, buf, 0, 8, 0);
      fs.closeSync(fd);

      const valid = magic.every((byte, i) => buf[i] === byte);
      if (!valid) {
        fs.unlinkSync(file.path);
        res.status(400).json({ error: `File ${file.originalname} has invalid file signature.` });
        return false;
      }
    } catch {
      res.status(500).json({ error: "Failed to validate file." });
      return false;
    }
  }
  return true;
};

const validateFileMagic = (req, res, next) => {
  if (validateLocalFiles(req, res)) next();
};

const MIME_TYPES_BY_FOLDER = {
  "surat-masuk": [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  "surat-keluar": [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  sertifikat: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "image/jpeg",
    "image/png",
  ],
};

const EXTENSIONS_BY_FOLDER = {
  "surat-masuk": [".pdf", ".doc", ".docx"],
  "surat-keluar": [".pdf", ".doc", ".docx"],
  sertifikat: [".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png"],
};

const getUploadFolder = (req) => {
  let folder = "surat-masuk";

  if (req.baseUrl.includes("surat-keluar")) folder = "surat-keluar";
  if (req.baseUrl.includes("sertifikat")) folder = "sertifikat";

  return folder;
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folder = getUploadFolder(req);

    cb(null, `uploads/${folder}/`);
  },
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    const uniqueName = Date.now() + "-" + safeName;
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  const folder = getUploadFolder(req);
  const allowedExtensions = EXTENSIONS_BY_FOLDER[folder] || EXTENSIONS_BY_FOLDER["surat-masuk"];
  const allowedMimeTypes = MIME_TYPES_BY_FOLDER[folder] || MIME_TYPES_BY_FOLDER["surat-masuk"];

  const extname = allowedExtensions.includes(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedMimeTypes.includes(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error("Hanya file dokumen (PDF/DOCX) dan gambar (JPG/PNG) yang diizinkan!"));
  }
};

const uploadSingle = multer({ 
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024
  }
}).single("file");

const uploadBulk = multer({ 
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024
  }
}).array("files", 20);

const uploadToGDrive = async (file, folderType) => {
  try {
    const result = await googleDrive.uploadFile(file.path, file.mimetype, folderType);
    file.gdriveFileId = result.fileId;
    file.gdriveMimeType = result.mimeType;

    fs.unlink(file.path, (err) => {
      if (err) console.warn("[gdrive] failed to delete local temp file:", file.path);
    });
  } catch (err) {
    console.warn("[gdrive] upload failed, falling back to local storage:", err.message);
  }
};

const uploadSingleWithGDrive = (req, res, next) => {
  uploadSingle(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: err.message });
      }
      return res.status(400).json({ error: err.message });
    }

    if (req.file) {
      // validate magic bytes BEFORE uploading to GDrive (which deletes local file)
      if (!validateLocalFiles(req, res)) return;

      const folderType = getUploadFolder(req);
      await uploadToGDrive(req.file, folderType);
    }

    next();
  });
};

const uploadBulkWithGDrive = (req, res, next) => {
  uploadBulk(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: err.message });
      }
      return res.status(400).json({ error: err.message });
    }

    // validate magic bytes BEFORE uploading to GDrive (which deletes local file)
    if (!validateLocalFiles(req, res)) return;

    if (req.files && req.files.length > 0) {
      const folderType = getUploadFolder(req);
      await Promise.all(req.files.map((f) => uploadToGDrive(f, folderType)));
    }

    next();
  });
};

module.exports = { uploadSingle: uploadSingleWithGDrive, uploadBulk: uploadBulkWithGDrive };
