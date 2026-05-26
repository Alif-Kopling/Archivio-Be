const dashboardService = require("../services/dashboard.service");

// get dashboard stats and recent activity
exports.getOverview = async (req, res) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;
    const { id: userId, role } = req.user;
    
    const data = await dashboardService.getOverview({
      search,
      page: Number(page),
      limit: Number(limit),
      userId,
      role
    });

    res.json(data);
  } catch (err) {
    console.error("Dashboard Controller Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// bulk approve documents
exports.bulkApprove = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !ids.length) {
      return res.status(400).json({ error: "No document IDs provided." });
    }

    const result = await dashboardService.bulkUpdateStatus(ids, "final");
    res.json({
      message: `${result.count} documents successfully approved.`,
      count: result.count,
    });
  } catch (err) {
    console.error("Dashboard Controller Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// bulk reject documents
exports.bulkReject = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !ids.length) {
      return res.status(400).json({ error: "No document IDs provided." });
    }

    const result = await dashboardService.bulkUpdateStatus(ids, "rejected");
    res.json({
      message: `${result.count} documents successfully rejected.`,
      count: result.count,
    });
  } catch (err) {
    console.error("Dashboard Controller Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
