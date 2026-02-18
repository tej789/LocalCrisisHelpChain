const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');

const userController = require('../controllers/userController');

router.get('/me', verifyToken, userController.getProfile);

router.put(
  '/update-profile',
  verifyToken,
  userController.updateProfile
);

module.exports = router;
