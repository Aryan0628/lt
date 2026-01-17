import nodemailer from "nodemailer";
console.log("hitted send email")
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD,
  },
});
console.log("transproter",transporter)
export const sendEmail = async ({
  to,
  subject,
  text,
  html,
  attachments = [], 
}) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USERNAME,
      to,
      subject,
      text,
      html,
      attachments,
    };
    console.log(mailOptions)

    const info = await transporter.sendMail(mailOptions);

    console.log(`Email sent to ${to} (Msg ID: ${info.messageId})`);
    return info;
  } catch (error) {
    console.error(`Failed to send email to ${to}:`, error.message);
    throw error;
  }
};
