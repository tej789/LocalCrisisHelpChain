const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { verifyToken, requireRole } = require('../middleware/auth');

// All analytics routes require admin or ngo role
router.use(verifyToken);
router.use((req, res, next) => {
  const role = req.user.role?.toLowerCase();
  if (role !== 'admin' && role !== 'ngo') {
    return res.status(403).json({ error: 'Access denied. Admin or NGO role required.' });
  }
  next();
});

// Public analytics endpoints
router.get('/sos/volume', analyticsController.getSosVolume);
router.get('/sos/urgency', analyticsController.getSosByUrgency);
router.get('/sos/status', analyticsController.getSosStatus);
router.get('/sos/volunteers-top', analyticsController.getTopVolunteers);
router.get('/sos/hotspots', analyticsController.getSosHotspots);
router.get('/sos/peak-hours', analyticsController.getSosPeakHours);
router.get('/sos/response-time', analyticsController.getResponseTimeAnalytics);
router.get('/sos/summary', analyticsController.getSosSummary);
router.get('/sos/notification-effectiveness', analyticsController.getNotificationEffectiveness);

module.exports = router;
