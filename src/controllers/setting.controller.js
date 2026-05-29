const path = require("path");
const fs = require("fs");
const prisma = require("../config/db");
const auditService = require("../services/audit.service");
const { REJECTED_STATUS_VALUES } = require("../utils/documentStatus");

// delete file from disk
const removeDocumentFile = (filePath) => {
  if (typeof filePath !== "string" || !filePath.trim()) {
    return;
  }

  const absolutePath = path.join(__dirname, "../../", filePath);
  if (fs.existsSync(absolutePath)) {
    fs.unlinkSync(absolutePath);
  }
};

// get all settings
exports.getSettings = async (req, res) => {
  try {
    const settings = await prisma.setting.findMany();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve settings' });
  }
};

// get storage usage stats
exports.getStorageStats = async (req, res) => {
  try {
    const totalCount = await prisma.document.count();
    const storageLimitSetting = await prisma.setting.findUnique({ where: { key: 'storage_limit' } });
    const storageLimit = storageLimitSetting ? parseInt(storageLimitSetting.value) : 100;

    res.json({
      total: totalCount,
      limit: storageLimit
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve storage stats' });
  }
};

// get rejected docs count
exports.getTrashStats = async (req, res) => {
  try {
    if (!Array.isArray(REJECTED_STATUS_VALUES) || REJECTED_STATUS_VALUES.length === 0) {
      return res.json({ rejected: 0 });
    }

    const rejectedCount = await prisma.document.count({
      where: {
        status: {
          in: REJECTED_STATUS_VALUES
        }
      },
    });

    res.json({
      rejected: rejectedCount,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve trash stats" });
  }
};

// permanently delete all rejected docs
exports.emptyRejectedTrash = async (req, res) => {
  try {
    if (!Array.isArray(REJECTED_STATUS_VALUES) || REJECTED_STATUS_VALUES.length === 0) {
      console.error("REJECTED_STATUS_VALUES is missing or empty.");
      return res.status(500).json({ error: "System configuration error: Rejected status values not defined." });
    }

    const rejectedDocuments = await prisma.document.findMany({
      where: {
        status: {
          in: REJECTED_STATUS_VALUES
        }
      },
      select: {
        id: true,
        filePath: true,
      },
    });

    if (rejectedDocuments.length === 0) {
      return res.json({
        message: "No rejected documents to remove.",
        deleted: 0,
      });
    }

    for (const document of rejectedDocuments) {
      removeDocumentFile(document.filePath);
    }

    const result = await prisma.document.deleteMany({
      where: {
        status: {
          in: REJECTED_STATUS_VALUES
        }
      },
    });

    await auditService.log({ userId: req.user.id, action: "empty-trash", detail: `Deleted ${result.count} rejected documents` });
    res.json({
      message: "Rejected documents permanently removed.",
      deleted: result.count,
    });
  } catch (error) {
    console.error("Empty Rejected Trash Error:", error);
    res.status(500).json({ error: "Failed to empty rejected trash" });
  }
};

// upsert a setting
exports.updateSetting = async (req, res) => {
  const { key, value } = req.body;
  try {
    const setting = await prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
    res.json(setting);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
};
