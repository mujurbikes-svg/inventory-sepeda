
// Thermal print functionality
class ThermalPrint {
    static printLabel() {
        const printContent = document.getElementById('qr-label-container').innerHTML;
        const originalContent = document.body.innerHTML;
        
        document.body.innerHTML = printContent;
        window.print();
        document.body.innerHTML = originalContent;
        
        // Reload app state
        if (window.app) {
            window.app.updateDashboard();
        }
    }
}

// Export untuk global access
window.ThermalPrint = ThermalPrint;
