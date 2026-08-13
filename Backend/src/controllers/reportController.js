const reportService = require("../services/reportService");

const getByPatient = async (req, res, next) => {
  try {
    const data = await reportService.getReportsByPatient(req.params.patientId);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const file_url = req.file ? `/uploads/${req.file.filename}` : req.body.file_url;
    const reportData = {
      ...req.body,
      file_url
    };
    const data = await reportService.uploadReport(reportData);
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

module.exports = { getByPatient, create };
