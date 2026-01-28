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
 *                 properties:
 *                   email:
 *                     type: array
 *                     items:
 *                       type: string
 *                     example: [user@example.com]
 *                   slackUsers:
 *                     type: array
 *                     items:
 *                       type: string
 *                     example: [U12345]
 *                   webengageUsers:
 *                     type: array
 *                     items:
 *                       type: string
 *                   internalEventTargets:
 *                     type: array
 *                     items:
 *                       type: string
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
