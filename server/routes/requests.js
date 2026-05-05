const express = require('express');
const router = express.Router();

console.log('Loading requests routes file');

const requestController = require('../controllers/requestController');
const { verifyToken, requireRole } = require('../middleware/auth');

router.get(
  '/stats',
  verifyToken,
  requireRole('ngo'),
  requestController.getRequestStats
);

// ✅ IMPORTANT: Place specific routes BEFORE generic routes
router.get(
  '/volunteer-location/:requestId',
  verifyToken,
  requestController.getVolunteerLocation
);

router.post(
  '/',
  verifyToken,
  requireRole('user'),
  requestController.createRequest
);

router.post(
  '/sos',
  verifyToken,
  requireRole('user'),
  requestController.sosAlert
);

// Lightweight ping for debugging route registration (no auth)
router.get('/sos-ping', (req, res) => {
  res.json({ ok: true, msg: 'sos route reachable' });
});

// User can share live GPS updates for their own request
router.patch(
  '/:id/live-location',
  verifyToken,
  requireRole('user'),
  requestController.updateRequestLiveLocation
);

router.get(
  '/',
  verifyToken,
  requestController.getRequests
);

router.put(
  '/:id/assign',
  verifyToken,
  (req, res, next) => {
    const role = req.user?.role?.toLowerCase();
    if (role !== 'ngo' && role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin or NGO role required.' });
    }
    next();
  },
  requestController.assignVolunteer
);

router.post(
  '/:id/claim/self',
  verifyToken,
  requireRole('volunteer'),
  requestController.claimRequest
);

router.post(
  '/:id/resolve',
  verifyToken,
  requireRole('volunteer'),
  requestController.resolveRequest
);

module.exports = router;
