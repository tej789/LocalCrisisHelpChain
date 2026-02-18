const express = require('express');
const router = express.Router();

const { verifyToken, requireRole } = require('../middleware/auth');
const ngoController = require('../controllers/ngoController');

router.get(
  '/me',
  verifyToken,
  requireRole('ngo'),
  ngoController.getProfile
);

router.put(
  '/update-profile',
  verifyToken,
  requireRole('ngo'),
  ngoController.updateProfile
);

module.exports = router;
