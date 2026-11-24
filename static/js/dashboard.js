/* Dashboard Logic & Chart */

let milkChartInstance = null;

async function loadDashboard() {
    try {
        const data = await apiCall('/api/dashboard');

        // Today's milk
        const todayQtyEl = document.getElementById('todayQty');
        if (data.today) {
            todayQtyEl.textContent = data.today.received ? `${data.today.quantity} L` : '0 L (Missed)';
        } else {
            todayQtyEl.textContent = 'Not Entered';
        }

        // Current month totals
        const cur = data.current_month || {};
        document.getElementById('monthQty').textContent = `${cur.total_quantity || 0} L`;
        document.getElementById('monthBill').textContent = formatCurrency(cur.total_bill || 0);
        document.getElementById('pendingBal').textContent = formatCurrency(data.total_pending || 0);
        document.getElementById('receivedDays').textContent = cur.received_days || 0;
        document.getElementById('missedDays').textContent = cur.not_received_days || 0;

        // Today's Record Quick Card
        const todayCard = document.getElementById('todayRecord');
        if (data.today) {
            const statusBadge = data.today.received
                ? '<span class="badge bg-success fs-6"><i class="bi bi-check-circle"></i> Received</span>'
                : '<span class="badge bg-danger fs-6"><i class="bi bi-x-circle"></i> Not Received</span>';

            todayCard.innerHTML = `
                <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
                    <div>
                        ${statusBadge}
                        ${data.today.received ? `<span class="ms-3 fs-5">${data.today.quantity} Litres @ ₹${data.today.rate}/L = <strong>${formatCurrency(data.today.amount)}</strong></span>` : '<span class="ms-3 text-muted">No milk taken today</span>'}
                    </div>
                    <button class="btn btn-outline-primary btn-sm" onclick="openEntryModal('${data.today.date}')">
                        <i class="bi bi-pencil"></i> Edit Today's Entry
                    </button>
                </div>
            `;
        } else {
            const todayStr = getTodayStr();
            todayCard.innerHTML = `
                <div class="text-center py-2">
                    <p class="text-muted mb-2">No milk record has been entered for today (${formatDate(todayStr)}).</p>
                    <button class="btn btn-primary" onclick="openEntryModal('${todayStr}')">
                        <i class="bi bi-plus-circle"></i> Record Today's Milk
                    </button>
                </div>
            `;
        }

        // Render Chart
        renderConsumptionChart(data.chart_data || []);
    } catch (err) {
        console.error('Failed to load dashboard:', err);
    }
}

function renderConsumptionChart(chartData) {
    const ctx = document.getElementById('milkChart');
    if (!ctx) return;

    if (milkChartInstance) {
        milkChartInstance.destroy();
    }

    const labels = chartData.map(item => item.month);
    const quantities = chartData.map(item => item.quantity);
    const bills = chartData.map(item => item.bill);

    milkChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Milk (Litres)',
                    data: quantities,
                    backgroundColor: 'rgba(13, 110, 253, 0.75)',
                    borderColor: 'rgb(13, 110, 253)',
                    borderWidth: 1,
                    borderRadius: 6,
                    yAxisID: 'y'
                },
                {
                    label: 'Bill (₹)',
                    data: bills,
                    backgroundColor: 'rgba(25, 135, 84, 0.75)',
                    borderColor: 'rgb(25, 135, 84)',
                    borderWidth: 1,
                    borderRadius: 6,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Litres'
                    },
                    beginAtZero: true
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    grid: {
                        drawOnChartArea: false
                    },
                    title: {
                        display: true,
                        text: 'Bill (₹)'
                    },
                    beginAtZero: true
                }
            }
        }
    });
}

document.addEventListener('DOMContentLoaded', loadDashboard);
