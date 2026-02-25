const express = require('express');
const router = express.Router();

const requestController = require('../controllers/requestController');
const { verifyToken, requireRole } = require('../middleware/auth');
router.get(
  '/stats',
  verifyToken,
  requireRole('ngo'),
  requestController.getRequestStats
);
router.post(
  '/',
  verifyToken,
  requireRole('user'),
  requestController.createRequest
);

router.get(
  '/',
  verifyToken,
  requestController.getRequests
);

router.put(
  '/:id/assign',
  verifyToken,
  requireRole('ngo'),
  requestController.assignVolunteer
);

router.post(
  '/:id/resolve',
  verifyToken,
  requireRole('volunteer'),
  requestController.resolveRequest
);

module.exports = router;
