const db = require("../config/database");
const aiService = require("./aiService");

const getReportsByPatient = async (patientId) => {
  const [rows] = await db.query(
    "SELECT * FROM medical_reports WHERE patient_id = ? ORDER BY created_at DESC",
    [patientId]
  );
  return rows;
};

const uploadReport = async (data) => {
  const { patient_id, title, report_type, file_url, parsed_text, uploaded_by } = data;

  // Run AI summary & OCR extraction automatically
  const ocrData = await aiService.ocrExtractReport(parsed_text || title);
  const summaryData = await aiService.summarizeHistory(patient_id, parsed_text || title);

  const [result] = await db.query(`
    INSERT INTO medical_reports (patient_id, title, report_type, file_url, parsed_text, ai_summary, uploaded_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [
    patient_id,
    title,
    report_type || 'General Lab Report',
    file_url || '/uploads/sample_report.pdf',
    parsed_text || ocrData.extractedTextSnippet,
    summaryData.executiveSummary,
    uploaded_by || 1
  ]);

  return {
    id: result.insertId,
    ...data,
    ai_summary: summaryData.executiveSummary,
    extractedMetrics: ocrData.extractedMetrics
  };
};

module.exports = { getReportsByPatient, uploadReport };
