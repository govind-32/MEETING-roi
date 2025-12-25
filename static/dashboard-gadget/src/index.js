import { invoke } from '@forge/bridge';

let roleRates = [];

async function init() {
    console.log('Dashboard initializing...');
    try {
        await loadRoleRates();
        await loadDashboardStats();
        await loadRecentMeetings();
        setupEventListeners();
        hideLoading();
        console.log('Dashboard ready');
    } catch (error) {
        console.error('Error initializing dashboard:', error);
        hideLoading();
    }
}

async function loadRoleRates() {
    try {
        const result = await invoke('getRoleRates');
        console.log('getRoleRates:', result);
        if (result && result.success) {
            roleRates = result.rates || [];
            populateRoleCheckboxes();
        }
    } catch (e) {
        console.error('loadRoleRates error:', e);
        roleRates = [
            { roleId: 'engineer', roleName: 'Engineer', hourlyRate: 75 },
            { roleId: 'senior', roleName: 'Senior Engineer', hourlyRate: 100 },
            { roleId: 'pm', roleName: 'Product Manager', hourlyRate: 90 }
        ];
        populateRoleCheckboxes();
    }
}

async function loadDashboardStats() {
    try {
        const result = await invoke('getDashboardStats', { dateRange: 'last-month' });
        console.log('getDashboardStats:', result);
        if (result && result.success && result.stats) {
            const s = result.stats;
            document.getElementById('monthly-cost').textContent = formatCurrency(s.totalCost || 0);
            document.getElementById('meeting-hours').textContent = (s.totalHours || 0).toFixed(1) + 'h';
            document.getElementById('meeting-count').textContent = s.meetingCount || 0;
            document.getElementById('cost-per-hour').textContent = formatCurrency(s.totalHours > 0 ? s.totalCost / s.totalHours : 0);
            renderTypeBreakdown(s.costByType || {});
        }
    } catch (e) {
        console.error('loadDashboardStats error:', e);
    }
}

function renderTypeBreakdown(costByType) {
    const container = document.getElementById('type-bars');
    if (!costByType || Object.keys(costByType).length === 0) {
        container.innerHTML = '<p class="empty-state">No data yet</p>';
        return;
    }
    const maxCost = Math.max(...Object.values(costByType).map(t => t.cost || 0));
    const colors = { standup: '#00875A', planning: '#0052CC', retro: '#6554C0', review: '#FF991F', 'one-on-one': '#00B8D9', 'team-sync': '#36B37E', 'ad-hoc': '#97A0AF', 'all-hands': '#FF5630', interview: '#8777D9' };
    container.innerHTML = Object.entries(costByType).sort((a, b) => b[1].cost - a[1].cost).map(([type, data]) => {
        const pct = maxCost > 0 ? (data.cost / maxCost) * 100 : 0;
        return `<div class="type-bar-item"><div class="type-bar-label"><span class="type-name">${formatType(type)}</span><span class="type-cost">${formatCurrency(data.cost)}</span></div><div class="type-bar-track"><div class="type-bar-fill" style="width:${pct}%;background:${colors[type] || '#6B778C'}"></div></div><div class="type-bar-meta">${data.count} meetings · ${data.hours.toFixed(1)}h</div></div>`;
    }).join('');
}

async function loadRecentMeetings() {
    try {
        const result = await invoke('getMeetings', { limit: 10 });
        console.log('getMeetings:', result);
        const list = document.getElementById('meetings-list');
        if (result && result.success && result.meetings && result.meetings.length > 0) {
            list.innerHTML = result.meetings.map(m =>
                `<div class="meeting-item"><div class="meeting-info"><span class="meeting-type-badge">${formatType(m.meetingType)}</span><div><div class="meeting-title">${m.title || 'Untitled'}</div><div class="meeting-meta">${formatDate(m.date)} · ${m.durationMinutes} min</div></div></div><div class="meeting-actions"><span class="meeting-cost">${formatCurrency(m.calculatedCost)}</span><button class="btn-danger" data-id="${m.id}">🗑️</button></div></div>`
            ).join('');

            list.querySelectorAll('.btn-danger').forEach(btn => {
                btn.addEventListener('click', async () => {
                    if (confirm('Delete this meeting?')) {
                        await invoke('deleteMeeting', { meetingId: btn.dataset.id });
                        await loadDashboardStats();
                        await loadRecentMeetings();
                    }
                });
            });
        } else {
            list.innerHTML = '<p class="empty-state">No meetings logged yet. Click "Log Meeting" to add one.</p>';
        }
    } catch (e) {
        console.error('loadRecentMeetings error:', e);
    }
}

