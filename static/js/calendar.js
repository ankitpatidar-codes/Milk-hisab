/* Monthly Calendar View Logic */

let calYear = initialYear;
let calMonth = initialMonth;

async function loadCalendar() {
    document.getElementById('currentMonth').textContent = `${MONTH_NAMES[calMonth]} ${calYear}`;

    try {
        const [entriesRes, summaryRes] = await Promise.all([
            apiCall(`/api/entries/${calYear}/${calMonth}`),
            apiCall(`/api/monthly-summary/${calYear}/${calMonth}`)
        ]);

        renderCalendarGrid(entriesRes.entries || []);
        renderMonthlySummary(summaryRes);
    } catch (e) {
        console.error('Error loading calendar:', e);
    }
}

function renderCalendarGrid(entries) {
    const grid = document.getElementById('calendarGrid');
    if (!grid) return;

    const entryMap = {};
    entries.forEach(e => {
        entryMap[e.date] = e;
    });

    const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    let html = dayHeaders.map(d => `<div class="calendar-header">${d}</div>`).join('');

    const firstDayIndex = new Date(calYear, calMonth - 1, 1).getDay();
    const daysInMonth = new Date(calYear, calMonth, 0).getDate();
    const todayStr = getTodayStr();

    // Leading empty cells
    for (let i = 0; i < firstDayIndex; i++) {
        html += '<div class="calendar-day empty"></div>';
    }

    // Month days
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${calYear}-${String(calMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const entry = entryMap[dateStr];
        const isToday = (dateStr === todayStr);

        let cls = 'calendar-day no-entry';
        let qtyText = '';

        if (entry) {
            if (entry.received) {
                cls = 'calendar-day received';
                qtyText = `${entry.quantity}L`;
            } else {
                cls = 'calendar-day not-received';
                qtyText = 'No';
            }
        }

        if (isToday) {
            cls += ' today';
        }

        html += `
            <div class="${cls}" onclick="openEntryModal('${dateStr}')" title="${dateStr}">
                <div class="day-number">${day}</div>
                <div class="day-qty">${qtyText}</div>
            </div>
        `;
    }

    grid.innerHTML = html;
}

function renderMonthlySummary(summary) {
    const container = document.getElementById('monthlySummary');
    if (!container) return;

    container.innerHTML = `
        <div class="row g-3 text-center mb-2">
            <div class="col-4">
                <div class="fw-bold fs-5 text-primary">${summary.total_quantity || 0} L</div>
                <small class="text-muted">Total Milk</small>
            </div>
            <div class="col-4">
                <div class="fw-bold fs-5 text-success">${formatCurrency(summary.total_bill || 0)}</div>
                <small class="text-muted">Total Bill</small>
            </div>
            <div class="col-4">
                <div class="fw-bold fs-5 text-danger">${formatCurrency(summary.pending_balance || 0)}</div>
                <small class="text-muted">Net Pending</small>
            </div>
        </div>
        <hr class="my-2">
        <div class="d-flex justify-content-around flex-wrap gap-2 text-center pt-1">
            <span class="badge bg-success py-2 px-3"><i class="bi bi-check-circle"></i> ${summary.received_days || 0} Days Received</span>
            <span class="badge bg-danger py-2 px-3"><i class="bi bi-x-circle"></i> ${summary.not_received_days || 0} Days Missed</span>
            <span class="badge bg-info py-2 px-3 text-dark"><i class="bi bi-wallet2"></i> ${formatCurrency(summary.total_payments || 0)} Paid</span>
        </div>
    `;
}

// Previous & Next navigation
document.addEventListener('DOMContentLoaded', function() {
    const prevBtn = document.getElementById('prevMonth');
    const nextBtn = document.getElementById('nextMonth');

    if (prevBtn) {
        prevBtn.addEventListener('click', function() {
            calMonth--;
            if (calMonth < 1) {
                calMonth = 12;
                calYear--;
            }
            loadCalendar();
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', function() {
            calMonth++;
            if (calMonth > 12) {
                calMonth = 1;
                calYear++;
            }
            loadCalendar();
        });
    }

    loadCalendar();
});
