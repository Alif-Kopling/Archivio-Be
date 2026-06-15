const express = require("express");
const router = express.Router();

const sertifikatController = require("../controllers/sertifikat.controller");
const { uploadSingle, uploadBulk } = require("../middlewares/upload.middleware");
const auth = require("../middlewares/auth.middleware");
const { role } = require("../middlewares/role.middleware");
const authorizeDocument = require("../middlewares/authorizeDocument");

router.use(auth);

router.get("/", sertifikatController.getAll);
router.get("/download/:id", authorizeDocument, sertifikatController.download);
router.get("/preview/:id", authorizeDocument, sertifikatController.preview);

router.post("/", role(["admin", "staff"]), uploadSingle, sertifikatController.create);
router.post("/bulk", role(["admin", "staff"]), uploadBulk, sertifikatController.createBulk);

// both admin and staff approvers can update status / approve / reject
router.patch("/:id/status", role(["admin", "staff"]), authorizeDocument, sertifikatController.updateStatus);
router.patch("/:id/approve", role(["admin", "staff"]), authorizeDocument, sertifikatController.approve);
router.patch("/:id/reject", role(["admin", "staff"]), authorizeDocument, sertifikatController.reject);
router.put("/:id", role(["admin"]), authorizeDocument, sertifikatController.update);
router.delete("/:id", role(["admin"]), authorizeDocument, sertifikatController.remove);

module.exports = router;
