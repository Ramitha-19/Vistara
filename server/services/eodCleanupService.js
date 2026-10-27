const Visit = require('../models/Visit');
const SystemConfig = require('../models/SystemConfig');
const AuditLog = require('../models/AuditLog');

/**
 * End-of-Day Cleanup Service
 * Automatically removes completed 'CheckedOut' visitors from the active dashboard roster.
 * IMPORTANT: Genuine records are NEVER deleted from MongoDB! They remain preserved forever for reports.
 * Overdue visitors and visitors with pending checkout requests are strictly KEPT active until resolved.
 */
async function performEodCleanup(force = false) {
  try {
    const config = await SystemConfig.findOne({ key: 'main_config' });
    const timezone = (config && config.timezone) || 'Asia/Kolkata';
    const eodHour = (config && typeof config.eodCleanupHour === 'number') ? config.eodCleanupHour : 23;

    const now = new Date();
    // Format local date and hour according to configured timezone
    const localHourStr = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      hour12: false,
    }).format(now);
    const localHour = parseInt(localHourStr, 10);

    const localDateStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now);

    // If not forced and not within the configured EOD cleanup window (or past it), skip
    if (!force && localHour < eodHour) {
      return { cleanedCount: 0, reason: `Cleanup scheduled for ${eodHour}:00 local time (${timezone}). Current hour: ${localHour}` };
    }

    // Query completed CheckedOut visits that:
    // 1. Have status: 'CheckedOut'
    // 2. Are not yet archived from active list
    // 3. Are NOT overdue
    // 4. Do NOT have a pending checkout request
    // 5. Either belong to today (or prior days)
    const filter = {
      status: 'CheckedOut',
      isArchivedFromActiveList: false,
      isOverdue: false,
      'checkoutRequest.status': { $ne: 'Pending' },
    };

    const eligibleVisits = await Visit.find(filter);

    if (eligibleVisits.length === 0) {
      return { cleanedCount: 0, reason: 'No completed visits waiting for active list cleanup.' };
    }

    const visitIds = eligibleVisits.map((v) => v._id);

    // Soft cleanup: mark as archived from active roster while preserving full historical document
    const result = await Visit.updateMany(
      { _id: { $in: visitIds } },
      {
        $set: {
          isArchivedFromActiveList: true,
          archivedAt: new Date(),
        },
      }
    );

    console.log(`🧹 [EOD CLEANUP] Safely archived ${result.modifiedCount} completed visit(s) from active list for date ${localDateStr} (${timezone}). All MongoDB historical data preserved.`);

    await AuditLog.create({
      action: 'EOD_ACTIVE_LIST_CLEANUP',
      userRole: 'system',
      details: `Safely archived ${result.modifiedCount} completed CheckedOut visits from active dashboard roster for date ${localDateStr}. Historical records preserved.`,
      metadata: { cleanedCount: result.modifiedCount, localDate: localDateStr, timezone },
    });

    return {
      success: true,
      cleanedCount: result.modifiedCount,
      localDate: localDateStr,
      timezone,
    };
  } catch (err) {
    console.error('Error during EOD cleanup job:', err.message);
    return { success: false, error: err.message };
  }
}

function startEodScheduler(intervalMs = 60000) {
  console.log(`⏰ Initializing Safe End-of-Day Cleanup Scheduler (Checks every ${intervalMs / 1000}s)...`);
  // Run check periodically
  return setInterval(() => {
    performEodCleanup(false);
  }, intervalMs);
}

module.exports = { performEodCleanup, startEodScheduler };
