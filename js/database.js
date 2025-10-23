// Database configuration untuk IndexedDB
const DB_NAME = 'InventorySepeda';
const DB_VERSION = 1;

class Database {
    constructor() {
        this.db = null;
        this.init();
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
    const db = event.target.result;

    // Store untuk data sepeda
    if (!db.objectStoreNames.contains('bikes')) {
        const bikeStore = db.createObjectStore('bikes', { 
            keyPath: 'id', 
            autoIncrement: true 
        });
        bikeStore.createIndex('status', 'status', { unique: false });
        bikeStore.createIndex('tipe', 'tipe', { unique: false });
        bikeStore.createIndex('supplier', 'supplier', { unique: false });
        bikeStore.createIndex('namaSepeda', 'namaSepeda', { unique: false });
    }

    // Store untuk master data - TAMBAH SEMUA TYPE YANG DIBUTUHKAN
    if (!db.objectStoreNames.contains('masters')) {
        const masterStore = db.createObjectStore('masters', { 
            keyPath: 'id', 
            autoIncrement: true 
        });
        masterStore.createIndex('type', 'type', { unique: false });
        
        // Add default data untuk ukuran
        const defaultSizes = ['16"', '18"', '20"', '24"', '26"', '27.5"', '29"'];
        defaultSizes.forEach(size => {
            masterStore.add({ type: 'ukuran', value: size });
        });
        
        // Add default kemasan
        const defaultKemasan = ['Karung', 'Kardus', 'Box', 'Plastik'];
        defaultKemasan.forEach(kemasan => {
            masterStore.add({ type: 'kemasan', value: kemasan });
        });
        
        // Add default lokasi
        const defaultLokasi = ['Rak A', 'Rak B', 'Gudang Belakang', 'Gudang Depan'];
        defaultLokasi.forEach(lokasi => {
            masterStore.add({ type: 'lokasi', value: lokasi });
        });
    }

    // Store untuk riwayat perakitan
    if (!db.objectStoreNames.contains('assembly')) {
        const assemblyStore = db.createObjectStore('assembly', { 
            keyPath: 'id', 
            autoIncrement: true 
        });
        assemblyStore.createIndex('bikeId', 'bikeId', { unique: false });
        assemblyStore.createIndex('pegawai', 'pegawai', { unique: false });
    }

    // Store untuk penjualan
    if (!db.objectStoreNames.contains('sales')) {
        const salesStore = db.createObjectStore('sales', { 
            keyPath: 'id', 
            autoIncrement: true 
        });
        salesStore.createIndex('bikeId', 'bikeId', { unique: false });
    }
};
        });
    }

    // Generic methods untuk semua store
    async add(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.add(data);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getAll(storeName, index = null, value = null) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            let request;

            if (index && value) {
                const idx = store.index(index);
                request = idx.getAll(value);
            } else {
                request = store.getAll();
            }

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async get(storeName, key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(key);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async update(storeName, key, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put({ ...data, id: key });

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async delete(storeName, key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(key);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Specific methods untuk bikes
    async addBike(bikeData) {
        const data = {
            ...bikeData,
            status: 'belum-rakit',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        return this.add('bikes', data);
    }

    async getAllBikes() {
        return this.getAll('bikes');
    }

    async getBikesByStatus(status) {
        return this.getAll('bikes', 'status', status);
    }

    async updateBikeStatus(bikeId, newStatus) {
        const bike = await this.get('bikes', bikeId);
        if (bike) {
            bike.status = newStatus;
            bike.updatedAt = new Date().toISOString();
            return this.update('bikes', bikeId, bike);
        }
    }

    // Methods untuk master data
    async getMasterData(type) {
        const allMasters = await this.getAll('masters');
        return allMasters.filter(master => master.type === type);
    }

    async addMasterData(type, value) {
        const data = {
            type: type,
            value: value,
            createdAt: new Date().toISOString()
        };
        return this.add('masters', data);
    }

    async deleteMasterData(id) {
        return this.delete('masters', id);
    }

    // Methods untuk perakitan
    async addAssemblyRecord(bikeId, pegawai, tanggalRakit) {
        const data = {
            bikeId: bikeId,
            pegawai: pegawai,
            tanggalRakit: tanggalRakit,
            createdAt: new Date().toISOString()
        };
        return this.add('assembly', data);
    }

    async getAllAssemblyRecords() {
        return this.getAll('assembly');
    }

    // Methods untuk penjualan
    async addSaleRecord(bikeId) {
        const data = {
            bikeId: bikeId,
            tanggalJual: new Date().toISOString(),
            createdAt: new Date().toISOString()
        };
        return this.add('sales', data);
    }
}

// Initialize database
const db = new Database();
