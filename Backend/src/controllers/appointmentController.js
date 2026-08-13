const appointmentService = require("../services/appointmentService");

const getAll = async (req, res, next) => {
  try {
    const data = await appointmentService.getAllAppointments(req.query);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const data = await appointmentService.createAppointment(req.body);
    res.status(201).json({ success: true, data });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

const updateStatus = async (req, res, next) => {
  try {
    const { status, notes } = req.body;
    const data = await appointmentService.updateAppointmentStatus(req.params.id, status, notes);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    await appointmentService.deleteAppointment(req.params.id);
    res.json({ success: true, message: "Appointment deleted successfully" });
  } catch (error) {
    next(error);
  }
};

const resubmitAdmission = async (req, res, next) => {
  try {
    const data = await appointmentService.resubmitLaterAdmissionRequest(req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

module.exports = { getAll, create, updateStatus, remove, resubmitAdmission };
