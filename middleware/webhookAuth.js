const { unauthorized } = require('../utils/response');

const verifyWebhookSecret = (req, res, next) => {
  const secret = req.headers['x-webhook-secret'];
  const expectedSecret = process.env.WEBHOOK_SECRET;

  if (!secret || secret !== expectedSecret) {
    return unauthorized(res, 'Invalid webhook secret');
  }

  next();
};

module.exports = {
  verifyWebhookSecret
};
