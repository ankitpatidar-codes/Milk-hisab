/* Monthly Reports & PDF Printing Logic */

let repYear = initialYear;
let repMonth = initialMonth;

async function loadReport() {
    document.getElementById('reportMonth').textContent = `${MONTH_NAMES[repMonth]} ${repYear}`;

    try {
        const data = await apiCall(`/api/report/${repYear}/${repMonth}`);

        const printTitle = document.getElementById('reportTitle');
        if (printTitle) {
            printTitle.textContent = `${MONTH_NAMES[repMonth]} ${repYear}`;
        }

        // Summary Cards
        document.getElementById('repQuantity').textContent = `${data.total_quantity || 0} L`;
        document.getElementById('repReceived').textContent = data.received_days || 0;
        document.getElementById('repMissed').textContent = data.not_received_days || 0;
        document.getElementById('repBill').textContent = formatCurrency(data.total_bill || 0);
        document.getElementById('repPaid').textContent = formatCurrency(data.total_payments || 0);
        document.getElementById('repPending').textContent = formatCurrency(data.pending_balance || 0);

        // Daily records table
        const tbody = document.getElementById('reportEntries');
        const entries = data.entries || [];
        if (entries.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-3">No milk records entered for this month.</td></tr>';
        } else {
            const sorted = entries.slice().sort((a, b) => a.date.localeCompare(b.date));
            tbody.innerHTML = sorted.map(e => `
                <tr>
                    <td>${formatDate(e.date)}</td>
                    <td>
                        ${e.received
                            ? '<span class="badge bg-success">Received</span>'
                            : '<span class="badge bg-danger">Missed</span>'}
                    </td>
                    <td>${e.received ? `${e.quantity} L` : '-'}</td>
                    <td>${e.received ? `₹${e.rate}` : '-'}</td>
                    <td class="fw-bold">${e.received ? formatCurrency(e.amount) : '-'}</td>
                </tr>
            `).join('');
        }

        // Totals row in table footer
        document.getElementById('reportTotals').innerHTML = `
            <tr>
                <td colspan="2">Month Total</td>
                <td>${data.total_quantity || 0} L</td>
                <td></td>
                <td>${formatCurrency(data.total_bill || 0)}</td>
            </tr>
        `;

        // Payments History
        const payTbody = document.getElementById('reportPayments');
        const payments = data.payments || [];
        if (payments.length === 0) {
            payTbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted py-3">No payments made during this month.</td></tr>';
        } else {
            payTbody.innerHTML = payments.map(p => `
                <tr>
                    <td>${formatDate(p.date)}</td>
                    <td class="fw-bold text-success">${formatCurrency(p.amount)}</td>
                    <td>${p.notes || '-'}</td>
                </tr>
            `).join('');
        }

        // Financial summary at bottom
        const carryForward = data.carry_forward || 0;
        const totalBill = data.total_bill || 0;
        const totalPaid = data.total_payments || 0;
        const netPending = data.pending_balance || 0;

        document.getElementById('repCarry').textContent = formatCurrency(carryForward);
        document.getElementById('repMonthBill').textContent = formatCurrency(totalBill);
        document.getElementById('repTotalDue').textContent = formatCurrency(carryForward + totalBill);
        document.getElementById('repTotalPaid').textContent = formatCurrency(totalPaid);
        document.getElementById('repNetPending').textContent = formatCurrency(netPending);

    } catch (e) {
        console.error('Failed to load report:', e);
    }
}

function printReport() {
    // Show print headers
    document.querySelectorAll('.print-only').forEach(el => el.style.display = 'block');
    window.print();
    setTimeout(() => {
        document.querySelectorAll('.print-only').forEach(el => el.style.display = 'none');
    }, 1200);
}

document.addEventListener('DOMContentLoaded', function() {
    loadReport();

    document.getElementById('prevRepMonth').addEventListener('click', function() {
        repMonth--;
        if (repMonth < 1) {
            repMonth = 12;
            repYear--;
        }
        loadReport();
    });

    document.getElementById('nextRepMonth').addEventListener('click', function() {
        repMonth++;
        if (repMonth > 12) {
            repMonth = 1;
            repYear++;
        }
        loadReport();
    });
});
