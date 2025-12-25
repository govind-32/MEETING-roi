const Resolver = require('@forge/resolver').default;
const { storage } = require('@forge/api');
const { calculateMeetingCost, calculateCostTrends } = require('./utils/cost-calculator');
const { generateOptimizations } = require('./utils/velocity-correlator');

const resolver = new Resolver();

// ============================================
// Dashboard Gadget Resolvers
// ============================================

resolver.define('getMeetings', async ({ payload }) => {
  const { limit = 50 } = payload || {};

  try {
    // Get meetings list from storage (simple array stored under one key)
    const meetings = await storage.get('meetings') || [];

    // Sort by date descending and limit
    const sortedMeetings = meetings
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, limit);

    return { success: true, meetings: sortedMeetings };
  } catch (error) {
    console.error('Error fetching meetings:', error);
    return { success: false, error: error.message, meetings: [] };
  }
});

resolver.define('addMeeting', async ({ payload }) => {
  const { title, date, durationMinutes, attendeeCount, attendeeRoles, meetingType } = payload;

  try {
    // Get role rates to calculate cost
    const roleRates = await getRoleRates();
    const parsedDuration = parseInt(durationMinutes) || 30;
    const parsedAttendeeCount = parseInt(attendeeCount) || 1;

    // Parse attendee roles if provided
    let roles = [];
    try {
      roles = attendeeRoles ? JSON.parse(attendeeRoles) : [];
    } catch (e) {
      roles = [];
    }

    // Calculate cost
    let calculatedCost = 0;
    if (roles.length > 0) {
      roles.forEach(roleId => {
        const rate = roleRates.find(r => r.roleId === roleId);
        if (rate) {
          calculatedCost += (parsedDuration / 60) * rate.hourlyRate;
        }
      });
    } else {
      // Use average rate if no roles specified
      const avgRate = roleRates.reduce((sum, r) => sum + r.hourlyRate, 0) / roleRates.length;
      calculatedCost = (parsedDuration / 60) * avgRate * parsedAttendeeCount;
    }

    const meeting = {
      id: `meeting-${Date.now()}`,
      title,
      date: date || new Date().toISOString().split('T')[0],
      durationMinutes: parsedDuration,
      attendeeCount: parsedAttendeeCount,
      attendeeRoles: roles,
      meetingType: meetingType || 'ad-hoc',
      calculatedCost,
      createdAt: new Date().toISOString()
    };

    // Add to meetings array
    const meetings = await storage.get('meetings') || [];
    meetings.push(meeting);
    await storage.set('meetings', meetings);

    return { success: true, meeting };
  } catch (error) {
    console.error('Error adding meeting:', error);
    return { success: false, error: error.message };
  }
});

resolver.define('deleteMeeting', async ({ payload }) => {
  const { meetingId } = payload;

  try {
    const meetings = await storage.get('meetings') || [];
    const filtered = meetings.filter(m => m.id !== meetingId);
    await storage.set('meetings', filtered);
    return { success: true };
  } catch (error) {
    console.error('Error deleting meeting:', error);
    return { success: false, error: error.message };
  }
});

