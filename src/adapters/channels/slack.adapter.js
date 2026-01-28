const { WebClient } = require('@slack/web-api');
const envConfig = require('../../config/envConfig');
const { logger } = require('../../utils/logger');
const { ChannelAdapterError } = require('../../utils/errors');

class SlackAdapter {
  constructor() {
    this.client = new WebClient(envConfig.slack.botToken);
    this.defaultChannel = envConfig.slack.defaultChannel;
  }

  /**
   * Check if a string is an email address
   * @param {string} email - Email address
   * @returns {boolean}
   */
  isEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  /**
   * Resolve emails to Slack user IDs
   * @param {string[]} emails - Array of email addresses
   * @param {string} correlationId - Correlation ID for logging
   * @returns {Promise<string[]>} Array of resolved Slack user IDs
   */
  async resolveSlackUserIds(emails, correlationId) {
    if (!emails || emails.length === 0) {
      return [];
    }

    const resolvedIds = [];

    logger.debug('[SlackAdapter] Resolving emails to Slack user IDs', {
      correlationId,
      emailCount: emails.length,
    });

    for (const email of emails) {
      // Validate email format
      if (!this.isEmail(email)) {
        logger.warn('[SlackAdapter] Invalid email format, skipping', {
          correlationId,
          email,
        });
        continue;
      }

      try {
        const response = await this.client.users.lookupByEmail({ email });
        if (response.ok && response.user) {
          resolvedIds.push(response.user.id);
          logger.debug('[SlackAdapter] Resolved email to user ID', {
            correlationId,
            email,
            userId: response.user.id,
          });
        } else {
          logger.warn('[SlackAdapter] Failed to resolve email', {
            correlationId,
            email,
            error: response.error,
          });
        }
      } catch (error) {
        logger.error('[SlackAdapter] Error resolving email to user ID', {
          correlationId,
          email,
          error: error.message,
        });
        // Continue with other emails even if one fails
      }
    }

    return resolvedIds;
  }

  async send(recipients, template, correlationId) {
    const slackUsers = recipients.slackUsers || [];
    const channel = recipients.channel || this.defaultChannel;

    if (!slackUsers.length && !channel) {
      throw new ChannelAdapterError('slack', 'No recipients or channel specified', false);
    }

    try {
      // Resolve emails to Slack user IDs
      const resolvedUserIds = await this.resolveSlackUserIds(slackUsers, correlationId);

      if (resolvedUserIds.length === 0 && slackUsers.length > 0) {
        logger.warn('[SlackAdapter] No valid Slack user IDs resolved', {
          correlationId,
          originalCount: slackUsers.length,
        });
      }

      // Send to individual users via DM or channel
      const promises = [];

      if (resolvedUserIds.length > 0) {
        // Send DMs to users
        for (const userId of resolvedUserIds) {
          promises.push(
            this.client.chat.postMessage({
              channel: userId,
              ...template,
            })
          );
        }
      }

      if (channel) {
        // Send to channel (template already has resolved user IDs from template service)
        promises.push(
          this.client.chat.postMessage({
            channel,
            ...template,
          })
        );
      }

      await Promise.all(promises);
      logger.info('[SlackAdapter] Message sent successfully', {
        correlationId,
        recipients: resolvedUserIds.length,
        channel,
      });
    } catch (error) {
      const isTransient = error.code === 'slack_webapi_rate_limited' || 
                         error.statusCode >= 500 ||
                         error.code === 'slack_webapi_platform_error';
      
      logger.error('[SlackAdapter] Failed to send message', {
        correlationId,
        error: error.message,
        isTransient,
      });

      throw new ChannelAdapterError('slack', error.message, isTransient);
    }
  }
}

module.exports = SlackAdapter;
