/**
 * Velocity Correlator Utilities
 * Analyzes relationship between meeting hours and sprint velocity
 */

/**
 * Calculate Pearson correlation between meeting hours and velocity
 * @param {Array} sprintSnapshots - Sprint data with meeting hours and velocity
 * @returns {number} Correlation coefficient (-1 to 1)
 */
function calculateCorrelation(sprintSnapshots) {
    const n = sprintSnapshots.length;
    if (n < 3) {
        return 0;
    }

    const meetingHours = sprintSnapshots.map(s => s.totalMeetingHours || 0);
    const velocities = sprintSnapshots.map(s => s.completedPoints || 0);

    const sumX = meetingHours.reduce((a, b) => a + b, 0);
    const sumY = velocities.reduce((a, b) => a + b, 0);
    const sumXY = meetingHours.reduce((sum, x, i) => sum + x * velocities[i], 0);
    const sumX2 = meetingHours.reduce((sum, x) => sum + x * x, 0);
    const sumY2 = velocities.reduce((sum, y) => sum + y * y, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX ** 2) * (n * sumY2 - sumY ** 2));

    if (denominator === 0) {
        return 0;
    }

    return numerator / denominator;
}

/**
 * Generate optimization suggestions based on meeting stats
 * @param {Object} stats - Meeting statistics
 * @returns {Array} List of optimization suggestions
 */
function generateOptimizations(stats) {
    const suggestions = [];

    const { totalCost, totalHours, meetingCount, costByType = {}, trendPercentage } = stats;

    // Check trend
    if (trendPercentage > 10) {
        suggestions.push({
            priority: 'high',
            category: 'cost-trend',
            title: 'Meeting costs are increasing',
            description: `Meeting costs have increased by ${trendPercentage.toFixed(1)}% compared to the previous period. Consider auditing recurring meetings.`,
            potentialSavings: totalCost * 0.1
        });
    }

    // Check standup efficiency
    if (costByType.standup) {
        const standupData = costByType.standup;
        const avgStandupDuration = (standupData.hours / standupData.count) * 60;
        if (avgStandupDuration > 15) {
            suggestions.push({
                priority: 'medium',
                category: 'standup',
                title: 'Standups are running long',
                description: `Average standup duration is ${avgStandupDuration.toFixed(0)} minutes. Consider async standups or stricter time-boxing to 15 minutes.`,
                potentialSavings: standupData.cost * 0.3
            });
        }
    }

    // Check for too many ad-hoc meetings
    if (costByType['ad-hoc']) {
        const adHocData = costByType['ad-hoc'];
        const adHocPercentage = (adHocData.cost / totalCost) * 100;
        if (adHocPercentage > 30) {
            suggestions.push({
                priority: 'high',
                category: 'ad-hoc',
                title: 'High ad-hoc meeting cost',
                description: `Ad-hoc meetings account for ${adHocPercentage.toFixed(0)}% of meeting costs. Consider better async communication or scheduled office hours.`,
                potentialSavings: adHocData.cost * 0.4
            });
        }
    }

    // Check average meeting hours per day
    const avgHoursPerDay = totalHours / 20; // Assuming ~20 working days
    if (avgHoursPerDay > 3) {
        suggestions.push({
            priority: 'high',
            category: 'time-spent',
            title: 'High meeting load',
            description: `Team averages ${avgHoursPerDay.toFixed(1)} hours/day in meetings. This leaves limited time for deep work. Consider "No Meeting Days" or meeting-free morning blocks.`,
            potentialSavings: totalCost * 0.2
        });
    }

    // General suggestions based on total cost
    if (totalCost > 10000) {
        suggestions.push({
            priority: 'medium',
            category: 'general',
            title: 'Review recurring meetings',
            description: 'Conduct a quarterly audit of recurring meetings. Many recurring meetings continue long after their original purpose is fulfilled.',
            potentialSavings: totalCost * 0.15
        });
    }

    // Suggest attendance reduction
    if (meetingCount > 30) {
        suggestions.push({
            priority: 'low',
            category: 'attendance',
            title: 'Consider optional attendees',
            description: 'Mark some meeting attendees as optional and encourage them to skip if not directly needed. Fewer attendees = lower cost per meeting.',
            potentialSavings: totalCost * 0.1
        });
    }

    // Sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    suggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    // Calculate total potential savings
    const totalPotentialSavings = suggestions.reduce((sum, s) => sum + (s.potentialSavings || 0), 0);

    return {
        suggestions,
        totalPotentialSavings,
        summary: `Found ${suggestions.length} optimization opportunities with potential savings of $${totalPotentialSavings.toFixed(0)}/month.`
    };
}

/**
 * Calculate sprint efficiency metrics
 */
function calculateSprintEfficiency(sprintSnapshot) {
    const { completedPoints, totalMeetingHours, totalMeetingCost } = sprintSnapshot;

    if (!totalMeetingHours || totalMeetingHours === 0) {
        return {
            pointsPerMeetingHour: null,
            costPerPoint: null,
            efficiency: 'unknown'
        };
    }

    const pointsPerMeetingHour = completedPoints / totalMeetingHours;
    const costPerPoint = totalMeetingCost / completedPoints;

    let efficiency = 'normal';
    if (pointsPerMeetingHour > 3) {
        efficiency = 'excellent';
    } else if (pointsPerMeetingHour > 2) {
        efficiency = 'good';
    } else if (pointsPerMeetingHour < 1) {
        efficiency = 'poor';
    }

    return {
        pointsPerMeetingHour,
        costPerPoint,
        efficiency
    };
}

/**
 * Compare sprints to find outliers
 */
function findSprintOutliers(sprintSnapshots) {
    if (sprintSnapshots.length < 3) {
        return { best: null, worst: null };
    }

    const sorted = [...sprintSnapshots]
        .filter(s => s.totalMeetingHours > 0 && s.completedPoints > 0)
        .map(s => ({
            ...s,
            efficiency: s.completedPoints / s.totalMeetingHours
        }))
        .sort((a, b) => b.efficiency - a.efficiency);

    return {
        best: sorted[0] || null,
        worst: sorted[sorted.length - 1] || null,
        median: sorted[Math.floor(sorted.length / 2)] || null
    };
}

module.exports = {
    calculateCorrelation,
    generateOptimizations,
    calculateSprintEfficiency,
    findSprintOutliers
};
