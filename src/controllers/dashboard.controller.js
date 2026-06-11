const dashboardService = require("../services/dashboard.service");
const auditService = require("../services/audit.service");

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

// get monthly trends (last 12 months)
exports.getTrends = async (req, res) => {
  try {
    const { id: userId, role } = req.user;
    const data = await dashboardService.getTrends(userId, role);
    res.json(data);
  } catch (err) {
    console.error("Dashboard Trends Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// bulk approve documents
exports.bulkApprove = async (req, res) => {
  try {
    const { ids } = req.body;
    const { id: userId, role } = req.user;

    if (!ids || !ids.length) {
      return res.status(400).json({ error: "No document IDs provided." });
    }

    const result = await dashboardService.bulkUpdateStatus(ids, "final", userId, role);
    await auditService.log({ userId, action: "bulk-approve", detail: `Approved ${result.count} documents: [${ids.join(", ")}]` });
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
    const { id: userId, role } = req.user;

    if (!ids || !ids.length) {
      return res.status(400).json({ error: "No document IDs provided." });
    }

    const result = await dashboardService.bulkUpdateStatus(ids, "rejected", userId, role);
    await auditService.log({ userId, action: "bulk-reject", detail: `Rejected ${result.count} documents: [${ids.join(", ")}]` });
    res.json({
      message: `${result.count} documents successfully rejected.`,
      count: result.count,
    });
  } catch (err) {
    console.error("Dashboard Controller Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
