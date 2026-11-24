/* Settings Page Logic */

async function loadSettings() {
    try {
        const data = await apiCall('/api/settings');
        if (data.settings) {
            document.getElementById('defaultRate').value = data.settings.default_rate || 60;
            document.getElementById('defaultQuantity').value = data.settings.default_quantity || 1;
        }
    } catch (e) {
        console.error('Failed to load settings:', e);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    loadSettings();

    const form = document.getElementById('settingsForm');
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            const rateVal = parseFloat(document.getElementById('defaultRate').value) || 60;
            const qtyVal = parseFloat(document.getElementById('defaultQuantity').value) || 1;

            try {
                const res = await apiCall('/api/settings', {
                    method: 'POST',
                    body: JSON.stringify({
                        default_rate: rateVal,
                        default_quantity: qtyVal
                    })
                });

                const msgDiv = document.getElementById('settingsMsg');
                msgDiv.innerHTML = '<div class="alert alert-success py-2 shadow-sm"><i class="bi bi-check-circle"></i> Settings saved successfully!</div>';
                setTimeout(() => {
                    msgDiv.innerHTML = '';
                }, 3000);
            } catch (err) {
                // apiCall handles error
            }
        });
    }
});
