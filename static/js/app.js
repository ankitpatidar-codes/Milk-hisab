/* ============================================================
   Milk Hisab - Shared JavaScript Utilities
   ============================================================ */

// Toast notification
function showToast(message, type = 'success') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `alert alert-${type} alert-dismissible fade show shadow`;
    toast.style.minWidth = '260px';
    toast.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3200);
}

// API helper
async function apiCall(url, options = {}) {
    try {
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                ...options.headers
            },
            ...options
        });

        const contentType = response.headers.get('content-type') || '';
        let data = {};
        if (contentType.includes('application/json')) {
            data = await response.json();
        }

        if (!response.ok) {
            throw new Error(data.error || `Request failed with status ${response.status}`);
        }
        return data;
    } catch (error) {
        showToast(error.message, 'danger');
        throw error;
    }
}

// Format currency in Indian Rupees
function formatCurrency(amount) {
    const num = Number(amount) || 0;
    return '₹' + num.toLocaleString('en-IN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    });
}

// Format ISO date (YYYY-MM-DD) to friendly format (e.g. 24 Nov 2026)
function formatDate(dateStr) {
    if (!dateStr) return '-';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        const d = new Date(parts[0], parts[1] - 1, parts[2]);
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    return dateStr;
}

// Today's ISO date string (YYYY-MM-DD)
function getTodayStr() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

const MONTH_NAMES = [
    '', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

// ---- Entry Modal Logic ----
let currentModalInstance = null;

function openEntryModal(dateStr) {
    const modalEl = document.getElementById('entryModal');
    if (!modalEl) return;
    
    if (!currentModalInstance) {
        currentModalInstance = new bootstrap.Modal(modalEl);
    }
    
    const targetDate = dateStr || getTodayStr();
    const dateInput = document.getElementById('entryDate');
    if (dateInput) {
        dateInput.value = targetDate;
    }
    loadEntryForDate(targetDate);
    currentModalInstance.show();
}

async function loadEntryForDate(dateStr) {
    try {
        const data = await apiCall(`/api/entry/${dateStr}`);
        const qtyInput = document.getElementById('entryQuantity');
        const rateInput = document.getElementById('entryRate');
        const yesRadio = document.getElementById('receivedYes');
        const noRadio = document.getElementById('receivedNo');

        if (data.entry) {
            if (data.entry.received) {
                yesRadio.checked = true;
            } else {
                noRadio.checked = true;
            }
            qtyInput.value = data.entry.quantity;
            rateInput.value = data.entry.rate;
            toggleMilkDetails(data.entry.received);
        } else {
            yesRadio.checked = true;
            const defRate = (data.defaults && data.defaults.default_rate) ? data.defaults.default_rate : 60;
            const defQty = (data.defaults && data.defaults.default_quantity) ? data.defaults.default_quantity : 1;
            qtyInput.value = defQty;
            rateInput.value = defRate;
            toggleMilkDetails(true);
        }
        calculateAmount();
    } catch (e) {
        // Fallback default
        toggleMilkDetails(true);
        calculateAmount();
    }
}

function toggleMilkDetails(show) {
    const details = document.getElementById('milkDetails');
    if (details) {
        details.style.display = show ? 'block' : 'none';
    }
}

function calculateAmount() {
    const qty = parseFloat(document.getElementById('entryQuantity').value) || 0;
    const rate = parseFloat(document.getElementById('entryRate').value) || 0;
    const amountField = document.getElementById('entryAmount');
    if (amountField) {
        amountField.value = (qty * rate).toFixed(2);
    }
}

// Initialize common modal listeners
document.addEventListener('DOMContentLoaded', function() {
    // Radio toggle
    document.querySelectorAll('input[name="received"]').forEach(radio => {
        radio.addEventListener('change', function() {
            toggleMilkDetails(this.value === 'true');
            calculateAmount();
        });
    });

    // Auto-calculate on rate or qty change
    ['entryQuantity', 'entryRate'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', calculateAmount);
            el.addEventListener('change', calculateAmount);
        }
    });

    // Date change in modal
    const dateInput = document.getElementById('entryDate');
    if (dateInput) {
        dateInput.addEventListener('change', function() {
            loadEntryForDate(this.value);
        });
    }

    // Save Milk Entry button
    const saveBtn = document.getElementById('saveEntry');
    if (saveBtn) {
        saveBtn.addEventListener('click', async function() {
            const dateVal = document.getElementById('entryDate').value;
            if (!dateVal) {
                showToast('Please select a date', 'warning');
                return;
            }

            const isReceived = document.querySelector('input[name="received"]:checked').value === 'true';
            const qty = isReceived ? (parseFloat(document.getElementById('entryQuantity').value) || 0) : 0;
            const rate = parseFloat(document.getElementById('entryRate').value) || 0;

            const payload = {
                date: dateVal,
                received: isReceived,
                quantity: qty,
                rate: rate
            };

            try {
                saveBtn.disabled = true;
                saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Saving...';
                const res = await apiCall('/api/entry', {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });
                showToast(res.message || 'Saved successfully', 'success');

                const modalEl = document.getElementById('entryModal');
                const modal = bootstrap.Modal.getInstance(modalEl);
                if (modal) modal.hide();

                // Refresh any open view
                if (typeof loadDashboard === 'function') loadDashboard();
                if (typeof loadCalendar === 'function') loadCalendar();
                if (typeof loadReport === 'function') loadReport();
            } catch (err) {
                // apiCall handles toast
            } finally {
                saveBtn.disabled = false;
                saveBtn.innerHTML = '<i class="bi bi-check-lg"></i> Save Entry';
            }
        });
    }
});
