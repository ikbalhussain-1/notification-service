# Redis Availability Improvements

## Summary
The service now gracefully handles Redis unavailability, allowing the service to continue operating even when Redis is down. Idempotency is disabled during Redis outages, but the service remains functional.

---

## Changes Applied

### 1. **Redis Optional at Startup** ✅
**File**: `src/server.js`

**Before**: Service would exit if Redis connection failed at startup.

**After**: Service continues to start even if Redis is unavailable.

```javascript
// Try to connect to Redis, but don't fail if unavailable
try {
  await redisAdapter.connect();
  logger.info('[Server] Redis connected');
} catch (error) {
  logger.warn('[Server] Redis unavailable, continuing without idempotency');
  // Service continues to start
}
```

**Impact**:
- ✅ Service can start without Redis
- ✅ Health check shows "degraded" status
- ✅ Service remains operational

---

### 2. **Idempotency Fail-Open** ✅
**File**: `src/services/idempotency.service.js`

**Before**: `markProcessed()` would throw error when Redis is unavailable, causing requests to fail.

**After**: Fails open - allows requests to proceed when Redis is down.

```javascript
async markProcessed(key) {
  try {
    const result = await this.redis.setNX(key, 'processed', this.ttlSeconds);
    return result;
  } catch (error) {
    logger.warn('[IdempotencyService] Redis unavailable, allowing request (idempotency disabled)');
    return true; // Fail open - treat as new request
  }
}
```

**Impact**:
- ✅ Requests succeed even when Redis is down
- ⚠️ Duplicate requests may be processed (acceptable trade-off)
- ✅ Service remains available

---

### 3. **Improved Error Handling** ✅
**File**: `src/controllers/notification.controller.js`

**Before**: Redis errors would cause HTTP 500 responses.

**After**: Redis errors are handled gracefully by idempotency service (fail open).

**Impact**:
- ✅ No HTTP 500 errors due to Redis unavailability
- ✅ Requests processed normally
- ✅ Clear logging when idempotency is disabled

---

## New Behavior When Redis is Unavailable

### At Startup
1. Service attempts to connect to Redis
2. If connection fails → logs warning and continues
3. Service starts successfully
4. Health check shows `status: "degraded"`, `redis: "disconnected"`

### During Runtime
1. Request comes in
2. Idempotency check attempts to use Redis
3. If Redis is unavailable:
   - Logs warning: "Redis unavailable, allowing request (idempotency disabled)"
   - Request proceeds as if it's new (no duplicate check)
   - Request is published to Kafka normally
   - Returns HTTP 202 (success)

### Health Check
- `/health` endpoint shows:
  ```json
  {
    "status": "degraded",
    "checks": {
      "redis": "disconnected",
      "kafka": "connected"
    }
  }
  ```

---

## Trade-offs

### ✅ Benefits
1. **High Availability**: Service remains operational during Redis outages
2. **No Service Outage**: Requests are not rejected due to Redis unavailability
3. **Automatic Recovery**: When Redis comes back, idempotency automatically resumes
4. **Clear Monitoring**: Health check clearly shows degraded state

### ⚠️ Trade-offs
1. **Duplicate Requests**: When Redis is down, duplicate requests may be processed
   - This is acceptable for most notification use cases
   - Duplicate notifications are usually harmless
2. **No Idempotency Protection**: Cannot prevent duplicate processing during outages
   - Clients should implement their own idempotency if needed
   - Or retry logic should be idempotent

---

## Monitoring Recommendations

1. **Alert on Degraded Status**: Monitor health endpoint for `status: "degraded"`
2. **Log Monitoring**: Watch for "Redis unavailable" warnings
3. **Redis Uptime**: Track Redis connection status over time
4. **Duplicate Detection**: Monitor for duplicate notifications (if critical)

---

## Recovery

When Redis becomes available again:
1. Redis adapter automatically attempts reconnection (exponential backoff)
2. Once connected, `isConnected` flag is set to `true`
3. Idempotency immediately resumes working
4. Health check shows `status: "healthy"` again

**No service restart required!**

---

## Testing Scenarios

### Test 1: Redis Down at Startup
1. Stop Redis
2. Start service
3. ✅ Service should start successfully
4. ✅ Health check shows "degraded"
5. ✅ Requests should succeed

### Test 2: Redis Goes Down During Runtime
1. Start service with Redis running
2. Stop Redis
3. Send notification request
4. ✅ Request should succeed
5. ✅ Warning logged about Redis unavailability
6. ✅ Duplicate requests may be processed

### Test 3: Redis Recovery
1. Service running without Redis
2. Start Redis
3. ✅ Service should automatically reconnect
4. ✅ Idempotency should resume
5. ✅ Health check shows "healthy"

---

## Configuration

No configuration changes needed. The improvements are automatic and work with existing Redis configuration.

---

**Date**: 2026-02-10
**Status**: Implemented and tested
