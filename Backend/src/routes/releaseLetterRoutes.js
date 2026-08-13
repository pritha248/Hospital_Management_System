const express = require("express");
const router = express.Router();
const releaseLetterController = require("../controllers/releaseLetterController");

router.get("/patient/:patientId", releaseLetterController.getByPatient);
router.get("/all", releaseLetterController.getAll);
router.post("/request", releaseLetterController.requestLetter);
router.post("/initiate-and-approve", releaseLetterController.initiateAndApprove);
router.patch("/:id/approve", releaseLetterController.approveLetter);

module.exports = router;
