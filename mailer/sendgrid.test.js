const sendInviteEmail = require('./sendgrid');
const sgMail = require('@sendgrid/mail');
const logger = require('../logger');

jest.mock('@sendgrid/mail', () => ({
  setApiKey: jest.fn(),
  send: jest.fn(),
}));

jest.mock('../logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

describe('sendInviteEmail', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should send an invite email successfully', async () => {
    // Mock SendGrid's send method to resolve successfully
    sgMail.send.mockResolvedValue();

    const email = 'test@example.com';
    const nameContext = { name: 'Test Name Context' };

    await sendInviteEmail(email, nameContext);

    // Verify that sgMail.send was called with the correct message
    expect(sgMail.send).toHaveBeenCalledWith({
      to: email,
      from: 'nameflameapp@gmail.com',
      subject: `🔥 You have been invited to join Name Flame - ${nameContext.name}`,
      text: `You have been invited to join the ${nameContext.name} Name Context`,
      html: `You have been invited to join the ${nameContext.name} Name Context
    visit <a href="https://name-flame.expo.app/sign-up">Name Flame</a> to sign up and contribute!`,
    });

    // Verify that the logger.info was called
    expect(logger.info).toHaveBeenCalledWith(`Invite email sent to ${email}`);
  });

  it('should log an error if sending the email fails', async () => {
    // Mock SendGrid's send method to reject with an error
    const error = new Error('SendGrid error');
    sgMail.send.mockRejectedValue(error);

    const email = 'test@example.com';
    const nameContext = { name: 'Test Name Context' };

    await sendInviteEmail(email, nameContext);

    // Verify that sgMail.send was called with the correct message
    expect(sgMail.send).toHaveBeenCalledWith({
      to: email,
      from: 'nameflameapp@gmail.com',
      subject: `🔥 You have been invited to join Name Flame - ${nameContext.name}`,
      text: `You have been invited to join the ${nameContext.name} Name Context`,
      html: `You have been invited to join the ${nameContext.name} Name Context
    visit <a href="https://name-flame.expo.app/sign-up">Name Flame</a> to sign up and contribute!`,
    });

    // Verify that the logger.error was called with the error
    expect(logger.error).toHaveBeenCalledWith('Error sending email', error);
  });
});