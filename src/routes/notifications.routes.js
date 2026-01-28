const express = require('express');
const router = express.Router();
const NotificationController = require('../controllers/notification.controller');
const HealthController = require('../controllers/health.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const correlationMiddleware = require('../middlewares/correlation.middleware');
const { validateNotificationRequest, handleValidationErrors } = require('../middlewares/validation.middleware');

/**
 * @swagger
 * /notifications/send:
 *   post:
 *     tags:
 *       - Notifications
 *     summary: Send a notification
 *     description: |
 *       Sends a notification to one or more channels (email, slack, webengage, internal).
 *       Returns 202 Accepted immediately. Delivery is asynchronous via Kafka.
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - eventType
 *               - channels
 *               - recipients
 *               - templateId
 *               - data
 *             properties:
 *               eventType:
 *                 type: string
 *                 example: LAB_REPORT_READY
 *               channels:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [email, slack, webengage, internal]
 *                 example: [email, slack]
 *               recipients:
 *                 type: object
 *                 required: true
 *                 properties:
 *                   email:
 *                     type: object
 *                     properties:
 *                       to:
 *                         type: array
 *                         items:
 *                           type: string
 *                         required: true
 *                         example: [user@example.com]
 *                   slack:
 *                     type: object
 *                     properties:
 *                       usersToTag:
 *                         type: array
 *                         items:
 *                           type: string
 *                         description: Array of email addresses to tag in channel messages
 *                         example: [user1@example.com, user2@example.com]
 *                       usersToDM:
 *                         type: array
 *                         items:
 *                           type: string
 *                         description: Array of email addresses to send direct messages to
 *                         example: [user3@example.com]
 *                       channel:
 *                         type: string
 *                         description: Slack channel ID or name (e.g., #general or C1234567890)
 *                         example: "#general"
 *                       options:
 *                         type: object
 *                         properties:
 *                           sendDMs:
 *                             type: boolean
 *                             default: false
 *                             description: Whether to send direct messages to usersToTag users
 *                           channelTags:
 *                             oneOf:
 *                               - type: string
 *                               - type: array
 *                                 items:
 *                                   type: string
 *                             enum: [channel, here, everyone]
 *                             description: Channel-wide mention tag(s). Can be single tag or array of tags
 *                             example: ["channel", "here"]
 *                   webengage:
 *                     type: object
 *                     properties:
 *                       users:
 *                         type: array
 *                         items:
 *                           type: string
 *                       options:
 *                         type: object
 *                   internal:
 *                     type: object
 *                     properties:
 *                       targets:
 *                         type: array
 *                         items:
 *                           type: string
 *                       options:
 *                         type: object
 *               templateId:
 *                 type: string
 *                 example: lab_report_ready_v1
 *               data:
 *                 type: object
 *                 example:
 *                   reportId: RPT123
 *                   sku: SKU001
 *               correlationId:
 *                 type: string
 *                 description: Optional correlation ID. Auto-generated if not provided.
 *               priority:
 *                 type: string
 *                 enum: [low, normal, high]
 *                 default: normal
 *     responses:
 *       202:
 *         description: Notification request accepted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 correlationId:
 *                   type: string
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication error
 *       500:
 *         description: Internal server error
 */
router.post(
  '/notifications/send',
  authMiddleware,
  correlationMiddleware,
  validateNotificationRequest,
  handleValidationErrors,
  async (req, res, next) => {
    try {
      await req.notificationController.sendNotification(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /health:
 *   get:
 *     tags:
 *       - Health
 *     summary: Health check endpoint
 *     description: Returns the health status of the service and its dependencies
 *     responses:
 *       200:
 *         description: Health status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [healthy, degraded, unhealthy]
 *                 timestamp:
 *                   type: string
 *                 checks:
 *                   type: object
 *                   properties:
 *                     redis:
 *                       type: string
 *                     kafka:
 *                       type: string
 */
router.get('/health', async (req, res, next) => {
  try {
    await req.healthController.health(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /ready:
 *   get:
 *     tags:
 *       - Health
 *     summary: Readiness check endpoint
 *     description: Returns whether the service is ready to accept requests
 *     responses:
 *       200:
 *         description: Readiness status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ready:
 *                   type: boolean
 *                 timestamp:
 *                   type: string
 */
router.get('/ready', async (req, res, next) => {
  try {
    await req.healthController.ready(req, res);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
