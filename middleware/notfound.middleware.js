const notfound = (req, res, next) => {
  const path = req.originalUrl;
  res.status(404).json({
    message: `path: ${path} not exist`,
    status: "info",
    status_code: 404,
    path: path,
  });
};

module.exports = notfound;
