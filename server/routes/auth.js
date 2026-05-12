const express = require('express');
const router = express.Router();

const validate = require("../middleware/validate");
const {
  registerSchema,
  loginSchema,
  verifyOtpSchema,
  forgotPasswordSchema,
  resetPasswordSchema
} = require("../validations/userValidation");

const authController = require('../controllers/authController');
const { loginLimiter, registerLimiter, resendOtpLimiter, forgotPasswordLimiter } = require('../middleware/rateLimiter');

router.post('/register', registerLimiter, validate(registerSchema), authController.register);
router.post('/login', loginLimiter, validate(loginSchema), authController.login);
router.post('/verify-otp', validate(verifyOtpSchema), authController.verifyOtp);
router.post('/forgot-password', forgotPasswordLimiter, validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword);

router.post('/resend-otp', resendOtpLimiter, authController.resendOtp); // optional to validate later

module.exports = router;