const express = require("express");
const cors = require("cors");
const path = require("path");

const errorHandler = require("./middlewares/errorHandler");
const authRoutes = require("./routes/authRoutes");
const patientRoutes = require("./routes/patientRoutes");
const doctorRoutes = require("./routes/doctorRoutes");
const appointmentRoutes = require("./routes/appointmentRoutes");
const prescriptionRoutes = require("./routes/prescriptionRoutes");
const reportRoutes = require("./routes/reportRoutes");
const billingRoutes = require("./routes/billingRoutes");
const aiRoutes = require("./routes/aiRoutes");
const testCatalogRoutes = require("./routes/testCatalogRoutes");
const releaseLetterRoutes = require("./routes/releaseLetterRoutes");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.use("/api/auth", authRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/doctors", doctorRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/prescriptions", prescriptionRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/diagnostic-tests", testCatalogRoutes);
app.use("/api/release-letters", releaseLetterRoutes);

app.get("/", (req, res) => {
  res.json({
    message: "Automated Healthcare System API Running",
    version: "1.0.0",
    modules: ["Authentication", "Patient Management", "Appointments", "Prescriptions", "Medical Reports", "Billing & Insurance", "AI Clinical Intelligence"]
  });
});

app.use(errorHandler);

module.exports = app;