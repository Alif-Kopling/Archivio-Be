const express = require("express");
const router = express.Router();

const suratMasukController = require("../controllers/suratMasuk.controller");
const { uploadSingle, uploadBulk } = require("../middlewares/upload.middleware");
const auth = require("../middlewares/auth.middleware");
const { role } = require("../middlewares/role.middleware");

// all routes require auth
router.use(auth);

router.get("/", suratMasukController.getAll);
router.get("/download/:id", suratMasukController.download);

// both staff and admin can upload, always saved as draft
router.post("/", role(["admin", "staff"]), uploadSingle, suratMasukController.create);
router.post("/bulk", role(["admin", "staff"]), uploadBulk, suratMasukController.createBulk);

// admin-only: manage all archives
// using PATCH for status updates
// both admin and staff approvers can update status / approve / reject
router.patch("/:id/status", role(["admin", "staff"]), suratMasukController.updateStatus);
router.patch("/:id/approve", role(["admin", "staff"]), suratMasukController.approve);
router.patch("/:id/reject", role(["admin", "staff"]), suratMasukController.reject);
router.put("/:id", role(["admin"]), suratMasukController.update); // Tetap sediakan PUT untuk update umum jika ada field lain
router.delete("/:id", role(["admin"]), suratMasukController.remove);

module.exports = router;
