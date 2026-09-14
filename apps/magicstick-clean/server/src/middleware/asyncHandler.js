// Express 4 doesn't catch a rejected promise thrown inside an async route
// handler — it becomes an unhandled rejection and the request just hangs
// instead of getting a response. Wrapping every async handler with this
// forwards the error to the app's error-handling middleware instead.
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

module.exports = { asyncHandler };
