const express = require('express');
const router = express.Router();

const { verifyToken } = require('../middleware/auth');
const userController = require('../controllers/userController');

/* Profile Routes */
router.get('/me', verifyToken, userController.getProfile);
router.put('/update-profile', verifyToken, userController.updateProfile);

/* Notification Route */
router.get('/notifications', verifyToken, userController.getMyNotifications);

router.put(
  "/notifications/:id/read",
  verifyToken,
  userController.markNotificationRead
);
module.exports = router;