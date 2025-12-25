import { invoke } from '@forge/bridge';

// Role rates cache
let roleRates = [];

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Dashboard initializing...');

    try {
        // Load role rates first
        await loadRoleRates();
        console.log('Role rates loaded:', roleRates);

        // Load dashboard stats
        await loadDashboardStats();
        console.log('Dashboard stats loaded');

        // Load recent meetings
        await loadRecentMeetings();
        console.log('Meetings loaded');

        // Setup event listeners
        setupEventListeners();

        // Hide loading
        hideLoading();
        console.log('Dashboard ready');
    } catch (error) {
        console.error('Error initializing dashboard:', error);
        hideLoading();
        // Show empty state even on error
        updateEmptyState();
    }
});

// Update UI to show empty/ready state
function updateEmptyState() {
    document.getElementById('monthly-cost').textContent = '$0';
    document.getElementById('meeting-hours').textContent = '0h';
    document.getElementById('meeting-count').textContent = '0';
    document.getElementById('cost-per-hour').textContent = '$0';
    document.getElementById('type-bars').innerHTML = '<p class="empty-state">No data yet</p>';
    document.getElementById('meetings-list').innerHTML = '<p class="empty-state">No meetings logged yet. Click "Log Meeting" to add one.</p>';
}

// Load role rates for cost calculation
async function loadRoleRates() {
    try {
        const result = await invoke('getRoleRates');
        console.log('getRoleRates result:', result);

        if (result && result.success && result.rates) {
            roleRates = result.rates;
            populateRoleCheckboxes();
        } else {
            // Use default rates
            roleRates = [
                { roleId: 'engineer', roleName: 'Engineer', hourlyRate: 75 },
                { roleId: 'senior-engineer', roleName: 'Senior Engineer', hourlyRate: 100 },
                { roleId: 'pm', roleName: 'Product Manager', hourlyRate: 90 }
            ];
            populateRoleCheckboxes();
        }
    } catch (error) {
        console.error('Error loading role rates:', error);
        roleRates = [
            { roleId: 'engineer', roleName: 'Engineer', hourlyRate: 75 },
            { roleId: 'senior-engineer', roleName: 'Senior Engineer', hourlyRate: 100 }
        ];
        populateRoleCheckboxes();
    }
}

// Load dashboard statistics
async function loadDashboardStats() {
    try {
        const result = await invoke('getDashboardStats', { dateRange: 'last-month' });
        console.log('getDashboardStats result:', result);

        if (result && result.success && result.stats) {
            const { stats } = result;

            // Update metric cards
            document.getElementById('monthly-cost').textContent = formatCurrency(stats.totalCost || 0);
            document.getElementById('meeting-hours').textContent = `${(stats.totalHours || 0).toFixed(1)}h`;
            document.getElementById('meeting-count').textContent = stats.meetingCount || 0;

            const costPerHour = stats.totalHours > 0 ? stats.totalCost / stats.totalHours : 0;
            document.getElementById('cost-per-hour').textContent = formatCurrency(costPerHour);

            // Update trend indicator
            const trendEl = document.getElementById('cost-trend');
            if (stats.trendPercentage && stats.trendPercentage !== 0) {
                const isUp = stats.trendPercentage > 0;
                trendEl.textContent = `${isUp ? '↑' : '↓'} ${Math.abs(stats.trendPercentage).toFixed(1)}%`;
                trendEl.className = `metric-trend ${isUp ? 'up' : 'down'}`;
            }

            // Render type breakdown bars
            renderTypeBreakdown(stats.costByType || {});
        } else {
            updateEmptyState();
        }
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
        updateEmptyState();
    }
}

