const billingService = require("../services/billingService");

const getByPatient = async (req, res, next) => {
  try {
    const data = await billingService.getBillsByPatient(req.params.patientId);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const getAll = async (req, res, next) => {
  try {
    const data = await billingService.getAllBilling();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const createBill = async (req, res, next) => {
  try {
    const data = await billingService.createBill(req.body);
    res.status(201).json({ success: true, data });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

const payBill = async (req, res, next) => {
  try {
    const { payment_method } = req.body;
    const data = await billingService.payBill(req.params.id, payment_method);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const fileClaim = async (req, res, next) => {
  try {
    const data = await billingService.fileClaim(req.body);
    res.status(201).json({ success: true, data });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

const updateClaimStatus = async (req, res, next) => {
  try {
    const { status, managerNotes, approved_amount, admin_name } = req.body;
    const data = await billingService.updateClaimStatus(req.params.id, status, managerNotes, approved_amount, admin_name);
    res.json({ success: true, data });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

const modifyBill = async (req, res, next) => {
  try {
    const data = await billingService.modifyBill(req.params.id, req.body);
    res.json({ success: true, data });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

const getBillAuditLogs = async (req, res, next) => {
  try {
    const data = await billingService.getBillAuditLogs(req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const getAdmissionRequests = async (req, res, next) => {
  try {
    const data = await billingService.getAdmissionRequests();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const processAdmissionDecision = async (req, res, next) => {
  try {
    const data = await billingService.processAdmissionDecision(req.params.id, req.body);
    res.json({ success: true, data });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

const getPatientAuditLogs = async (req, res, next) => {
  try {
    const data = await billingService.getPatientAuditLogs(req.params.patientId);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const addAdditionalCharges = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const { amount, reason, user_name, user_id } = req.body;
    const data = await billingService.addAdditionalChargesInvoice({
      patient_id: patientId,
      amount,
      reason,
      user_name,
      user_id
    });
    res.status(201).json({ success: true, data });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

const applyPatientDiscount = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const { discount_type, discount_value, reason, user_name, user_id } = req.body;
    const data = await billingService.applyPatientDiscount({
      patient_id: patientId,
      discount_type,
      discount_value,
      reason,
      user_name,
      user_id
    });
    res.status(200).json({ success: true, data });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

const deductPatientCharges = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const { bill_id, amount, reason, user_name, user_id } = req.body;
    const data = await billingService.deductPatientCharges({
      patient_id: patientId,
      bill_id,
      amount,
      reason,
      user_name,
      user_id
    });
    res.status(200).json({ success: true, data });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

module.exports = { 
  getByPatient, 
  getAll, 
  createBill, 
  payBill, 
  fileClaim, 
  updateClaimStatus, 
  modifyBill, 
  getBillAuditLogs,
  getPatientAuditLogs,
  getAdmissionRequests,
  processAdmissionDecision,
  addAdditionalCharges,
  applyPatientDiscount,
  deductPatientCharges
};

