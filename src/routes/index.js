const express = require('express');
const router = express.Router();
const notificationsRouter = require('./notifications.routes');

// Mount notification routes
router.use('/', notificationsRouter);

module.exports = router;
