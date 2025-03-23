const nodemailer = require("nodemailer");
const logger = require("../logger");
require("dotenv").config();

// Create a transporter using environment variables
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.SMTP_USER, // SMTP username from environment variables
        pass: process.env.SMTP_PASS, //just4fun!
    },
});

/**
 * Sends an email using the configured transporter.
 * @param {string} to - Recipient email address(es).
 * @param {string} subject - Subject of the email.
 * @param {string} text - Plain text content of the email.
 * @param {string} html - HTML content of the email.
 */
async function sendEmail(to, subject, text, html) {
  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || '"Name Flame" <no-reply@nameflame.com>', // Sender address
      to, // List of receivers
      subject, // Subject line
      text, // Plain text body
      html, // HTML body
    });

    logger.info(`Message sent: ${info.messageId}`);
    return info;
  } catch (error) {
    logger.error(`Failed to send email: ${error.message}`);
    throw error;
  }
}

module.exports = sendEmail;