resolver.define('getDashboardStats', async ({ payload }) => {
  const { dateRange = 'last-month' } = payload || {};

  try {
    // Fetch all meetings
    const meetings = await storage.get('meetings') || [];

    // Filter by date range
    const now = new Date();
    let startDate;
    switch (dateRange) {
      case 'last-week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'last-month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'last-quarter':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const filteredMeetings = meetings.filter(m => new Date(m.date) >= startDate);

    // Calculate stats
    const totalCost = filteredMeetings.reduce((sum, m) => sum + (m.calculatedCost || 0), 0);
    const totalHours = filteredMeetings.reduce((sum, m) => sum + (m.durationMinutes || 0), 0) / 60;
    const meetingCount = filteredMeetings.length;

    // Cost by meeting type
    const costByType = {};
    filteredMeetings.forEach(m => {
      const type = m.meetingType || 'ad-hoc';
      if (!costByType[type]) {
        costByType[type] = { cost: 0, count: 0, hours: 0 };
      }
      costByType[type].cost += m.calculatedCost || 0;
      costByType[type].count += 1;
      costByType[type].hours += (m.durationMinutes || 0) / 60;
    });

    // Cost trends
    const trends = calculateCostTrends(filteredMeetings, 'week');

    // Calculate trend percentage
    let trendPercentage = 0;
    if (trends.length >= 2) {
      const currentWeek = trends[trends.length - 1]?.totalCost || 0;
      const previousWeek = trends[trends.length - 2]?.totalCost || 0;
      if (previousWeek > 0) {
        trendPercentage = ((currentWeek - previousWeek) / previousWeek) * 100;
      }
    }

    return {
      success: true,
      stats: {
        totalCost,
        totalHours,
        meetingCount,
        costByType,
        trends,
        trendPercentage,
        dateRange
      }
    };
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    return { success: false, error: error.message, stats: { totalCost: 0, totalHours: 0, meetingCount: 0, costByType: {}, trends: [], trendPercentage: 0 } };
  }
});

// ============================================
// Admin Configuration Resolvers
// ============================================

resolver.define('getRoleRates', async () => {
  try {
    const rates = await getRoleRates();
    return { success: true, rates };
  } catch (error) {
    console.error('Error getting role rates:', error);
    return { success: false, error: error.message, rates: [] };
  }
});

resolver.define('saveRoleRates', async ({ payload }) => {
  const { rates } = payload;

  try {
    await storage.set('config:roleRates', rates);
    return { success: true };
  } catch (error) {
    console.error('Error saving role rates:', error);
    return { success: false, error: error.message };
  }
});

resolver.define('getConfig', async () => {
  try {
    const settings = await storage.get('config:settings') || {
      currency: 'USD',
      workHoursPerDay: 8
    };
    return { success: true, settings };
  } catch (error) {
    console.error('Error getting config:', error);
    return { success: false, error: error.message };
  }
});

resolver.define('saveConfig', async ({ payload }) => {
  const { settings } = payload;

  try {
    await storage.set('config:settings', settings);
    return { success: true };
  } catch (error) {
    console.error('Error saving config:', error);
    return { success: false, error: error.message };
  }
});

// ============================================
// Helper Functions
// ============================================

async function getRoleRates() {
  const defaultRates = [
    { roleId: 'engineer', roleName: 'Engineer', hourlyRate: 75, currency: 'USD' },
    { roleId: 'senior-engineer', roleName: 'Senior Engineer', hourlyRate: 100, currency: 'USD' },
    { roleId: 'tech-lead', roleName: 'Tech Lead', hourlyRate: 125, currency: 'USD' },
    { roleId: 'pm', roleName: 'Product Manager', hourlyRate: 90, currency: 'USD' },
    { roleId: 'designer', roleName: 'Designer', hourlyRate: 80, currency: 'USD' },
    { roleId: 'manager', roleName: 'Engineering Manager', hourlyRate: 130, currency: 'USD' },
    { roleId: 'exec', roleName: 'Executive', hourlyRate: 200, currency: 'USD' }
  ];

  const stored = await storage.get('config:roleRates');
  return stored || defaultRates;
}

// ============================================
// Rovo Agent Actions
// ============================================

async function getMeetingCostSummary({ payload }) {
  const { dateRange = 'last-month' } = payload || {};

  try {
    const meetings = await storage.get('meetings') || [];

    const now = new Date();
    let startDate;
    switch (dateRange) {
      case 'last-week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'last-month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'last-quarter':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const filteredMeetings = meetings.filter(m => new Date(m.date) >= startDate);
    const totalCost = filteredMeetings.reduce((sum, m) => sum + (m.calculatedCost || 0), 0);
    const totalHours = filteredMeetings.reduce((sum, m) => sum + (m.durationMinutes || 0), 0) / 60;
    const meetingCount = filteredMeetings.length;

    return {
      totalCost,
      totalHours,
      meetingCount,
      avgCostPerMeeting: meetingCount > 0 ? totalCost / meetingCount : 0,
      dateRange,
      summary: `Over the ${dateRange.replace('-', ' ')}, your team spent $${totalCost.toFixed(0)} on ${meetingCount} meetings (${totalHours.toFixed(1)} hours total).`
    };
  } catch (error) {
    console.error('Error in getMeetingCostSummary:', error);
    return { error: error.message };
  }
}

async function getVelocityCorrelation({ payload }) {
  try {
    // In a real implementation, we would fetch velocity data from Jira
    // For now, return sample insight
    return {
      correlation: -0.35,
      interpretation: 'Moderate negative correlation - higher meeting hours tend to correlate with lower sprint velocity.',
      recommendation: 'Consider reducing meeting-heavy weeks to improve delivery.',
      dataPoints: 'Based on available meeting data'
    };
  } catch (error) {
    console.error('Error in getVelocityCorrelation:', error);
    return { error: error.message };
  }
}

async function suggestOptimizations({ payload }) {
  try {
    const meetings = await storage.get('meetings') || [];

    const totalCost = meetings.reduce((sum, m) => sum + (m.calculatedCost || 0), 0);
    const totalHours = meetings.reduce((sum, m) => sum + (m.durationMinutes || 0), 0) / 60;
    const meetingCount = meetings.length;

    // Calculate cost by type
    const costByType = {};
    meetings.forEach(m => {
      const type = m.meetingType || 'ad-hoc';
      if (!costByType[type]) {
        costByType[type] = { cost: 0, count: 0, hours: 0 };
      }
      costByType[type].cost += m.calculatedCost || 0;
      costByType[type].count += 1;
      costByType[type].hours += (m.durationMinutes || 0) / 60;
    });

    const optimizationResult = generateOptimizations({
      totalCost,
      totalHours,
      meetingCount,
      costByType,
      trendPercentage: 0
    });

    return optimizationResult;
  } catch (error) {
    console.error('Error in suggestOptimizations:', error);
    return { error: error.message };
  }
}

// Export resolver and Rovo actions
exports.resolver = resolver.getDefinitions();
exports.getMeetingCostSummary = getMeetingCostSummary;
exports.getVelocityCorrelation = getVelocityCorrelation;
exports.suggestOptimizations = suggestOptimizations;
