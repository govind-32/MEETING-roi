import { invoke } from '@forge/bridge';

let roles = [];

async function init() {
    console.log('Admin panel initializing...');
    try {
        await loadRoles();
        await loadSettings();
        setupEventListeners();
        console.log('Admin panel ready');
    } catch (error) {
        console.error('Error initializing admin panel:', error);
    }
}

async function loadRoles() {
    try {
        const result = await invoke('getRoleRates');
        console.log('getRoleRates:', result);
        if (result && result.success) {
            roles = result.rates || [];
            renderRoles();
        } else {
            document.getElementById('role-list').innerHTML = '<p class="loading">No roles configured yet.</p>';
        }
    } catch (e) {
        console.error('loadRoles error:', e);
        document.getElementById('role-list').innerHTML = '<p class="loading">Error loading roles.</p>';
    }
}

async function loadSettings() {
    try {
        const result = await invoke('getConfig');
        console.log('getConfig:', result);
        if (result && result.success && result.settings) {
            document.getElementById('currency').value = result.settings.currency || 'USD';
            document.getElementById('work-hours').value = result.settings.workHoursPerDay || 8;
        }
    } catch (e) {
        console.error('loadSettings error:', e);
    }
}

function renderRoles() {
    const container = document.getElementById('role-list');

    if (roles.length === 0) {
        container.innerHTML = '<p class="loading">No roles configured yet.</p>';
        return;
    }

    container.innerHTML = roles.map((role, index) => `
    <div class="role-row" data-index="${index}">
      <div class="form-group">
        ${index === 0 ? '<label>Role Title</label>' : ''}
        <input type="text" class="role-name" value="${role.roleName}" placeholder="e.g., Engineer">
      </div>
      <div class="form-group">
        ${index === 0 ? '<label>Hourly Rate</label>' : ''}
        <div class="rate-input-wrapper">
          <input type="number" class="role-rate" value="${role.hourlyRate}" min="0" step="5">
        </div>
      </div>
      <button class="btn-delete" data-index="${index}" title="Delete role">🗑️</button>
    </div>
  `).join('');

    // Add delete handlers
    container.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', () => {
            const idx = parseInt(btn.dataset.index);
            roles.splice(idx, 1);
            renderRoles();
        });
    });
}

function setupEventListeners() {
    document.getElementById('add-role-btn').addEventListener('click', () => {
        roles.push({
            roleId: `role-${Date.now()}`,
            roleName: '',
            hourlyRate: 75,
            currency: 'USD'
        });
        renderRoles();
    });

    document.getElementById('save-roles-btn').addEventListener('click', async () => {
        const roleRows = document.querySelectorAll('.role-row');
        const updatedRoles = [];

        roleRows.forEach((row, i) => {
            const name = row.querySelector('.role-name').value.trim();
            const rate = parseFloat(row.querySelector('.role-rate').value) || 0;

            if (name) {
                updatedRoles.push({
                    roleId: roles[i]?.roleId || `role-${Date.now()}-${i}`,
                    roleName: name,
                    hourlyRate: rate,
                    currency: document.getElementById('currency').value
                });
            }
        });

        console.log('Saving roles:', updatedRoles);
        const result = await invoke('saveRoleRates', { rates: updatedRoles });
        console.log('saveRoleRates result:', result);

        if (result && result.success) {
            roles = updatedRoles;
            showToast('Roles saved successfully!');
        } else {
            showToast('Failed to save roles', true);
        }
    });

    document.getElementById('save-settings-btn').addEventListener('click', async () => {
        const settings = {
            currency: document.getElementById('currency').value,
            workHoursPerDay: parseInt(document.getElementById('work-hours').value) || 8
        };

        console.log('Saving settings:', settings);
        const result = await invoke('saveConfig', { settings });
        console.log('saveConfig result:', result);

        if (result && result.success) {
            showToast('Settings saved successfully!');
        } else {
            showToast('Failed to save settings', true);
        }
    });
}

function showToast(message, isError = false) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.style.background = isError ? '#DE350B' : '#00875A';
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
