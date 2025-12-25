import { invoke } from '@forge/bridge';

async function init() {
    console.log('Confluence macro initializing...');

    try {
        const result = await invoke('getDashboardStats', { dateRange: 'last-month' });
        console.log('getDashboardStats:', result);

        if (result && result.success && result.stats) {
            const stats = result.stats;

            document.getElementById('total-cost').textContent = formatCurrency(stats.totalCost || 0);
            document.getElementById('total-hours').textContent = (stats.totalHours || 0).toFixed(1) + 'h';
            document.getElementById('meeting-count').textContent = stats.meetingCount || 0;
            document.getElementById('avg-cost').textContent = formatCurrency(
                stats.totalHours > 0 ? stats.totalCost / stats.totalHours : 0
            );

            // Hide loading, show content
            document.getElementById('loading').classList.add('hidden');
            document.getElementById('content').classList.remove('hidden');
        } else {
            showEmpty();
        }
    } catch (error) {
        console.error('Error loading stats:', error);
        showEmpty();
    }
}

function showEmpty() {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('content').classList.remove('hidden');
    document.getElementById('total-cost').textContent = '$0';
    document.getElementById('total-hours').textContent = '0h';
    document.getElementById('meeting-count').textContent = '0';
    document.getElementById('avg-cost').textContent = '$0';
}

function formatCurrency(n) {
    return '$' + Math.round(n || 0).toLocaleString();
}

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
