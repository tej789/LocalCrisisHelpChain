const Brevo = require("@getbrevo/brevo");

exports.generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const apiInstance = new Brevo.TransactionalEmailsApi();

apiInstance.setApiKey(
  Brevo.TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY
);

exports.sendOtpEmail = async (email, otp) => {
  try {
    const sendSmtpEmail = {
      sender: {
        email: process.env.BREVO_SENDER_EMAIL,
        name: process.env.BREVO_SENDER_NAME,
      },
      to: [{ email }],
      subject: "LCHC Email Verification OTP",
      htmlContent: `
        <h2>Your OTP: ${otp}</h2>
        <p>This OTP expires in 5 minutes.</p>
      `,
    };

    await apiInstance.sendTransacEmail(sendSmtpEmail);

    console.log("OTP email sent");
  } catch (error) {
    console.error("Brevo error:", error);
  }
};
