const userService = require("../services/user.service");

// list all users
exports.getAll = async (req, res) => {
  try {
    const { search } = req.query;
    const data = await userService.getAll(search);
    res.json(data);
  } catch (err) {
    console.error("User Controller Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// create user
exports.create = async (req, res) => {
  try {
    const data = await userService.create(req.body);
    res.json(data);
  } catch (err) {
    console.error("User Controller Error:", err);
    const status = err.message.startsWith("Valid email") || err.message.startsWith("Name") || err.message.startsWith("Password") || err.message.startsWith("Role") ? 400 : 500;
    res.status(status).json({ error: err.message });
  }
};

// update user
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await userService.update(id, req.body);
    res.json(data);
  } catch (err) {
    console.error("User Controller Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// delete user
exports.remove = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await userService.getById(id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user._count && user._count.documents > 0) {
      return res.status(400).json({ 
        error: `Cannot delete user "${user.name}" because they have ${user._count.documents} associated documents.` 
      });
    }

    await userService.remove(id);
    res.json({ message: "User successfully deleted." });
  } catch (err) {
    console.error("User Controller Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
