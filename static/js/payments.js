/* Payments Management Logic */

let payYear, payMonth;

function initPayments() {
    const now = new Date();
    payYear = now.getFullYear();
    payMonth = now.getMonth() + 1;

    const dateField = document.getElementById('paymentDate');
    if (dateField) {
        dateField.value = getTodayStr();
    }

    loadPayments();
}

async function loadPayments() {
    document.getElementById('paymentMonth').textContent = `${MONTH_NAMES[payMonth]} ${payYear}`;

    try {
        const data = await apiCall(`/api/payments/${payYear}/${payMonth}`);
        const summary = data.summary || {};

        // Update billing summary cards
        document.getElementById('payTotalBill').textContent = formatCurrency(summary.total_bill || 0);
        document.getElementById('payCarryForward').textContent = formatCurrency(summary.carry_forward || 0);
        document.getElementById('payTotalPaid').textContent = formatCurrency(summary.total_payments || 0);
        document.getElementById('payPending').textContent = formatCurrency(summary.pending_balance || 0);

        // Payments table
        const tbody = document.getElementById('paymentsList');
        if (!data.payments || data.payments.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-4">No payments recorded for this month.</td></tr>';
        } else {
            tbody.innerHTML = data.payments.map(p => `
                <tr>
                    <td class="align-middle">${formatDate(p.date)}</td>
                    <td class="align-middle fw-bold text-success fs-6">${formatCurrency(p.amount)}</td>
                    <td class="align-middle">${p.notes ? p.notes : '<span class="text-muted">-</span>'}</td>
                    <td class="align-middle text-end">
                        <button class="btn btn-sm btn-outline-danger" onclick="deletePayment(${p.id})">
                            <i class="bi bi-trash"></i> Delete
                        </button>
                    </td>
                </tr>
            `).join('');
        }
    } catch (e) {
        console.error('Failed to load payments:', e);
    }
}

async function deletePayment(id) {
    if (!confirm('Are you sure you want to delete this payment record?')) return;
    try {
        await apiCall(`/api/payment/${id}`, { method: 'DELETE' });
        showToast('Payment deleted successfully', 'success');
        loadPayments();
    } catch (e) {
        // Handled by apiCall
    }
}

document.addEventListener('DOMContentLoaded', function() {
    initPayments();

    const saveBtn = document.getElementById('savePayment');
    if (saveBtn) {
        saveBtn.addEventListener('click', async function() {
            const dateVal = document.getElementById('paymentDate').value;
            const amountVal = parseFloat(document.getElementById('paymentAmount').value) || 0;
            const notesVal = document.getElementById('paymentNotes').value.trim();

            if (!dateVal || amountVal <= 0) {
                showToast('Please enter a valid date and positive amount', 'warning');
                return;
            }

            try {
                saveBtn.disabled = true;
                saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Saving...';

                await apiCall('/api/payment', {
                    method: 'POST',
                    body: JSON.stringify({
                        date: dateVal,
                        amount: amountVal,
                        notes: notesVal,
                        month: payMonth,
                        year: payYear
                    })
                });

                showToast('Payment recorded successfully', 'success');

                const modal = bootstrap.Modal.getInstance(document.getElementById('paymentModal'));
                if (modal) modal.hide();

                document.getElementById('paymentAmount').value = '';
                document.getElementById('paymentNotes').value = '';
                loadPayments();
            } catch (err) {
                // apiCall handles toast
            } finally {
                saveBtn.disabled = false;
                saveBtn.innerHTML = '<i class="bi bi-check-lg"></i> Save Payment';
            }
        });
    }

    // Previous/Next month
    document.getElementById('prevPayMonth').addEventListener('click', function() {
        payMonth--;
        if (payMonth < 1) {
            payMonth = 12;
            payYear--;
        }
        loadPayments();
    });

    document.getElementById('nextPayMonth').addEventListener('click', function() {
        payMonth++;
        if (payMonth > 12) {
            payMonth = 1;
            payYear++;
        }
        loadPayments();
    });
});
