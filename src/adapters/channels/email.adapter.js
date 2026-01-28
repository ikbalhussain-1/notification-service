const nodemailer = require('nodemailer');
const envConfig = require('../../config/envConfig');
const { logger } = require('../../utils/logger');
const { ChannelAdapterError } = require('../../utils/errors');

class EmailAdapter {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: envConfig.email.smtp.host,
      port: envConfig.email.smtp.port,
      secure: envConfig.email.smtp.secure,
      auth: {
        user: envConfig.email.smtp.user,
        pass: envConfig.email.smtp.password,
      },
    });
  }

  async send(recipients, template, correlationId) {
    const emails = recipients.email?.to || [];

    if (!emails.length) {
      throw new ChannelAdapterError('email', 'No email recipients specified', false);
    }

    try {
      const mailOptions = {
        from: `"${envConfig.email.from.name}" <${envConfig.email.from.address}>`,
        to: emails.join(', '),
        subject: template.subject,
        text: template.text,
        html: template.html,
      };

      await this.transporter.sendMail(mailOptions);
      logger.info('[EmailAdapter] Email sent successfully', {
        correlationId,
        recipients: emails.length,
      });
    } catch (error) {
      const isTransient = error.code === 'ETIMEDOUT' || 
                         error.code === 'ECONNRESET' ||
                         error.code === 'ESOCKETTIMEDOUT';
      
      logger.error('[EmailAdapter] Failed to send email', {
        correlationId,
        error: error.message,
        isTransient,
      });

      throw new ChannelAdapterError('email', error.message, isTransient);
    }
  }
}

module.exports = EmailAdapter;
