const db = require('../config/database');

const getAllActive = async (req, res, next) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM diagnostic_tests_catalog WHERE status = 'Active' ORDER BY category, test_name"
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllActive
};
