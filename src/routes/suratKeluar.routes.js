const express = require("express");
const router = express.Router();

const suratKeluarController = require("../controllers/suratKeluar.controller");
const { uploadSingle, uploadBulk, validateFileMagic } = require("../middlewares/upload.middleware");
const auth = require("../middlewares/auth.middleware");
const { role } = require("../middlewares/role.middleware");
const authorizeDocument = require("../middlewares/authorizeDocument");

router.use(auth);

router.get("/", suratKeluarController.getAll);
router.get("/download/:id", authorizeDocument, suratKeluarController.download);
router.get("/preview/:id", authorizeDocument, suratKeluarController.preview);
router.post("/send-email", role(["admin", "staff"]), suratKeluarController.sendEmail);
router.post("/:id/send-email", role(["admin", "staff"]), authorizeDocument, suratKeluarController.sendEmail);

router.post("/", role(["admin", "staff"]), uploadSingle, validateFileMagic, suratKeluarController.create);
router.post("/bulk", role(["admin", "staff"]), uploadBulk, validateFileMagic, suratKeluarController.createBulk);

// general update, for fields other than status
router.put("/:id", role(["admin"]), authorizeDocument, suratKeluarController.update);

// both admin and staff approvers can update status / approve / reject
router.patch("/:id/status", role(["admin", "staff"]), authorizeDocument, suratKeluarController.updateStatus);
router.patch("/:id/approve", role(["admin", "staff"]), authorizeDocument, suratKeluarController.approve);
router.patch("/:id/reject", role(["admin", "staff"]), authorizeDocument, suratKeluarController.reject);

router.delete("/:id", role(["admin"]), authorizeDocument, suratKeluarController.remove);

module.exports = router;
