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

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/verify-otp', validate(verifyOtpSchema), authController.verifyOtp);
router.post('/forgot-password', validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword);

router.post('/resend-otp', authController.resendOtp); // optional to validate later

module.exports = router;