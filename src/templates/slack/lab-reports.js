// Slack templates for lab reports

/**
 * Get channel tag strings for Slack mentions
 * @param {string|string[]} channelTags - Single tag or array of tags ('channel', 'here', 'everyone')
 * @returns {string} Formatted channel tags string or empty string
 */
const getChannelTags = (channelTags) => {
  if (!channelTags) return '';
  
  const tagMap = {
    channel: '<!channel>',
    here: '<!here>',
    everyone: '<!everyone>',
  };
  
  // Handle both single string and array
  const tags = Array.isArray(channelTags) ? channelTags : [channelTags];
  
  return tags
    .map(tag => tagMap[tag.toLowerCase()])
    .filter(Boolean)
    .join(' ');
};

/**
 * Format user mentions from Slack user IDs array
 * @param {string[]} slackUsers - Array of Slack user IDs
 * @returns {string} Formatted user mentions string or empty string
 */
const formatUserMentions = (slackUsers) => {
  if (!slackUsers || !Array.isArray(slackUsers) || slackUsers.length === 0) {
    return '';
  }
  return slackUsers.map(userId => `<@${userId}>`).join(' ');
};

module.exports = {
  lab_report_ready_v1: (data) => {
    const channelTags = getChannelTags(data.channelTags);
    const userMentions = formatUserMentions(data.slackUsers);
    const mentionsText = [channelTags, userMentions].filter(Boolean).join(' ');
    const textPrefix = mentionsText ? `${mentionsText} ` : '';
    
    return {
      text: `${textPrefix}Lab Report Ready`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: 'Lab Report Ready',
          },
        },
        ...(mentionsText ? [{
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: mentionsText,
          },
        }] : []),
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Report ID:*\n${data.reportId || 'N/A'}`,
            },
            {
              type: 'mrkdwn',
              text: `*SKU:*\n${data.sku || 'N/A'}`,
            },
          ],
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: 'The lab report is now available and ready for access.',
            },
          ],
        },
      ],
    };
  },

  lab_report_ready_v2: (data) => {
    const channelTags = getChannelTags(data.channelTags);
    const userMentions = formatUserMentions(data.slackUsers);
    const mentionsText = [channelTags, userMentions].filter(Boolean).join(' ');
    const textPrefix = mentionsText ? `${mentionsText} ` : '';
    
    return {
      text: `${textPrefix}Lab Report Ready for <@${data.userId}>`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: 'Lab Report Ready',
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `${mentionsText ? `${mentionsText} ` : ''}Hey <@${data.userId}>, your lab report is ready!`,
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Report ID:*\n${data.reportId || 'N/A'}`,
            },
            {
              type: 'mrkdwn',
              text: `*SKU:*\n${data.sku || 'N/A'}`,
            },
          ],
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: 'Please check your dashboard for details.',
            },
          ],
        },
      ],
    };
  },

  lab_report_pending_v1: (data) => {
    const channelTags = getChannelTags(data.channelTags);
    const userMentions = formatUserMentions(data.slackUsers);
    const mentionsText = [channelTags, userMentions].filter(Boolean).join(' ');
    const textPrefix = mentionsText ? `${mentionsText} ` : '';
    
    return {
      text: `${textPrefix}Lab Report Pending`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: 'Lab Report Pending',
          },
        },
        ...(mentionsText ? [{
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: mentionsText,
          },
        }] : []),
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Report ID:*\n${data.reportId || 'N/A'}`,
            },
            {
              type: 'mrkdwn',
              text: `*SKU:*\n${data.sku || 'N/A'}`,
            },
          ],
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: 'The lab report is currently under processing. A notification will be sent once it is ready.',
            },
          ],
        },
      ],
    };
  },

  lab_report_qr_missing_v1: (data) => {
    const channelTags = getChannelTags(data.channelTags);
    const userMentions = formatUserMentions(data.slackUsers);
    const mentionsText = [channelTags, userMentions].filter(Boolean).join(' ');
    const textPrefix = mentionsText ? `${mentionsText} ` : '';
    
    return {
      text: `${textPrefix}Lab Report QR Missing`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: 'QR Code Missing',
          },
        },
        ...(mentionsText ? [{
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: mentionsText,
          },
        }] : []),
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*SKU:*\n${data.sku || 'N/A'}`,
            },
            {
              type: 'mrkdwn',
              text: `*Status:*\nAction Required`,
            },
          ],
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text:
              'The lab report does not have an associated QR code.\n' +
              'Please verify the report details or upload a valid QR code to proceed.',
          },
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: 'Operational attention required.',
            },
          ],
        },
      ],
    };
  },

  unknown_sku_detected_v1: (data) => {
    const channelTags = getChannelTags(data.channelTags);
    const userMentions = formatUserMentions(data.slackUsers);
    const mentionsText = [channelTags, userMentions].filter(Boolean).join(' ');
    const textPrefix = mentionsText ? `${mentionsText} ` : '';
    
    return {
      text: `${textPrefix}New Unknown SKU Detected`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: 'Unknown SKU Detected',
          },
        },
        ...(mentionsText ? [{
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: mentionsText,
          },
        }] : []),
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*SKU:*\n${data.sku || 'N/A'}`,
            },
            {
              type: 'mrkdwn',
              text: `*Status:*\nReview Required`,
            },
          ],
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text:
              'A new, unrecognized SKU has been detected in the system.\n' +
              'Please review and map this SKU to the appropriate product.',
          },
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: 'Operational notification.',
            },
          ],
        },
      ],
    };
  },
};
