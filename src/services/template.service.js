const { TemplateNotFoundError } = require('../utils/errors');
const { logger } = require('../utils/logger');

// Load templates from channel-specific folders
const emailTemplates = require('../templates/email/lab-reports');
const slackTemplates = require('../templates/slack/lab-reports');

const templateRegistry = {
  email: emailTemplates,
  slack: slackTemplates,
  webengage: {}, // Future
  internal: {}, // Internal events don't use templates
};

class TemplateService {
  constructor() {
    this.slackAdapter = null; // Will be injected if needed
  }

  /**
   * Set Slack adapter for email-to-user-ID resolution
   * @param {SlackAdapter} adapter - Slack adapter instance
   */
  setSlackAdapter(adapter) {
    this.slackAdapter = adapter;
  }

  /**
   * Get template for channel and templateId
   * @param {string} channel - Channel name (e.g., 'slack', 'email')
   * @param {string} templateId - Template identifier
   * @param {object} data - Template data
   * @param {object} recipients - Optional recipients object (for user tagging in Slack)
   * @param {string} correlationId - Optional correlation ID for logging
   */
  async getTemplate(channel, templateId, data, recipients = {}, correlationId = 'unknown') {
    const channelTemplates = templateRegistry[channel];
    
    if (!channelTemplates) {
      throw new TemplateNotFoundError(templateId, channel);
    }

    const templateFunction = channelTemplates[templateId];
    
    if (!templateFunction) {
      throw new TemplateNotFoundError(templateId, channel);
    }

    try {
      // Merge recipients into data for Slack templates to enable user tagging
      const templateData = { ...data };
      if (channel === 'slack') {
        const slackConfig = recipients.slack || {};
        const usersToTag = slackConfig.usersToTag || [];
        
        // Resolve emails to Slack user IDs for tagging if Slack adapter is available
        if (usersToTag.length > 0 && this.slackAdapter) {
          const resolvedUserIds = await this.slackAdapter.resolveSlackUserIds(
            usersToTag,
            correlationId
          );
          templateData.slackUsers = resolvedUserIds;
        }
        
        // Pass channelTags (supports array) from options to template data
        if (slackConfig.options?.channelTags) {
          templateData.channelTags = slackConfig.options.channelTags;
        }
      }
      
      const rendered = templateFunction(templateData);
      logger.debug('[TemplateService] Template rendered', { channel, templateId });
      return rendered;
    } catch (error) {
      logger.error('[TemplateService] Error rendering template', {
        channel,
        templateId,
        error: error.message,
      });
      throw new TemplateNotFoundError(templateId, channel);
    }
  }

  /**
   * Substitute variables in template string
   */
  substituteVariables(template, data) {
    if (typeof template !== 'string') {
      return template;
    }

    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] !== undefined ? String(data[key]) : match;
    });
  }
}

module.exports = TemplateService;