// Render type breakdown with CSS bars
function renderTypeBreakdown(costByType) {
    const container = document.getElementById('type-bars');

    if (!costByType || Object.keys(costByType).length === 0) {
        container.innerHTML = '<p class="empty-state">No data yet</p>';
        return;
    }

    const maxCost = Math.max(...Object.values(costByType).map(t => t.cost || 0));
    const colors = {
        'standup': '#00875A',
        'planning': '#0052CC',
        'retro': '#6554C0',
        'review': '#FF991F',
        'one-on-one': '#00B8D9',
        'team-sync': '#36B37E',
        'ad-hoc': '#97A0AF',
        'all-hands': '#FF5630',
        'interview': '#8777D9'
    };

    container.innerHTML = Object.entries(costByType)
        .sort((a, b) => (b[1].cost || 0) - (a[1].cost || 0))
        .map(([type, data]) => {
            const percentage = maxCost > 0 ? ((data.cost || 0) / maxCost) * 100 : 0;
            const color = colors[type] || '#6B778C';
            return `
        <div class="type-bar-item">
          <div class="type-bar-label">
            <span class="type-name">${formatMeetingType(type)}</span>
            <span class="type-cost">${formatCurrency(data.cost || 0)}</span>
          </div>
          <div class="type-bar-track">
            <div class="type-bar-fill" style="width: ${percentage}%; background: ${color};"></div>
          </div>
          <div class="type-bar-meta">${data.count || 0} meetings · ${(data.hours || 0).toFixed(1)}h</div>
        </div>
      `;
        }).join('');
}

// Load recent meetings
async function loadRecentMeetings() {
    try {
        const result = await invoke('getMeetings', { limit: 10 });
        console.log('getMeetings result:', result);

        const listEl = document.getElementById('meetings-list');

        if (result && result.success && result.meetings && result.meetings.length > 0) {
            listEl.innerHTML = result.meetings.map(meeting => `
        <div class="meeting-item" data-id="${meeting.id}">
          <div class="meeting-info">
            <span class="meeting-type-badge ${meeting.meetingType || 'ad-hoc'}">${formatMeetingType(meeting.meetingType)}</span>
            <div>
              <div class="meeting-title">${escapeHtml(meeting.title || 'Untitled')}</div>
              <div class="meeting-meta">${formatDate(meeting.date)} · ${meeting.durationMinutes || 0} min</div>
            </div>
          </div>
          <div class="meeting-actions">
            <span class="meeting-cost">${formatCurrency(meeting.calculatedCost || 0)}</span>
            <button class="btn-danger delete-meeting" data-id="${meeting.id}" title="Delete">🗑️</button>
          </div>
        </div>
      `).join('');

            // Add delete handlers
            document.querySelectorAll('.delete-meeting').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const meetingId = btn.dataset.id;
                    if (confirm('Delete this meeting?')) {
                        await deleteMeeting(meetingId);
                    }
                });
            });
        } else {
            listEl.innerHTML = '<p class="empty-state">No meetings logged yet. Click "Log Meeting" to add one.</p>';
        }
    } catch (error) {
        console.error('Error loading meetings:', error);
        document.getElementById('meetings-list').innerHTML = '<p class="empty-state">No meetings logged yet.</p>';
    }
}

// Delete meeting
async function deleteMeeting(meetingId) {
    try {
        const result = await invoke('deleteMeeting', { meetingId });
        if (result && result.success) {
            await loadDashboardStats();
            await loadRecentMeetings();
        }
    } catch (error) {
        console.error('Error deleting meeting:', error);
    }
}

