const doctorService = require("../services/doctorService");

const getAll = async (req, res, next) => {
  try {
    const data = await doctorService.getAllDoctors();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const data = await doctorService.getDoctorById(req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const data = await doctorService.createDoctor(req.body);
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const data = await doctorService.updateDoctor(req.params.id, req.body);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    await doctorService.deleteDoctor(req.params.id);
    res.json({ success: true, message: "Doctor deleted successfully" });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getById, create, update, remove };
