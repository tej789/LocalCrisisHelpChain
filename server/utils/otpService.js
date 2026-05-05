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
  console.log("Sending OTP to:", email);
console.log("Using sender:", process.env.BREVO_SENDER_EMAIL);
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

exports.sendAssignmentEmail = async (user, volunteer, subject = "Volunteer Assigned to Your Crisis Request") => {
  try {
    const isSosEmail = /sos/i.test(subject);
    const volunteerEmail = volunteer?.email || "";
    const volunteerName = volunteer?.name || "Volunteer";
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
      subject,
      htmlContent: `
        <p>Hello ${user.name || "User"},</p>

        <p>We’re pleased to inform you that a volunteer has been assigned to assist with your ${isSosEmail ? 'SOS' : 'request'}.</p>

        <p><strong>Volunteer Details:</strong><br/>
        Name: ${volunteerName}<br/>
        ${volunteerEmail ? `Email: ${volunteerEmail}<br/>` : ''}</p>

        <p>You may reply to this email to coordinate further assistance.</p>

        <p>We are committed to supporting you.</p>

        <p>– Local Crisis HelpChain</p>
      `,
      ...(volunteerEmail ? {
        replyTo: {
          email: volunteerEmail,
          name: volunteerName,
        },
      } : {}),
    };

    await apiInstance.sendTransacEmail(sendSmtpEmail);

    console.log("Assignment email sent successfully");
  } catch (error) {
    console.error("Assignment email error:", error);
  }
};

// Volunteer Assigned request Mail
exports.sendVolunteerAssignmentEmail = async (
  volunteer,
  request,
  user,
  subject = "New Crisis Request Assigned to You"
) => {
  try {
    const isSosRequest = request?.isSos === true || (request?.type?.toLowerCase() === 'rescue' && request?.sosTargetVolunteer);
    const requesterName = user?.name || "User";
    const requesterEmail = user?.email || "";

    const sendSmtpEmail = {
      sender: {
        email: process.env.BREVO_SENDER_EMAIL,
        name: process.env.BREVO_SENDER_NAME,
      },
      to: [
        {
          email: volunteer.email,
          name: volunteer.name || "Volunteer",
        },
      ],
      subject,
      htmlContent: `
        <p>Hello ${volunteer.name || "Volunteer"},</p>

        <p>You have been assigned a new ${isSosRequest ? 'SOS request' : 'crisis request'}.</p>

        <p><strong>User Details:</strong><br/>
        Name: ${requesterName}<br/>
        Email: ${requesterEmail}</p>

        <p><strong>Request Details:</strong><br/>
        Type: ${request.type}<br/>
        Urgency: ${request.urgency}<br/>
        Description: ${request.description}</p>

        <p>Please contact the user and log in to your dashboard to take further action.</p>

        <p>– Local Crisis HelpChain</p>
      `,
      replyTo: {
        email: requesterEmail || volunteer.email,
        name: requesterName,
      },
    };

    await apiInstance.sendTransacEmail(sendSmtpEmail);

    console.log("Volunteer assignment email sent successfully");
  } catch (error) {
    console.error("Volunteer assignment email error:", error);
  }
};