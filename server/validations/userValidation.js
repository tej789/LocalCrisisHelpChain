const Joi = require("joi");

/* ================= REGISTER ================= */
const registerSchema = Joi.object({
  name: Joi.string()
    .min(3)
    .max(50)
    .required()
    .messages({
      "string.empty": "Name is required",
      "string.min": "Name must be at least 3 characters"
    }),

  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      "string.email": "Invalid email format",
      "string.empty": "Email is required"
    }),

  password: Joi.string()
    .min(6)
    .required()
    .messages({
      "string.min": "Password must be at least 6 characters"
    }),

  contact: Joi.string()
    .pattern(/^[0-9]{10}$/)
    .required()
    .messages({
      "string.pattern.base": "Contact must be 10 digits"
    }),

  role: Joi.string()
    .valid("user", "ngo", "volunteer", "admin")
    .optional()
});


/* ================= LOGIN ================= */
const loginSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      "string.email": "Invalid email format",
      "string.empty": "Email is required"
    }),

  password: Joi.string()
    .required()
    .messages({
      "string.empty": "Password is required"
    })
});


/* ================= VERIFY OTP ================= */
const verifyOtpSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required(),

  otp: Joi.string()
    .length(6)
    .pattern(/^[0-9]+$/)
    .required()
    .messages({
      "string.length": "OTP must be 6 digits",
      "string.pattern.base": "OTP must contain only numbers"
    })
});


/* ================= FORGOT PASSWORD ================= */
const forgotPasswordSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      "string.email": "Invalid email format",
      "string.empty": "Email is required"
    })
});


/* ================= RESET PASSWORD ================= */
const resetPasswordSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required(),

  otp: Joi.string()
    .length(6)
    .pattern(/^[0-9]+$/)
    .required(),

  newPassword: Joi.string()
    .min(6)
    .required()
    .messages({
      "string.min": "Password must be at least 6 characters"
    })
});


/* ================= EXPORT ================= */
module.exports = {
  registerSchema,
  loginSchema,
  verifyOtpSchema,
  forgotPasswordSchema,
  resetPasswordSchema
};