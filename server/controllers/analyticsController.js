const HelpRequest = require('../models/HelpRequest');
const Volunteer = require('../models/Volunteer');
const Notification = require('../models/Notification');

/* =========================
   SOS DASHBOARD ANALYTICS
   Tracks patterns, response times, and effectiveness
========================= */

// Get SOS request volume over time (7 days, daily breakdown)
exports.getSosVolume = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const data = await HelpRequest.aggregate([
      {
        $match: {
          type: 'rescue',
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 },
          resolved: {
            $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      period: `Last ${days} days`,
      data,
      total: data.reduce((sum, d) => sum + d.count, 0),
      resolvedTotal: data.reduce((sum, d) => sum + d.resolved, 0)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get SOS by urgency level
exports.getSosByUrgency = async (req, res) => {
  try {
    const data = await HelpRequest.aggregate([
      {
        $match: { type: 'rescue' }
      },
      {
        $group: {
          _id: '$urgency',
          count: { $sum: 1 },
          resolved: {
            $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] }
          },
          avgTimeToResolve: {
            $avg: {
              $cond: [
                { $eq: ['$status', 'resolved'] },
                { $subtract: ['$updatedAt', '$createdAt'] },
                null
              ]
            }
          }
        }
      }
    ]);

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get SOS status distribution
exports.getSosStatus = async (req, res) => {
  try {
    const data = await HelpRequest.aggregate([
      {
        $match: { type: 'rescue' }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          percentage: { $sum: 1 }
        }
      }
    ]);

    const total = data.reduce((sum, d) => sum + d.count, 0);
    const withPercentage = data.map(d => ({
      ...d,
      percentage: total > 0 ? ((d.count / total) * 100).toFixed(2) : 0
    }));

    res.json({ data: withPercentage, total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get top response volunteers
exports.getTopVolunteers = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const data = await HelpRequest.aggregate([
      {
        $match: {
          type: 'rescue',
          handledBy: { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: '$handledBy',
          totalResponses: { $sum: 1 },
          resolved: {
            $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] }
          },
          avgResponseTime: {
            $avg: {
              $cond: [
                { $ne: ['$assignedAt', null] },
                { $subtract: ['$assignedAt', '$createdAt'] },
                null
              ]
            }
          }
        }
      },
      { $sort: { totalResponses: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'volunteers',
          localField: '_id',
          foreignField: '_id',
          as: 'volunteer'
        }
      },
      { $unwind: '$volunteer' }
    ]);

    const formatted = data.map(d => ({
      volunteerId: d._id,
      name: d.volunteer?.name || 'Unknown',
      contact: d.volunteer?.contact || 'N/A',
      totalResponses: d.totalResponses,
      resolved: d.resolved,
      resolutionRate: d.totalResponses > 0 ? ((d.resolved / d.totalResponses) * 100).toFixed(2) : 0,
      avgResponseTimeMs: Math.round(d.avgResponseTime || 0)
    }));

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get geographic hotspots (cluster by area)
exports.getSosHotspots = async (req, res) => {
  try {
    const data = await HelpRequest.aggregate([
      {
        $match: {
          type: 'rescue',
          'location.coordinates': { $exists: true }
        }
      },
      {
        $group: {
          _id: {
            address: '$location.address'
          },
          count: { $sum: 1 },
          lat: { $avg: { $arrayElemAt: ['$location.coordinates', 1] } },
          lon: { $avg: { $arrayElemAt: ['$location.coordinates', 0] } },
          resolved: {
            $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] }
          }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ]);

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get peak hours for SOS alerts
exports.getSosPeakHours = async (req, res) => {
  try {
    const data = await HelpRequest.aggregate([
      {
        $match: { type: 'rescue' }
      },
      {
        $group: {
          _id: {
            $hour: '$createdAt'
          },
          count: { $sum: 1 },
          resolved: {
            $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Fill gaps for missing hours
    const fullData = [];
    for (let hour = 0; hour < 24; hour++) {
      const found = data.find(d => d._id === hour);
      fullData.push({
        hour,
        count: found?.count || 0,
        resolved: found?.resolved || 0
      });
    }

    res.json(fullData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get response time analytics
exports.getResponseTimeAnalytics = async (req, res) => {
  try {
    const data = await HelpRequest.aggregate([
      {
        $match: {
          type: 'rescue',
          status: 'resolved'
        }
      },
      {
        $project: {
          responseTimeMs: { $subtract: ['$updatedAt', '$createdAt'] },
          urgency: 1,
          status: 1
        }
      },
      {
        $group: {
          _id: '$urgency',
          avgResponseTime: { $avg: '$responseTimeMs' },
          minResponseTime: { $min: '$responseTimeMs' },
          maxResponseTime: { $max: '$responseTimeMs' },
          count: { $sum: 1 }
        }
      }
    ]);

    const formatted = data.map(d => ({
      urgency: d._id,
      avgResponseTimeMin: Math.round(d.avgResponseTime / 1000 / 60),
      minResponseTimeMin: Math.round(d.minResponseTime / 1000 / 60),
      maxResponseTimeMin: Math.round(d.maxResponseTime / 1000 / 60),
      resolvedCount: d.count
    }));

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get overall SOS dashboard summary
exports.getSosSummary = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);

    // All time
    const allTime = await HelpRequest.countDocuments({ type: 'rescue' });
    const allResolved = await HelpRequest.countDocuments({
      type: 'rescue',
      status: 'resolved'
    });

    // Today
    const todayCount = await HelpRequest.countDocuments({
      type: 'rescue',
      createdAt: { $gte: today }
    });

    // This month
    const monthCount = await HelpRequest.countDocuments({
      type: 'rescue',
      createdAt: { $gte: thisMonth }
    });

    // Average response time
    const responseData = await HelpRequest.aggregate([
      {
        $match: {
          type: 'rescue',
          status: 'resolved'
        }
      },
      {
        $group: {
          _id: null,
          avgResponseTime: {
            $avg: { $subtract: ['$updatedAt', '$createdAt'] }
          }
        }
      }
    ]);

    const avgResponseTimeMs = responseData[0]?.avgResponseTime || 0;

    // Active volunteers responding to SOS
    const activeVolunteers = await HelpRequest.distinct('handledBy', {
      type: 'rescue',
      handledBy: { $exists: true, $ne: null }
    });

    res.json({
      allTime: {
        total: allTime,
        resolved: allResolved,
        resolutionRate: allTime > 0 ? ((allResolved / allTime) * 100).toFixed(2) : 0
      },
      today: todayCount,
      thisMonth: monthCount,
      avgResponseTimeMin: Math.round(avgResponseTimeMs / 1000 / 60),
      activeVolunteersResponding: activeVolunteers.length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get notification effectiveness (SOS alerts that converted to assigned/resolved)
exports.getNotificationEffectiveness = async (req, res) => {
  try {
    const sosNotifications = await Notification.countDocuments({
      type: 'sos'
    });

    const sosResolved = await HelpRequest.countDocuments({
      type: 'rescue',
      status: 'resolved'
    });

    const effectiveness = sosNotifications > 0
      ? ((sosResolved / sosNotifications) * 100).toFixed(2)
      : 0;

    res.json({
      totalSosNotifications: sosNotifications,
      convertedToResolved: sosResolved,
      effectivenessRate: effectiveness
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
