const express = require("express");
const router = express.Router();
const appointmentController = require("../controllers/appointmentController");

router.get("/", appointmentController.getAll);
router.post("/", appointmentController.create);
router.patch("/:id/status", appointmentController.updateStatus);
router.post("/:id/resubmit-admission", appointmentController.resubmitAdmission);
router.delete("/:id", appointmentController.remove);

module.exports = router;
