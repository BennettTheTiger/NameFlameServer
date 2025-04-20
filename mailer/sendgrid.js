const sgMail = require('@sendgrid/mail')
const logger = require('../logger')
sgMail.setApiKey(process.env.SENDGRID_API_KEY)

async function sendInviteEmail(email, nameContext) {
  const msg = {
    to: email,
    from: 'nameflameapp@gmail.com',
    subject: `🔥 You have been invited to join Name Flame - ${nameContext.name}`,
    text: `You have been invited to join the ${nameContext.name} Name Context`,
    html: `You have been invited to join the ${nameContext.name} Name Context
    visit <a href="https://name-flame.expo.app/sign-up">Name Flame</a> to sign up and contribute!`,
  }

  try {
    await sgMail.send(msg)
    logger.info(`Invite email sent to ${email}`)
  }
  catch (error) {
    logger.error('Error sending email', error)
  }
}

module.exports = sendInviteEmail;