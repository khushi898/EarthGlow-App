export function notFound(req, res, _next) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

export function errorHandler(err, _req, res, _next) {
  console.error(err);
  if (err.code === 11000) return res.status(409).json({ message: 'A record with that value already exists' });
  if (err.name === 'ValidationError') return res.status(400).json({ message: err.message });
  // A malformed ID or value in the request is the client's mistake, not a server failure.
  if (err.name === 'CastError') return res.status(400).json({ message: `Invalid value for ${err.path}` });

  // Keep internal details in the server log and out of the response.
  const status = err.status || 500;
  res.status(status).json({ message: status < 500 ? err.message : 'Internal server error' });
}
