const releaseLetterService = require("../services/releaseLetterService");

const getByPatient = async (req, res, next) => {
  try {
    const data = await releaseLetterService.getReleaseLettersByPatient(req.params.patientId);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const getAll = async (req, res, next) => {
  try {
    const data = await releaseLetterService.getAllReleaseLetters();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const requestLetter = async (req, res, next) => {
  try {
    const data = await releaseLetterService.requestReleaseLetter(req.body);
    res.status(201).json({ success: true, data });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

const approveLetter = async (req, res, next) => {
  try {
    const data = await releaseLetterService.approveReleaseLetter(req.params.id, req.body);
    res.json({ success: true, data });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

const initiateAndApprove = async (req, res, next) => {
  try {
    const data = await releaseLetterService.initiateAndApproveRelease(req.body, req.body);
    res.json({ success: true, data });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

module.exports = { getByPatient, getAll, requestLetter, approveLetter, initiateAndApprove };
