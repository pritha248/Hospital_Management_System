const patientService = require("../services/patientService");

const getAll = async (req, res, next) => {
  try {
    const data = await patientService.getAllPatients();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const data = await patientService.getPatientById(req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    if (error.statusCode || error.status) {
      return res.status(error.statusCode || error.status).json({ success: false, message: error.message });
    }
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const data = await patientService.createPatient(req.body);
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const data = await patientService.updatePatient(req.params.id, req.body);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    const data = await patientService.deletePatient(req.params.id);
    res.json({ success: true, message: data.message || "Patient deleted successfully" });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

module.exports = { getAll, getById, create, update, remove };
