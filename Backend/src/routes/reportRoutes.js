const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const reportController = require("../controllers/reportController");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../../uploads"));
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage });

router.get("/patient/:patientId", reportController.getByPatient);
router.post("/", upload.single("reportFile"), reportController.create);

module.exports = router;
