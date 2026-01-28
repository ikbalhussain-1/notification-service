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
    const slackConfig = recipients.slack || {};
    const channel = slackConfig.channel || this.defaultChannel;
    const usersToTag = slackConfig.usersToTag || [];  // For tagging in channel
    const usersToDM = slackConfig.usersToDM || [];  // For sending DMs
    const options = slackConfig.options || {};
    const sendDMs = options.sendDMs === true;  // Send DMs to usersToTag if true
    
    // Combine usersToDM with usersToTag (if sendDMs is true)
    const allDMUsers = sendDMs 
      ? [...new Set([...usersToTag, ...usersToDM])]  // Remove duplicates
      : usersToDM;

    // At least one action must be specified
    if (!channel && usersToTag.length === 0 && allDMUsers.length === 0) {
      throw new ChannelAdapterError('slack', 'No recipients or channel specified', false);
    }

    try {
      const promises = [];

      // Resolve emails to Slack user IDs for tagging
      let resolvedTagUserIds = [];
      if (usersToTag.length > 0) {
        resolvedTagUserIds = await this.resolveSlackUserIds(usersToTag, correlationId);
        if (resolvedTagUserIds.length === 0 && usersToTag.length > 0) {
          logger.warn('[SlackAdapter] No valid Slack user IDs resolved for tagging', {
            correlationId,
            originalCount: usersToTag.length,
          });
        }
      }

      // Resolve emails to Slack user IDs for DMs
      let resolvedDMUserIds = [];
      if (allDMUsers.length > 0) {
        resolvedDMUserIds = await this.resolveSlackUserIds(allDMUsers, correlationId);
        if (resolvedDMUserIds.length === 0 && allDMUsers.length > 0) {
          logger.warn('[SlackAdapter] No valid Slack user IDs resolved for DMs', {
            correlationId,
            originalCount: allDMUsers.length,
          });
        }
      }

      // Send DMs to users
      if (resolvedDMUserIds.length > 0) {
        for (const userId of resolvedDMUserIds) {
          promises.push(
            this.client.chat.postMessage({
              channel: userId,
              ...template,
            })
          );
        }
        logger.debug('[SlackAdapter] Sending DMs to users', {
          correlationId,
          userCount: resolvedDMUserIds.length,
        });
      }

      // Send to channel (if channel is specified)
      if (channel) {
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
        channel,
        taggedUsers: resolvedTagUserIds.length,
        dmUsers: resolvedDMUserIds.length,
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
