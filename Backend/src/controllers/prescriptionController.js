const prescriptionService = require("../services/prescriptionService");

const getAll = async (req, res, next) => {
  try {
    const filters = {
      ...req.query,
      role: req.query.role || req.user?.role
    };
    const data = await prescriptionService.getAllPrescriptions(filters);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const data = await prescriptionService.createPrescription(req.body);
    res.status(201).json({ success: true, data });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const actorInfo = { name: req.body?.user_name || req.query?.user_name || 'Doctor' };
    await prescriptionService.deletePrescription(id, actorInfo);
    res.json({ success: true, message: "Prescription deleted successfully" });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, create, remove };