// Setup event listeners
function setupEventListeners() {
    const modal = document.getElementById('add-meeting-modal');
    const form = document.getElementById('meeting-form');

    if (!modal || !form) {
        console.error('Modal or form not found');
        return;
    }

    // Open modal
    const addBtn = document.getElementById('add-meeting-btn');
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            modal.classList.remove('hidden');
            const dateInput = document.getElementById('date');
            if (dateInput) dateInput.valueAsDate = new Date();
        });
    }

    // Close modal
    const closeBtn = document.getElementById('close-modal');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
    }

    const cancelBtn = document.getElementById('cancel-btn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => modal.classList.add('hidden'));
    }

    const backdrop = document.querySelector('.modal-backdrop');
    if (backdrop) {
        backdrop.addEventListener('click', () => modal.classList.add('hidden'));
    }

    // Update cost preview on form change
    form.addEventListener('change', updateCostPreview);
    form.addEventListener('input', updateCostPreview);

    // Form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData(form);
        const selectedRoles = Array.from(
            document.querySelectorAll('#attendee-roles input:checked')
        ).map(el => el.value);

        const meeting = {
            title: formData.get('title') || 'Untitled Meeting',
            date: formData.get('date') || new Date().toISOString().split('T')[0],
            durationMinutes: formData.get('duration') || '30',
            meetingType: formData.get('meetingType') || 'ad-hoc',
            attendeeRoles: JSON.stringify(selectedRoles),
            attendeeCount: formData.get('attendeeCount') || selectedRoles.length || 1
        };

        console.log('Adding meeting:', meeting);

        try {
            const result = await invoke('addMeeting', meeting);
            console.log('addMeeting result:', result);

            if (result && result.success) {
                modal.classList.add('hidden');
                form.reset();
                await loadDashboardStats();
                await loadRecentMeetings();
            } else {
                alert('Failed to save meeting: ' + (result?.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error adding meeting:', error);
            alert('Failed to save meeting: ' + error.message);
        }
    });
}

// Populate role checkboxes
function populateRoleCheckboxes() {
    const container = document.getElementById('attendee-roles');
    if (!container) return;

    if (roleRates.length === 0) {
        container.innerHTML = '<span>No roles configured</span>';
        return;
    }

    container.innerHTML = roleRates.map(role => `
    <label class="role-checkbox">
      <input type="checkbox" name="roles" value="${role.roleId}">
      ${role.roleName} ($${role.hourlyRate}/hr)
    </label>
  `).join('');

    // Toggle selected state
    container.querySelectorAll('input').forEach(input => {
        input.addEventListener('change', () => {
            input.parentElement.classList.toggle('selected', input.checked);
            updateCostPreview();
        });
    });
}

// Update cost preview
function updateCostPreview() {
    const durationEl = document.getElementById('duration');
    const estimatedCostEl = document.getElementById('estimated-cost');
    const attendeeCountEl = document.getElementById('attendeeCount');

    if (!durationEl || !estimatedCostEl) return;

    const duration = parseInt(durationEl.value) || 0;
    const selectedRoles = Array.from(
        document.querySelectorAll('#attendee-roles input:checked')
    ).map(el => el.value);
    const attendeeCount = parseInt(attendeeCountEl?.value) || 0;

    let totalCost = 0;

    if (selectedRoles.length > 0) {
        selectedRoles.forEach(roleId => {
            const rate = roleRates.find(r => r.roleId === roleId);
            if (rate) {
                totalCost += (duration / 60) * rate.hourlyRate;
            }
        });
    } else if (attendeeCount > 0 && roleRates.length > 0) {
        const avgRate = roleRates.reduce((sum, r) => sum + r.hourlyRate, 0) / roleRates.length;
        totalCost = (duration / 60) * avgRate * attendeeCount;
    }

    estimatedCostEl.textContent = formatCurrency(totalCost);
}

// Utility functions
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount || 0);
}

function formatMeetingType(type) {
    const types = {
        'standup': 'Standup',
        'planning': 'Planning',
        'retro': 'Retro',
        'review': 'Review',
        'one-on-one': '1:1',
        'team-sync': 'Team Sync',
        'all-hands': 'All Hands',
        'interview': 'Interview',
        'ad-hoc': 'Ad-hoc'
    };
    return types[type] || type || 'Ad-hoc';
}

function formatDate(dateStr) {
    if (!dateStr) return 'Unknown';
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
        return dateStr;
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function hideLoading() {
    const loadingEl = document.getElementById('loading');
    if (loadingEl) loadingEl.classList.add('hidden');
}
