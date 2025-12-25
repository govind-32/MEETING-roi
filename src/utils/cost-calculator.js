/**
 * Meeting Cost Calculator Utilities
 * Calculates meeting costs based on attendee roles and hourly rates
 */

/**
 * Calculate the total cost of a meeting
 * @param {Object} meeting - Meeting details
 * @param {Array} roleRates - Array of role hourly rates
 * @returns {Object} Cost breakdown
 */
function calculateMeetingCost(meeting, roleRates) {
    const { durationMinutes, attendeeRoles, attendeeCount } = meeting;

    let totalCost = 0;
    const breakdown = [];

    // Parse attendee roles if it's a string
    let roles = [];
    try {
        roles = typeof attendeeRoles === 'string' ? JSON.parse(attendeeRoles) : attendeeRoles || [];
    } catch (e) {
        roles = [];
    }

    if (roles.length > 0) {
        // Calculate based on specific roles
        for (const roleId of roles) {
            const rate = roleRates.find(r => r.roleId === roleId);
            if (rate) {
                const cost = (durationMinutes / 60) * rate.hourlyRate;
                totalCost += cost;
                breakdown.push({
                    role: rate.roleName,
                    roleId: rate.roleId,
                    hourlyRate: rate.hourlyRate,
                    hours: durationMinutes / 60,
                    cost
                });
            }
        }
    } else if (attendeeCount) {
        // Fallback: use average rate if no specific roles provided
        const avgRate = roleRates.reduce((sum, r) => sum + r.hourlyRate, 0) / roleRates.length;
        totalCost = (durationMinutes / 60) * avgRate * attendeeCount;
        breakdown.push({
            role: 'Average (estimated)',
            hourlyRate: avgRate,
            attendeeCount,
            hours: durationMinutes / 60,
            cost: totalCost
        });
    }

    return {
        totalCost,
        breakdown,
        costPerMinute: durationMinutes > 0 ? totalCost / durationMinutes : 0,
        costPerHour: totalCost / (durationMinutes / 60 || 1),
        formattedCost: formatCurrency(totalCost)
    };
}

/**
 * Calculate meeting cost trends over time
 * @param {Array} meetings - Array of meetings
 * @param {string} groupBy - 'day', 'week', 'month'
 * @returns {Array} Trend data for charting
 */
function calculateCostTrends(meetings, groupBy = 'week') {
    if (!meetings || meetings.length === 0) {
        return [];
    }

    const grouped = groupMeetingsByPeriod(meetings, groupBy);

    return Object.entries(grouped)
        .map(([period, periodMeetings]) => ({
            period,
            totalCost: periodMeetings.reduce((sum, m) => sum + (m.calculatedCost || 0), 0),
            meetingCount: periodMeetings.length,
            totalHours: periodMeetings.reduce((sum, m) => sum + (m.durationMinutes || 0), 0) / 60,
            avgCostPerMeeting: periodMeetings.length > 0
                ? periodMeetings.reduce((sum, m) => sum + (m.calculatedCost || 0), 0) / periodMeetings.length
                : 0
        }))
        .sort((a, b) => a.period.localeCompare(b.period));
}

/**
 * Group meetings by time period
 */
function groupMeetingsByPeriod(meetings, groupBy) {
    const grouped = {};

    meetings.forEach(meeting => {
        const date = new Date(meeting.date);
        let key;

        switch (groupBy) {
            case 'day':
                key = date.toISOString().split('T')[0];
                break;
            case 'week':
                // Get ISO week
                const startOfYear = new Date(date.getFullYear(), 0, 1);
                const weekNum = Math.ceil(((date - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7);
                key = `${date.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
                break;
            case 'month':
                key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                break;
            default:
                key = date.toISOString().split('T')[0];
        }

        if (!grouped[key]) {
            grouped[key] = [];
        }
        grouped[key].push(meeting);
    });

    return grouped;
}

/**
 * Calculate meeting efficiency score (0-100)
 * Higher velocity per meeting hour = higher score
 */
function calculateEfficiencyScore(sprintSnapshots) {
    if (!sprintSnapshots || sprintSnapshots.length < 2) {
        return null;
    }

    // Calculate points delivered per meeting hour
    const efficiencies = sprintSnapshots
        .filter(s => s.totalMeetingHours > 0)
        .map(s => s.completedPoints / s.totalMeetingHours);

    if (efficiencies.length === 0) {
        return null;
    }

    const avgEfficiency = efficiencies.reduce((a, b) => a + b, 0) / efficiencies.length;
    const maxEfficiency = Math.max(...efficiencies);

    // Normalize to 0-100 scale
    return Math.round((avgEfficiency / maxEfficiency) * 100);
}

/**
 * Calculate cost savings potential
 */
function calculateSavingsPotential(meetings, targetReduction = 0.2) {
    const totalCost = meetings.reduce((sum, m) => sum + (m.calculatedCost || 0), 0);
    const totalHours = meetings.reduce((sum, m) => sum + (m.durationMinutes || 0), 0) / 60;

    return {
        currentMonthlyCost: totalCost,
        currentMonthlyHours: totalHours,
        potentialSavings: totalCost * targetReduction,
        potentialHoursSaved: totalHours * targetReduction,
        targetReductionPercent: targetReduction * 100
    };
}

/**
 * Format currency
 */
function formatCurrency(amount, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency
    }).format(amount);
}

module.exports = {
    calculateMeetingCost,
    calculateCostTrends,
    calculateEfficiencyScore,
    calculateSavingsPotential,
    groupMeetingsByPeriod,
    formatCurrency
};