function setupEventListeners() {
    const modal = document.getElementById('add-meeting-modal');
    const form = document.getElementById('meeting-form');

    document.getElementById('add-meeting-btn').addEventListener('click', () => {
        modal.classList.remove('hidden');
        document.getElementById('date').valueAsDate = new Date();
    });

    document.getElementById('close-modal').addEventListener('click', () => modal.classList.add('hidden'));
    document.getElementById('cancel-btn').addEventListener('click', () => modal.classList.add('hidden'));
    document.querySelector('.modal-backdrop').addEventListener('click', () => modal.classList.add('hidden'));

    form.addEventListener('change', updateCostPreview);
    form.addEventListener('input', updateCostPreview);

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        const selectedRoles = Array.from(document.querySelectorAll('#attendee-roles input:checked')).map(el => el.value);
        const meeting = {
            title: fd.get('title'),
            date: fd.get('date'),
            durationMinutes: fd.get('duration'),
            meetingType: fd.get('meetingType'),
            attendeeRoles: JSON.stringify(selectedRoles),
            attendeeCount: fd.get('attendeeCount') || selectedRoles.length || 1
        };
        console.log('Adding meeting:', meeting);
        const result = await invoke('addMeeting', meeting);
        console.log('addMeeting result:', result);
        if (result && result.success) {
            modal.classList.add('hidden');
            form.reset();
            await loadDashboardStats();
            await loadRecentMeetings();
        } else {
            alert('Failed to save: ' + (result ? result.error : 'Unknown error'));
        }
    });
}

function populateRoleCheckboxes() {
    const c = document.getElementById('attendee-roles');
    c.innerHTML = roleRates.map(r =>
        `<label class="role-checkbox"><input type="checkbox" value="${r.roleId}">${r.roleName} ($${r.hourlyRate}/hr)</label>`
    ).join('');

    c.querySelectorAll('input').forEach(i => {
        i.addEventListener('change', () => {
            i.parentElement.classList.toggle('selected', i.checked);
            updateCostPreview();
        });
    });
}

function updateCostPreview() {
    const dur = parseInt(document.getElementById('duration').value) || 0;
    const roles = Array.from(document.querySelectorAll('#attendee-roles input:checked')).map(el => el.value);
    const cnt = parseInt(document.getElementById('attendeeCount').value) || 0;
    let cost = 0;
    if (roles.length > 0) {
        roles.forEach(id => {
            const r = roleRates.find(x => x.roleId === id);
            if (r) cost += (dur / 60) * r.hourlyRate;
        });
    } else if (cnt > 0 && roleRates.length > 0) {
        const avg = roleRates.reduce((s, r) => s + r.hourlyRate, 0) / roleRates.length;
        cost = (dur / 60) * avg * cnt;
    }
    document.getElementById('estimated-cost').textContent = formatCurrency(cost);
}

function formatCurrency(n) {
    return '$' + Math.round(n || 0).toLocaleString();
}

function formatType(t) {
    const m = { standup: 'Standup', planning: 'Planning', retro: 'Retro', review: 'Review', 'one-on-one': '1:1', 'team-sync': 'Team Sync', 'all-hands': 'All Hands', interview: 'Interview', 'ad-hoc': 'Ad-hoc' };
    return m[t] || t || 'Ad-hoc';
}

function formatDate(d) {
    if (!d) return '-';
    try {
        return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
        return d;
    }
}

function hideLoading() {
    document.getElementById('loading').classList.add('hidden');
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
