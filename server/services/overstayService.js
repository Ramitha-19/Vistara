const Visit = require('../models/Visit');
const Notification = require('../models/Notification');
const SystemConfig = require('../models/SystemConfig');
const User = require('../models/User');

/**
 * Intelligent Server-side Overstay Detection Job
 * Evaluates all currently checked-in visitors against their scheduled departure + grace period.
 */
async function checkOverstays() {
  try {
    // 1. Fetch system config for grace period
    let config = await SystemConfig.findOne({ key: 'main_config' });
    const graceMinutes = config ? config.overstayGracePeriodMinutes : (parseInt(process.env.OVERSTAY_GRACE_PERIOD_MINUTES, 10) || 15);

    // 2. Find all visits currently 'CheckedIn'
    const activeVisits = await Visit.find({ status: 'CheckedIn' }).populate('host', 'name email');
    const now = new Date();

    for (const visit of activeVisits) {
      if (!visit.visitDate || !visit.expectedDeparture) continue;

      // Parse expected departure as a real Date object in local time
      // format: visitDate "YYYY-MM-DD", expectedDeparture "HH:mm"
      const [year, month, day] = visit.visitDate.split('-').map(Number);
      const [hours, minutes] = visit.expectedDeparture.split(':').map(Number);

      const departureDate = new Date(year, month - 1, day, hours, minutes, 0);

      // Add grace period
      const thresholdDate = new Date(departureDate.getTime() + graceMinutes * 60 * 1000);

      if (now > thresholdDate) {
        const diffMs = now.getTime() - departureDate.getTime();
        const overdueMinutes = Math.floor(diffMs / (60 * 1000));

        const wasAlreadyOverdue = visit.isOverdue;
        visit.isOverdue = true;
        visit.overdueMinutes = overdueMinutes;
        await visit.save();

        // If newly detected as overdue, generate alert notifications for Security, Receptionists, Admins, and Host
        if (!wasAlreadyOverdue) {
          console.log(`⚠️ [OVERSTAY ALERT] Visitor "${visit.visitorName}" (Ref: ${visit.referenceNumber}) is overstayed by ${overdueMinutes} mins.`);

          const alertRecipients = await User.find({
            role: { $in: ['admin', 'receptionist', 'security'] },
            isActive: true,
          }).select('_id');

          const notificationsToInsert = alertRecipients.map((recipient) => ({
            recipient: recipient._id,
            title: `OVERDUE VISITOR: ${visit.visitorName}`,
            message: `${visit.visitorName} was expected to leave at ${visit.expectedDeparture}. Currently overdue by ${overdueMinutes} minutes.`,
            type: 'overstay_alert',
            visit: visit._id,
          }));

          if (visit.host && visit.host._id) {
            notificationsToInsert.push({
              recipient: visit.host._id,
              title: `Your Visitor Has Overstayed: ${visit.visitorName}`,
              message: `Your visitor ${visit.visitorName} from ${visit.organization} was expected to leave at ${visit.expectedDeparture}. Overdue by ${overdueMinutes} minutes.`,
              type: 'overstay_alert',
              visit: visit._id,
            });
          }

          if (notificationsToInsert.length > 0) {
            await Notification.insertMany(notificationsToInsert);
          }
        }
      } else {
        // If not overdue (e.g. grace period adjusted)
        if (visit.isOverdue) {
          visit.isOverdue = false;
          visit.overdueMinutes = 0;
          await visit.save();
        }
      }
    }
  } catch (err) {
    console.error('Error during overstay detection job:', err.message);
  }
}

function startOverstayScheduler(intervalMs = 30000) {
  console.log(`⏰ Initializing Intelligent Overstay Engine (Runs every ${intervalMs / 1000}s)...`);
  checkOverstays();
  return setInterval(checkOverstays, intervalMs);
}

module.exports = { checkOverstays, startOverstayScheduler };
