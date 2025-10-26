class BikeInventory {
    constructor() {
        this.bikes = JSON.parse(localStorage.getItem('bikes')) || [];
        this.masterData = JSON.parse(localStorage.getItem('masterData')) || {
            types: ['MTB', 'Road Bike', 'City Bike', 'BMX'],
            sizes: ['16"', '18"', '20"', '24"', '26"', '27.5"', '29"'],
            suppliers: ['Supplier A', 'Supplier B', 'Supplier C'],
            packages: ['Kardus', 'Karton', 'Plastik']
        };
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadMasterData();
        this.loadDashboard();
        this.setupNavigation();
    }

    setupEventListeners() {
        // Form submission
        document.getElementById('bike-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addBike();
        });

        // QR Code generation
        document.getElementById('generate-qr').addEventListener('click', () => {
            this.generateQRCode();
        });

        // QR Code scanning
        document.getElementById('start-scan').addEventListener('click', () => {
            this.startQRScan();
        });

        document.getElementById('stop-scan').addEventListener('click', () => {
            this.stopQRScan();
        });
    }

    setupNavigation() {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const page = e.target.dataset.page;
                this.showPage(page);
                
                // Update active button
                document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
            });
        });
    }

    showPage(pageName) {
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        document.getElementById(pageName).classList.add('active');
    }

    loadMasterData() {
        // Load types
        const typeSelect = document.getElementById('bike-type');
        typeSelect.innerHTML = '<option value="">Pilih Tipe</option>';
        this.masterData.types.forEach(type => {
            typeSelect.innerHTML += `<option value="${type}">${type}</option>`;
        });

        // Load sizes
        const sizeSelect = document.getElementById('bike-size');
        sizeSelect.innerHTML = '<option value="">Pilih Ukuran</option>';
        this.masterData.sizes.forEach(size => {
            sizeSelect.innerHTML += `<option value="${size}">${size}</option>`;
        });

        // Load suppliers
        const supplierSelect = document.getElementById('supplier');
        supplierSelect.innerHTML = '<option value="">Pilih Supplier</option>';
        this.masterData.suppliers.forEach(supplier => {
            supplierSelect.innerHTML += `<option value="${supplier}">${supplier}</option>`;
        });

        // Load packages
        const packageSelect = document.getElementById('package-type');
        packageSelect.innerHTML = '<option value="">Pilih Kemasan</option>';
        this.masterData.packages.forEach(pkg => {
            packageSelect.innerHTML += `<option value="${pkg}">${pkg}</option>`;
        });

        // Update master data lists
        this.updateMasterLists();
    }

    updateMasterLists() {
        const updateList = (listId, data) => {
            const list = document.getElementById(listId);
            list.innerHTML = '';
            data.forEach(item => {
                const li = document.createElement('li');
                li.innerHTML = `
                    ${item}
                    <button class="delete-btn" onclick="inventory.deleteMasterItem('${listId.replace('-list', '')}', '${item}')">Hapus</button>
                `;
                list.appendChild(li);
            });
        };

        updateList('type-list', this.masterData.types);
        updateList('size-list', this.masterData.sizes);
        updateList('supplier-list', this.masterData.suppliers);
        updateList('package-list', this.masterData.packages);
    }

    addMasterData(type) {
        const inputMap = {
            type: 'new-type',
            size: 'new-size',
            supplier: 'new-supplier',
            package: 'new-package'
        };

        const input = document.getElementById(inputMap[type]);
        const value = input.value.trim();

        if (value && !this.masterData[type + 's'].includes(value)) {
            this.masterData[type + 's'].push(value);
            this.saveMasterData();
            this.loadMasterData();
            input.value = '';
        }
    }

    deleteMasterItem(type, item) {
        this.masterData[type + 's'] = this.masterData[type + 's'].filter(i => i !== item);
        this.saveMasterData();
        this.loadMasterData();
    }

    saveMasterData() {
        localStorage.setItem('masterData', JSON.stringify(this.masterData));
    }

    addBike() {
        const formData = {
            id: Date.now().toString(),
            name: document.getElementById('bike-name').value,
            type: document.getElementById('bike-type').value,
            size: document.getElementById('bike-size').value,
            supplier: document.getElementById('supplier').value,
            packageType: document.getElementById('package-type').value,
            packageCount: parseInt(document.getElementById('package-count').value),
            unitsPerPackage: parseInt(document.getElementById('units-per-package').value),
            arrivalDate: document.getElementById('arrival-date').value,
            status: 'belum-rakit',
            assembledDate: null,
            soldDate: null
        };

        formData.totalUnits = formData.packageCount * formData.unitsPerPackage;

        this.bikes.push(formData);
        this.saveBikes();
        this.loadDashboard();
        document.getElementById('bike-form').reset();
        alert('Data sepeda berhasil disimpan!');
    }

    updateBikeStatus(bikeId, newStatus) {
        const bike = this.bikes.find(b => b.id === bikeId);
        if (bike) {
            bike.status = newStatus;
            if (newStatus === 'sudah-rakit') {
                bike.assembledDate = new Date().toISOString().split('T')[0];
            } else if (newStatus === 'terjual') {
                bike.soldDate = new Date().toISOString().split('T')[0];
            }
            this.saveBikes();
            this.loadDashboard();
        }
    }

    saveBikes() {
        localStorage.setItem('bikes', JSON.stringify(this.bikes));
    }

    loadDashboard() {
        this.updateStats();
        this.renderBikeCards();
    }

    updateStats() {
        const belumRakit = this.bikes.filter(b => b.status === 'belum-rakit').length;
        const sudahRakit = this.bikes.filter(b => b.status === 'sudah-rakit').length;
        const terjual = this.bikes.filter(b => b.status === 'terjual').length;

        document.getElementById('count-belum-rakit').textContent = belumRakit;
        document.getElementById('count-sudah-rakit').textContent = sudahRakit;
        document.getElementById('count-terjual').textContent = terjual;
    }

    renderBikeCards() {
        const container = document.getElementById('bike-cards');
        container.innerHTML = '';

        // Group bikes by identical properties
        const groupedBikes = this.bikes.reduce((groups, bike) => {
            const key = `${bike.name}-${bike.type}-${bike.size}-${bike.supplier}-${bike.status}`;
            if (!groups[key]) {
                groups[key] = { ...bike, quantity: 0 };
            }
            groups[key].quantity += bike.totalUnits;
            return groups;
        }, {});

        Object.values(groupedBikes).forEach(bike => {
            const card = document.createElement('div');
            card.className = 'bike-card';
            card.innerHTML = `
                <h3>${bike.name}</h3>
                <div class="bike-info">${bike.type} • ${bike.size}</div>
                <div class="bike-info">${bike.supplier} • ${bike.arrivalDate}</div>
                <div class="bike-info">
                    <span class="status-badge ${bike.status}">
                        ${this.getStatusText(bike.status)}
                    </span>
                    • Quantity: ${bike.quantity}
                </div>
                <div class="action-buttons">
                    ${bike.status === 'belum-rakit' ? 
                        `<button onclick="inventory.updateBikeStatus('${bike.id}', 'sudah-rakit')">Tandai Sudah Rakit</button>` : ''}
                    ${bike.status === 'sudah-rakit' ? 
                        `<button onclick="inventory.updateBikeStatus('${bike.id}', 'terjual')">Tandai Terjual</button>` : ''}
                    <button onclick="inventory.generateQRCodeForBike('${bike.id}')" style="background: #28a745;">Generate QR</button>
                </div>
            `;
            container.appendChild(card);
        });
    }

    getStatusText(status) {
        const statusMap = {
            'belum-rakit': 'Belum Rakit',
            'sudah-rakit': 'Ready Jual',
            'terjual': 'Terjual'
        };
        return statusMap[status];
    }

    generateQRCode() {
        const data = document.getElementById('qr-data').value;
        if (!data) {
            alert('Masukkan data untuk generate QR code');
            return;
        }

        const qrOutput = document.getElementById('qr-output');
        // Simple QR generation using text representation
        qrOutput.innerHTML = `
            <div style="background: white; padding: 10px; border-radius: 5px; margin: 10px 0;">
                <h4>QR Code untuk: ${data}</h4>
                <div style="background: #000; color: white; padding: 20px; text-align: center; font-family: monospace;">
                    [QR CODE: ${data}]
                </div>
                <p>Scan kode di atas untuk melihat info sepeda</p>
            </div>
        `;
    }

    generateQRCodeForBike(bikeId) {
        const bike = this.bikes.find(b => b.id === bikeId);
        if (bike) {
            document.getElementById('qr-data').value = `${bike.name}-${bike.id}`;
            this.generateQRCode();
            this.showPage('scan');
        }
    }

    async startQRScan() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: "environment" } 
            });
            
            const video = document.getElementById('qr-video');
            video.srcObject = stream;
            video.play();

            document.getElementById('start-scan').style.display = 'none';
            document.getElementById('stop-scan').style.display = 'inline-block';

            this.scanInterval = setInterval(() => {
                this.scanQRCode(video);
            }, 1000);

        } catch (err) {
            console.error('Error accessing camera:', err);
            alert('Tidak dapat mengakses kamera. Pastikan izin kamera sudah diberikan.');
        }
    }

    scanQRCode(video) {
        const canvas = document.getElementById('qr-canvas');
        const context = canvas.getContext('2d');

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code) {
            this.handleScannedQR(code.data);
        }
    }

    handleScannedQR(data) {
        const resultDiv = document.getElementById('scan-result');
        resultDiv.innerHTML = `<div style="background: #d4edda; padding: 10px; border-radius: 5px; margin: 10px 0;">
            <h4>QR Code Terbaca!</h4>
            <p>Data: ${data}</p>
            <p>Fitur pencarian berdasarkan QR code akan dikembangkan lebih lanjut</p>
        </div>`;
    }

    stopQRScan() {
        if (this.scanInterval) {
            clearInterval(this.scanInterval);
        }

        const video = document.getElementById('qr-video');
        if (video.srcObject) {
            video.srcObject.getTracks().forEach(track => track.stop());
        }

        document.getElementById('start-scan').style.display = 'inline-block';
        document.getElementById('stop-scan').style.display = 'none';
        document.getElementById('scan-result').innerHTML = '';
    }
}

// Initialize the application
const inventory = new BikeInventory();

// PWA Setup
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(() => console.log('Service Worker Registered'))
            .catch(err => console.log('Service Worker Registration Failed'));
    });
}
