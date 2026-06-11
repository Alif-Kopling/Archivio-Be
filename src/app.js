const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const app = express();

const corsOptions = {
  origin: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(",")
    : ["http://localhost:5173", "http://localhost:3000"],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: "50mb" }));

const authRoutes = require("./routes/auth.routes");
const suratMasukRoutes = require("./routes/suratMasuk.routes");
const suratKeluarRoutes = require("./routes/suratKeluar.routes");
const sertifikatRoutes = require("./routes/sertifikat.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const userRoutes = require("./routes/user.routes");
const settingRoutes = require("./routes/setting.routes");
const notificationRoutes = require("./routes/notification.routes");
const auditRoutes = require("./routes/audit.routes");

app.use("/auth", authRoutes);
app.use("/surat-masuk", suratMasukRoutes);
app.use("/surat-keluar", suratKeluarRoutes);
app.use("/sertifikat", sertifikatRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/users", userRoutes);
app.use("/settings", settingRoutes);
app.use("/notifications", notificationRoutes);
app.use("/audit", auditRoutes);

const { cleanOld } = require("./services/audit.service");

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  cleanOld();
  setInterval(cleanOld, 6 * 60 * 60 * 1000);
});

module.exports = app;
