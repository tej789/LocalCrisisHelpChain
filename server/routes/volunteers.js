const express = require('express');
const router = express.Router();

const { verifyToken, requireAnyRole, requireRole } = require('../middleware/auth');
const volunteerController = require('../controllers/volunteerController');

router.get(
  '/',
  verifyToken,
  requireAnyRole(['ngo', 'admin']),
  volunteerController.getVolunteers
);

router.patch(
  '/me/location',
  verifyToken,
  requireRole('volunteer'),
  volunteerController.updateLocation
);

router.patch(
  '/me/availability',
  verifyToken,
  requireRole('volunteer'),
  volunteerController.updateAvailability
);
router.patch(
  "/me/basic",
  verifyToken,
  requireRole('volunteer'),
  volunteerController.updateBasicProfile
);

module.exports = router;
