const Visit = require('../models/Visit');
const User = require('../models/User');
const { checkOverstays } = require('../services/overstayService');

// @desc    Get comprehensive dashboard metrics
// @route   GET /api/dashboard/stats
// @access  Private
exports.getDashboardStats = async (req, res) => {
  try {
    await checkOverstays();

    const todayStr = new Date().toISOString().slice(0, 10);
    const role = req.user.role;
    const userId = req.user._id;

    // Role-specific base query
    let baseQuery = {};
    if (role === 'host') {
      baseQuery.host = userId;
    }

    // 1. KPI Counts
    const totalTodayPromise = Visit.countDocuments({ ...baseQuery, visitDate: todayStr });
    const pendingCountPromise = Visit.countDocuments({ ...baseQuery, status: 'Pending' });
    const checkedInCountPromise = Visit.countDocuments({ ...baseQuery, status: 'CheckedIn' });
    const completedTodayPromise = Visit.countDocuments({ ...baseQuery, status: 'CheckedOut', visitDate: todayStr });
    const activeOverstaysPromise = Visit.countDocuments({ ...baseQuery, status: 'CheckedIn', isOverdue: true });
    const approvedUpcomingPromise = Visit.countDocuments({ ...baseQuery, status: 'Approved', visitDate: { $gte: todayStr } });

    const [totalToday, pendingCount, checkedInCount, completedToday, activeOverstays, approvedUpcoming] =
      await Promise.all([
        totalTodayPromise,
        pendingCountPromise,
        checkedInCountPromise,
        completedTodayPromise,
        activeOverstaysPromise,
        approvedUpcomingPromise,
      ]);

    // 2. Visits breakdown by Organization (Top 5)
    const orgBreakdown = await Visit.aggregate([
      { $match: baseQuery },
      { $group: { _id: '$organization', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    // 3. Visits breakdown by Purpose (Top 5)
    const purposeBreakdown = await Visit.aggregate([
      { $match: baseQuery },
      { $group: { _id: '$purpose', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    // 4. Past 7 days trend
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().slice(0, 10);

    const trendBreakdown = await Visit.aggregate([
      {
        $match: {
          ...baseQuery,
          visitDate: { $gte: sevenDaysAgoStr },
        },
      },
      {
        $group: {
          _id: '$visitDate',
          total: { $sum: 1 },
          checkedIn: {
            $sum: { $cond: [{ $in: ['$status', ['CheckedIn', 'CheckedOut']] }, 1, 0] },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // 5. Recent Activity Feed
    const recentVisits = await Visit.find(baseQuery)
      .populate('host', 'name department')
      .sort({ updatedAt: -1 })
      .limit(6);

    res.status(200).json({
      success: true,
      stats: {
        totalToday,
        pendingCount,
        checkedInCount,
        completedToday,
        activeOverstays,
        approvedUpcoming,
        orgBreakdown,
        purposeBreakdown,
        trendBreakdown,
        recentVisits,
      },
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving dashboard statistics.' });
  }
};
