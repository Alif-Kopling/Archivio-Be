const express = require("express");
const router = express.Router();

const userController = require("../controllers/user.controller");
const auth = require("../middlewares/auth.middleware");
const { role } = require("../middlewares/role.middleware");

// route to list users for selection (available to all logged in users)
router.get("/list", auth, userController.getAll);

// admin-only: user management
router.use(auth);
router.use(role(["admin"]));

router.get("/", userController.getAll);
router.post("/", userController.create);
router.put("/:id", userController.update);
router.delete("/:id", userController.remove);

module.exports = router;
