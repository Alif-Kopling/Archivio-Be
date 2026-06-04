const express = require("express");
const router = express.Router();

const suratKeluarController = require("../controllers/suratKeluar.controller");
const { uploadSingle, uploadBulk } = require("../middlewares/upload.middleware");
const auth = require("../middlewares/auth.middleware");
const { role } = require("../middlewares/role.middleware");

router.use(auth);

router.get("/", suratKeluarController.getAll);
router.get("/download/:id", suratKeluarController.download);
router.get("/preview/:id", suratKeluarController.preview);
router.post("/send-email", role(["admin", "staff"]), suratKeluarController.sendEmail);
router.post("/:id/send-email", role(["admin", "staff"]), suratKeluarController.sendEmail);

router.post("/", role(["admin", "staff"]), uploadSingle, suratKeluarController.create);
router.post("/bulk", role(["admin", "staff"]), uploadBulk, suratKeluarController.createBulk);

// general update, for fields other than status
router.put("/:id", role(["admin"]), suratKeluarController.update);

// both admin and staff approvers can update status / approve / reject
router.patch("/:id/status", role(["admin", "staff"]), suratKeluarController.updateStatus);
router.patch("/:id/approve", role(["admin", "staff"]), suratKeluarController.approve);
router.patch("/:id/reject", role(["admin", "staff"]), suratKeluarController.reject);

router.delete("/:id", role(["admin"]), suratKeluarController.remove);

module.exports = router;
