const express = require("express");
const router = express.Router();
const prescriptionController = require("../controllers/prescriptionController");

router.get("/", prescriptionController.getAll);
router.post("/", prescriptionController.create);
router.delete("/:id", prescriptionController.remove);

module.exports = router;
