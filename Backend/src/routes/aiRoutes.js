const express = require("express");
const router = express.Router();
const aiController = require("../controllers/aiController");

router.post("/summarize-history", aiController.summarizeHistory);
router.post("/differential-diagnosis", aiController.predictDifferentialDiagnosis);
router.post("/readmission-risk", aiController.predictReadmissionRisk);
router.post("/drug-interactions", aiController.checkDrugInteractions);
router.post("/medical-chatbot", aiController.medicalChatbot);
router.post("/ocr-extract", aiController.ocrExtractReport);

module.exports = router;
