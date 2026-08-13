const express = require("express");
const router = express.Router();
const billingController = require("../controllers/billingController");

router.get("/patient/:patientId", billingController.getByPatient);
router.get("/patient/:patientId/audit-logs", billingController.getPatientAuditLogs);
router.post("/patient/:patientId/add-charges", billingController.addAdditionalCharges);
router.post("/patient/:patientId/apply-discount", billingController.applyPatientDiscount);
router.post("/patient/:patientId/deduct-charges", billingController.deductPatientCharges);
router.get("/all", billingController.getAll);
router.post("/bills", billingController.createBill);
router.patch("/bills/:id/pay", billingController.payBill);
router.patch("/bills/:id/modify", billingController.modifyBill);
router.get("/bills/:id/audit-logs", billingController.getBillAuditLogs);
router.post("/claims", billingController.fileClaim);
router.patch("/claims/:id/status", billingController.updateClaimStatus);
router.get("/admission-requests", billingController.getAdmissionRequests);
router.patch("/admission-requests/:id/decision", billingController.processAdmissionDecision);

module.exports = router;
