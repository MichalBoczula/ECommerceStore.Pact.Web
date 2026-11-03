// Development only. Production Nginx implements this same prefix contract in WEB/10.
module.exports = {
  '/backend/api/**': {
    target: process.env.PACT_API_URL || 'http://127.0.0.1:5080',
    changeOrigin: true,
    pathRewrite: { '^/backend': '' },
  },
};
