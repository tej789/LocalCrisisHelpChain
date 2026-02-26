const express = require('express');
const router = express.Router();

const validate = require("../middleware/validate");
const { registerSchema, loginSchema } = require("../validations/userValidation");

const authController = require('../controllers/authController');

router.post(
  '/register',
  validate(registerSchema),   // ✅ Joi added here
  authController.register
);

router.post(
  '/login',
  validate(loginSchema),      // ✅ Joi added here
  authController.login
);

router.post('/verify-otp', authController.verifyOtp);
router.post('/resend-otp', authController.resendOtp);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

module.exports = router;