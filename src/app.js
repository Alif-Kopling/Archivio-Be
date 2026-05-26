const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const express = require("express");
const cors = require("cors");
const app = express();

app.use(cors());
app.use(express.json());

const authRoutes = require("./routes/auth.routes");
const suratMasukRoutes = require("./routes/suratMasuk.routes");
const suratKeluarRoutes = require("./routes/suratKeluar.routes");
const sertifikatRoutes = require("./routes/sertifikat.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const userRoutes = require("./routes/user.routes");
const settingRoutes = require("./routes/setting.routes");
const notificationRoutes = require("./routes/notification.routes");

app.use("/auth", authRoutes);
app.use("/surat-masuk", suratMasukRoutes);
app.use("/surat-keluar", suratKeluarRoutes);
app.use("/sertifikat", sertifikatRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/users", userRoutes);
app.use("/settings", settingRoutes);
app.use("/notifications", notificationRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;
