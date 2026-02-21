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



// Assign Mail 

exports.sendAssignmentEmail = async (user, volunteer) => {
  try {
    const sendSmtpEmail = {
      sender: {
        email: process.env.BREVO_SENDER_EMAIL,
        name: process.env.BREVO_SENDER_NAME,
      },
      to: [
        {
          email: user.email,
          name: user.name || "User",
        },
      ],
      subject: "Volunteer Assigned to Your Crisis Request",
      htmlContent: `
        <p>Hello ${user.name || "User"},</p>

        <p>We’re pleased to inform you that a volunteer has been assigned to assist with your request.</p>

        <p><strong>Volunteer Details:</strong><br/>
        Name: ${volunteer.name}<br/>
        Email: ${volunteer.email}</p>

        <p>You may reply to this email to coordinate further assistance.</p>

        <p>We are committed to supporting you.</p>

        <p>– Local Crisis HelpChain</p>
      `,
      replyTo: {
        email: volunteer.email,
        name: volunteer.name,
      },
    };

    await apiInstance.sendTransacEmail(sendSmtpEmail);

    console.log("Assignment email sent successfully");
  } catch (error) {
    console.error("Assignment email error:", error);
  }
};