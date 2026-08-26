const aiService = require("../services/aiService");

const summarizeHistory = async (req, res, next) => {
  try {
    const { patientId, text } = req.body;

    const result = await aiService.summarizeHistory(
      patientId,
      text
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};


const predictDifferentialDiagnosis = async (req, res, next) => {
  try {
    const { symptoms } = req.body;

    if (!symptoms || !String(symptoms).trim()) {
      return res.status(400).json({
        success: false,
        message: "Symptoms are required."
      });
    }

    const result =
      await aiService.predictDifferentialDiagnosis(symptoms);

    return res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error(
      "Differential diagnosis controller error:",
      error
    );

    return res.status(503).json({
      success: false,
      message:
        error.message ||
        "AI differential diagnosis service is unavailable."
    });
  }
};


const predictReadmissionRisk = async (req, res, next) => {
  try {
    const result =
      await aiService.predictReadmissionRisk(req.body);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};


const checkDrugInteractions = async (req, res, next) => {
  try {
    const { medications, patientId } = req.body;

    if (
      !medications ||
      (
        Array.isArray(medications) &&
        medications.length === 0
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "At least one medication is required."
      });
    }

    const result =
      await aiService.checkDrugInteractions(
        medications,
        patientId
      );

    return res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error(
      "Drug interaction controller error:",
      error
    );

    return res.status(503).json({
      success: false,
      message:
        error.message ||
        "AI drug interaction service is unavailable."
    });
  }
};


const medicalChatbot = async (req, res, next) => {
  try {
    const { query } = req.body;

    if (!query || !String(query).trim()) {
      return res.status(400).json({
        success: false,
        message: "Query is required."
      });
    }

    const result =
      await aiService.medicalChatbot(query);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};


const ocrExtractReport = async (req, res, next) => {
  try {
    const { text } = req.body;

    if (!text || !String(text).trim()) {
      return res.status(400).json({
        success: false,
        message: "Report text is required."
      });
    }

    const result =
      await aiService.ocrExtractReport(text);

    res.json({
      success: true,
      data: result
    });
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
