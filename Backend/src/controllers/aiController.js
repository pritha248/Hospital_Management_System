const aiService = require("../services/aiService");


/**
 * ============================================================
 * MEDICAL HISTORY SUMMARIZATION
 * ============================================================
 */
const summarizeHistory = async (
  req,
  res,
  next
) => {
  try {
    const {
      patientId,
      text
    } = req.body;

    if (
      !text ||
      !String(text).trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Medical history text is required."
      });
    }

    const result =
      await aiService.summarizeHistory(
        patientId,
        text
      );

    return res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error(
      "Medical history controller error:",
      error
    );

    return res.status(503).json({
      success: false,
      message:
        error.message ||
        "AI medical history service unavailable."
    });
  }
};


/**
 * ============================================================
 * DIFFERENTIAL DIAGNOSIS
 * ============================================================
 */
const predictDifferentialDiagnosis = async (
  req,
  res,
  next
) => {
  try {
    const {
      symptoms
    } = req.body;

    if (
      !symptoms ||
      !String(symptoms).trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Symptoms are required."
      });
    }

    const result =
      await aiService.predictDifferentialDiagnosis(
        symptoms
      );

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


/**
 * ============================================================
 * READMISSION RISK
 * ============================================================
 */
const predictReadmissionRisk = async (
  req,
  res,
  next
) => {
  try {
    const result =
      await aiService.predictReadmissionRisk(
        req.body
      );

    return res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error(
      "Readmission risk controller error:",
      error
    );

    return res.status(503).json({
      success: false,
      message:
        error.message ||
        "AI readmission risk service unavailable."
    });
  }
};


/**
 * ============================================================
 * DRUG INTERACTION CHECK
 * ============================================================
 */
const checkDrugInteractions = async (
  req,
  res,
  next
) => {
  try {
    const {
      medications,
      patientId
    } = req.body;

    if (
      !medications ||
      (
        Array.isArray(medications) &&
        medications.length === 0
      ) ||
      (
        typeof medications === "string" &&
        !medications.trim()
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "At least one medication is required."
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


/**
 * ============================================================
 * MEDICAL CHATBOT
 * ============================================================
 */
const medicalChatbot = async (
  req,
  res,
  next
) => {
  try {
    const {
      query
    } = req.body;

    if (
      !query ||
      !String(query).trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Medical question is required."
      });
    }

    const result =
      await aiService.medicalChatbot(
        query
      );

    return res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error(
      "Medical chatbot controller error:",
      error
    );

    return res.status(503).json({
      success: false,
      message:
        error.message ||
        "AI medical chatbot service is unavailable."
    });
  }
};


/**
 * ============================================================
 * OCR REPORT EXTRACTION
 * ============================================================
 */
const ocrExtractReport = async (
  req,
  res,
  next
) => {
  try {
    const {
      text
    } = req.body;

    if (
      !text ||
      !String(text).trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Report text is required."
      });
    }

    const result =
      await aiService.ocrExtractReport(
        text
      );

    return res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error(
      "OCR report controller error:",
      error
    );

    return res.status(503).json({
      success: false,
      message:
        error.message ||
        "OCR report extraction service unavailable."
    });
  }
};


/**
 * ============================================================
 * EXPORTS
 * ============================================================
 */
module.exports = {
  summarizeHistory,
  predictDifferentialDiagnosis,
  predictReadmissionRisk,
  checkDrugInteractions,
  medicalChatbot,
  ocrExtractReport
};
