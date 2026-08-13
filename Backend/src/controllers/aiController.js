const aiService = require("../services/aiService");

const summarizeHistory = async (req, res, next) => {
  try {
    const { patientId, text } = req.body;
    const result = await aiService.summarizeHistory(patientId, text);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

const predictDifferentialDiagnosis = async (req, res, next) => {
  try {
    const { symptoms } = req.body;
    const result = await aiService.predictDifferentialDiagnosis(symptoms);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

const predictReadmissionRisk = async (req, res, next) => {
  try {
    const result = await aiService.predictReadmissionRisk(req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

const checkDrugInteractions = async (req, res, next) => {
  try {
    const { medications, patientId } = req.body;
    const result = await aiService.checkDrugInteractions(medications, patientId);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

const medicalChatbot = async (req, res, next) => {
  try {
    const { query } = req.body;
    const result = await aiService.medicalChatbot(query);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

const ocrExtractReport = async (req, res, next) => {
  try {
    const { text } = req.body;
    const result = await aiService.ocrExtractReport(text);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  summarizeHistory,
  predictDifferentialDiagnosis,
  predictReadmissionRisk,
  checkDrugInteractions,
  medicalChatbot,
  ocrExtractReport
};
