document.addEventListener('DOMContentLoaded', async () => {
    const tokenData = await browser.storage.local.get('scrobblerToken');
    const token = tokenData.scrobblerToken;

    const exportButton = document.getElementById('export-data-btn');
    const exportBackupBtn = document.getElementById('export-backup-btn');

    exportBackupBtn.addEventListener('click', async () => {
        try {
            // 1. Generar el archivo
            const backupResponse = await fetch('https://127.0.0.1:5000/backupJson', {
                headers: {
                    'Authorization': 'Bearer ' + token
                }
            });

            const backupResult = await backupResponse.json();

            if (!backupResponse.ok) {
                alert('❌ Error al generar backup: ' + backupResult.error);
                return;
            }

            // 2. Descargar el archivo
            const downloadResponse = await fetch('https://127.0.0.1:5000/downloadBackupJson', {
                headers: {
                    'Authorization': 'Bearer ' + token
                }
            });

            if (!downloadResponse.ok) {
                const error = await downloadResponse.json();
                alert('❌ Error al descargar backup: ' + error.error);
                return;
            }

            const blob = await downloadResponse.blob();
            const url = window.URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = 'my_scrobble_backup.json';
            document.body.appendChild(a);
            a.click();
            a.remove();

            window.URL.revokeObjectURL(url);
        } catch (err) {
            alert('❌ Error inesperado: ' + err.message);
        }
    });



    exportButton.addEventListener('click', async () => {
        try {
            const response = await fetch('https://127.0.0.1:5000/exportScrobbleHistory', {
                headers: {
                    'Authorization': 'Bearer ' + token
                }
            });

            if (!response.ok) throw new Error("Failed to download file.");

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            const today = new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"
            a.download = `scrobble_history_${today}.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();

            window.URL.revokeObjectURL(url);
        } catch (err) {
            alert('Download failed: ' + err.message);
        }
    });





    const userEmailSpan = document.getElementById('user-email');
    const userStatusSpan = document.getElementById('user-status');

    try {
        const response = await fetch('https://127.0.0.1:5000/me', {
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });

        if (!response.ok) throw new Error("Failed to fetch user data.");

        const data = await response.json();
        userEmailSpan.textContent = data.email;
        userStatusSpan.textContent = data.is_active ? 'Active ✅' : 'Inactive ❌';
    } catch (err) {
        userEmailSpan.textContent = 'Error';
        userStatusSpan.textContent = 'Unavailable';
        console.error(err);
    }



    const changePasswordBtn = document.getElementById('change-password-btn');
    const passwordModal = document.getElementById('change-password-modal');
    const submitBtn = document.getElementById('submit-password-change');
    const cancelBtn = document.getElementById('cancel-password-change');

    changePasswordBtn.addEventListener('click', () => {
        passwordModal.style.display = 'flex';
    });

    cancelBtn.addEventListener('click', () => {
        passwordModal.style.display = 'none';
        clearPasswordFields();
    });

    submitBtn.addEventListener('click', async () => {
        const oldPassword = document.getElementById('old-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        if (!oldPassword || !newPassword || !confirmPassword) {
            alert("Please fill out all fields.");
            return;
        }

        if (newPassword !== confirmPassword) {
            alert("New passwords do not match.");
            return;
        }

        if (newPassword.length < 6) {
            alert("New password must be at least 6 characters.");
            return;
        }

        try {
            const response = await fetch('https://127.0.0.1:5000/changePassword', {
                method: 'PATCH',
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    old_password: oldPassword,
                    new_password: newPassword
                })
            });

            const data = await response.json();

            if (!response.ok) {
                alert("Error: " + data.error);
                return;
            }

            alert("Password updated successfully!");
            passwordModal.style.display = 'none';
            clearPasswordFields();
        } catch (err) {
            alert("Unexpected error: " + err.message);
        }
    });

    function clearPasswordFields() {
        document.getElementById('old-password').value = '';
        document.getElementById('new-password').value = '';
        document.getElementById('confirm-password').value = '';
    }

});
