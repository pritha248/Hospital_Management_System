const express = require("express");
const router = express.Router();
const testCatalogController = require("../controllers/testCatalogController");

router.get("/", testCatalogController.getAllActive);

module.exports = router;
