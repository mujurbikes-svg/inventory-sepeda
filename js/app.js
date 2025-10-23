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

        // Tambah Stok button
        document.getElementById('btn-tambah-stok').addEventListener('click', () => {
            this.showFormInput();
        });

        // Batal button
        document.getElementById('btn-batal-input').addEventListener('click', () => {
            this.hideFormInput();
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

        // Modal events
        document.querySelector('.close').addEventListener('click', () => {
            this.closeModal();
        });

        document.getElementById('btn-tutup-modal').addEventListener('click', () => {
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
        
        // Load data stok untuk tab stok
        await this.loadDataStok();
    }

    async loadMasterData() {
        const types = ['nama-sepeda', 'tipe', 'supplier', 'ukuran', 'kemasan', 'lokasi', 'pegawai'];
        
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

    showFormInput() {
        document.getElementById('form-input-container').style.display = 'block';
        document.getElementById('btn-tambah-stok').style.display = 'none';
    }

    hideFormInput() {
        document.getElementById('form-input-container').style.display = 'none';
        document.getElementById('btn-tambah-stok').style.display = 'block';
        document.getElementById('form-input-stok').reset();
    }

    async handleInputStok() {
        const formData = {
            namaSepeda: document.getElementById('nama-sepeda').value,
            tipe: document.getElementById('tipe').value,
            supplier: document.getElementById('supplier').value,
            ukuran: document.getElementById('ukuran').value,
            warna: document.getElementById('warna').value || '',
            kemasan: document.getElementById('kemasan').value,
            unitPerKemasan: parseInt(document.getElementById('unit-per-kemasan').value),
            lokasi: document.getElementById('lokasi').value,
            tanggalDatang: document.getElementById('tanggal-datang').value || 'N/A'
        };

        // Validasi
        if (!formData.namaSepeda || !formData.tipe || !formData.supplier || !formData.ukuran || 
            !formData.kemasan || !formData.lokasi) {
            alert('Harap lengkapi semua field yang wajib diisi!');
            return;
        }

        try {
            const bikeId = await this.db.addBike(formData);
            formData.id = bikeId;
            
            // Show QR modal
            this.showQRModal(formData);
            
            // Hide form
            this.hideFormInput();
            
            // Update semua data
            await this.updateDashboard();
            await this.loadDataStok();
            await this.loadStokForPerakitan();
            
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
            nama: bikeData.namaSepeda,
            tipe: bikeData.tipe,
            supplier: bikeData.supplier,
            ukuran: bikeData.ukuran
        });
        
        // Clear previous QR code
        container.innerHTML = `
            <div class="qr-label">
                <div class="qr-label-content">
                    <div class="qr-code" id="qr-code-element"></div>
                    <div class="label-info">
                        <div class="name">${bikeData.namaSepeda}</div>
                        <div class="details">${bikeData.tipe} - ${bikeData.ukuran}</div>
                        <div class="supplier">${bikeData.supplier}</div>
                        <div class="date">Datang: ${bikeData.tanggalDatang}</div>
                    </div>
                </div>
            </div>
        `;
        
        // Generate QR code
        const qrCode = new QRCode(document.getElementById('qr-code-element'), {
            text: qrData,
            width: 100,
            height: 100,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });
        
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
            document.getElementById('stok-belum-rakit').selectedIndex = 0;
            
            // Reload data
            await this.loadStokForPerakitan();
            await this.loadRiwayatPerakitan();
            await this.updateDashboard();
            await this.loadDataStok();
            
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
            option.textContent = `${bike.namaSepeda} - ${bike.tipe} - ${bike.ukuran} - ${bike.lokasi}`;
            select.appendChild(option);
        });
    }

    async loadRiwayatPerakitan() {
        const riwayat = await this.db.getAllAssemblyRecords();
        const container = document.getElementById('list-riwayat-perakitan');
        
        if (riwayat.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #666;">Belum ada riwayat perakitan</p>';
            return;
        }
        
        // Get bike details for each assembly record
        const riwayatWithDetails = await Promise.all(
            riwayat.map(async (record) => {
                const bike = await this.db.get('bikes', record.bikeId);
                return { ...record, bike };
            })
        );
        
        // Sort by date descending
        riwayatWithDetails.sort((a, b) => new Date(b.tanggalRakit) - new Date(a.tanggalRakit));
        
        container.innerHTML = riwayatWithDetails.map(record => `
            <div class="stok-item sudah-rakit">
                <div class="stok-header">
                    <div class="stok-name">${record.bike.namaSepeda} - ${record.bike.tipe}</div>
                    <span class="stok-status status-sudah-rakit">Siap Jual</span>
                </div>
                <div class="stok-details">
                    <div class="detail-info">Ukuran: ${record.bike.ukuran} | Warna: ${record.bike.warna || 'Standard'}</div>
                    <div class="detail-info">Pegawai: ${record.pegawai} | Tanggal: ${new Date(record.tanggalRakit).toLocaleDateString('id-ID')}</div>
                    <div class="detail-info">Lokasi: ${record.bike.lokasi}</div>
                </div>
            </div>
        `).join('');
    }

    async loadDataStok() {
        const allBikes = await this.db.getAllBikes();
        const container = document.getElementById('list-stok-terinput');
        
        if (allBikes.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #666;">Belum ada data stok. Klik "Tambah Sepeda" untuk mulai.</p>';
            return;
        }
        
        // Sort by creation date descending
        allBikes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        container.innerHTML = allBikes.map(bike => {
            const isOld = this.isStokLama(bike);
            const statusClass = this.getStatusClass(bike.status);
            const statusText = this.getStatusText(bike.status);
            
            return `
                <div class="stok-item ${bike.status} ${isOld ? 'lama' : ''}">
                    <div class="stok-header">
                        <div class="nama-sepeda">${bike.namaSepeda}</div>
                        <span class="stok-status ${statusClass}">${statusText}</span>
                    </div>
                    <div class="stok-details">
                        <div class="detail-info">${bike.tipe} - ${bike.ukuran} | ${bike.warna || 'Standard'}</div>
                        <div class="detail-info">Supplier: ${bike.supplier} | Lokasi: ${bike.lokasi}</div>
                        <div class="detail-info">Kemasan: ${bike.kemasan} | Unit: ${bike.unitPerKemasan} | Datang: ${bike.tanggalDatang}</div>
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
                bike.namaSepeda.toLowerCase().includes(searchTerm) ||
                bike.tipe.toLowerCase().includes(searchTerm) ||
                bike.ukuran.toLowerCase().includes(searchTerm) ||
                bike.supplier.toLowerCase().includes(searchTerm) ||
                (bike.warna && bike.warna.toLowerCase().includes(searchTerm));
            
            const matchesStatus = !statusFilter || bike.status === statusFilter;
            
            return matchesSearch && matchesStatus;
        });
        
        if (filteredBikes.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #666;">Tidak ada data yang sesuai dengan filter</p>';
            return;
        }
        
        container.innerHTML = filteredBikes.map(bike => {
            const isOld = this.isStokLama(bike);
            const statusClass = this.getStatusClass(bike.status);
            const statusText = this.getStatusText(bike.status);
            
            return `
                <div class="stok-item ${bike.status} ${isOld ? 'lama' : ''}">
                    <div class="stok-header">
                        <div class="nama-sepeda">${bike.namaSepeda}</div>
                        <span class="stok-status ${statusClass}">${statusText}</span>
                    </div>
                    <div class="stok-details">
                        <div class="detail-info">${bike.tipe} - ${bike.ukuran} | ${bike.warna || 'Standard'}</div>
                        <div class="detail-info">Supplier: ${bike.supplier} | Lokasi: ${bike.lokasi}</div>
                        <div class="detail-info">Kemasan: ${bike.kemasan} | Unit: ${bike.unitPerKemasan} | Datang: ${bike.tanggalDatang}</div>
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
            await this.loadDataStok();
            
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
                await this.loadDataStok();
                
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
        
        // Check for low stock
        const lowStockTypes = this.checkLowStock(bikes);
        lowStockTypes.forEach(item => {
            notifications.push(`
                <div class="notification">
                    📦 Stok ${item.nama} - ${item.ukuran} tinggal ${item.count} unit
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
        // Group by nama and size
        const groups = {};
        bikes.forEach(bike => {
            if (bike.status === 'belum-rakit') {
                const key = `${bike.namaSepeda}-${bike.ukuran}`;
                if (!groups[key]) {
                    groups[key] = { nama: bike.namaSepeda, ukuran: bike.ukuran, count: 0 };
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
        } else if (tabName === 'stok') {
            this.loadDataStok();
        } else if (tabName === 'master') {
            this.loadMasterData();
        }
    }
}

// QR Code library
class QRCode {
    constructor(element, options) {
        this._el = element;
        this._options = options;
        this.generate();
    }
    
    generate() {
        // Simple QR code representation
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${this._options.width}x${this._options.height}&data=${encodeURIComponent(this._options.text)}`;
        
        this._el.innerHTML = `
            <img src="${qrUrl}" alt="QR Code" style="width: 100%; height: 100%;">
        `;
    }
}

// Static properties untuk QRCode
QRCode.CorrectLevel = {
    L: 1,
    M: 0,
    Q: 3,
    H: 2
};

// Initialize app when DOM is loaded
let app;
document.addEventListener('DOMContentLoaded', async () => {
    app = new InventoryApp();
});

// Global functions untuk onclick events
function addMasterData(type) {
    if (app) app.addMasterData(type);
    }
