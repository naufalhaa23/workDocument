function errorHandler(err, req, res, next) {
  console.error('❌ Error:', err.message);
  console.error(err.stack);
  require('fs').appendFileSync('error.log', new Date().toISOString() + ' ' + err.message + '\n' + err.stack + '\n\n');

  if (err.name === 'ValidationError') {
    return res.status(400).json({ message: err.message, details: err.details });
  }

  if (err.code === 'P2002') {
    return res.status(409).json({ message: 'Data sudah ada (duplikat)', field: err.meta?.target });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({ message: 'Data tidak ditemukan' });
  }

  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
  });
}

module.exports = { errorHandler };
