// Main application logic
class InventoryApp {
    constructor() {
        this.db = db;
        this.currentTab = 'dashboard';
        this.init();
    }

    async init() {
        // Initialize database
        await this.db.init();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Load initial data
        await this.loadInitialData();
        
        // Update dashboard
        await this.updateDashboard();
        
        console.log('Inventory App initialized');
    }

    setupEventListeners() {
        // Tab navigation
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Form submission
        document.getElementById('form-input-stok').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleInputStok();
        });

        // Perakitan button
        document.getElementById('btn-proses-rakit').addEventListener('click', () => {
            this.handlePerakitan();
        });

        // Search and filter
        document.getElementById('search-input').addEventListener('input', (e) => {
            this.filterStok(e.target.value);
        });

        document.getElementById('status-filter').addEventListener('change', (e) => {
            this.filterStok(document.getElementById('search-input').value, e.target.value);
        });

        // Modal close
        document.querySelector('.close').addEventListener('click', () => {
            this.closeModal();
        });

        document.getElementById('btn-print-label').addEventListener('click', () => {
            this.printLabel();
        });

        // Close modal when clicking outside
        window.addEventListener('click', (e) => {
            const modal = document.getElementById('qr-modal');
            if (e.target === modal) {
                this.closeModal();
            }
        });
    }

    async loadInitialData() {
        // Load master data untuk dropdowns
        await this.loadMasterData();
        
        // Load stok untuk perakitan dropdown
        await this.loadStokForPerakitan();
        
        // Load riwayat perakitan
        await this.loadRiwayatPerakitan();
    }

    async loadMasterData() {
        const types = ['tipe', 'supplier', 'ukuran', 'kemasan', 'lokasi', 'pegawai'];
        
        for (const type of types) {
            const data = await this.db.getMasterData(type);
            const select = document.getElementById(type);
            
            if (select) {
                // Clear existing options except first one
                while (select.options.length > 1) {
                    select.remove(1);
                }
                
                // Add options from database
                data.forEach(item => {
                    const option = document.createElement('option');
                    option.value = item.value;
                    option.textContent = item.value;
                    select.appendChild(option);
                });
            }
            
            // Also update master data lists
            this.updateMasterList(type, data);
        }
    }

    updateMasterList(type, data) {
        const listElement = document.getElementById(`list-${type}`);
        if (listElement) {
            listElement.innerHTML = data.map(item => `
                <div class="master-tag">
                    ${item.value}
                    <button onclick="app.deleteMasterItem(${item.id}, '${type}')">×</button>
                </div>
            `).join('');
        }
    }

    async addMasterData(type) {
        const input = document.getElementById(`new-${type}`);
        const value = input.value.trim();
        
        if (value) {
            await this.db.addMasterData(type, value);
            input.value = '';
            await this.loadMasterData();
        }
    }

    async deleteMasterItem(id, type) {
        if (confirm('Hapus data ini?')) {
            await this.db.deleteMasterData(id);
            await this.loadMasterData();
        }
    }

    async handleInputStok() {
        const formData = new FormData(document.getElementById('form-input-stok'));
        const bikeData = {
            tipe: formData.get('tipe'),
            supplier: formData.get('supplier'),
            ukuran: formData.get('ukuran'),
            warna: formData.get('warna') || '',
            kemasan: formData.get('kemasan'),
            unitPerKemasan: parseInt(formData.get('unit-per-kemasan')),
            lokasi: formData.get('lokasi'),
            tanggalDatang: formData.get('tanggal-datang') || 'N/A'
        };

        try {
            const bikeId = await this.db.addBike(bikeData);
            bikeData.id = bikeId;
            
            // Show QR modal
            this.showQRModal(bikeData);
            
            // Reset form
            document.getElementById('form-input-stok').reset();
            
            // Update dashboard
            await this.updateDashboard();
            
            alert('Stok berhasil disimpan!');
            
        } catch (error) {
            console.error('Error saving bike:', error);
            alert('Error menyimpan stok');
        }
    }

    showQRModal(bikeData) {
        const modal = document.getElementById('qr-modal');
        const container = document.getElementById('qr-label-container');
        
        // Generate QR code data
        const qrData = JSON.stringify({
            id: bikeData.id,
            tipe: bikeData.tipe,
            supplier: bikeData.supplier,
            ukuran: bikeData.ukuran
        });
        
        // Create QR code
        const qrCode = new QRCode(document.createElement('div'), {
            text: qrData,
            width: 100,
            height: 100
        });
        
        // Build label template
        container.innerHTML = `
            <div class="qr-label">
                <div class="qr-label-content">
                    <div class="qr-code">${qrCode._el.innerHTML}</div>
                    <div class="label-info">
                        <div class="name">${bikeData.tipe}</div>
                        <div class="details">${bikeData.ukuran} - ${bikeData.warna || 'Standard'}</div>
                        <div class="supplier">${bikeData.supplier}</div>
                        <div class="date">Datang: ${bikeData.tanggalDatang}</div>
                    </div>
                </div>
            </div>
        `;
        
        modal.style.display = 'block';
    }

    closeModal() {
        document.getElementById('qr-modal').style.display = 'none';
    }

    printLabel() {
        window.print();
    }

    async handlePerakitan() {
        const bikeSelect = document.getElementById('stok-belum-rakit');
        const pegawai = document.getElementById('pegawai-rakit').value;
        const tanggalRakit = document.getElementById('tanggal-rakit').value;
        
        if (!bikeSelect.value || !pegawai || !tanggalRakit) {
            alert('Harap lengkapi semua field');
            return;
        }
        
        const bikeId = parseInt(bikeSelect.value);
        
        try {
            // Update bike status
            await this.db.updateBikeStatus(bikeId, 'sudah-rakit');
            
            // Add assembly record
            await this.db.addAssemblyRecord(bikeId, pegawai, tanggalRakit);
            
            // Reset form
            document.getElementById('pegawai-rakit').value = '';
            document.getElementById('tanggal-rakit').value = '';
            
            // Reload data
            await this.loadStokForPerakitan();
            await this.loadRiwayatPerakitan();
            await this.updateDashboard();
            
            alert('Perakitan berhasil dicatat!');
            
        } catch (error) {
            console.error('Error processing assembly:', error);
            alert('Error memproses perakitan');
        }
    }

    async loadStokForPerakitan() {
        const stokBelumRakit = await this.db.getBikesByStatus('belum-rakit');
        const select = document.getElementById('stok-belum-rakit');
        
        // Clear existing options except first one
        while (select.options.length > 1) {
            select.remove(1);
        }
        
        // Add options
        stokBelumRakit.forEach(bike => {
            const option = document.createElement('option');
            option.value = bike.id;
            option.textContent = `${bike.tipe} - ${bike.ukuran} - ${bike.lokasi} (${bike.warna || 'Standard'})`;
            select.appendChild(option);
        });
    }

    async loadRiwayatPerakitan() {
        const riwayat = await this.db.getAllAssemblyRecords();
        const container = document.getElementById('list-riwayat-perakitan');
        
        // Get bike details for each assembly record
        const riwayatWithDetails = await Promise.all(
            riwayat.map(async (record) => {
                const bike = await this.db.get('bikes', record.bikeId);
                return { ...record, bike };
            })
        );
        
        container.innerHTML = riwayatWithDetails.map(record => `
            <div class="stok-item">
                <div class="stok-header">
                    <div class="stok-name">${record.bike.tipe} - ${record.bike.ukuran}</div>
                </div>
                <div class="stok-details">
                    <div>Pegawai: ${record.pegawai}</div>
                    <div>Tanggal: ${new Date(record.tanggalRakit).toLocaleDateString('id-ID')}</div>
                    <div>Lokasi: ${record.bike.lokasi}</div>
                </div>
            </div>
        `).join('');
    }

    async updateDashboard() {
        const allBikes = await this.db.getAllBikes();
        
        // Update statistics
        document.getElementById('total-stok').textContent = allBikes.length;
        document.getElementById('belum-rakit').textContent = allBikes.filter(b => b.status === 'belum-rakit').length;
        document.getElementById('sudah-rakit').textContent = allBikes.filter(b => b.status === 'sudah-rakit').length;
        
        // Update stok list
        await this.updateStokList(allBikes);
        
        // Update notifications
        this.updateNotifications(allBikes);
    }

    async updateStokList(bikes = null) {
        if (!bikes) {
            bikes = await this.db.getAllBikes();
        }
        
        const container = document.getElementById('stok-list');
        const searchTerm = document.getElementById('search-input').value.toLowerCase();
        const statusFilter = document.getElementById('status-filter').value;
        
        // Filter bikes
        let filteredBikes = bikes.filter(bike => {
            const matchesSearch = 
                bike.tipe.toLowerCase().includes(searchTerm) ||
                bike.ukuran.toLowerCase().includes(searchTerm) ||
                bike.supplier.toLowerCase().includes(searchTerm) ||
                (bike.warna && bike.warna.toLowerCase().includes(searchTerm));
            
            const matchesStatus = !statusFilter || bike.status === statusFilter;
            
            return matchesSearch && matchesStatus;
        });
        
        container.innerHTML = filteredBikes.map(bike => {
            const isOld = this.isStokLama(bike);
            const statusClass = this.getStatusClass(bike.status);
            const statusText = this.getStatusText(bike.status);
            
            return `
                <div class="stok-item ${bike.status} ${isOld ? 'lama' : ''}">
                    <div class="stok-header">
                        <div class="stok-name">${bike.tipe} - ${bike.ukuran}</div>
                        <span class="stok-status ${statusClass}">${statusText}</span>
                    </div>
                    <div class="stok-details">
                        <div>Supplier: ${bike.supplier} | Lokasi: ${bike.lokasi}</div>
                        <div>Warna: ${bike.warna || 'Standard'} | Unit/Kemasan: ${bike.unitPerKemasan}</div>
                        <div>Datang: ${bike.tanggalDatang} | Kemasan: ${bike.kemasan}</div>
                        ${isOld ? '<div style="color: #d32f2f; font-weight: bold;">⚠ Stok sudah lama (>3 bulan)</div>' : ''}
                    </div>
                    <div class="stok-actions">
                        <button class="btn-small btn-qr" onclick="app.showBikeQR(${bike.id})">QR Code</button>
                        ${bike.status === 'belum-rakit' ? 
                            `<button class="btn-small btn-rakit" onclick="app.quickAssembly(${bike.id})">Quick Rakit</button>` : ''}
                        ${bike.status === 'sudah-rakit' ? 
                            `<button class="btn-small btn-jual" onclick="app.markAsSold(${bike.id})">Tandai Terjual</button>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    async showBikeQR(bikeId) {
        const bike = await this.db.get('bikes', bikeId);
        if (bike) {
            this.showQRModal(bike);
        }
    }

    async quickAssembly(bikeId) {
        const pegawaiList = await this.db.getMasterData('pegawai');
        if (pegawaiList.length === 0) {
            alert('Tambahkan dulu data pegawai di Master Data');
            return;
        }
        
        const pegawai = pegawaiList[0].value; // Use first employee
        const today = new Date().toISOString().split('T')[0];
        
        try {
            await this.db.updateBikeStatus(bikeId, 'sudah-rakit');
            await this.db.addAssemblyRecord(bikeId, pegawai, today);
            await this.updateDashboard();
            await this.loadStokForPerakitan();
            await this.loadRiwayatPerakitan();
            
            alert('Perakitan cepat berhasil!');
        } catch (error) {
            console.error('Error in quick assembly:', error);
            alert('Error memproses perakitan');
        }
    }

    async markAsSold(bikeId) {
        if (confirm('Tandai sepeda sebagai terjual?')) {
            try {
                await this.db.updateBikeStatus(bikeId, 'terjual');
                await this.db.addSaleRecord(bikeId);
                await this.updateDashboard();
                
                alert('Sepeda ditandai sebagai terjual!');
            } catch (error) {
                console.error('Error marking as sold:', error);
                alert('Error menandai sepeda terjual');
            }
        }
    }

    filterStok(searchTerm = '', statusFilter = '') {
        this.updateStokList();
    }

    updateNotifications(bikes) {
        const container = document.getElementById('notifications');
        const notifications = [];
        
        // Check for old stock
        const oldStok = bikes.filter(bike => 
            bike.status === 'belum-rakit' && this.isStokLama(bike)
        );
        
        if (oldStok.length > 0) {
            notifications.push(`
                <div class="notification warning">
                    ⚠ Ada ${oldStok.length} unit stok belum dirakit lebih dari 3 bulan
                </div>
            `);
        }
        
        // Check for low stock (you can customize this logic)
        const lowStockTypes = this.checkLowStock(bikes);
        lowStockTypes.forEach(item => {
            notifications.push(`
                <div class="notification">
                    📦 Stok ${item.tipe} - ${item.ukuran} tinggal ${item.count} unit
                </div>
            `);
        });
        
        container.innerHTML = notifications.join('');
    }

    isStokLama(bike) {
        if (bike.tanggalDatang === 'N/A') return false;
        
        const datangDate = new Date(bike.tanggalDatang);
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        
        return datangDate < threeMonthsAgo;
    }

    checkLowStock(bikes) {
        // Group by type and size
        const groups = {};
        bikes.forEach(bike => {
            if (bike.status === 'belum-rakit') {
                const key = `${bike.tipe}-${bike.ukuran}`;
                if (!groups[key]) {
                    groups[key] = { tipe: bike.tipe, ukuran: bike.ukuran, count: 0 };
                }
                groups[key].count += bike.unitPerKemasan;
            }
        });
        
        // Return items with low stock (<= 2)
        return Object.values(groups).filter(item => item.count <= 2);
    }

    getStatusClass(status) {
        const classes = {
            'belum-rakit': 'status-belum-rakit',
            'sudah-rakit': 'status-sudah-rakit',
            'terjual': 'status-terjual'
        };
        return classes[status] || '';
    }

    getStatusText(status) {
        const texts = {
            'belum-rakit': 'Belum Dirakit',
            'sudah-rakit': 'Siap Jual',
            'terjual': 'Terjual'
        };
        return texts[status] || status;
    }

    switchTab(tabName) {
        // Update active tab button
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        
        // Update active tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(tabName).classList.add('active');
        
        this.currentTab = tabName;
        
        // Load tab-specific data
        if (tabName === 'perakitan') {
            this.loadStokForPerakitan();
            this.loadRiwayatPerakitan();
        }
    }
}

// QR Code library (simplified version)
class QRCode {
    constructor(element, options) {
        this._el = element;
        this._options = options;
        this.generate();
    }
    
    generate() {
        // Simple QR code representation (in real app, use proper QR library)
        this._el.innerHTML = `
            <div style="width: ${this._options.width}px; height: ${this._options.height}px; 
                       background: #f0f0f0; display: flex; align-items: center; justify-content: center;
                       border: 1px solid #ccc;">
                <div style="text-align: center; font-size: 8px;">
                    QR CODE<br/>${this._options.text.substring(0, 20)}...
                </div>
            </div>
        `;
    }
}

// Initialize app when DOM is loaded
let app;
document.addEventListener('DOMContentLoaded', async () => {
    app = new InventoryApp();
});

// Global functions untuk onclick events
function addMasterData(type) {
    if (app) app.addMasterData(type);
}
