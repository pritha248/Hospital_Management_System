const errorHandler = (err, req, res, next) => {
  console.error("API ERROR:", err);

  res.status(err.status || err.statusCode || 500).json({
    success: false,
    message: err.message || "Internal Server Error"
  });
};

module.exports = errorHandler;