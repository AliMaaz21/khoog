// API Configuration
// Use the same origin as the served page so the frontend works when
// the app is served by the backend. Fallback to localhost:3000 for file:// usage.
const API_BASE_URL = (typeof window !== 'undefined' && window.location && window.location.origin)
    ? `${window.location.origin}/api`
    : 'http://localhost:3000/api';
let authToken = null;

// API Helper Functions
async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        },
        ...options
    };

    if (authToken) {
        config.headers = {
            ...config.headers,
            Authorization: `Bearer ${authToken}`
        };
    }

    try {
        const response = await fetch(url, config);
        const responseText = await response.text();
        let data;

        try {
            data = responseText ? JSON.parse(responseText) : {};
        } catch (parseError) {
            throw new Error(`Invalid JSON response from ${url}: ${responseText}`);
        }

        if (!response.ok) {
            throw new Error(data.error || `HTTP error ${response.status}: ${response.statusText}`);
        }

        return data;
    } catch (error) {
        console.error('API request failed:', error);
        showNotification(error.message, 'error');
        throw error;
    }
}

// Authentication Functions
async function login(username, password) {
    try {
        const data = await apiRequest('/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });

        authToken = data.token;
        localStorage.setItem('authToken', authToken);
        localStorage.setItem('currentUser', JSON.stringify(data.user));

        return data.user;
    } catch (error) {
        throw error;
    }
}

function logout() {
    authToken = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
}

function isAuthenticated() {
    const token = localStorage.getItem('authToken');
    if (token) {
        authToken = token;
        return true;
    }
    return false;
}

// Data Loading Functions
async function loadOrders() {
    try {
        const apiOrders = await apiRequest('/orders');
        orders = apiOrders.map(normalizeOrder);
        return orders;
    } catch (error) {
        console.error('Failed to load orders:', error);
        const savedOrders = localStorage.getItem('poultryOrders');
        orders = savedOrders ? JSON.parse(savedOrders).map(normalizeOrder) : [];
        return orders;
    }
}

function normalizeOrder(order) {
    const normalized = {
        ...order,
        id: order.id,
        date: order.order_date || order.date || order.created_at || order.createdAt || '',
        customer: order.customer_name || order.customer || order.client_name || '',
        type: order.chicken_type || order.type || '',
        pricePerKg: parseFloat(order.price_per_kg ?? order.pricePerKg ?? 0) || 0,
        quantity: parseFloat(order.quantity ?? 0) || 0,
        total: parseFloat(order.total_price ?? order.total ?? 0) || 0,
        clientId: String(order.client_id ?? order.clientId ?? ''),
        status: order.status || (order.completed ? 'delivered' : 'pending'),
        completed: order.completed === true || order.status === 'delivered',
        takenBy: order.takenBy || order.created_by || currentUser?.username || '',
        phone: order.phone || '',
        address: order.address || '',
        createdAt: order.created_at || order.createdAt || ''
    };

    return normalized;
}

async function loadClients() {
    try {
        const apiClients = await apiRequest('/clients');
        clients = apiClients.map(client => ({
            ...client,
            id: String(client.id),
            active: client.active !== false
        }));
        return clients;
    } catch (error) {
        console.error('Failed to load clients:', error);
        const savedClients = localStorage.getItem('poultryClients');
        clients = savedClients ? JSON.parse(savedClients) : [];
        return clients;
    }
}

async function loadCars() {
    try {
        cars = await apiRequest('/cars');
        return cars;
    } catch (error) {
        console.error('Failed to load cars:', error);
        cars = [];
        return [];
    }
}

async function loadWorkers() {
    try {
        workers = await apiRequest('/workers');
        return workers;
    } catch (error) {
        console.error('Failed to load workers:', error);
        workers = [];
        return [];
    }
}

async function loadWasteSales() {
    try {
        wasteSales = await apiRequest('/waste');
        return wasteSales;
    } catch (error) {
        console.error('Failed to load waste sales:', error);
        wasteSales = [];
        return [];
    }
}

async function loadBrokers() {
    try {
        const apiBrokers = await apiRequest('/brokers');
        const savedBrokers = JSON.parse(localStorage.getItem('poultryBrokers') || '[]');
        const savedBrokerMap = new Map(savedBrokers.map(broker => [String(broker.id), broker]));

        brokers = apiBrokers.map(broker => {
            const saved = savedBrokerMap.get(String(broker.id));
            return {
                ...broker,
                id: String(broker.id),
                name: broker.name || '',
                phone: broker.phone || '',
                address: saved?.address || broker.address || '',
                totalDue: saved?.totalDue ?? 0,
                paidAmount: saved?.paidAmount ?? 0,
                payments: Array.isArray(saved?.payments) ? saved.payments : [],
                createdAt: broker.created_at || broker.createdAt || ''
            };
        });

        const localOnlyBrokers = savedBrokers.filter(saved => !brokers.some(broker => broker.id === String(saved.id)));
        if (localOnlyBrokers.length) {
            brokers = brokers.concat(localOnlyBrokers.map(broker => ({
                ...broker,
                id: String(broker.id)
            })));
        }

        return brokers;
    } catch (error) {
        console.error('Failed to load brokers:', error);
        const savedBrokers = localStorage.getItem('poultryBrokers');
        brokers = savedBrokers ? JSON.parse(savedBrokers) : [];
        brokers = brokers.map(broker => ({
            ...broker,
            id: String(broker.id),
            totalDue: broker.totalDue ?? 0,
            paidAmount: broker.paidAmount ?? 0,
            payments: Array.isArray(broker.payments) ? broker.payments : []
        }));
        return brokers;
    }
}

async function loadShops() {
    try {
        shops = await apiRequest('/shops');
        return shops;
    } catch (error) {
        console.error('Failed to load shops:', error);
        shops = [];
        return [];
    }
}

async function loadReminders() {
    try {
        reminders = await apiRequest('/reminders');
        return reminders;
    } catch (error) {
        console.error('Failed to load reminders:', error);
        reminders = [];
        return [];
    }
}

async function loadScheduledBills() {
    try {
        scheduledBills = await apiRequest('/bills');
        return scheduledBills;
    } catch (error) {
        console.error('Failed to load scheduled bills:', error);
        scheduledBills = [];
        return [];
    }
}

async function loadDashboardStats() {
    try {
        const stats = await apiRequest('/dashboard/stats');
        return stats;
    } catch (error) {
        console.error('Failed to load dashboard stats:', error);
        return {
            totalOrders: 0,
            totalRevenue: 0,
            totalChicken: 0,
            totalClients: 0
        };
    }
}

// Data Saving Functions
async function saveOrder(orderData) {
    try {
        const result = await apiRequest('/orders', {
            method: 'POST',
            body: JSON.stringify(orderData)
        });
        return result;
    } catch (error) {
        throw error;
    }
}

async function saveClient(clientData) {
    try {
        const result = await apiRequest('/clients', {
            method: 'POST',
            body: JSON.stringify(clientData)
        });
        return result;
    } catch (error) {
        throw error;
    }
}

async function saveCar(carData) {
    try {
        const result = await apiRequest('/cars', {
            method: 'POST',
            body: JSON.stringify(carData)
        });
        return result;
    } catch (error) {
        throw error;
    }
}

async function saveWorker(workerData) {
    try {
        const result = await apiRequest('/workers', {
            method: 'POST',
            body: JSON.stringify(workerData)
        });
        return result;
    } catch (error) {
        throw error;
    }
}

async function saveWasteSale(wasteData) {
    try {
        const result = await apiRequest('/waste', {
            method: 'POST',
            body: JSON.stringify(wasteData)
        });
        return result;
    } catch (error) {
        throw error;
    }
}

async function saveBroker(brokerData) {
    try {
        const result = await apiRequest('/brokers', {
            method: 'POST',
            body: JSON.stringify(brokerData)
        });
        return result;
    } catch (error) {
        throw error;
    }
}

async function saveShop(shopData) {
    try {
        const result = await apiRequest('/shops', {
            method: 'POST',
            body: JSON.stringify(shopData)
        });
        return result;
    } catch (error) {
        throw error;
    }
}

async function saveReminder(reminderData) {
    try {
        const result = await apiRequest('/reminders', {
            method: 'POST',
            body: JSON.stringify(reminderData)
        });
        return result;
    } catch (error) {
        throw error;
    }
}

async function saveScheduledBill(billData) {
    try {
        const result = await apiRequest('/bills', {
            method: 'POST',
            body: JSON.stringify(billData)
        });
        return result;
    } catch (error) {
        throw error;
    }
}

const translations = {
    en: {
        "login-title": "Login to Ali Khail Poultry System",
        "select-user": "Select User",
        "password": "Password",
        "login-btn": "Login",
        "logout": "Logout",
        "dashboard": "Dashboard",
        "all-orders": "All Orders",
        "order-records": "Order Records",
        "client-management": "Clients",
        "car-management": "Cars",
        "worker-management": "Workers",
        "waste-management": "Waste",
        "shop-management": "Shops",
        "broker-management": "Brokers",
        "total-orders": "Total Orders",
        "total-revenue": "Total Revenue",
        "total-chicken": "Total Chicken Sold",
        "total-clients": "Total Clients",
        "add-order": "Add New Order",
        "order-date": "Order Date",
        "select-client": "Select Client",
        "quick-add-client": "Quick Add New Client",
        "client-name": "Client Name",
        "customer-name": "Customer Name",
        "phone": "Phone Number",
        "address": "Delivery Address",
        "chicken-type": "Chicken Type",
        "select-type": "Select chicken type",
        "price-per-kg": "Price per kg (PKR)",
        "quantity": "Quantity (kg)",
        "add-order-btn": "Add Order",
        "load-last-order": "Load My Last Order",
        "your-last-order": "Your Last Order",
        "recent-orders": "Recent Orders",
        "date": "Date",
        "time": "Time",
        "customer": "Customer",
        "type": "Type",
        "rate": "Rate (PKR/kg)",
        "price": "Total (PKR)",
        "status": "Status",
        "delivered": "Delivered",
        "processing": "Processing",
        "pending": "Pending",
        "footer-text": "Ali Khail Poultry Management System. All rights reserved.",
        "total-order-price": "Total Order Price",
        "actions": "Actions",
        "edit": "Edit",
        "delete": "Delete",
        "activate": "Activate",
        "deactivate": "Deactivate",
        "active": "Active",
        "inactive": "Inactive",
        "payment": "Payment",
        "history": "History",
        "bill": "Bill",
        "search": "Search",
        "search-by-name": "Search by Name",
        "search-by-location": "Search by Location",
        "location": "Location",
        "back-to-dashboard": "Back to Dashboard",
        "export-data": "Export Data",
        "add-client": "Add New Client",
        "save-client": "Save Client",
        "cancel": "Cancel",
        "total-spent": "Total Spent",
        "edit-client": "Edit Client",
        "save-and-select": "Save & Select",
        "filter-by-date": "Filter by Date:",
        "reset-filter": "Reset Filter",
        "orders": "Orders",
        "total-kg": "Total KG",
        "export-records": "Export Records",
        "add-car": "Add New Car",
        "car-number": "Car Number",
        "car-driver": "Driver Name",
        "car-capacity": "Capacity (kg)",
        "car-status": "Status",
        "save-car": "Save Car",
        "add-worker": "Add New Worker",
        "worker-name": "Worker Name",
        "worker-role": "Role",
        "worker-salary": "Salary (PKR)",
        "worker-status": "Status",
        "save-worker": "Save Worker",
        "add-waste": "Add Waste Sale",
        "waste-date": "Sale Date",
        "waste-type": "Waste Type",
        "waste-quantity": "Quantity (kg)",
        "waste-price": "Price (PKR)",
        "waste-buyer": "Buyer Name",
        "save-waste": "Save Waste Sale",
        "more": "More",
        "reminders": "Reminders",
        "add-reminder": "Add Reminder",
        "reminder-title": "Reminder Title",
        "reminder-description": "Description",
        "reminder-date": "Date",
        "reminder-time": "Time",
        "repeat": "Repeat",
        "once": "Once",
        "daily": "Daily",
        "weekly": "Weekly",
        "monthly": "Monthly",
        "save-reminder": "Save Reminder",
        "bill-management": "Bill Management",
        "send-bill": "Send Bill",
        "schedule-bill": "Schedule Bill",
        "select-bill-client": "Select Client for Bill",
        "bill-period": "Bill Period",
        "bill-date": "Bill Date",
        "due-date": "Due Date",
        "send-now": "Send Now",
        "schedule": "Schedule",
        "scheduled-bills": "Scheduled Bills",
        "active-reminders": "Active Reminders",
        "no-reminders": "No reminders set",
        "add-shop": "Add New Shop",
        "shop-name": "Shop Name",
        "shop-location": "Location",
        "save-shop": "Save Shop",
        "add-broker": "Add New Broker",
        "broker-name": "Broker Name",
        "broker-phone": "Phone",
        "broker-address": "Address",
        "save-broker": "Save Broker",
        // New translations for remaining chicken feature
        "remaining-chicken": "Remaining Chicken",
        "add-remaining": "Add Remaining Chicken",
        "remaining-date": "Date",
        "remaining-quantity": "Quantity (kg)",
        "remaining-notes": "Notes",
        "save-remaining": "Save Remaining",
        "dead-chicken": "Dead/Unsold",
        "total-received": "Total Received",
        "total-sold": "Total Sold",
        "remaining": "Remaining",
        "record-remaining": "Record Remaining",
        "remaining-history": "Remaining History"
    },
    ur: {
        "login-title": "علی خیل پولٹری سسٹم میں لاگ ان کریں",
        "select-user": "صارف منتخب کریں",
        "password": "پاس ورڈ",
        "login-btn": "لاگ ان",
        "logout": "لاگ آؤٹ",
        "dashboard": "ڈیش بورڈ",
        "all-orders": "تمام آرڈرز",
        "order-records": "آرڈر ریکارڈز",
        "client-management": "کلائنٹس",
        "car-management": "گاڑیاں",
        "worker-management": "کارکنان",
        "waste-management": "فضلہ",
        "shop-management": "دوکانیں",
        "broker-management": "بروکرز",
        "total-orders": "کل آرڈرز",
        "total-revenue": "کل آمدنی",
        "total-chicken": "کل مرغی فروخت",
        "total-clients": "کل کلائنٹس",
        "add-order": "نیا آرڈر شامل کریں",
        "order-date": "آرڈر کی تاریخ",
        "select-client": "کلائنٹ منتخب کریں",
        "quick-add-client": "فوری نیا کلائنٹ شامل کریں",
        "client-name": "کلائنٹ کا نام",
        "customer-name": "گاہک کا نام",
        "phone": "فون نمبر",
        "address": "ڈیلیوری کا پتہ",
        "chicken-type": "مرغی کی قسم",
        "select-type": "مرغی کی قسم منتخب کریں",
        "price-per-kg": "فی کلو قیمت (PKR)",
        "quantity": "مقدار (کلو)",
        "add-order-btn": "آرڈر شامل کریں",
        "load-last-order": "میرا آخری آرڈر لوڈ کریں",
        "your-last-order": "آپ کا آخری آرڈر",
        "recent-orders": "حالیہ آرڈرز",
        "date": "تاریخ",
        "time": "وقت",
        "customer": "گاہک",
        "type": "قسم",
        "rate": "ریٹ (PKR/کلو)",
        "price": "کل (PKR)",
        "status": "حالت",
        "delivered": "ڈیلیور ہو گیا",
        "processing": "جاری ہے",
        "pending": "زیر التواء",
        "footer-text": "علی خیل پولٹری مینجمنٹ سسٹم۔ تمام حقوق محفوظ ہیں۔",
        "total-order-price": "آرڈر کی کل قیمت",
        "actions": "اعمال",
        "edit": "ترمیم",
        "delete": "حذف کریں",
        "activate": "فعال کریں",
        "deactivate": "غیر فعال کریں",
        "active": "فعال",
        "inactive": "غیر فعال",
        "payment": "ادائیگی",
        "history": "تاریخ",
        "bill": "بل",
        "search": "تلاش",
        "search-by-name": "نام سے تلاش کریں",
        "search-by-location": "مقام سے تلاش کریں",
        "location": "مقام",
        "back-to-dashboard": "ڈیش بورڈ پر واپس",
        "export-data": "ڈیٹا ایکسپورٹ کریں",
        "add-client": "نیا کلائنٹ شامل کریں",
        "save-client": "کلائنٹ محفوظ کریں",
        "cancel": "منسوخ کریں",
        "total-spent": "کل خرچ",
        "edit-client": "کلائنٹ میں ترمیم کریں",
        "save-and-select": "محفوظ کریں اور منتخب کریں",
        "filter-by-date": "تاریخ کے لحاظ سے فلٹر کریں:",
        "reset-filter": "فلٹر ری سیٹ کریں",
        "orders": "آرڈرز",
        "total-kg": "کل کلو",
        "export-records": "ریکارڈز ایکسپورٹ کریں",
        "add-car": "نیا گاڑی شامل کریں",
        "car-number": "گاڑی نمبر",
        "car-driver": "ڈرائیور کا نام",
        "car-capacity": "گنجائش (کلو)",
        "car-status": "حالت",
        "save-car": "گاڑی محفوظ کریں",
        "add-worker": "نیا کارکن شامل کریں",
        "worker-name": "کارکن کا نام",
        "worker-role": "کردار",
        "worker-salary": "تنخواہ (PKR)",
        "worker-status": "حالت",
        "save-worker": "کارکن محفوظ کریں",
        "add-waste": "فضلہ فروخت شامل کریں",
        "waste-date": "فروخت کی تاریخ",
        "waste-type": "فضلہ کی قسم",
        "waste-quantity": "مقدار (کلو)",
        "waste-price": "قیمت (PKR)",
        "waste-buyer": "خریدار کا نام",
        "save-waste": "فضلہ فروخت محفوظ کریں",
        "more": "مزید",
        "reminders": "یاد دہانیاں",
        "add-reminder": "یاد دہانی شامل کریں",
        "reminder-title": "یاد دہانی کا عنوان",
        "reminder-description": "تفصیل",
        "reminder-date": "تاریخ",
        "reminder-time": "وقت",
        "repeat": "دہرائیں",
        "once": "ایک بار",
        "daily": "روزانہ",
        "weekly": "ہفتہ وار",
        "monthly": "ماہانہ",
        "save-reminder": "یاد دہانی محفوظ کریں",
        "bill-management": "بل مینجمنٹ",
        "send-bill": "بل بھیجیں",
        "schedule-bill": "بل شیڈول کریں",
        "select-bill-client": "بل کے لیے کلائنٹ منتخب کریں",
        "bill-period": "بل کی مدت",
        "bill-date": "بل کی تاریخ",
        "due-date": "ادائیگی کی تاریخ",
        "send-now": "ابھی بھیجیں",
        "schedule": "شیڈول کریں",
        "scheduled-bills": "شیڈولڈ بلز",
        "active-reminders": "فعال یاد دہانیاں",
        "no-reminders": "کوئی یاد دہانی سیٹ نہیں",
        "add-shop": "نئی دکان شامل کریں",
        "shop-name": "دکان کا نام",
        "shop-location": "مقام",
        "save-shop": "دکان محفوظ کریں",
        "add-broker": "نیا بروکر شامل کریں",
        "broker-name": "بروکر کا نام",
        "broker-phone": "فون",
        "broker-address": "پتہ",
        "save-broker": "بروکر محفوظ کریں",
        // New translations for remaining chicken feature
        "remaining-chicken": "باقی مرغی",
        "add-remaining": "باقی مرغی شامل کریں",
        "remaining-date": "تاریخ",
        "remaining-quantity": "مقدار (کلو)",
        "remaining-notes": "نوٹس",
        "save-remaining": "محفوظ کریں",
        "dead-chicken": "مردہ/غیر فروخت شدہ",
        "total-received": "کل موصول",
        "total-sold": "کل فروخت",
        "remaining": "باقی",
        "record-remaining": "باقی ریکارڈ کریں",
        "remaining-history": "باقی کی تاریخ"
    }
};

// Debounce function for performance optimization
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Sanitize input to prevent XSS
function sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    return input.replace(/[<>]/g, '').trim();
}

// Language switching functionality
let currentLang = localStorage.getItem('preferredLanguage') || 'en';

function switchLanguage(lang) {
    currentLang = lang;
    
    // Update all elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (translations[lang] && translations[lang][key]) {
            element.textContent = translations[lang][key];
        }
    });
    
    // Update input placeholders with data-i18n-placeholder
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
        const key = element.getAttribute('data-i18n-placeholder');
        if (translations[lang] && translations[lang][key]) {
            element.placeholder = translations[lang][key];
        }
    });
    
    // Update HTML direction for Urdu
    if (lang === 'ur') {
        document.documentElement.dir = 'rtl';
        document.documentElement.lang = 'ur';
        document.body.classList.add('urdu-text');
    } else {
        document.documentElement.dir = 'ltr';
        document.documentElement.lang = 'en';
        document.body.classList.remove('urdu-text');
    }
    
    // Update active state of language buttons
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-lang') === lang) {
            btn.classList.add('active');
        }
    });
    
    // Save language preference
    localStorage.setItem('preferredLanguage', lang);
}

// Application State
let currentUser = null;
let selectedLoginUsername = null;
let orders = [];
let clients = [];
let cars = [];
let workers = [];
let wasteSales = [];
let brokers = [];
let shops = [];
let editingOrderId = null;
let reminders = [];
let scheduledBills = [];
let notificationSound = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-correct-answer-tone-2870.mp3');
let notificationCleanupTimer = null;

// DOM Elements
const loginPage = document.getElementById('login-page');
const app = document.getElementById('app');
const loginForm = document.getElementById('loginForm');
const headerUser = document.getElementById('header-user');
const headerUserImg = document.getElementById('header-user-img');
const headerUserNameTop = document.getElementById('header-user-name-top');
const headerLogoutBtn = document.getElementById('header-logout-btn');
const orderForm = document.getElementById('orderForm');
const recentOrdersTableBody = document.getElementById('recentOrdersTableBody');
const allOrdersTableBody = document.getElementById('allOrdersTableBody');
const clientsTableBody = document.getElementById('clientsTableBody');
const clientSearchName = document.getElementById('clientSearchName');
const clientSearchLocation = document.getElementById('clientSearchLocation');
const clearClientSearch = document.getElementById('clearClientSearch');
const orderRecordsTableBody = document.getElementById('orderRecordsTableBody');
const clientSelect = document.getElementById('clientSelect');
const quickAddClientBtn = document.getElementById('quick-add-client-btn');
const recordsDateFilter = document.getElementById('records-date-filter');
const resetRecordsFilterBtn = document.getElementById('reset-records-filter');
const exportRecordsBtn = document.getElementById('export-records-btn');
const addClientBtn = document.getElementById('add-client-btn');
const addCarBtn = document.getElementById('add-car-btn');
const addWorkerBtn = document.getElementById('add-worker-btn');
const addWasteBtn = document.getElementById('add-waste-btn');
const addBrokerBtn = document.getElementById('add-broker-btn');
const addShopBtn = document.getElementById('add-shop-btn');
const shopsGrid = document.getElementById('shopsGrid');
const shopModal = document.getElementById('shop-modal');
const shopForm = document.getElementById('shopForm');
const wasteForm = document.getElementById('wasteForm');
const cancelShopBtn = document.getElementById('cancel-shop-btn');
const saleModal = document.getElementById('add-sale-modal');
const saleForm = document.getElementById('saleForm');
const saleDate = document.getElementById('saleDate');
const saleShopSelect = document.getElementById('saleShopSelect');
const saleQuantity = document.getElementById('saleQuantity');
const salePricePerKg = document.getElementById('salePricePerKg');
const saleCostPerKg = document.getElementById('saleCostPerKg');
const saleTotalValue = document.getElementById('saleTotalValue');
const cancelSaleBtn = document.getElementById('cancel-sale-btn');

// New elements for remaining chicken feature
const remainingChickenModal = document.getElementById('remaining-chicken-modal');
const remainingChickenForm = document.getElementById('remainingChickenForm');
const remainingShopId = document.getElementById('remainingShopId');
const remainingDate = document.getElementById('remainingDate');
const remainingQuantity = document.getElementById('remainingQuantity');
const remainingNotes = document.getElementById('remainingNotes');
const cancelRemainingBtn = document.getElementById('cancel-remaining-btn');

// Shop payments
const shopPaymentModal = document.getElementById('shop-payment-modal');
const shopPaymentForm = document.getElementById('shopPaymentForm');
const paymentShopIdInput = document.getElementById('paymentShopId');
const shopPaymentDate = document.getElementById('shopPaymentDate');
const shopPaymentAmount = document.getElementById('shopPaymentAmount');
const shopPaymentMethod = document.getElementById('shopPaymentMethod');
const cancelShopPaymentBtn = document.getElementById('cancel-shop-payment-btn');
// Shop day summary elements
const shopDaySummaryModal = document.getElementById('shop-day-summary-modal');
const sdsShopName = document.getElementById('sds-shop-name');
const sdsDate = document.getElementById('sds-date');
const sdsTotalKg = document.getElementById('sds-total-kg');
const sdsRevenue = document.getElementById('sds-revenue');
const sdsCost = document.getElementById('sds-cost');
const sdsGrossProfit = document.getElementById('sds-gross-profit');
const sdsPayments = document.getElementById('sds-payments');
const sdsRemaining = document.getElementById('sds-remaining');
const sdsNetCash = document.getElementById('sds-net-cash');
const sdsIndicator = document.getElementById('sds-indicator');
const sdsCloseBtn = document.getElementById('sds-close-btn');
// Shop bill elements
const shopBillModal = document.getElementById('shop-bill-modal');
const shopBillBody = document.getElementById('shop-bill-body');
const shopBillPrintBtn = document.getElementById('shop-bill-print-btn');
const shopBillCloseBtn = document.getElementById('shop-bill-close-btn');
// Shop bill filter modal
const shopBillFilterModal = document.getElementById('shop-bill-filter-modal');
const billFilterForm = document.getElementById('billFilterForm');
const billFromDate = document.getElementById('billFromDate');
const billToDate = document.getElementById('billToDate');
const billFilterShopId = document.getElementById('billFilterShopId');
const cancelBillFilterBtn = document.getElementById('cancel-bill-filter-btn');
const bottomNav = document.getElementById('bottom-nav');
const navTabs = document.querySelectorAll('.nav-tab');
const dropdownLinks = document.querySelectorAll('.dropdown-content .nav-link');
const exportBottomBtn = document.getElementById('export-bottom-btn');
const logoutBottomBtn = document.getElementById('logout-bottom-btn');
const carsGrid = document.getElementById('carsGrid');
const workersGrid = document.getElementById('workersGrid');
const wasteGrid = document.getElementById('wasteGrid');
const brokersGrid = document.getElementById('brokersGrid');
const addPaymentFromDetailBtn = document.getElementById('add-payment-from-detail');

// User Orders Modal Elements
const userOrdersModal = document.getElementById('user-orders-modal');
const userOrdersModalTitle = document.getElementById('user-orders-modal-title');
const userOrdersTableBody = document.getElementById('user-orders-table-body');
const userOrdersTotal = document.getElementById('user-orders-total');
const userOrdersClose = document.querySelector('#user-orders-modal .close');

// New DG Kata elements
const topActionBar = document.getElementById('top-action-bar');
const topActionTabs = document.querySelectorAll('.top-action-tab');

// Reminder and Bill elements
const addReminderBtn = document.getElementById('add-reminder-btn');
const remindersList = document.getElementById('reminders-list');
const scheduledBillsList = document.getElementById('scheduled-bills-list');
const scheduleBillBtn = document.getElementById('schedule-bill-btn');
const sendBillBtn = document.getElementById('send-bill-btn');
const reminderModal = document.getElementById('reminder-modal');
const scheduleBillModal = document.getElementById('schedule-bill-modal');
const notificationCenter = document.getElementById('notification-center');
const notificationList = document.getElementById('notification-list');
const notificationBadge = document.getElementById('notification-badge');

// New client dropdown elements for reminder section
const immediateBillClient = document.getElementById('immediateBillClient');

// Touch slider variables
let touchStartX = 0;
let touchEndX = 0;
const pages = ['dashboard', 'orders', 'records', 'clients', 'shops', 'cars', 'workers', 'waste', 'brokers', 'reminders'];

// Initialize the application
async function initApp() {
    console.log('Initializing Ali Khail Poultry System...');

    try {
        // Show loading indicator
        showNotification('Loading data...', 'info');

        // Load data from API
        await Promise.all([
            loadOrders(),
            loadClients(),
            loadCars(),
            loadWorkers(),
            loadWasteSales(),
            loadBrokers(),
            loadShops(),
            loadReminders(),
            loadScheduledBills()
        ]);

        // Setup event listeners
        setupEventListeners();

        // Initialize UI
        await updateDashboard();
        setDefaultDate();
        populateClientDropdown();
        setupClientAutoFill();

        // Initial render
        renderClients();
        renderCars();
        renderWorkers();
        renderWasteSales();
        renderBrokers();
        renderShops();

        // Setup navigation
        setupNavigation();

        // Setup touch slider for mobile navigation
        setupTouchSlider();

        // Setup reminders and bills
        setupReminders();
        renderReminders();
        renderScheduledBills();

        // Populate client dropdowns in reminder section
        populateReminderClientDropdowns();
        populateSaleShopSelect();

        // Initialize language
        switchLanguage(currentLang);

        showNotification('Data loaded successfully!', 'success');

        // Check for due reminders every minute
        setInterval(checkDueReminders, 60000);
        
        // Setup notification cleanup every hour to prevent memory leaks
        if (notificationCleanupTimer) clearInterval(notificationCleanupTimer);
        notificationCleanupTimer = setInterval(cleanupOldNotifications, 3600000);

    } catch (error) {
        console.error('Failed to initialize app:', error);
        showNotification('Failed to load data. Please check your connection.', 'error');
    }
}

// Cleanup old notifications to prevent memory leaks
function cleanupOldNotifications() {
    if (notificationList) {
        const notifications = notificationList.children;
        if (notifications.length > 50) {
            while (notifications.length > 30) {
                notificationList.removeChild(notifications[notifications.length - 1]);
            }
        }
    }
}

// Setup touch slider for mobile navigation
function setupTouchSlider() {
    const mainContent = document.querySelector('.main-content');
    
    mainContent.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });
    
    mainContent.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, { passive: true });
}

function handleSwipe() {
    const swipeThreshold = 50;
    const currentPage = document.querySelector('.page.active');
    let currentIndex = pages.findIndex(page => currentPage.id === `${page}-page` || 
        (page === 'dashboard' && currentPage.id === 'main-dashboard-page'));
    
    if (currentIndex === -1) return;
    
    if (touchEndX < touchStartX - swipeThreshold) {
        // Swipe left - next page
        const nextIndex = (currentIndex + 1) % pages.length;
        navigateToSection(pages[nextIndex]);
    } else if (touchEndX > touchStartX + swipeThreshold) {
        // Swipe right - previous page
        const prevIndex = (currentIndex - 1 + pages.length) % pages.length;
        navigateToSection(pages[prevIndex]);
    }
}

// Setup dropdown handlers for More button
function setupDropdownHandlers() {
    const moreBtn = document.querySelector('.more-btn');
    const navDropdown = document.querySelector('.nav-dropdown');
    
    if (moreBtn && navDropdown) {
        // Remove any existing click listeners
        moreBtn.removeEventListener('click', toggleDropdown);
        // Add click listener
        moreBtn.addEventListener('click', toggleDropdown);
        
        // Close dropdown when clicking outside
        document.addEventListener('click', function(event) {
            if (!navDropdown.contains(event.target) && !moreBtn.contains(event.target)) {
                navDropdown.classList.remove('active');
            }
        });
        
        // Prevent dropdown from closing when clicking inside it
        const dropdownContent = navDropdown.querySelector('.dropdown-content');
        if (dropdownContent) {
            dropdownContent.addEventListener('click', function(event) {
                event.stopPropagation();
            });
        }
    }
}

function toggleDropdown(event) {
    event.stopPropagation();
    const navDropdown = document.querySelector('.nav-dropdown');
    if (navDropdown) {
        navDropdown.classList.toggle('active');
    }
}

// Setup event listeners
function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    // Login form
    if (loginForm) {
        loginForm.removeEventListener('submit', handleLogin);
        loginForm.addEventListener('submit', handleLogin);
        console.log('Login form event listener added');
    }
    
    // Password toggle
    const passwordToggleBtn = document.getElementById('passwordToggleBtn');
    const loginPassword = document.getElementById('loginPassword');
    if (passwordToggleBtn && loginPassword) {
        passwordToggleBtn.removeEventListener('click', togglePasswordVisibility);
        passwordToggleBtn.addEventListener('click', togglePasswordVisibility);
    }
    
    // Close user orders modal
    if (userOrdersClose) {
        userOrdersClose.removeEventListener('click', closeUserOrdersModal);
        userOrdersClose.addEventListener('click', closeUserOrdersModal);
    }
    
    window.addEventListener('click', function(event) {
        if (event.target === userOrdersModal) {
            userOrdersModal.style.display = 'none';
        }
    });
    
    // Order form
    if (orderForm) {
        orderForm.removeEventListener('submit', handleOrderSubmit);
        orderForm.addEventListener('submit', handleOrderSubmit);
    }
    
    // Calculate total price with debounce for performance
    const pricePerKgInput = document.getElementById('pricePerKg');
    const quantityInput = document.getElementById('quantity');
    if (pricePerKgInput && quantityInput) {
        pricePerKgInput.removeEventListener('input', calculateTotal);
        quantityInput.removeEventListener('input', calculateTotal);
        pricePerKgInput.addEventListener('input', calculateTotal);
        quantityInput.addEventListener('input', calculateTotal);
    }
    
    // Quick add client
    if (quickAddClientBtn) {
        quickAddClientBtn.removeEventListener('click', openQuickClientModal);
        quickAddClientBtn.addEventListener('click', openQuickClientModal);
    }
    
    // Records filter with debounce
    if (recordsDateFilter) {
        recordsDateFilter.removeEventListener('change', renderOrderRecords);
        recordsDateFilter.addEventListener('change', renderOrderRecords);
    }
    
    if (resetRecordsFilterBtn) {
        resetRecordsFilterBtn.removeEventListener('click', resetRecordsFilter);
        resetRecordsFilterBtn.addEventListener('click', resetRecordsFilter);
    }
    
    if (exportRecordsBtn) {
        exportRecordsBtn.removeEventListener('click', exportFilteredRecords);
        exportRecordsBtn.addEventListener('click', exportFilteredRecords);
    }
    
    // Add buttons
    if (addClientBtn) {
        addClientBtn.removeEventListener('click', () => openClientModal());
        addClientBtn.addEventListener('click', () => openClientModal());
    }
    if (addCarBtn) {
        addCarBtn.removeEventListener('click', () => openCarModal());
        addCarBtn.addEventListener('click', () => openCarModal());
    }
    if (addWorkerBtn) {
        addWorkerBtn.removeEventListener('click', () => openWorkerModal());
        addWorkerBtn.addEventListener('click', () => openWorkerModal());
    }
    if (addWasteBtn) {
        addWasteBtn.removeEventListener('click', () => openWasteModal());
        addWasteBtn.addEventListener('click', () => openWasteModal());
    }
    if (addBrokerBtn) {
        addBrokerBtn.removeEventListener('click', () => openBrokerModal());
        addBrokerBtn.addEventListener('click', () => openBrokerModal());
    }
    if (addShopBtn) {
        addShopBtn.removeEventListener('click', () => openShopModal());
        addShopBtn.addEventListener('click', () => openShopModal());
    }
    
    // Client search with debounce
    if (clientSearchName) {
        clientSearchName.removeEventListener('input', debouncedFilterClients);
        clientSearchName.addEventListener('input', debouncedFilterClients);
    }
    if (clientSearchLocation) {
        clientSearchLocation.removeEventListener('input', debouncedFilterClients);
        clientSearchLocation.addEventListener('input', debouncedFilterClients);
    }
    if (clearClientSearch) {
        clearClientSearch.removeEventListener('click', clearClientSearchFunc);
        clearClientSearch.addEventListener('click', clearClientSearchFunc);
    }
    
    // Reminder and Bill buttons
    if (addReminderBtn) {
        addReminderBtn.removeEventListener('click', openReminderModal);
        addReminderBtn.addEventListener('click', openReminderModal);
    }
    if (scheduleBillBtn) {
        scheduleBillBtn.removeEventListener('click', openScheduleBillModal);
        scheduleBillBtn.addEventListener('click', openScheduleBillModal);
    }
    if (sendBillBtn) {
        sendBillBtn.removeEventListener('click', sendImmediateBill);
        sendBillBtn.addEventListener('click', sendImmediateBill);
    }
    
    // Modals
    setupModalEventListeners();
    
    // Payment from detail
    if (addPaymentFromDetailBtn) {
        addPaymentFromDetailBtn.removeEventListener('click', handleAddPaymentFromDetail);
        addPaymentFromDetailBtn.addEventListener('click', handleAddPaymentFromDetail);
    }
    
    // Notification center
    if (notificationCenter) {
        notificationCenter.removeEventListener('click', toggleNotificationCenter);
        notificationCenter.addEventListener('click', toggleNotificationCenter);
    }
    
    // Language switcher
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.removeEventListener('click', handleLanguageSwitch);
        btn.addEventListener('click', handleLanguageSwitch);
    });
}

// Debounced filter function for performance
const debouncedFilterClients = debounce(filterAndRenderClients, 300);

function handleLanguageSwitch(e) {
    const lang = this.getAttribute('data-lang');
    switchLanguage(lang);
}

function togglePasswordVisibility(e) {
    e.preventDefault();
    const loginPassword = document.getElementById('loginPassword');
    const type = loginPassword.getAttribute('type') === 'password' ? 'text' : 'password';
    loginPassword.setAttribute('type', type);
    
    // Toggle icon
    const icon = this.querySelector('i');
    if (type === 'text') {
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

function closeUserOrdersModal() {
    userOrdersModal.style.display = 'none';
}

function resetRecordsFilter() {
    recordsDateFilter.value = '';
    renderOrderRecords();
}

function clearClientSearchFunc() {
    if (clientSearchName) clientSearchName.value = '';
    if (clientSearchLocation) clientSearchLocation.value = '';
    renderClients();
}

// Setup modal event listeners
function setupModalEventListeners() {
    // Client modal
    const clientModal = document.getElementById('client-modal');
    const clientForm = document.getElementById('clientForm');
    const closeModal = document.querySelector('#client-modal .close');
    const cancelClientBtn = document.getElementById('cancel-client-btn');
    
    if (closeModal) {
        closeModal.removeEventListener('click', () => closeModalFunc(clientModal));
        closeModal.addEventListener('click', () => closeModalFunc(clientModal));
    }
    if (cancelClientBtn) {
        cancelClientBtn.removeEventListener('click', () => closeModalFunc(clientModal));
        cancelClientBtn.addEventListener('click', () => closeModalFunc(clientModal));
    }
    if (clientForm) {
        clientForm.removeEventListener('submit', handleClientSubmit);
        clientForm.addEventListener('submit', handleClientSubmit);
    }
    
    // Quick client modal
    const quickClientModal = document.getElementById('quick-client-modal');
    const quickClientForm = document.getElementById('quickClientForm');
    const quickClientClose = document.querySelector('#quick-client-modal .close');
    const cancelQuickClientBtn = document.getElementById('cancel-quick-client-btn');
    
    if (quickClientClose) {
        quickClientClose.removeEventListener('click', () => closeModalFunc(quickClientModal));
        quickClientClose.addEventListener('click', () => closeModalFunc(quickClientModal));
    }
    if (cancelQuickClientBtn) {
        cancelQuickClientBtn.removeEventListener('click', () => closeModalFunc(quickClientModal));
        cancelQuickClientBtn.addEventListener('click', () => closeModalFunc(quickClientModal));
    }
    if (quickClientForm) {
        quickClientForm.removeEventListener('submit', handleQuickClientSubmit);
        quickClientForm.addEventListener('submit', handleQuickClientSubmit);
    }

    // Shop modal
    const shopClose = document.querySelector('#shop-modal .close');
    if (shopClose) {
        shopClose.removeEventListener('click', () => closeModalFunc(shopModal));
        shopClose.addEventListener('click', () => closeModalFunc(shopModal));
    }
    if (cancelShopBtn) {
        cancelShopBtn.removeEventListener('click', () => closeModalFunc(shopModal));
        cancelShopBtn.addEventListener('click', () => closeModalFunc(shopModal));
    }
    if (shopForm) {
        shopForm.removeEventListener('submit', handleShopSubmit);
        shopForm.addEventListener('submit', handleShopSubmit);
    }

    // Waste modal
    const wasteModal = document.getElementById('waste-modal');
    const wasteClose = document.querySelector('#waste-modal .close');
    const cancelWasteBtn = document.getElementById('cancel-waste-btn');

    if (wasteClose) {
        wasteClose.removeEventListener('click', () => closeModalFunc(wasteModal));
        wasteClose.addEventListener('click', () => closeModalFunc(wasteModal));
    }
    if (cancelWasteBtn) {
        cancelWasteBtn.removeEventListener('click', () => closeModalFunc(wasteModal));
        cancelWasteBtn.addEventListener('click', () => closeModalFunc(wasteModal));
    }
    if (wasteForm) {
        wasteForm.removeEventListener('submit', handleWasteSubmit);
        wasteForm.addEventListener('submit', handleWasteSubmit);
    }

    // Broker modal
    const brokerModal = document.getElementById('broker-modal');
    const brokerForm = document.getElementById('brokerForm');
    const brokerClose = document.querySelector('#broker-modal .close');
    const cancelBrokerBtn = document.getElementById('cancel-broker-btn');

    if (brokerClose) {
        brokerClose.removeEventListener('click', () => closeModalFunc(brokerModal));
        brokerClose.addEventListener('click', () => closeModalFunc(brokerModal));
    }
    if (cancelBrokerBtn) {
        cancelBrokerBtn.removeEventListener('click', () => closeModalFunc(brokerModal));
        cancelBrokerBtn.addEventListener('click', () => closeModalFunc(brokerModal));
    }
    if (brokerForm) {
        brokerForm.removeEventListener('submit', handleBrokerSubmit);
        brokerForm.addEventListener('submit', handleBrokerSubmit);
    }

    // Remaining chicken modal
    if (cancelRemainingBtn) {
        cancelRemainingBtn.removeEventListener('click', () => closeModalFunc(remainingChickenModal));
        cancelRemainingBtn.addEventListener('click', () => closeModalFunc(remainingChickenModal));
    }
    if (remainingChickenForm) {
        remainingChickenForm.removeEventListener('submit', handleRemainingChickenSubmit);
        remainingChickenForm.addEventListener('submit', handleRemainingChickenSubmit);
    }

    // Sale modal
    const saleClose = document.querySelector('#add-sale-modal .close');
    if (saleClose) {
        saleClose.removeEventListener('click', () => closeModalFunc(saleModal));
        saleClose.addEventListener('click', () => closeModalFunc(saleModal));
    }
    if (cancelSaleBtn) {
        cancelSaleBtn.removeEventListener('click', () => closeModalFunc(saleModal));
        cancelSaleBtn.addEventListener('click', () => closeModalFunc(saleModal));
    }
    if (saleForm) {
        saleForm.removeEventListener('submit', handleSaleSubmit);
        saleForm.addEventListener('submit', handleSaleSubmit);
    }
    if (saleQuantity) {
        saleQuantity.removeEventListener('input', calculateSaleTotal);
        saleQuantity.addEventListener('input', calculateSaleTotal);
    }
    if (salePricePerKg) {
        salePricePerKg.removeEventListener('input', calculateSaleTotal);
        salePricePerKg.addEventListener('input', calculateSaleTotal);
    }
    if (saleCostPerKg) {
        saleCostPerKg.removeEventListener('input', calculateSaleTotal);
        saleCostPerKg.addEventListener('input', calculateSaleTotal);
    }

    // Shop payment modal
    const shopPaymentClose = document.querySelector('#shop-payment-modal .close');
    if (shopPaymentClose) {
        shopPaymentClose.removeEventListener('click', () => closeModalFunc(shopPaymentModal));
        shopPaymentClose.addEventListener('click', () => closeModalFunc(shopPaymentModal));
    }
    if (cancelShopPaymentBtn) {
        cancelShopPaymentBtn.removeEventListener('click', () => closeModalFunc(shopPaymentModal));
        cancelShopPaymentBtn.addEventListener('click', () => closeModalFunc(shopPaymentModal));
    }
    if (shopPaymentForm) {
        shopPaymentForm.removeEventListener('submit', handleShopPaymentSubmit);
        shopPaymentForm.addEventListener('submit', handleShopPaymentSubmit);
    }
    
    // Shop day summary modal
    const shopDaySummaryClose = document.querySelector('#shop-day-summary-modal .close');
    if (shopDaySummaryClose) {
        shopDaySummaryClose.removeEventListener('click', () => closeModalFunc(shopDaySummaryModal));
        shopDaySummaryClose.addEventListener('click', () => closeModalFunc(shopDaySummaryModal));
    }
    if (sdsCloseBtn) {
        sdsCloseBtn.removeEventListener('click', () => closeModalFunc(shopDaySummaryModal));
        sdsCloseBtn.addEventListener('click', () => closeModalFunc(shopDaySummaryModal));
    }

    // Shop bill modal
    const shopBillClose = document.querySelector('#shop-bill-modal .close');
    if (shopBillClose) {
        shopBillClose.removeEventListener('click', () => closeModalFunc(shopBillModal));
        shopBillClose.addEventListener('click', () => closeModalFunc(shopBillModal));
    }
    if (shopBillCloseBtn) {
        shopBillCloseBtn.removeEventListener('click', () => closeModalFunc(shopBillModal));
        shopBillCloseBtn.addEventListener('click', () => closeModalFunc(shopBillModal));
    }
    if (shopBillPrintBtn) {
        shopBillPrintBtn.removeEventListener('click', printShopBill);
        shopBillPrintBtn.addEventListener('click', printShopBill);
    }

    // Shop bill filter modal
    const shopBillFilterClose = document.querySelector('#shop-bill-filter-modal .close');
    if (shopBillFilterClose) {
        shopBillFilterClose.removeEventListener('click', () => closeModalFunc(shopBillFilterModal));
        shopBillFilterClose.addEventListener('click', () => closeModalFunc(shopBillFilterModal));
    }
    if (cancelBillFilterBtn) {
        cancelBillFilterBtn.removeEventListener('click', () => closeModalFunc(shopBillFilterModal));
        cancelBillFilterBtn.addEventListener('click', () => closeModalFunc(shopBillFilterModal));
    }
    if (billFilterForm) {
        billFilterForm.removeEventListener('submit', handleBillFilterSubmit);
        billFilterForm.addEventListener('submit', handleBillFilterSubmit);
    }
    
    // Payment modal
    const paymentModal = document.getElementById('payment-modal');
    const paymentForm = document.getElementById('paymentForm');
    const paymentClose = document.querySelector('#payment-modal .close');
    const cancelPaymentBtn = document.getElementById('cancel-payment-btn');
    
    if (paymentClose) {
        paymentClose.removeEventListener('click', () => closeModalFunc(paymentModal));
        paymentClose.addEventListener('click', () => closeModalFunc(paymentModal));
    }
    if (cancelPaymentBtn) {
        cancelPaymentBtn.removeEventListener('click', () => closeModalFunc(paymentModal));
        cancelPaymentBtn.addEventListener('click', () => closeModalFunc(paymentModal));
    }
    if (paymentForm) {
        paymentForm.removeEventListener('submit', handlePaymentSubmit);
        paymentForm.addEventListener('submit', handlePaymentSubmit);
    }
    
    // Reminder modal
    const reminderClose = document.querySelector('#reminder-modal .close');
    const cancelReminderBtn = document.getElementById('cancel-reminder-btn');
    const reminderForm = document.getElementById('reminderForm');
    
    if (reminderClose) {
        reminderClose.removeEventListener('click', () => closeModalFunc(reminderModal));
        reminderClose.addEventListener('click', () => closeModalFunc(reminderModal));
    }
    if (cancelReminderBtn) {
        cancelReminderBtn.removeEventListener('click', () => closeModalFunc(reminderModal));
        cancelReminderBtn.addEventListener('click', () => closeModalFunc(reminderModal));
    }
    if (reminderForm) {
        reminderForm.removeEventListener('submit', handleReminderSubmit);
        reminderForm.addEventListener('submit', handleReminderSubmit);
    }
    
    // Schedule bill modal
    const scheduleBillClose = document.querySelector('#schedule-bill-modal .close');
    const cancelScheduleBillBtn = document.getElementById('cancel-schedule-bill-btn');
    const scheduleBillForm = document.getElementById('scheduleBillForm');
    
    if (scheduleBillClose) {
        scheduleBillClose.removeEventListener('click', () => closeModalFunc(scheduleBillModal));
        scheduleBillClose.addEventListener('click', () => closeModalFunc(scheduleBillModal));
    }
    if (cancelScheduleBillBtn) {
        cancelScheduleBillBtn.removeEventListener('click', () => closeModalFunc(scheduleBillModal));
        cancelScheduleBillBtn.addEventListener('click', () => closeModalFunc(scheduleBillModal));
    }
    if (scheduleBillForm) {
        scheduleBillForm.removeEventListener('submit', handleScheduleBillSubmit);
        scheduleBillForm.addEventListener('submit', handleScheduleBillSubmit);
    }
    
    // Broker payment modal
    const brokerPaymentModal = document.getElementById('broker-payment-modal');
    const brokerPaymentForm = document.getElementById('brokerPaymentForm');
    const brokerPaymentClose = document.querySelector('#broker-payment-modal .close');
    const cancelBrokerPaymentBtn = document.getElementById('cancel-broker-payment-btn');
    
    if (brokerPaymentClose) {
        brokerPaymentClose.removeEventListener('click', () => closeModalFunc(brokerPaymentModal));
        brokerPaymentClose.addEventListener('click', () => closeModalFunc(brokerPaymentModal));
    }
    if (cancelBrokerPaymentBtn) {
        cancelBrokerPaymentBtn.removeEventListener('click', () => closeModalFunc(brokerPaymentModal));
        cancelBrokerPaymentBtn.addEventListener('click', () => closeModalFunc(brokerPaymentModal));
    }
    if (brokerPaymentForm) {
        brokerPaymentForm.removeEventListener('submit', handleBrokerPaymentSubmit);
        brokerPaymentForm.addEventListener('submit', handleBrokerPaymentSubmit);
    }
    
    // Broker payment history modal
    const brokerHistoryModal = document.getElementById('broker-payment-history-modal');
    const brokerHistoryClose = document.querySelector('#broker-payment-history-modal .close');
    
    if (brokerHistoryClose) {
        brokerHistoryClose.removeEventListener('click', () => closeModalFunc(brokerHistoryModal));
        brokerHistoryClose.addEventListener('click', () => closeModalFunc(brokerHistoryModal));
    }

    // Payment history modal
    const paymentHistoryModal = document.getElementById('payment-history-modal');
    const paymentHistoryClose = document.querySelector('#payment-history-modal .close');
    if (paymentHistoryClose) {
        paymentHistoryClose.removeEventListener('click', () => closeModalFunc(paymentHistoryModal));
        paymentHistoryClose.addEventListener('click', () => closeModalFunc(paymentHistoryModal));
    }
    
    // Close modals on window click
    window.addEventListener('click', function(event) {
        if (event.target === clientModal) closeModalFunc(clientModal);
        if (event.target === quickClientModal) closeModalFunc(quickClientModal);
        if (event.target === shopModal) closeModalFunc(shopModal);
        if (event.target === remainingChickenModal) closeModalFunc(remainingChickenModal);
        if (event.target === saleModal) closeModalFunc(saleModal);
        if (event.target === shopPaymentModal) closeModalFunc(shopPaymentModal);
        if (event.target === shopDaySummaryModal) closeModalFunc(shopDaySummaryModal);
        if (event.target === shopBillModal) closeModalFunc(shopBillModal);
        if (event.target === shopBillFilterModal) closeModalFunc(shopBillFilterModal);
        if (event.target === paymentModal) closeModalFunc(paymentModal);
        if (event.target === reminderModal) closeModalFunc(reminderModal);
        if (event.target === scheduleBillModal) closeModalFunc(scheduleBillModal);
        if (event.target === brokerPaymentModal) closeModalFunc(brokerPaymentModal);
        if (event.target === brokerHistoryModal) closeModalFunc(brokerHistoryModal);
        if (event.target === paymentHistoryModal) closeModalFunc(paymentHistoryModal);
    });
}

// Setup navigation (DG Kata style)
function setupNavigation() {
    // Show bottom nav
    if (bottomNav) {
        bottomNav.style.display = 'block';
    }
    
    // Handle bottom tab clicks
    navTabs.forEach(tab => {
        tab.removeEventListener('click', handleNavTabClick);
        tab.addEventListener('click', handleNavTabClick);
    });
    
    // Handle dropdown links
    dropdownLinks.forEach(link => {
        link.removeEventListener('click', handleDropdownLinkClick);
        link.addEventListener('click', handleDropdownLinkClick);
    });
    
    // Export button
    if (exportBottomBtn) {
        exportBottomBtn.removeEventListener('click', exportData);
        exportBottomBtn.addEventListener('click', exportData);
    }
    
    // Logout button
    if (logoutBottomBtn) {
        logoutBottomBtn.removeEventListener('click', handleLogout);
        logoutBottomBtn.addEventListener('click', handleLogout);
    }
    
    // Setup dropdown handlers
    setupDropdownHandlers();
}

function handleNavTabClick(e) {
    if (this.classList.contains('more-btn')) {
        e.stopPropagation();
        return;
    }
    
    // Remove active class from all bottom tabs
    navTabs.forEach(t => t.classList.remove('active'));
    
    // Add active class to clicked tab
    this.classList.add('active');
    
    // Navigate based on data-section
    const section = this.getAttribute('data-section');
    navigateToSection(section);
    
    // Close dropdown if open
    const navDropdown = document.querySelector('.nav-dropdown');
    if (navDropdown) {
        navDropdown.classList.remove('active');
    }
}

function handleDropdownLinkClick(e) {
    e.preventDefault();
    const section = this.getAttribute('data-section');
    navigateToSection(section);
    
    // Update active tab to "More"
    navTabs.forEach(t => t.classList.remove('active'));
    document.querySelector('.more-btn').classList.add('active');
    
    // Close dropdown
    const navDropdown = document.querySelector('.nav-dropdown');
    if (navDropdown) {
        navDropdown.classList.remove('active');
    }
}

// Navigation functions
function navigateToSection(section) {
    // Close dropdown if open
    const navDropdown = document.querySelector('.nav-dropdown');
    if (navDropdown) {
        navDropdown.classList.remove('active');
    }
    
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    
    // Show/hide top action bar based on section
    if (section === 'clients' || section === 'cars' || section === 'workers' || 
        section === 'waste' || section === 'brokers' || section === 'reminders' || section === 'shops') {
        if (topActionBar) {
            topActionBar.style.display = 'none';
        }
    } else {
        if (topActionBar) {
            topActionBar.style.display = 'none';
        }
    }
    
    // Show selected page
    switch(section) {
        case 'dashboard':
            document.getElementById('main-dashboard-page').classList.add('active');
            updateDashboard();
            break;
        case 'orders':
            document.getElementById('all-orders-page').classList.add('active');
            renderAllOrders();
            break;
        case 'clients':
            document.getElementById('client-management-page').classList.add('active');
            renderClients();
            break;
        case 'brokers':
            document.getElementById('broker-management-page').classList.add('active');
            renderBrokers();
            break;
        case 'records':
            document.getElementById('order-records-page').classList.add('active');
            renderOrderRecords();
            break;
        case 'cars':
            document.getElementById('car-management-page').classList.add('active');
            renderCars();
            break;
        case 'workers':
            document.getElementById('worker-management-page').classList.add('active');
            renderWorkers();
            break;
        case 'waste':
            document.getElementById('waste-management-page').classList.add('active');
            renderWasteSales();
            break;
        case 'shops':
            document.getElementById('shop-management-page').classList.add('active');
            renderShops();
            break;
        case 'reminders':
            document.getElementById('reminder-management-page').classList.add('active');
            renderReminders();
            renderScheduledBills();
            populateReminderClientDropdowns();
            break;
    }
    
    // Update bottom navigation active state
    navTabs.forEach(tab => tab.classList.remove('active'));
    const bottomTab = document.querySelector(`.nav-tab[data-section="${section}"]`);
    if (bottomTab) {
        bottomTab.classList.add('active');
    } else {
        // If section not in bottom nav, activate "More" tab
        const moreBtn = document.querySelector('.more-btn');
        if (moreBtn) {
            moreBtn.classList.add('active');
        }
    }
}

// Show success message
function showSuccessMessage(message) {
    showNotification(message, 'success');
}

// Populate client dropdowns in reminder section
function populateReminderClientDropdowns() {
    // Populate immediate bill client dropdown
    if (immediateBillClient) {
        immediateBillClient.innerHTML = '<option value="">Select Client</option>';
        clients.forEach(client => {
            // Only show active clients
            if (client.active !== false) {
                const option = document.createElement('option');
                option.value = client.id;
                option.textContent = `${client.name} - ${client.phone}`;
                immediateBillClient.appendChild(option);
            }
        });
    }
}

// Data Storage with error handling
function saveDataToStorage() {
    try {
        localStorage.setItem('poultryOrders', JSON.stringify(orders));
        localStorage.setItem('poultryClients', JSON.stringify(clients));
        localStorage.setItem('poultryCars', JSON.stringify(cars));
        localStorage.setItem('poultryWorkers', JSON.stringify(workers));
        localStorage.setItem('poultryWaste', JSON.stringify(wasteSales));
        localStorage.setItem('poultryBrokers', JSON.stringify(brokers));
        localStorage.setItem('poultryShops', JSON.stringify(shops));
        localStorage.setItem('poultryReminders', JSON.stringify(reminders));
        localStorage.setItem('poultryScheduledBills', JSON.stringify(scheduledBills));
    } catch (e) {
        console.error('Error saving to localStorage:', e);
        showNotification('Error saving data. Storage might be full.', 'danger');
    }
}

function loadDataFromStorage() {
    try {
        // Load orders
        const savedOrders = localStorage.getItem('poultryOrders');
        orders = savedOrders ? JSON.parse(savedOrders) : [];
        
        // Load clients
        const savedClients = localStorage.getItem('poultryClients');
        clients = savedClients ? JSON.parse(savedClients) : [
            {
                id: 'client-1',
                name: 'Regular Customer',
                phone: '0300-1234567',
                address: 'Main Market, City',
                totalDue: 0,
                paidAmount: 0,
                payments: [],
                active: true,
                createdAt: new Date().toISOString()
            }
        ];
        
        // Ensure all loaded clients have the active property
        clients = clients.map(client => ({
            ...client,
            active: client.active !== false
        }));
        
        // Load cars
        const savedCars = localStorage.getItem('poultryCars');
        cars = savedCars ? JSON.parse(savedCars) : [
            {
                id: 'car-1',
                number: 'ABC-123',
                driver: 'Ahmed Khan',
                capacity: 500,
                status: 'active',
                createdAt: new Date().toISOString()
            }
        ];
        
        // Load workers
        const savedWorkers = localStorage.getItem('poultryWorkers');
        workers = savedWorkers ? JSON.parse(savedWorkers) : [
            {
                id: 'worker-1',
                name: 'Ali Raza',
                phone: '0300-7654321',
                role: 'Chicken Cutter',
                salary: 25000,
                status: 'active',
                advance: 0,
                createdAt: new Date().toISOString()
            }
        ];
        
        // Load waste sales
        const savedWaste = localStorage.getItem('poultryWaste');
        wasteSales = savedWaste ? JSON.parse(savedWaste) : [
            {
                id: 'waste-1',
                date: new Date().toISOString(),
                type: 'feathers',
                quantity: 50,
                price: 500,
                buyer: 'Feather Buyer',
                createdAt: new Date().toISOString()
            }
        ];
        
        // Load brokers
        const savedBrokers = localStorage.getItem('poultryBrokers');
        brokers = savedBrokers ? JSON.parse(savedBrokers) : [
            {
                id: 'broker-1',
                name: 'Default Broker',
                phone: '0300-0000000',
                address: 'Market Area',
                totalDue: 0,
                paidAmount: 0,
                payments: [],
                createdAt: new Date().toISOString()
            }
        ];
        
        // Load reminders
        const savedReminders = localStorage.getItem('poultryReminders');
        reminders = savedReminders ? JSON.parse(savedReminders) : [];
        
        // Load scheduled bills
        const savedScheduledBills = localStorage.getItem('poultryScheduledBills');
        scheduledBills = savedScheduledBills ? JSON.parse(savedScheduledBills) : [];

        // Load shops
        const savedShops = localStorage.getItem('poultryShops');
        shops = savedShops ? JSON.parse(savedShops) : [];
    } catch (e) {
        console.error('Error loading from localStorage:', e);
        showNotification('Error loading saved data. Starting with default data.', 'warning');
    }
}

// Format a Date to local YYYY-MM-DD (avoids timezone shifts)
function formatDateLocal(d) {
    if (!d) return '';
    try {
        const date = new Date(d);
        if (isNaN(date.getTime())) return '';
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    } catch (e) {
        console.error('Error formatting date:', e);
        return '';
    }
}

// Login/Logout
async function handleLogin(e) {
    e.preventDefault();

    const selectedUser = document.querySelector('.user-option.active') || document.querySelector(`.user-option[data-user="${selectedLoginUsername}"]`);
    const password = document.getElementById('loginPassword').value;

    if (!selectedUser) {
        showNotification('Please select a user', 'warning');
        return;
    }

    if (password.length < 6) {
        showNotification('Password must be at least 6 characters!', 'warning');
        return;
    }

    const username = selectedUser.getAttribute('data-user');

    // Declare these outside try-catch so they're available in finally
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;

    try {
        // Show loading state
        submitBtn.textContent = 'Logging in...';
        submitBtn.disabled = true;

        const user = await login(username, password);

        currentUser = user;
        const userName = user.name;
        const userImg = selectedUser.querySelector('img').src;

        // Update header
        headerUserImg.src = userImg;
        headerUserNameTop.textContent = userName;
        headerUser.style.display = 'flex';

        // Setup logout button in header
        if (headerLogoutBtn) {
            headerLogoutBtn.removeEventListener('click', handleLogout);
            headerLogoutBtn.addEventListener('click', handleLogout);
        }

        // Setup logout button in bottom nav
        if (logoutBottomBtn) {
            logoutBottomBtn.removeEventListener('click', handleLogout);
            logoutBottomBtn.addEventListener('click', handleLogout);
        }

        // Hide login, show app
        loginPage.style.display = 'none';
        app.style.display = 'block';

        // Show bottom navigation
        if (bottomNav) {
            bottomNav.style.display = 'block';
        }

        // Hide top action bar initially
        if (topActionBar) {
            topActionBar.style.display = 'none';
        }

        // Initialize the app
        await initApp();

        showNotification('Login successful!', 'success');

    } catch (error) {
        showNotification('Login failed: ' + error.message, 'error');
    } finally {
        // Reset button state
        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

function handleLogout() {
    logout();
    currentUser = null;

    // Clear all data
    orders = [];
    clients = [];
    cars = [];
    workers = [];
    wasteSales = [];
    brokers = [];
    shops = [];
    reminders = [];
    scheduledBills = [];

    // Reload the page to reset all state and event listeners
    window.location.reload();
}

// Auto-login check
async function checkAutoLogin() {
    if (isAuthenticated()) {
        try {
            const savedUser = JSON.parse(localStorage.getItem('currentUser'));
            if (savedUser) {
                console.log('Found authenticated user:', savedUser.username);

                // Find the user option
                const userOption = document.querySelector(`.user-option[data-user="${savedUser.username}"]`);
                if (userOption) {
                    console.log('Found user option, auto-logging in...');

                    // Remove active from all first
                    document.querySelectorAll('.user-option').forEach(opt => opt.classList.remove('active'));

                    // Add active to the saved user
                    userOption.classList.add('active');
                    currentUser = savedUser;

                    // Update UI
                    loginPage.style.display = 'none';
                    app.style.display = 'block';

                    // Update header
                    const userName = savedUser.name;
                    const userImg = userOption.querySelector('img').src;

                    headerUserImg.src = userImg;
                    headerUserNameTop.textContent = userName;
                    headerUser.style.display = 'flex';

                    // Hide top action bar initially
                    if (topActionBar) {
                        topActionBar.style.display = 'none';
                    }

                    // Initialize the app
                    await initApp();
                }
            }
        } catch (error) {
            console.error('Auto-login failed:', error);
            logout();
        }
    }
}

// Update DOMContentLoaded event
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM fully loaded');
    
    // Check for auto-login
    checkAutoLogin();
    
    // Setup login form
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
        console.log('Login form event listener added on DOM load');
    }
    
    // Setup logout buttons if they exist
    if (headerLogoutBtn) {
        headerLogoutBtn.addEventListener('click', handleLogout);
    }
    
    if (logoutBottomBtn) {
        logoutBottomBtn.addEventListener('click', handleLogout);
    }
    
    // Setup user option click handlers
    document.querySelectorAll('.user-option').forEach(userOption => {
        userOption.addEventListener('click', function() {
            // Remove active class from all user options
            document.querySelectorAll('.user-option').forEach(option => {
                option.classList.remove('active');
            });
            // Add active class to clicked option
            this.classList.add('active');
            selectedLoginUsername = this.getAttribute('data-user');
        });
    });
});

// Order Form
function calculateTotal() {
    const pricePerKg = parseFloat(document.getElementById('pricePerKg').value) || 0;
    const quantity = parseFloat(document.getElementById('quantity').value) || 0;
    const totalPrice = pricePerKg * quantity;
    
    document.getElementById('totalPrice').textContent = `PKR ${totalPrice.toFixed(2)}`;
}

function setDefaultDate() {
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    const orderDateInput = document.getElementById('orderDate');
    if (orderDateInput) {
        orderDateInput.value = formattedDate;
    }
}

function populateClientDropdown() {
    if (clientSelect) {
        clientSelect.innerHTML = '<option value="">Select a client</option>';
        
        clients.forEach(client => {
            // Only show active clients in the dropdown
            if (client.active !== false) {
                const option = document.createElement('option');
                option.value = client.id;
                option.textContent = `${client.name} - ${client.phone}`;
                clientSelect.appendChild(option);
            }
        });
    }
}

function setupClientAutoFill() {
    const customerNameInput = document.getElementById('customerName');
    const phoneInput = document.getElementById('phone');
    const addressInput = document.getElementById('address');
    
    if (clientSelect) {
        clientSelect.addEventListener('change', function() {
            const selectedClientId = this.value;
            
            if (selectedClientId) {
                const client = clients.find(c => String(c.id) === String(selectedClientId));
                if (client) {
                    if (customerNameInput) customerNameInput.value = sanitizeInput(client.name);
                    if (phoneInput) phoneInput.value = sanitizeInput(client.phone || '');
                    if (addressInput) addressInput.value = sanitizeInput(client.address || '');
                }
            } else {
                if (customerNameInput) customerNameInput.value = '';
                if (phoneInput) phoneInput.value = '';
                if (addressInput) addressInput.value = '';
            }
        });
    }
}

async function handleOrderSubmit(e) {
    e.preventDefault();

    // Get form values
    const orderDate = document.getElementById('orderDate').value;
    const selectedClientId = document.getElementById('clientSelect').value;
    const clientId = selectedClientId ? (isNaN(Number(selectedClientId)) ? selectedClientId : Number(selectedClientId)) : null;
    let customerName = sanitizeInput(document.getElementById('customerName')?.value || '');
    let phone = sanitizeInput(document.getElementById('phone')?.value || '');
    let address = sanitizeInput(document.getElementById('address')?.value || '');
    const chickenType = sanitizeInput(document.getElementById('chickenType').value);
    const pricePerKg = parseFloat(document.getElementById('pricePerKg').value);
    const quantity = parseFloat(document.getElementById('quantity').value);

    const selectedClient = selectedClientId ? clients.find(c => String(c.id) === String(selectedClientId)) : null;
    if (selectedClient) {
        if (!customerName) customerName = sanitizeInput(selectedClient.name);
        if (!phone) phone = sanitizeInput(selectedClient.phone || '');
        if (!address) address = sanitizeInput(selectedClient.address || '');
    }

    // Validate
    if (!customerName) {
        showNotification('Please enter customer name or select a client', 'warning');
        return;
    }

    if (isNaN(pricePerKg) || pricePerKg <= 0 || isNaN(quantity) || quantity <= 0) {
        showNotification('Please enter valid price and quantity', 'warning');
        return;
    }

    const orderData = {
        order_date: orderDate,
        client_id: clientId,
        customer_name: customerName,
        phone: phone,
        address: address,
        chicken_type: chickenType,
        price_per_kg: pricePerKg,
        quantity: quantity
    };

    try {
        const result = await saveOrder(orderData);
        showNotification('Order added successfully!', 'success');

        try {
            await loadOrders();
            await loadClients();
            await updateDashboard();
            renderClients();
            renderAllOrders();
            renderOrderRecords();
        } catch (refreshError) {
            console.error('Order saved, but refresh failed:', refreshError);
            showNotification('Order saved, but data refresh failed. Please reload the page.', 'warning');
        }

        // Reset form
        orderForm.reset();
        setDefaultDate();
        document.getElementById('totalPrice').textContent = 'PKR 0.00';
    } catch (error) {
        showNotification('Failed to save order: ' + error.message, 'error');
    }
}

// Dashboard Updates
async function updateDashboard() {
    try {
        const stats = await loadDashboardStats();

        document.getElementById('total-orders').textContent = stats.totalOrders;
        document.getElementById('total-revenue').textContent = `PKR ${stats.totalRevenue.toFixed(2)}`;
        document.getElementById('total-chicken').textContent = `${stats.totalChicken.toFixed(2)} kg`;
        document.getElementById('total-clients').textContent = stats.totalClients;
    } catch (error) {
        console.error('Failed to update dashboard:', error);
        // Fallback to local calculation
        const activeOrders = orders.filter(order => !order.completed);
        const totalOrders = activeOrders.length;
        const totalRevenue = activeOrders.reduce((sum, order) => sum + order.total, 0);
        const totalChicken = activeOrders.reduce((sum, order) => sum + order.quantity, 0);
        const totalClients = clients.length;

        document.getElementById('total-orders').textContent = totalOrders;
        document.getElementById('total-revenue').textContent = `PKR ${totalRevenue.toFixed(2)}`;
        document.getElementById('total-chicken').textContent = `${totalChicken.toFixed(2)} kg`;
        document.getElementById('total-clients').textContent = totalClients;
    }
}

// Render All Orders
function renderAllOrders() {
    if (!allOrdersTableBody) return;
    
    allOrdersTableBody.innerHTML = '';
    
    // Use document fragment for better performance
    const fragment = document.createDocumentFragment();
    
    // Filter out completed orders
    const activeOrders = orders.filter(order => !order.completed);
    
    activeOrders.forEach(order => {
        const row = document.createElement('tr');
        const statusClass = order.status === 'delivered' ? 'delivered' : 
                          order.status === 'processing' ? 'processing' : 'pending';
        
        const statusText = order.status === 'delivered' ? 'Delivered' : 
                         order.status === 'processing' ? 'Processing' : 'Pending';
        
        const takenByName = order.takenBy === 'jawad' ? 'Jawad' : 
                          order.takenBy === 'fawad' ? 'Fawad' : 
                          order.takenBy === 'shal-dada' ? 'Shal Dada' : 
                          order.takenBy === 1 ? 'Jawad' : 
                          order.takenBy === 2 ? 'Fawad' : 
                          order.takenBy === 3 ? 'Shal Dada' : 
                          order.takenBy || 'N/A';
        
        const orderDate = order.date ? new Date(order.date).toLocaleDateString() : 'N/A';
        
        row.innerHTML = `
            <td><input type="checkbox" class="complete-order-checkbox" data-id="${order.id}" style="cursor: pointer;"></td>
            <td>${orderDate}</td>
            <td>${sanitizeInput(order.customer)}</td>
            <td>${sanitizeInput(order.phone)}</td>
            <td>${sanitizeInput(order.type)}</td>
            <td>${order.quantity}</td>
            <td>PKR ${order.pricePerKg}</td>
            <td>PKR ${order.total.toFixed(2)}</td>
            <td>${takenByName}</td>
            <td><span class="status ${statusClass}">${statusText}</span></td>
            <td class="action-buttons">
                <button class="btn-icon btn-edit edit-order" data-id="${order.id}" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon btn-delete delete-order" data-id="${order.id}" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        
        fragment.appendChild(row);
    });
    
    allOrdersTableBody.appendChild(fragment);
    
    // Add event listeners for checkboxes
    document.querySelectorAll('.complete-order-checkbox').forEach(checkbox => {
        checkbox.removeEventListener('change', handleOrderComplete);
        checkbox.addEventListener('change', handleOrderComplete);
    });
    
    // Add event listeners for edit and delete
    document.querySelectorAll('.edit-order').forEach(button => {
        button.removeEventListener('click', handleEditOrder);
        button.addEventListener('click', handleEditOrder);
    });
    
    document.querySelectorAll('.delete-order').forEach(button => {
        button.removeEventListener('click', handleDeleteOrder);
        button.addEventListener('click', handleDeleteOrder);
    });
}

async function handleOrderComplete() {
    const orderId = parseInt(this.getAttribute('data-id'));
    const order = orders.find(o => o.id === orderId);
    
    if (this.checked) {
        if (confirm(`Are you sure you delivered this order to ${order.customer}? This will move it to the records section.`)) {
            try {
                await completeOrder(orderId);
            } catch (error) {
                this.checked = false;
            }
        } else {
            this.checked = false;
        }
    }
}

function handleEditOrder() {
    const orderId = parseInt(this.getAttribute('data-id'));
    loadOrderIntoForm(orderId);
}

async function handleDeleteOrder() {
    const orderId = parseInt(this.getAttribute('data-id'));
    await deleteOrder(orderId);
}

// Load order into form
function loadOrderIntoForm(orderId) {
    const order = orders.find(o => o.id === orderId);
    if (!order) {
        alert('Order not found');
        return;
    }

    // Navigate to dashboard
    navigateToSection('dashboard');
    
    // Fill the form
    document.getElementById('orderDate').value = order.date ? (new Date(order.date).toISOString().split('T')[0]) : '';
    
    if (order.clientId) {
        document.getElementById('clientSelect').value = order.clientId;
        const ev = new Event('change');
        document.getElementById('clientSelect').dispatchEvent(ev);
    } else {
        document.getElementById('customerName').value = sanitizeInput(order.customer);
    }

    document.getElementById('chickenType').value = order.type;
    document.getElementById('quantity').value = order.quantity;
    document.getElementById('pricePerKg').value = order.pricePerKg;
    calculateTotal();

    editingOrderId = order.id;

    // Change submit button text
    const submitBtn = orderForm.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.textContent = 'Update Order';
}

// Delete order
async function deleteOrder(orderId) {
    if (!confirm('Are you sure you want to delete this order?')) return;

    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    if (authToken) {
        try {
            await apiRequest(`/orders/${orderId}`, {
                method: 'DELETE'
            });
        } catch (error) {
            showNotification('Unable to delete order from server. Changes may not persist.', 'warning');
        }
    }

    if (order.clientId) {
        const client = clients.find(c => c.id === order.clientId);
        if (client) {
            client.totalDue = Math.max(0, (client.totalDue || 0) - order.total);
        }
    }

    orders = orders.filter(order => order.id !== orderId);
    saveDataToStorage();
    
    renderAllOrders();
    updateDashboard();
    renderClients();
    showSuccessMessage('Order deleted successfully');
}

// Complete order (mark as archived)
async function completeOrder(orderId) {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    if (authToken) {
        try {
            await apiRequest(`/orders/${orderId}`, {
                method: 'PUT',
                body: JSON.stringify({ status: 'delivered' })
            });
        } catch (error) {
            showNotification('Unable to update order status on server. Local data was updated.', 'warning');
        }
    }

    order.completed = true;
    order.status = 'delivered';
    order.completedDate = new Date().toISOString();
    saveDataToStorage();
    
    renderAllOrders();
    updateDashboard();
    showSuccessMessage(`✓ Order delivered to ${order.customer} and moved to records`);
}

// Client Search and Filter
function filterAndRenderClients() {
    const nameFilter = clientSearchName ? clientSearchName.value.toLowerCase() : '';
    const locationFilter = clientSearchLocation ? clientSearchLocation.value.toLowerCase() : '';
    
    if (!clientsTableBody) return;
    
    clientsTableBody.innerHTML = '';
    
    const filteredClients = clients.filter(client => {
        const nameMatch = client.name.toLowerCase().includes(nameFilter);
        const locationMatch = client.address.toLowerCase().includes(locationFilter);
        return nameMatch && locationMatch;
    });
    
    if (filteredClients.length === 0) {
        clientsTableBody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 30px; color: #999;">No clients found matching your search</td></tr>`;
        return;
    }
    
    const fragment = document.createDocumentFragment();
    
    filteredClients.forEach(client => {
        fragment.appendChild(renderClientRow(client));
    });
    
    clientsTableBody.appendChild(fragment);
    
    attachClientEventListeners();
}

function renderClientRow(client) {
    const row = document.createElement('tr');
    row.style.cursor = 'pointer';
    row.className = 'client-row';
    row.setAttribute('data-client-id', client.id);
    
    const clientOrders = orders.filter(order => String(order.clientId) === String(client.id));
    const totalOrders = clientOrders.length;
    const totalDue = client.totalDue || 0;
    const paid = client.paidAmount || 0;
    const remaining = Math.max(0, totalDue - paid);
    const isActive = client.active !== false;
    const statusText = isActive ? 'Active' : 'Inactive';
    const statusClass = isActive ? 'status-active' : 'status-inactive';
    const toggleBtnText = isActive ? 'Deactivate' : 'Activate';
    const toggleBtnClass = isActive ? 'btn-warning' : 'btn-success';

    row.innerHTML = `
        <td>${sanitizeInput(client.name)}</td>
        <td>${sanitizeInput(client.phone)}</td>
        <td>${sanitizeInput(client.address)}</td>
        <td>${totalOrders}</td>
        <td>PKR ${totalDue.toFixed(2)}</td>
        <td>PKR ${paid.toFixed(2)}</td>
        <td>PKR ${remaining.toFixed(2)}</td>
        <td class="action-buttons">
            <button class="btn btn-sm btn-payment record-payment" data-id="${client.id}" title="Record Payment">
                <i class="fas fa-money-bill-wave"></i> Payment
            </button>
            <button class="btn btn-sm btn-history view-payments" data-id="${client.id}" title="Payment History">
                <i class="fas fa-history"></i> History
            </button>
            <button class="btn btn-sm btn-bill send-client-bill" data-id="${client.id}" title="Send Bill">
                <i class="fas fa-file-invoice"></i> Bill
            </button>
            <button class="btn btn-sm btn-edit edit-client" data-id="${client.id}" title="Edit">
                <i class="fas fa-edit"></i> Edit
            </button>
            <button class="btn btn-sm ${toggleBtnClass} toggle-client-status" data-id="${client.id}" title="${toggleBtnText}">
                <i class="fas ${isActive ? 'fa-ban' : 'fa-check'}"></i> ${toggleBtnText}
            </button>
        </td>
    `;
    
    return row;
}

function attachClientEventListeners() {
    // Add click event to client rows
    document.querySelectorAll('.client-row').forEach(row => {
        row.removeEventListener('click', handleClientRowClick);
        row.addEventListener('click', handleClientRowClick);
    });
    
    // Add event listeners for payment buttons
    document.querySelectorAll('.record-payment').forEach(button => {
        button.removeEventListener('click', handleRecordPayment);
        button.addEventListener('click', handleRecordPayment);
    });

    document.querySelectorAll('.view-payments').forEach(button => {
        button.removeEventListener('click', handleViewPayments);
        button.addEventListener('click', handleViewPayments);
    });
    
    // Add event listeners for bill buttons
    document.querySelectorAll('.send-client-bill').forEach(button => {
        button.removeEventListener('click', handleSendClientBill);
        button.addEventListener('click', handleSendClientBill);
    });
    
    // Add event listeners for edit buttons
    document.querySelectorAll('.edit-client').forEach(button => {
        button.removeEventListener('click', handleEditClient);
        button.addEventListener('click', handleEditClient);
    });
    
    // Add event listeners for toggle status buttons
    document.querySelectorAll('.toggle-client-status').forEach(button => {
        button.removeEventListener('click', handleToggleClientStatus);
        button.addEventListener('click', handleToggleClientStatus);
    });
}

function handleClientRowClick(e) {
    if (e.target.closest('.action-buttons')) return;
    
    const clientId = this.getAttribute('data-client-id');
    showClientDetail(clientId);
}

function handleRecordPayment(e) {
    e.stopPropagation();
    const clientId = this.getAttribute('data-id');
    openPaymentModal(clientId);
}

function handleViewPayments(e) {
    e.stopPropagation();
    const clientId = this.getAttribute('data-id');
    openPaymentHistoryModal(clientId);
}

function handleSendClientBill(e) {
    e.stopPropagation();
    const clientId = this.getAttribute('data-id');
    sendBillToClient(clientId);
}

function handleEditClient(e) {
    e.stopPropagation();
    const clientId = this.getAttribute('data-id');
    openClientModal(clientId);
}

function handleToggleClientStatus(e) {
    e.stopPropagation();
    const clientId = this.getAttribute('data-id');
    toggleClientStatus(clientId);
}

// Client Management
function renderClients() {
    // Clear search inputs and render all clients (or reset to filtered view)
    if (clientSearchName) clientSearchName.value = '';
    if (clientSearchLocation) clientSearchLocation.value = '';
    filterAndRenderClients();
}

// Shop Management with remaining chicken feature
function renderShops() {
    if (!shopsGrid) return;
    shopsGrid.innerHTML = '';

    if (shops.length === 0) {
        shopsGrid.innerHTML = `<div style="text-align: center; padding: 40px; grid-column: 1/-1;"><p style="color: #999;">No shops added yet. Add a shop to get started.</p></div>`;
        return;
    }

    const fragment = document.createDocumentFragment();

    shops.forEach((shop, index) => {
        const totalChicken = (shop.sales || []).reduce((s, sale) => s + (sale.quantity || 0), 0);
        const totalValue = (shop.sales || []).reduce((s, sale) => s + (sale.total || 0), 0);

        // Today's stats
        const todayKey = formatDateLocal(new Date());
        const todaysSales = (shop.sales || []).filter(sale => formatDateLocal(sale.date) === todayKey);
        const todayKg = todaysSales.reduce((s, sale) => s + (sale.quantity || 0), 0);
        const todayValue = todaysSales.reduce((s, sale) => s + (sale.total || 0), 0);
        const todayProfit = todaysSales.reduce((s, sale) => s + (sale.profit || 0), 0);

        // Remaining chicken for today
        const todaysRemaining = (shop.remainingChickens || []).filter(r => formatDateLocal(r.date) === todayKey);
        const remainingKg = todaysRemaining.reduce((s, r) => s + (r.quantity || 0), 0);

        const paid = shop.paidAmount || 0;
        const remaining = Math.max(0, totalValue - paid);

        // Group sales by date
        const salesByDate = {};
        (shop.sales || []).forEach(sale => {
            const dateKey = formatDateLocal(sale.date);
            if (!salesByDate[dateKey]) {
                salesByDate[dateKey] = [];
            }
            salesByDate[dateKey].push(sale);
        });

        // Sort dates in descending order (newest first)
        const sortedDates = Object.keys(salesByDate).sort((a, b) => new Date(b) - new Date(a));

        const card = document.createElement('div');
        card.className = 'shop-card';
        
        let dateEntriesHTML = '';
        sortedDates.forEach(dateKey => {
            const dateSales = salesByDate[dateKey];
            const dateKg = dateSales.reduce((s, sale) => s + (sale.quantity || 0), 0);
            const dateValue = dateSales.reduce((s, sale) => s + (sale.total || 0), 0);
            const dateProfit = dateSales.reduce((s, sale) => s + (sale.profit || 0), 0);
            const datePayments = (shop.payments || []).filter(p => formatDateLocal(p.date) === dateKey);
            const datePaid = datePayments.reduce((s, p) => s + (p.amount || 0), 0);
            const dateRemaining = Math.max(0, dateValue - datePaid);
            
            // Get remaining chickens for this date
            const dateRemainingChickens = (shop.remainingChickens || []).filter(r => formatDateLocal(r.date) === dateKey);
            const dateRemainingKg = dateRemainingChickens.reduce((s, r) => s + (r.quantity || 0), 0);

            dateEntriesHTML += `
                <div class="shop-date-entry">
                    <div class="date-entry-header">
                        <div class="date-entry-date"><i class="fas fa-calendar"></i> ${dateKey}</div>
                        <div class="date-entry-status ${dateRemaining > 0 ? 'pending' : 'paid'}">
                            ${dateRemaining > 0 ? 'Pending' : 'Paid'}
                        </div>
                    </div>
                    <div class="date-entry-details">
                        <div class="detail-item">
                            <span class="detail-label">Chicken Given:</span>
                            <span class="detail-value">${dateKg.toFixed(2)} kg</span>
                        </div>
                        ${dateRemainingKg > 0 ? `
                        <div class="detail-item">
                            <span class="detail-label">Remaining/Dead:</span>
                            <span class="detail-value danger">${dateRemainingKg.toFixed(2)} kg</span>
                        </div>
                        ` : ''}
                        <div class="detail-item">
                            <span class="detail-label">Revenue:</span>
                            <span class="detail-value positive">PKR ${dateValue.toFixed(2)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Profit:</span>
                            <span class="detail-value positive">PKR ${dateProfit.toFixed(2)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Remaining Due:</span>
                            <span class="detail-value ${dateRemaining > 0 ? 'danger' : 'success'}">PKR ${dateRemaining.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            `;
        });

        card.innerHTML = `
            <div class="shop-card-header">
                <div>
                    <div class="shop-card-title">Shop #${index + 1}: ${sanitizeInput(shop.name)}</div>
                    <div class="shop-location">${sanitizeInput(shop.location || 'No location')}</div>
                </div>
            </div>
            
            <div class="shop-stats">
                <div class="shop-stat">
                    <div class="shop-stat-label">Today's Chicken</div>
                    <div class="shop-stat-value positive">${todayKg.toFixed(2)} kg</div>
                </div>
                <div class="shop-stat">
                    <div class="shop-stat-label">Today's Remaining</div>
                    <div class="shop-stat-value ${remainingKg > 0 ? 'danger' : 'success'}">${remainingKg.toFixed(2)} kg</div>
                </div>
                <div class="shop-stat">
                    <div class="shop-stat-label">Today's Revenue</div>
                    <div class="shop-stat-value positive">PKR ${todayValue.toFixed(2)}</div>
                </div>
                <div class="shop-stat">
                    <div class="shop-stat-label">Total Sales Value</div>
                    <div class="shop-stat-value">PKR ${totalValue.toFixed(2)}</div>
                </div>
                <div class="shop-stat">
                    <div class="shop-stat-label">Total Paid</div>
                    <div class="shop-stat-value">PKR ${paid.toFixed(2)}</div>
                </div>
                <div class="shop-stat">
                    <div class="shop-stat-label">Remaining Due</div>
                    <div class="shop-stat-value ${remaining > 0 ? 'danger' : 'positive'}">PKR ${remaining.toFixed(2)}</div>
                </div>
                <div class="shop-stat">
                    <div class="shop-stat-label">Today's Profit</div>
                    <div class="shop-stat-value positive">PKR ${todayProfit.toFixed(2)}</div>
                </div>
            </div>

            <div class="shop-entries-section">
                <div class="entries-header">
                    <h4><i class="fas fa-list"></i> Daily Entries (${sortedDates.length} dates)</h4>
                </div>
                <div class="shop-date-entries">
                    ${dateEntriesHTML || '<p style="padding: 10px; color: #999;">No entries yet</p>'}
                </div>
            </div>
            
            <div class="shop-actions">
                <button class="btn btn-info btn-sm record-sale" data-id="${shop.id}">
                    <i class="fas fa-plus"></i> Sale
                </button>
                <button class="btn btn-warning btn-sm record-remaining" data-id="${shop.id}">
                    <i class="fas fa-drumstick-bite"></i> Remaining
                </button>
                <button class="btn btn-primary btn-sm day-summary" data-id="${shop.id}">
                    <i class="fas fa-chart-bar"></i> Summary
                </button>
                <button class="btn btn-warning btn-sm generate-shop-bill" data-id="${shop.id}">
                    <i class="fas fa-file-pdf"></i> Bill
                </button>
                <button class="btn btn-success btn-sm record-payment-shop" data-id="${shop.id}">
                    <i class="fas fa-money-bill"></i> Payment
                </button>
                <button class="btn btn-danger btn-sm delete-shop" data-id="${shop.id}">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        `;

        fragment.appendChild(card);
    });

    shopsGrid.appendChild(fragment);

    // Attach event listeners
    document.querySelectorAll('.record-sale').forEach(btn => {
        btn.removeEventListener('click', handleRecordSale);
        btn.addEventListener('click', handleRecordSale);
    });

    document.querySelectorAll('.record-remaining').forEach(btn => {
        btn.removeEventListener('click', handleRecordRemaining);
        btn.addEventListener('click', handleRecordRemaining);
    });

    document.querySelectorAll('.record-payment-shop').forEach(btn => {
        btn.removeEventListener('click', handleRecordPaymentShop);
        btn.addEventListener('click', handleRecordPaymentShop);
    });

    document.querySelectorAll('.day-summary').forEach(btn => {
        btn.removeEventListener('click', handleDaySummary);
        btn.addEventListener('click', handleDaySummary);
    });

    document.querySelectorAll('.generate-shop-bill').forEach(btn => {
        btn.removeEventListener('click', handleGenerateShopBill);
        btn.addEventListener('click', handleGenerateShopBill);
    });

    document.querySelectorAll('.delete-shop').forEach(btn => {
        btn.removeEventListener('click', handleDeleteShop);
        btn.addEventListener('click', handleDeleteShop);
    });
}

function handleRecordSale(e) {
    e.stopPropagation();
    const id = this.getAttribute('data-id');
    openAddSaleModal(id);
}

function handleRecordRemaining(e) {
    e.stopPropagation();
    const id = this.getAttribute('data-id');
    openRemainingChickenModal(id);
}

function handleRecordPaymentShop(e) {
    e.stopPropagation();
    const id = this.getAttribute('data-id');
    openShopPaymentModal(id);
}

function handleDaySummary(e) {
    e.stopPropagation();
    const id = this.getAttribute('data-id');
    openShopDaySummary(id);
}

function handleGenerateShopBill(e) {
    e.stopPropagation();
    const id = this.getAttribute('data-id');
    showShopBillFilterModal(id);
}

function handleDeleteShop(e) {
    e.stopPropagation();
    const id = this.getAttribute('data-id');
    deleteShop(id);
}

function openShopModal() {
    document.getElementById('shopForm').reset();
    document.getElementById('shopId').value = '';
    document.getElementById('shop-modal').style.display = 'block';
}

function handleShopSubmit(e) {
    e.preventDefault();
    const name = sanitizeInput(document.getElementById('shopName').value.trim());
    const location = sanitizeInput(document.getElementById('shopLocation').value.trim());

    if (!name) { alert('Please enter shop name'); return; }

    const newShop = {
        id: 'shop-' + Date.now(),
        name: name,
        location: location,
        sales: [],
        remainingChickens: [],
        payments: [],
        paidAmount: 0,
        createdAt: new Date().toISOString()
    };

    shops.push(newShop);
    saveDataToStorage();
    renderShops();
    populateSaleShopSelect();
    closeModalFunc(document.getElementById('shop-modal'));
    showSuccessMessage('Shop added successfully');
}

function deleteShop(shopId) {
    if (!confirm('Delete this shop and all its sales and remaining records?')) return;
    shops = shops.filter(s => s.id !== shopId);
    saveDataToStorage();
    renderShops();
    populateSaleShopSelect();
}

function populateSaleShopSelect() {
    if (!saleShopSelect) return;
    saleShopSelect.innerHTML = '<option value="">Select Shop</option>';
    shops.forEach(shop => {
        const opt = document.createElement('option');
        opt.value = shop.id;
        opt.textContent = shop.name + (shop.location ? (' - ' + shop.location) : '');
        saleShopSelect.appendChild(opt);
    });
}

function openAddSaleModal(shopId = null) {
    if (!saleModal) return;
    populateSaleShopSelect();
    if (shopId && saleShopSelect) saleShopSelect.value = shopId;
    if (saleForm) saleForm.reset();
    if (saleDate) saleDate.value = formatDateLocal(new Date());
    if (saleTotalValue) saleTotalValue.textContent = 'PKR 0.00';
    saleModal.style.display = 'block';
}

function calculateSaleTotal() {
    const q = parseFloat(saleQuantity?.value) || 0;
    const p = parseFloat(salePricePerKg?.value) || 0;
    const c = parseFloat(saleCostPerKg?.value) || 0;
    const total = q * p;
    const profit = (p - c) * q;
    if (saleTotalValue) saleTotalValue.textContent = `PKR ${total.toFixed(2)} (Profit: PKR ${profit.toFixed(2)})`;
}

function handleSaleSubmit(e) {
    e.preventDefault();
    const saleDate_val = saleDate?.value;
    const shopId = saleShopSelect?.value;
    const quantity = parseFloat(saleQuantity?.value) || 0;
    const pricePerKg = parseFloat(salePricePerKg?.value) || 0;
    const costPerKg = parseFloat(saleCostPerKg?.value) || 0;

    if (!saleDate_val || !shopId || quantity <= 0 || pricePerKg <= 0) { alert('Please complete the sale form'); return; }

    const shop = shops.find(s => s.id === shopId);
    if (!shop) { alert('Shop not found'); return; }

    const total = quantity * pricePerKg;
    const profit = (pricePerKg - costPerKg) * quantity;
    const sale = {
        id: 'sale-' + Date.now(),
        date: new Date(saleDate_val + 'T12:00:00').toISOString(),
        quantity: quantity,
        pricePerKg: pricePerKg,
        costPerKg: costPerKg,
        total: total,
        profit: profit,
        recordedBy: currentUser || 'system'
    };

    if (!shop.sales) shop.sales = [];
    shop.sales.push(sale);
    saveDataToStorage();
    renderShops();
    closeModalFunc(document.getElementById('add-sale-modal'));
    showSuccessMessage(`Recorded sale: ${quantity} kg to ${shop.name} on ${saleDate_val} for PKR ${total.toFixed(2)} (Profit: PKR ${profit.toFixed(2)})`);
}

// New function for remaining chicken modal
function openRemainingChickenModal(shopId) {
    if (!remainingChickenModal) return;
    
    const today = formatDateLocal(new Date());
    remainingDate.value = today;
    remainingShopId.value = shopId;
    remainingQuantity.value = '';
    remainingNotes.value = '';
    
    remainingChickenModal.style.display = 'block';
}

function handleRemainingChickenSubmit(e) {
    e.preventDefault();
    
    const shopId = remainingShopId.value;
    const date = remainingDate.value;
    const quantity = parseFloat(remainingQuantity.value) || 0;
    const notes = sanitizeInput(remainingNotes.value);

    if (!shopId || !date) {
        alert('Please fill all required fields');
        return;
    }

    const shop = shops.find(s => s.id === shopId);
    if (!shop) {
        alert('Shop not found');
        return;
    }

    const remainingRecord = {
        id: 'remaining-' + Date.now(),
        date: new Date(date + 'T12:00:00').toISOString(),
        quantity: quantity,
        notes: notes,
        recordedBy: currentUser || 'system',
        createdAt: new Date().toISOString()
    };

    if (!shop.remainingChickens) shop.remainingChickens = [];
    shop.remainingChickens.push(remainingRecord);
    
    saveDataToStorage();
    renderShops();
    closeModalFunc(remainingChickenModal);
    
    showSuccessMessage(`Recorded ${quantity} kg remaining/unsold chicken for ${date}`);
}

// Open day summary for a shop; optional date string (YYYY-MM-DD)
function openShopDaySummary(shopId, dateStr = null) {
    const shop = shops.find(s => s.id === shopId);
    if (!shop) return;
    const dateKey = dateStr || formatDateLocal(new Date());

    sdsShopName.textContent = sanitizeInput(shop.name);
    sdsDate.value = dateKey;

    const salesOnDate = (shop.sales || []).filter(sale => formatDateLocal(sale.date) === dateKey);
    const paymentsOnDate = (shop.payments || []).filter(p => formatDateLocal(p.date) === dateKey);
    const remainingOnDate = (shop.remainingChickens || []).filter(r => formatDateLocal(r.date) === dateKey);

    const totalKg = salesOnDate.reduce((s, sale) => s + (sale.quantity || 0), 0);
    const revenue = salesOnDate.reduce((s, sale) => s + (sale.total || 0), 0);
    const cost = salesOnDate.reduce((s, sale) => s + ((sale.costPerKg || 0) * (sale.quantity || 0)), 0);
    const grossProfit = revenue - cost;
    const paymentsSum = paymentsOnDate.reduce((s, p) => s + (p.amount || 0), 0);
    const remainingDue = Math.max(0, revenue - paymentsSum);
    const netCash = paymentsSum - cost;
    const remainingKg = remainingOnDate.reduce((s, r) => s + (r.quantity || 0), 0);

    sdsTotalKg.textContent = `${totalKg.toFixed(2)} kg`;
    sdsRevenue.textContent = `PKR ${revenue.toFixed(2)}`;
    sdsCost.textContent = `PKR ${cost.toFixed(2)}`;
    sdsGrossProfit.textContent = `PKR ${grossProfit.toFixed(2)}`;
    sdsPayments.textContent = `PKR ${paymentsSum.toFixed(2)}`;
    sdsRemaining.textContent = `PKR ${remainingDue.toFixed(2)}`;
    sdsNetCash.textContent = `PKR ${netCash.toFixed(2)}`;

    // Add remaining chicken info
    let remainingInfo = '';
    if (remainingKg > 0) {
        remainingInfo = `<div style="color:var(--danger); font-weight:600; margin-top:10px;">Remaining/Unsold: ${remainingKg.toFixed(2)} kg</div>`;
    }

    if (grossProfit >= 0) {
        sdsIndicator.innerHTML = `<div style="color:green;font-weight:600;">Gross Profit: PKR ${grossProfit.toFixed(2)}</div>${remainingInfo}`;
    } else {
        sdsIndicator.innerHTML = `<div style="color:red;font-weight:600;">Gross Loss: PKR ${Math.abs(grossProfit).toFixed(2)}</div>${remainingInfo}`;
    }

    shopDaySummaryModal.style.display = 'block';

    // allow changing date in modal
    sdsDate.onchange = function() {
        openShopDaySummary(shopId, this.value);
    };
}

function openShopBill(shopId, fromDate = null, toDate = null) {
    const shop = shops.find(s => s.id === shopId);
    if (!shop) return;

    // Filter sales by date range if provided
    let salesForBill = shop.sales || [];
    let paymentsForBill = shop.payments || [];
    let remainingForBill = shop.remainingChickens || [];
    
    if (fromDate && toDate) {
        salesForBill = salesForBill.filter(sale => {
            const saleDate = formatDateLocal(sale.date);
            return saleDate >= fromDate && saleDate <= toDate;
        });
        paymentsForBill = paymentsForBill.filter(p => {
            const payDate = formatDateLocal(p.date);
            return payDate >= fromDate && payDate <= toDate;
        });
        remainingForBill = remainingForBill.filter(r => {
            const remDate = formatDateLocal(r.date);
            return remDate >= fromDate && remDate <= toDate;
        });
    } else {
        // Use today's date if no range provided
        const dateKey = formatDateLocal(new Date());
        salesForBill = salesForBill.filter(sale => formatDateLocal(sale.date) === dateKey);
        paymentsForBill = paymentsForBill.filter(p => formatDateLocal(p.date) === dateKey);
        remainingForBill = remainingForBill.filter(r => formatDateLocal(r.date) === dateKey);
    }

    const totalKg = salesForBill.reduce((s, sale) => s + (sale.quantity || 0), 0);
    const revenue = salesForBill.reduce((s, sale) => s + (sale.total || 0), 0);
    const cost = salesForBill.reduce((s, sale) => s + ((sale.costPerKg || 0) * (sale.quantity || 0)), 0);
    const grossProfit = revenue - cost;
    const paymentsSum = paymentsForBill.reduce((s, p) => s + (p.amount || 0), 0);
    const remainingDue = Math.max(0, revenue - paymentsSum);
    const remainingKg = remainingForBill.reduce((s, r) => s + (r.quantity || 0), 0);

    // Build bill HTML
    let html = '';
    html += `<div style="text-align:center;"><h2>Ali Khail Poultry</h2><h3>Shop Bill</h3></div>`;
    html += `<div><strong>Shop:</strong> ${sanitizeInput(shop.name)}</div>`;
    if (fromDate && toDate) {
        html += `<div><strong>Period:</strong> ${fromDate} to ${toDate}</div>`;
    } else {
        html += `<div><strong>Date:</strong> ${formatDateLocal(new Date())}</div>`;
    }
    html += `<hr/>`;
    html += `<h4>Sales</h4>`;
    if (salesForBill.length === 0) {
        html += `<div>No sales for this period.</div>`;
    } else {
        html += `<table style="width:100%; border-collapse:collapse;">`;
        html += `<thead><tr><th style="border:1px solid #ddd;padding:6px;">Date</th><th style="border:1px solid #ddd;padding:6px;">Time</th><th style="border:1px solid #ddd;padding:6px;">Qty (kg)</th><th style="border:1px solid #ddd;padding:6px;">Rate (PKR/kg)</th><th style="border:1px solid #ddd;padding:6px;">Cost/kg</th><th style="border:1px solid #ddd;padding:6px;">Total (PKR)</th><th style="border:1px solid #ddd;padding:6px;">Profit (PKR)</th></tr></thead>`;
        html += `<tbody>`;
        salesForBill.forEach(sale => {
            const saleDate = formatDateLocal(sale.date);
            const time = new Date(sale.date).toLocaleTimeString();
            const profit = ((sale.pricePerKg || 0) - (sale.costPerKg || 0)) * (sale.quantity || 0);
            html += `<tr><td style="border:1px solid #ddd;padding:6px;">${saleDate}</td><td style="border:1px solid #ddd;padding:6px;">${time}</td><td style="border:1px solid #ddd;padding:6px; text-align:right;">${sale.quantity}</td><td style="border:1px solid #ddd;padding:6px; text-align:right;">${sale.pricePerKg}</td><td style="border:1px solid #ddd;padding:6px; text-align:right;">${sale.costPerKg}</td><td style="border:1px solid #ddd;padding:6px; text-align:right;">PKR ${sale.total.toFixed(2)}</td><td style="border:1px solid #ddd;padding:6px; text-align:right;">PKR ${profit.toFixed(2)}</td></tr>`;
        });
        html += `</tbody></table>`;
    }

    if (remainingKg > 0) {
        html += `<hr/>`;
        html += `<h4>Remaining/Unsold Chicken</h4>`;
        html += `<table style="width:100%; border-collapse:collapse;">`;
        html += `<thead><tr><th style="border:1px solid #ddd;padding:6px;">Date</th><th style="border:1px solid #ddd;padding:6px;">Quantity (kg)</th><th style="border:1px solid #ddd;padding:6px;">Notes</th></tr></thead>`;
        html += `<tbody>`;
        remainingForBill.forEach(rem => {
            const remDate = formatDateLocal(rem.date);
            html += `<tr><td style="border:1px solid #ddd;padding:6px;">${remDate}</td><td style="border:1px solid #ddd;padding:6px; text-align:right;">${rem.quantity} kg</td><td style="border:1px solid #ddd;padding:6px;">${rem.notes || '-'}</td></tr>`;
        });
        html += `</tbody></table>`;
    }

    html += `<hr/>`;
    html += `<div style="display:flex; gap:20px; flex-wrap:wrap;">`;
    html += `<div><strong>Total Sold (kg):</strong> ${totalKg.toFixed(2)}</div>`;
    html += `<div><strong>Revenue:</strong> PKR ${revenue.toFixed(2)}</div>`;
    html += `<div><strong>Total Cost:</strong> PKR ${cost.toFixed(2)}</div>`;
    html += `<div><strong>Gross Profit:</strong> PKR ${grossProfit.toFixed(2)}</div>`;
    html += `<div><strong>Payments Collected:</strong> PKR ${paymentsSum.toFixed(2)}</div>`;
    html += `<div><strong>Remaining Due:</strong> PKR ${remainingDue.toFixed(2)}</div>`;
    if (remainingKg > 0) {
        html += `<div><strong>Remaining/Unsold:</strong> ${remainingKg.toFixed(2)} kg</div>`;
    }
    html += `</div>`;

    html += `<hr/>`;
    html += `<div><strong>Remarks:</strong> ____________________________________________</div>`;

    shopBillBody.innerHTML = html;
    shopBillModal.style.display = 'block';
}

function printShopBill() {
    if (!shopBillBody) return;
    const content = shopBillBody.innerHTML;
    const w = window.open('', '_blank');
    w.document.write(`<html><head><title>Shop Bill</title><style>body{font-family:Arial, Helvetica, sans-serif;padding:12px;}table{width:100%;border-collapse:collapse;}th,td{border:1px solid #ddd;padding:6px;}</style></head><body>${content}</body></html>`);
    w.document.close();
    w.focus();
    w.print();
}

function showShopBillFilterModal(shopId) {
    if (!shopBillFilterModal) return;
    billFilterShopId.value = shopId;
    billFromDate.value = formatDateLocal(new Date());
    billToDate.value = formatDateLocal(new Date());
    shopBillFilterModal.style.display = 'block';
}

function handleBillFilterSubmit(e) {
    e.preventDefault();
    const shopId = billFilterShopId.value;
    const fromDate = billFromDate.value;
    const toDate = billToDate.value;

    if (!shopId || !fromDate || !toDate) {
        alert('Please fill all filter fields');
        return;
    }

    if (fromDate > toDate) {
        alert('From date must be before To date');
        return;
    }

    closeModalFunc(shopBillFilterModal);
    openShopBill(shopId, fromDate, toDate);
}

// Shop payments
function openShopPaymentModal(shopId) {
    if (!shopPaymentModal) return;
    paymentShopIdInput.value = shopId;
    shopPaymentDate.value = formatDateLocal(new Date());
    shopPaymentAmount.value = '';
    shopPaymentMethod.value = 'cash';
    shopPaymentModal.style.display = 'block';
}

function handleShopPaymentSubmit(e) {
    e.preventDefault();
    const shopId = paymentShopIdInput.value;
    const date = shopPaymentDate.value;
    const amount = parseFloat(shopPaymentAmount.value) || 0;
    const method = shopPaymentMethod.value;

    if (!shopId || !date || amount <= 0) { alert('Please fill payment details'); return; }

    const shop = shops.find(s => s.id === shopId);
    if (!shop) { alert('Shop not found'); return; }

    const payment = {
        id: 'shoppayment-' + Date.now(),
        date: date,
        amount: amount,
        method: method,
        recordedBy: currentUser || 'system',
        createdAt: new Date().toISOString()
    };

    if (!shop.payments) shop.payments = [];
    shop.payments.push(payment);
    shop.paidAmount = (shop.paidAmount || 0) + amount;

    saveDataToStorage();
    renderShops();
    closeModalFunc(shopPaymentModal);
    showSuccessMessage(`Payment of PKR ${amount.toFixed(2)} recorded for ${shop.name}`);
    // After recording payment, show day summary for the payment date
    openShopDaySummary(shop.id, date);
}

// Delete client
function toggleClientStatus(clientId) {
    const client = clients.find(c => c.id === clientId);
    if (!client) return;
    
    const newStatus = client.active === false;
    const message = newStatus ? 'activated' : 'deactivated';
    
    client.active = newStatus;
    saveDataToStorage();
    renderClients();
    populateClientDropdown();
    populateReminderClientDropdowns();
    updateDashboard();
    
    showSuccessMessage(`Client ${message} successfully`);
}

// Client Detail Page
function showClientDetail(clientId) {
    const client = clients.find(c => c.id === clientId);
    if (!client) return;
    
    // Update client info
    document.getElementById('client-detail-name').textContent = sanitizeInput(client.name);
    document.getElementById('detail-client-name').textContent = sanitizeInput(client.name);
    document.getElementById('detail-client-phone').textContent = sanitizeInput(client.phone);
    document.getElementById('detail-client-address').textContent = sanitizeInput(client.address);
    
    const sinceDate = client.createdAt ? new Date(client.createdAt).toLocaleDateString() : 'N/A';
    document.getElementById('detail-client-since').textContent = sinceDate;
    
    // Calculate statistics
    const clientOrders = orders.filter(order => order.clientId === clientId);
    const totalOrders = clientOrders.length;
    const totalChicken = clientOrders.reduce((sum, order) => sum + order.quantity, 0);
    const totalValue = clientOrders.reduce((sum, order) => sum + order.total, 0);
    const totalDue = client.totalDue || 0;
    const totalPaid = client.paidAmount || 0;
    const remaining = Math.max(0, totalDue - totalPaid);
    
    // Update financial summary
    document.getElementById('detail-total-orders').textContent = totalOrders;
    document.getElementById('detail-total-chicken').textContent = `${totalChicken.toFixed(2)} kg`;
    document.getElementById('detail-total-value').textContent = `PKR ${totalValue.toFixed(2)}`;
    document.getElementById('detail-total-due').textContent = `PKR ${totalDue.toFixed(2)}`;
    document.getElementById('detail-total-paid').textContent = `PKR ${totalPaid.toFixed(2)}`;
    document.getElementById('detail-remaining').textContent = `PKR ${remaining.toFixed(2)}`;
    
    // Render client orders
    renderClientOrders(clientId);
    
    // Render payment history
    renderClientDetailPaymentHistory(clientId);
    
    // Show client detail page
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById('client-detail-page').classList.add('active');
    
    // Update navigation
    navTabs.forEach(tab => tab.classList.remove('active'));
}

function renderClientOrders(clientId) {
    const tableBody = document.getElementById('client-orders-table-body');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    const clientOrders = orders.filter(order => order.clientId === clientId)
        .sort((a, b) => new Date(b.date) - new Date(a.date));
    
    if (clientOrders.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 20px;">
                    No orders found for this client
                </td>
            </tr>
        `;
        return;
    }
    
    const fragment = document.createDocumentFragment();
    
    clientOrders.forEach(order => {
        const row = document.createElement('tr');
        const orderDate = order.date ? new Date(order.date).toLocaleDateString() : 'N/A';
        const takenByName = order.takenBy === 'jawad' ? 'Jawad' : 
                          order.takenBy === 'fawad' ? 'Fawad' : 'Shal Dada';
        
        const statusClass = order.status === 'delivered' ? 'delivered' : 
                          order.status === 'processing' ? 'processing' : 'pending';
        
        const statusText = order.status === 'delivered' ? 'Delivered' : 
                         order.status === 'processing' ? 'Processing' : 'Pending';
        
        row.innerHTML = `
            <td>${orderDate}</td>
            <td>${sanitizeInput(order.type)}</td>
            <td>${order.quantity}</td>
            <td>PKR ${order.pricePerKg}</td>
            <td>PKR ${order.total.toFixed(2)}</td>
            <td>${takenByName}</td>
            <td><span class="status ${statusClass}">${statusText}</span></td>
        `;
        
        fragment.appendChild(row);
    });
    
    tableBody.appendChild(fragment);
}

function renderClientDetailPaymentHistory(clientId) {
    const tableBody = document.getElementById('client-payment-history-table-body');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    const client = clients.find(c => c.id === clientId);
    if (!client || !client.payments || client.payments.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 20px;">
                    No payment history found
                </td>
            </tr>
        `;
        return;
    }
    
    const sortedPayments = [...client.payments].sort((a, b) => new Date(b.date) - new Date(a.date));
    const fragment = document.createDocumentFragment();
    
    sortedPayments.forEach(payment => {
        const row = document.createElement('tr');
        const paymentDate = new Date(payment.date).toLocaleDateString();
        
        row.innerHTML = `
            <td>${paymentDate}</td>
            <td>PKR ${payment.amount.toFixed(2)}</td>
            <td>${formatPaymentMethod(payment.method)}</td>
            <td>${sanitizeInput(payment.reference || '-')}</td>
            <td>
                <button class="btn-icon btn-delete delete-payment-detail" 
                        data-client-id="${clientId}" 
                        data-payment-id="${payment.id}" 
                        title="Delete Payment">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        
        fragment.appendChild(row);
    });
    
    tableBody.appendChild(fragment);
    
    document.querySelectorAll('.delete-payment-detail').forEach(button => {
        button.removeEventListener('click', handleDeletePaymentDetail);
        button.addEventListener('click', handleDeletePaymentDetail);
    });
}

function handleDeletePaymentDetail() {
    const clientId = this.getAttribute('data-client-id');
    const paymentId = this.getAttribute('data-payment-id');
    deletePayment(clientId, paymentId);
    showClientDetail(clientId);
}

function handleAddPaymentFromDetail() {
    const currentClientId = document.querySelector('.client-row.active')?.getAttribute('data-client-id');
    if (currentClientId) {
        openPaymentModal(currentClientId);
    }
}

// Payment Management
function openPaymentModal(clientId) {
    const client = clients.find(c => c.id === clientId);
    if (!client) return;

    const today = new Date().toISOString().split('T')[0];
    document.getElementById('paymentDate').value = today;
    document.getElementById('paymentClientId').value = clientId;
    
    const totalDue = client.totalDue || 0;
    const paidAmount = client.paidAmount || 0;
    const currentDue = Math.max(0, totalDue - paidAmount);
    
    document.getElementById('current-due-amount').textContent = `PKR ${currentDue.toFixed(2)}`;
    document.getElementById('paymentAmount').value = '';
    document.getElementById('paymentMethod').value = 'cash';
    document.getElementById('paymentReference').value = '';
    
    document.getElementById('payment-modal').style.display = 'block';
}

function handlePaymentSubmit(e) {
    e.preventDefault();
    
    const clientId = document.getElementById('paymentClientId').value;
    const date = document.getElementById('paymentDate').value;
    const amount = parseFloat(document.getElementById('paymentAmount').value);
    const method = document.getElementById('paymentMethod').value;
    const reference = sanitizeInput(document.getElementById('paymentReference').value);
    
    if (!clientId || !date || !amount || amount <= 0) {
        alert('Please fill in all required fields with valid values');
        return;
    }
    
    const client = clients.find(c => c.id === clientId);
    if (!client) {
        alert('Client not found');
        return;
    }
    
    const totalDue = client.totalDue || 0;
    const currentPaid = client.paidAmount || 0;
    const remainingDue = Math.max(0, totalDue - currentPaid);
    
    if (amount > remainingDue) {
        if (!confirm(`Payment amount (PKR ${amount}) exceeds remaining due (PKR ${remainingDue.toFixed(2)}). Continue anyway?`)) {
            return;
        }
    }
    
    const payment = {
        id: 'payment-' + Date.now(),
        date: date,
        amount: amount,
        method: method,
        reference: reference,
        recordedBy: currentUser,
        createdAt: new Date().toISOString()
    };
    
    if (!client.payments) {
        client.payments = [];
    }
    
    client.payments.push(payment);
    client.paidAmount = (client.paidAmount || 0) + amount;
    
    saveDataToStorage();
    renderClients();
    closeModalFunc(document.getElementById('payment-modal'));
    
    showSuccessMessage(`Payment of PKR ${amount.toFixed(2)} recorded successfully!`);
}

function openPaymentHistoryModal(clientId) {
    const client = clients.find(c => c.id === clientId);
    if (!client) return;

    document.getElementById('history-client-name').textContent = sanitizeInput(client.name);
    document.getElementById('history-client-details').textContent = 
        `Phone: ${sanitizeInput(client.phone)} | Address: ${sanitizeInput(client.address)}`;
    
    const totalDue = client.totalDue || 0;
    const paidAmount = client.paidAmount || 0;
    const remaining = Math.max(0, totalDue - paidAmount);
    
    document.getElementById('history-total-due').textContent = `PKR ${totalDue.toFixed(2)}`;
    document.getElementById('history-total-paid').textContent = `PKR ${paidAmount.toFixed(2)}`;
    document.getElementById('history-remaining').textContent = `PKR ${remaining.toFixed(2)}`;
    
    renderPaymentHistory(clientId);
    document.getElementById('payment-history-modal').style.display = 'block';
}

function renderPaymentHistory(clientId) {
    const tableBody = document.getElementById('paymentHistoryTableBody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    const client = clients.find(c => c.id === clientId);
    if (!client || !client.payments || client.payments.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No payment history found</td></tr>';
        return;
    }
    
    const sortedPayments = [...client.payments].sort((a, b) => new Date(b.date) - new Date(a.date));
    const fragment = document.createDocumentFragment();
    
    sortedPayments.forEach(payment => {
        const row = document.createElement('tr');
        const paymentDate = new Date(payment.date).toLocaleDateString();
        
        row.innerHTML = `
            <td>${paymentDate}</td>
            <td>PKR ${payment.amount.toFixed(2)}</td>
            <td>${formatPaymentMethod(payment.method)}</td>
            <td>${sanitizeInput(payment.reference || '-')}</td>
            <td>
                <button class="btn-icon btn-delete delete-payment" 
                        data-client-id="${clientId}" 
                        data-payment-id="${payment.id}" 
                        title="Delete Payment">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        
        fragment.appendChild(row);
    });
    
    tableBody.appendChild(fragment);
    
    document.querySelectorAll('.delete-payment').forEach(button => {
        button.removeEventListener('click', handleDeletePayment);
        button.addEventListener('click', handleDeletePayment);
    });
}

function handleDeletePayment() {
    const clientId = this.getAttribute('data-client-id');
    const paymentId = this.getAttribute('data-payment-id');
    deletePayment(clientId, paymentId);
    renderPaymentHistory(clientId);
}

function deletePayment(clientId, paymentId) {
    if (!confirm('Are you sure you want to delete this payment record?')) {
        return;
    }
    
    const client = clients.find(c => c.id === clientId);
    if (!client || !client.payments) return;
    
    const paymentIndex = client.payments.findIndex(p => p.id === paymentId);
    if (paymentIndex === -1) return;
    
    const payment = client.payments[paymentIndex];
    client.paidAmount = Math.max(0, (client.paidAmount || 0) - payment.amount);
    client.payments.splice(paymentIndex, 1);
    
    if (client.payments.length === 0) {
        delete client.payments;
    }
    
    saveDataToStorage();
    renderClients();
    
    if (document.getElementById('client-detail-page').classList.contains('active')) {
        showClientDetail(clientId);
    } else {
        renderPaymentHistory(clientId);
    }
    
    showSuccessMessage('Payment record deleted successfully');
}

function formatPaymentMethod(method) {
    const methodMap = {
        'cash': 'Cash',
        'bank_transfer': 'Bank Transfer',
        'cheque': 'Cheque',
        'online': 'Online Payment',
        'card': 'Card',
        'other': 'Other'
    };
    return methodMap[method] || method;
}

// Modal Functions
function openClientModal(clientId = null) {
    const modalTitle = document.getElementById('modal-title');
    
    if (clientId) {
        modalTitle.textContent = 'Edit Client';
        const client = clients.find(c => c.id === clientId);
        if (client) {
            document.getElementById('clientId').value = client.id;
            document.getElementById('clientName').value = sanitizeInput(client.name);
            document.getElementById('clientPhone').value = sanitizeInput(client.phone);
            document.getElementById('clientAddress').value = sanitizeInput(client.address);
        }
    } else {
        modalTitle.textContent = 'Add New Client';
        document.getElementById('clientForm').reset();
        document.getElementById('clientId').value = '';
    }
    
    document.getElementById('client-modal').style.display = 'block';
}

async function handleClientSubmit(e) {
    e.preventDefault();
    
    const clientId = document.getElementById('clientId').value;
    const name = sanitizeInput(document.getElementById('clientName').value);
    const phone = sanitizeInput(document.getElementById('clientPhone').value);
    const address = sanitizeInput(document.getElementById('clientAddress').value);
    
    if (!name || !phone || !address) {
        alert('Please fill in all fields');
        return;
    }
    
    if (clientId) {
        const clientIndex = clients.findIndex(c => String(c.id) === String(clientId));
        if (clientIndex !== -1) {
            clients[clientIndex] = {
                ...clients[clientIndex],
                name: name,
                phone: phone,
                address: address
            };
        }
        showSuccessMessage('Client updated successfully!');
    } else {
        let newClient = {
            id: 'client-' + Date.now(),
            name: name,
            phone: phone,
            address: address,
            totalDue: 0,
            paidAmount: 0,
            payments: [],
            active: true,
            createdAt: new Date().toISOString()
        };

        if (authToken) {
            try {
                const saved = await saveClient({ name, phone, address });
                await loadClients();
                populateClientDropdown();
                populateReminderClientDropdowns();
                showSuccessMessage('Client added successfully!');
                closeModalFunc(document.getElementById('client-modal'));
                renderClients();
                return;
            } catch (error) {
                console.error('Failed to save client via API, falling back to local data', error);
            }
        }

        clients.push(newClient);
        showSuccessMessage('Client added successfully!');
    }
    
    saveDataToStorage();
    renderClients();
    populateClientDropdown();
    populateReminderClientDropdowns();
    updateDashboard();
    closeModalFunc(document.getElementById('client-modal'));
}

function openQuickClientModal() {
    document.getElementById('quickClientForm').reset();
    document.getElementById('quick-client-modal').style.display = 'block';
}

async function handleQuickClientSubmit(e) {
    e.preventDefault();
    
    const name = sanitizeInput(document.getElementById('quickClientName').value);
    const phone = sanitizeInput(document.getElementById('quickClientPhone').value);
    const address = sanitizeInput(document.getElementById('quickClientAddress').value);
    
    if (!name || !phone || !address) {
        alert('Please fill in all fields');
        return;
    }

    let newClient = {
        id: 'client-' + Date.now(),
        name: name,
        phone: phone,
        address: address,
        totalDue: 0,
        paidAmount: 0,
        payments: [],
        active: true,
        createdAt: new Date().toISOString()
    };

    if (authToken) {
        try {
            const saved = await saveClient({ name, phone, address });
            await loadClients();
            populateClientDropdown();
            populateReminderClientDropdowns();
            document.getElementById('clientSelect').value = String(saved.id);
            const event = new Event('change');
            document.getElementById('clientSelect').dispatchEvent(event);
            closeModalFunc(document.getElementById('quick-client-modal'));
            showSuccessMessage('New client added and selected successfully!');
            return;
        } catch (error) {
            console.error('Failed to save quick client via API, falling back to local data', error);
        }
    }

    clients.push(newClient);
    saveDataToStorage();
    populateClientDropdown();
    populateReminderClientDropdowns();
    
    document.getElementById('clientSelect').value = newClient.id;
    const event = new Event('change');
    document.getElementById('clientSelect').dispatchEvent(event);
    
    closeModalFunc(document.getElementById('quick-client-modal'));
    showSuccessMessage('New client added and selected successfully!');
}

async function handleBrokerSubmit(e) {
    e.preventDefault();

    const brokerId = document.getElementById('brokerId').value;
    const name = sanitizeInput(document.getElementById('brokerName').value);
    const phone = sanitizeInput(document.getElementById('brokerPhone').value);
    const address = sanitizeInput(document.getElementById('brokerAddress').value);
    const totalDue = parseFloat(document.getElementById('brokerTotal').value) || 0;
    const paidAmount = parseFloat(document.getElementById('brokerPaid').value) || 0;

    if (!name || !phone || !address) {
        alert('Please fill in all required fields.');
        return;
    }

    if (brokerId) {
        const existingIndex = brokers.findIndex(b => String(b.id) === String(brokerId));
        if (existingIndex !== -1) {
            brokers[existingIndex] = {
                ...brokers[existingIndex],
                name,
                phone,
                address,
                totalDue,
                paidAmount,
                payments: brokers[existingIndex].payments || []
            };
            showSuccessMessage('Broker updated successfully');
        }
    } else {
        const newBroker = {
            id: authToken ? null : `broker-${Date.now()}`,
            name,
            phone,
            address,
            totalDue,
            paidAmount,
            payments: [],
            createdAt: new Date().toISOString()
        };

        if (authToken) {
            try {
                const saved = await saveBroker({ name, phone, commission_rate: 0 });
                newBroker.id = String(saved.id || newBroker.id);
            } catch (error) {
                console.error('Failed to save broker via API, falling back to local data', error);
            }
        }

        if (!newBroker.id) {
            newBroker.id = `broker-${Date.now()}`;
        }

        brokers.push(newBroker);
        showSuccessMessage('Broker added successfully');
    }

    saveDataToStorage();
    renderBrokers();
    closeModalFunc(document.getElementById('broker-modal'));
}

// Last Order Functions
function saveLastOrder(order) {
    if (currentUser) {
        const lastOrders = JSON.parse(localStorage.getItem('userLastOrders') || '{}');
        lastOrders[currentUser] = order;
        localStorage.setItem('userLastOrders', JSON.stringify(lastOrders));
    }
}

function loadLastOrderIntoForm() {
    if (!currentUser) {
        alert('Please login first');
        return;
    }
    
    const lastOrders = JSON.parse(localStorage.getItem('userLastOrders') || '{}');
    const lastOrder = lastOrders[currentUser];
    
    if (!lastOrder) {
        alert('No previous order found for your account.');
        return;
    }
    
    document.getElementById('orderDate').value = lastOrder.date ? lastOrder.date.split('T')[0] : new Date().toISOString().split('T')[0];
    
    const client = clients.find(c => c.name === lastOrder.customer && c.phone === lastOrder.phone);
    if (client) {
        document.getElementById('clientSelect').value = client.id;
        const event = new Event('change');
        document.getElementById('clientSelect').dispatchEvent(event);
    } else {
        document.getElementById('customerName').value = sanitizeInput(lastOrder.customer);
    }
    
    document.getElementById('chickenType').value = lastOrder.type;
    document.getElementById('quantity').value = lastOrder.quantity;
    document.getElementById('pricePerKg').value = lastOrder.pricePerKg;
    calculateTotal();
    
    alert('Last order loaded successfully! Review and click "Add Order" to save.');
}

// Records Functions
function renderOrderRecords() {
    if (!orderRecordsTableBody) return;
    
    orderRecordsTableBody.innerHTML = '';
    
    const selectedDate = recordsDateFilter.value;
    // Filter to show only delivered/completed orders
    let filteredOrders = orders.filter(order => order.completed === true || order.status === 'delivered');
    
    if (selectedDate) {
        filteredOrders = filteredOrders.filter(order => {
            const orderDate = new Date(order.date).toISOString().split('T')[0];
            return orderDate === selectedDate;
        });
    }
    
    filteredOrders.sort((a, b) => new Date(b.date) - new Date(a.date));
    updateRecordsSummary(filteredOrders);
    
    if (filteredOrders.length === 0) {
        orderRecordsTableBody.innerHTML = '<tr><td colspan="10" style="text-align:center; padding: 30px; color: #999;">No delivered orders found</td></tr>';
        return;
    }
    
    const fragment = document.createDocumentFragment();
    
    filteredOrders.forEach(order => {
        const row = document.createElement('tr');
        const orderDateTime = new Date(order.date);
        const orderDate = orderDateTime.toLocaleDateString();
        const orderTime = orderDateTime.toLocaleTimeString();
        
        const statusClass = 'delivered';
        const statusText = 'Delivered';
        
        const takenByName = order.takenBy === 'jawad' ? 'Jawad' : 
                          order.takenBy === 'fawad' ? 'Fawad' : 
                          order.takenBy === 'shal-dada' ? 'Shal Dada' : 
                          order.takenBy === 1 ? 'Jawad' : 
                          order.takenBy === 2 ? 'Fawad' : 
                          order.takenBy === 3 ? 'Shal Dada' : 
                          order.takenBy || 'N/A';
        
        row.innerHTML = `
            <td>${orderDate}</td>
            <td>${orderTime}</td>
            <td>${sanitizeInput(order.customer)}</td>
            <td>${sanitizeInput(order.phone)}</td>
            <td>${sanitizeInput(order.type)}</td>
            <td>${order.quantity}</td>
            <td>PKR ${order.pricePerKg}</td>
            <td>PKR ${order.total.toFixed(2)}</td>
            <td>${takenByName}</td>
            <td><span class="status ${statusClass}">${statusText}</span></td>
        `;
        
        fragment.appendChild(row);
    });
    
    orderRecordsTableBody.appendChild(fragment);
}

function updateRecordsSummary(filteredOrders) {
    const totalOrders = filteredOrders.length;
    const totalQuantity = filteredOrders.reduce((sum, order) => sum + order.quantity, 0);
    const totalRevenue = filteredOrders.reduce((sum, order) => sum + order.total, 0);
    
    document.getElementById('filtered-orders-count').textContent = totalOrders;
    document.getElementById('filtered-quantity-total').textContent = totalQuantity.toFixed(2);
    document.getElementById('filtered-revenue-total').textContent = `PKR ${totalRevenue.toFixed(2)}`;
}

function exportFilteredRecords() {
    const selectedDate = recordsDateFilter.value;
    let filteredOrders = orders;
    
    if (selectedDate) {
        filteredOrders = orders.filter(order => {
            const orderDate = new Date(order.date).toISOString().split('T')[0];
            return orderDate === selectedDate;
        });
    }
    
    if (filteredOrders.length === 0) {
        alert('No orders to export with current filter!');
        return;
    }
    
    const csvHeaders = ['Date', 'Time', 'Customer', 'Phone', 'Address', 'Chicken Type', 'Quantity (kg)', 'Price per kg', 'Total Price', 'Taken By', 'Status'];
    const csvData = filteredOrders.map(order => {
        const orderDateTime = new Date(order.date);
        const orderDate = orderDateTime.toLocaleDateString();
        const orderTime = orderDateTime.toLocaleTimeString();
        
        const takenByName = order.takenBy === 'jawad' ? 'Jawad' : 
                          order.takenBy === 'fawad' ? 'Fawad' : 'Shal Dada';
        
        return [
            orderDate,
            orderTime,
            `"${sanitizeInput(order.customer)}"`,
            `"${sanitizeInput(order.phone)}"`,
            `"${sanitizeInput(order.address)}"`,
            sanitizeInput(order.type),
            order.quantity,
            `PKR ${order.pricePerKg}`,
            `PKR ${order.total}`,
            takenByName,
            order.status
        ];
    });
    
    const csvContent = [csvHeaders, ...csvData]
        .map(row => row.join(','))
        .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const timestamp = selectedDate || new Date().toISOString().split('T')[0];
    
    link.setAttribute('href', url);
    link.setAttribute('download', `ali-khail-poultry-records-${timestamp}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    alert(`Exported ${filteredOrders.length} orders successfully!`);
}

// Export Data
function exportData() {
    if (orders.length === 0) {
        alert('No orders to export!');
        return;
    }
    
    const csvHeaders = ['ID', 'Date', 'Time', 'Customer', 'Phone', 'Address', 'Chicken Type', 'Quantity (kg)', 'Price per kg', 'Total Price', 'Taken By', 'Status'];
    const csvData = orders.map(order => {
        const orderDateTime = new Date(order.date);
        const orderDate = orderDateTime.toLocaleDateString();
        const orderTime = orderDateTime.toLocaleTimeString();
        
        const takenByName = order.takenBy === 'jawad' ? 'Jawad' : 
                          order.takenBy === 'fawad' ? 'Fawad' : 'Shal Dada';
        
        return [
            order.id,
            orderDate,
            orderTime,
            `"${sanitizeInput(order.customer)}"`,
            `"${sanitizeInput(order.phone)}"`,
            `"${sanitizeInput(order.address)}"`,
            sanitizeInput(order.type),
            order.quantity,
            `PKR ${order.pricePerKg}`,
            `PKR ${order.total}`,
            takenByName,
            order.status
        ];
    });
    
    const csvContent = [csvHeaders, ...csvData]
        .map(row => row.join(','))
        .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().split('T')[0];
    
    link.setAttribute('href', url);
    link.setAttribute('download', `ali-khail-poultry-orders-backup-${timestamp}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    alert(`Exported ${orders.length} orders successfully! File: ali-khail-poultry-orders-backup-${timestamp}.csv`);
}

// Car Management
function renderCars() {
    if (!carsGrid) return;
    
    carsGrid.innerHTML = '';
    
    const fragment = document.createDocumentFragment();
    
    cars.forEach(car => {
        const carCard = document.createElement('div');
        carCard.className = 'car-card';
        
        const statusClass = car.status === 'active' ? 'delivered' : 
                         car.status === 'inactive' ? 'pending' : 'processing';
        
        const statusText = car.status === 'active' ? 'Active' : 
                         car.status === 'inactive' ? 'Inactive' : 'Under Maintenance';
        
        carCard.innerHTML = `
            <div class="car-card-header">
                <h3>${sanitizeInput(car.number)}</h3>
                <span class="status ${statusClass}">${statusText}</span>
            </div>
            <div class="car-info">
                <div class="info-item">
                    <span class="info-label">Driver:</span>
                    <span class="info-value">${sanitizeInput(car.driver)}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Capacity:</span>
                    <span class="info-value">${car.capacity} kg</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Added:</span>
                    <span class="info-value">${new Date(car.createdAt).toLocaleDateString()}</span>
                </div>
            </div>
            <div class="action-buttons" style="margin-top: 10px;">
                <button class="btn-icon btn-edit edit-car" data-id="${car.id}" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon btn-delete delete-car" data-id="${car.id}" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        fragment.appendChild(carCard);
    });
    
    carsGrid.appendChild(fragment);
    
    document.querySelectorAll('.edit-car').forEach(button => {
        button.removeEventListener('click', handleEditCar);
        button.addEventListener('click', handleEditCar);
    });
    
    document.querySelectorAll('.delete-car').forEach(button => {
        button.removeEventListener('click', handleDeleteCar);
        button.addEventListener('click', handleDeleteCar);
    });
}

function handleEditCar() {
    const carId = this.getAttribute('data-id');
    openCarModal(carId);
}

function handleDeleteCar() {
    const carId = this.getAttribute('data-id');
    deleteCar(carId);
}

function openCarModal(carId = null) {
    const modalTitle = document.getElementById('car-modal-title');
    
    if (carId) {
        modalTitle.textContent = 'Edit Car';
        const car = cars.find(c => c.id === carId);
        if (car) {
            document.getElementById('carId').value = car.id;
            document.getElementById('carNumber').value = sanitizeInput(car.number);
            document.getElementById('carDriver').value = sanitizeInput(car.driver);
            document.getElementById('carCapacity').value = car.capacity;
            document.getElementById('carStatus').value = car.status;
        }
    } else {
        modalTitle.textContent = 'Add New Car';
        document.getElementById('carForm').reset();
        document.getElementById('carId').value = '';
    }
    
    document.getElementById('car-modal').style.display = 'block';
}

function deleteCar(carId) {
    if (confirm('Are you sure you want to delete this car?')) {
        cars = cars.filter(car => car.id !== carId);
        saveDataToStorage();
        renderCars();
        showSuccessMessage('Car deleted successfully');
    }
}

// Worker Management
function renderWorkers() {
    if (!workersGrid) return;
    
    workersGrid.innerHTML = '';
    
    const fragment = document.createDocumentFragment();
    
    workers.forEach(worker => {
        const workerCard = document.createElement('div');
        workerCard.className = 'worker-card';
        
        const statusClass = worker.status === 'active' ? 'delivered' : 
                          worker.status === 'inactive' ? 'pending' : 'processing';
        
        const statusText = worker.status === 'active' ? 'Active' : 
                         worker.status === 'inactive' ? 'Inactive' : 'On Leave';
        
        const remainingSalary = (worker.salary || 0) - (worker.advance || 0);
        
        workerCard.innerHTML = `
            <div class="worker-card-header">
                <h3>${sanitizeInput(worker.name)}</h3>
                <span class="status ${statusClass}">${statusText}</span>
            </div>
            <div class="worker-info">
                <div class="info-item">
                    <span class="info-label">Phone:</span>
                    <span class="info-value">${sanitizeInput(worker.phone)}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Role:</span>
                    <span class="info-value">${sanitizeInput(worker.role)}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Salary:</span>
                    <span class="info-value">PKR ${worker.salary}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Advance:</span>
                    <span class="info-value">PKR ${worker.advance || 0}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Remaining:</span>
                    <span class="info-value">PKR ${remainingSalary}</span>
                </div>
            </div>
            <div class="action-buttons" style="margin-top: 10px;">
                <button class="btn-icon btn-edit edit-worker" data-id="${worker.id}" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon btn-delete delete-worker" data-id="${worker.id}" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        fragment.appendChild(workerCard);
    });
    
    workersGrid.appendChild(fragment);
    
    document.querySelectorAll('.edit-worker').forEach(button => {
        button.removeEventListener('click', handleEditWorker);
        button.addEventListener('click', handleEditWorker);
    });
    
    document.querySelectorAll('.delete-worker').forEach(button => {
        button.removeEventListener('click', handleDeleteWorker);
        button.addEventListener('click', handleDeleteWorker);
    });
}

function handleEditWorker() {
    const workerId = this.getAttribute('data-id');
    openWorkerModal(workerId);
}

function handleDeleteWorker() {
    const workerId = this.getAttribute('data-id');
    deleteWorker(workerId);
}

function openWorkerModal(workerId = null) {
    const modalTitle = document.getElementById('worker-modal-title');
    
    if (workerId) {
        modalTitle.textContent = 'Edit Worker';
        const worker = workers.find(w => w.id === workerId);
        if (worker) {
            document.getElementById('workerId').value = worker.id;
            document.getElementById('workerName').value = sanitizeInput(worker.name);
            document.getElementById('workerPhone').value = sanitizeInput(worker.phone);
            document.getElementById('workerRole').value = sanitizeInput(worker.role);
            document.getElementById('workerSalary').value = worker.salary;
            document.getElementById('workerAdvance').value = worker.advance || 0;
            document.getElementById('workerStatus').value = worker.status;
            
            const remainingSalary = (worker.salary || 0) - (worker.advance || 0);
            document.getElementById('workerRemaining').value = `PKR ${remainingSalary}`;
        }
    } else {
        modalTitle.textContent = 'Add New Worker';
        document.getElementById('workerForm').reset();
        document.getElementById('workerId').value = '';
        document.getElementById('workerAdvance').value = '0';
        document.getElementById('workerRemaining').value = 'PKR 0.00';
    }
    
    document.getElementById('worker-modal').style.display = 'block';
}

function deleteWorker(workerId) {
    if (confirm('Are you sure you want to delete this worker?')) {
        workers = workers.filter(worker => worker.id !== workerId);
        saveDataToStorage();
        renderWorkers();
        showSuccessMessage('Worker deleted successfully');
    }
}

// Waste Management
function renderWasteSales() {
    if (!wasteGrid) return;
    
    wasteGrid.innerHTML = '';
    
    const fragment = document.createDocumentFragment();
    
    wasteSales.forEach(waste => {
        const wasteCard = document.createElement('div');
        wasteCard.className = 'waste-card';
        
        const wasteDate = new Date(waste.date).toLocaleDateString();
        
        wasteCard.innerHTML = `
            <div class="waste-card-header">
                <h3>${sanitizeInput(waste.type)}</h3>
                <span class="status delivered">Sold</span>
            </div>
            <div class="waste-info">
                <div class="info-item">
                    <span class="info-label">Date:</span>
                    <span class="info-value">${wasteDate}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Quantity:</span>
                    <span class="info-value">${waste.quantity} kg</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Price:</span>
                    <span class="info-value">PKR ${waste.price}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Buyer:</span>
                    <span class="info-value">${sanitizeInput(waste.buyer)}</span>
                </div>
            </div>
            <div class="action-buttons" style="margin-top: 10px;">
                <button class="btn-icon btn-edit edit-waste" data-id="${waste.id}" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon btn-delete delete-waste" data-id="${waste.id}" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        fragment.appendChild(wasteCard);
    });
    
    wasteGrid.appendChild(fragment);
    
    document.querySelectorAll('.edit-waste').forEach(button => {
        button.removeEventListener('click', handleEditWaste);
        button.addEventListener('click', handleEditWaste);
    });
    
    document.querySelectorAll('.delete-waste').forEach(button => {
        button.removeEventListener('click', handleDeleteWaste);
        button.addEventListener('click', handleDeleteWaste);
    });
}

function handleEditWaste() {
    const wasteId = this.getAttribute('data-id');
    openWasteModal(wasteId);
}

function handleDeleteWaste() {
    const wasteId = this.getAttribute('data-id');
    deleteWaste(wasteId);
}

function openWasteModal(wasteId = null) {
    const modalTitle = document.getElementById('waste-modal-title');
    
    if (wasteId) {
        modalTitle.textContent = 'Edit Waste Sale';
        const waste = wasteSales.find(w => w.id === wasteId);
        if (waste) {
            document.getElementById('wasteId').value = waste.id;
            document.getElementById('wasteDate').value = waste.date.split('T')[0];
            document.getElementById('wasteType').value = waste.type;
            document.getElementById('wasteQuantity').value = waste.quantity;
            document.getElementById('wastePrice').value = waste.price;
            document.getElementById('wasteBuyer').value = sanitizeInput(waste.buyer);
        }
    } else {
        modalTitle.textContent = 'Add Waste Sale';
        document.getElementById('wasteForm').reset();
        document.getElementById('wasteId').value = '';
        
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('wasteDate').value = today;
    }
    
    document.getElementById('waste-modal').style.display = 'block';
}

function deleteWaste(wasteId) {
    if (confirm('Are you sure you want to delete this waste sale?')) {
        wasteSales = wasteSales.filter(waste => waste.id !== wasteId);
        saveDataToStorage();
        renderWasteSales();
        showSuccessMessage('Waste sale deleted successfully');
    }
}

async function handleWasteSubmit(e) {
    e.preventDefault();

    const wasteId = document.getElementById('wasteId').value;
    const date = document.getElementById('wasteDate').value;
    const type = document.getElementById('wasteType').value;
    const quantity = parseFloat(document.getElementById('wasteQuantity').value) || 0;
    const price = parseFloat(document.getElementById('wastePrice').value) || 0;
    const buyer = sanitizeInput(document.getElementById('wasteBuyer').value);

    if (!date || !type || !quantity || !price || !buyer) {
        alert('Please fill in all waste sale fields.');
        return;
    }

    if (wasteId) {
        const index = wasteSales.findIndex(w => w.id === wasteId);
        if (index !== -1) {
            wasteSales[index] = {
                ...wasteSales[index],
                date,
                type,
                quantity,
                price,
                buyer
            };
            showSuccessMessage('Waste sale updated successfully');
        }
    } else {
        const newWaste = {
            id: `waste-${Date.now()}`,
            date,
            type,
            quantity,
            price,
            buyer,
            createdAt: new Date().toISOString()
        };

        if (authToken) {
            try {
                await saveWasteSale({
                    date,
                    quantity,
                    price_per_kg: price,
                    buyer_name: buyer,
                    phone: ''
                });
            } catch (error) {
                console.warn('Waste API save failed, saving locally instead.', error);
            }
        }

        wasteSales.push(newWaste);
        showSuccessMessage('Waste sale added successfully');
    }

    saveDataToStorage();
    renderWasteSales();
    closeModalFunc(document.getElementById('waste-modal'));
}

// Broker Management
function renderBrokers() {
    if (!brokersGrid) return;
    
    brokersGrid.innerHTML = '';
    
    const fragment = document.createDocumentFragment();
    
    brokers.forEach(broker => {
        const brokerCard = document.createElement('div');
        brokerCard.className = 'broker-card';
        
        const totalDue = broker.totalDue || 0;
        const paidAmount = broker.paidAmount || 0;
        const remaining = Math.max(0, totalDue - paidAmount);
        
        brokerCard.innerHTML = `
            <div class="broker-card-header">
                <h3>${sanitizeInput(broker.name)}</h3>
                <span class="status ${remaining > 0 ? 'pending' : 'delivered'}">
                    ${remaining > 0 ? 'Due' : 'Paid'}
                </span>
            </div>
            <div class="broker-info">
                <div class="info-item">
                    <span class="info-label">Phone:</span>
                    <span class="info-value">${sanitizeInput(broker.phone)}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Address:</span>
                    <span class="info-value">${sanitizeInput(broker.address)}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Total Due:</span>
                    <span class="info-value">PKR ${totalDue.toFixed(2)}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Paid:</span>
                    <span class="info-value">PKR ${paidAmount.toFixed(2)}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Remaining:</span>
                    <span class="info-value">PKR ${remaining.toFixed(2)}</span>
                </div>
            </div>
            <div class="action-buttons" style="margin-top: 10px;">
                <button class="btn-icon btn-payment record-broker-payment" data-id="${broker.id}" title="Record Payment">
                    <i class="fas fa-money-bill-wave"></i>
                </button>
                <button class="btn-icon btn-history view-broker-payments" data-id="${broker.id}" title="Payment History">
                    <i class="fas fa-history"></i>
                </button>
                <button class="btn-icon btn-edit edit-broker" data-id="${broker.id}" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon btn-delete delete-broker" data-id="${broker.id}" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        fragment.appendChild(brokerCard);
    });
    
    brokersGrid.appendChild(fragment);
    
    document.querySelectorAll('.record-broker-payment').forEach(button => {
        button.removeEventListener('click', handleRecordBrokerPayment);
        button.addEventListener('click', handleRecordBrokerPayment);
    });
    
    document.querySelectorAll('.view-broker-payments').forEach(button => {
        button.removeEventListener('click', handleViewBrokerPayments);
        button.addEventListener('click', handleViewBrokerPayments);
    });
    
    document.querySelectorAll('.edit-broker').forEach(button => {
        button.removeEventListener('click', handleEditBroker);
        button.addEventListener('click', handleEditBroker);
    });
    
    document.querySelectorAll('.delete-broker').forEach(button => {
        button.removeEventListener('click', handleDeleteBroker);
        button.addEventListener('click', handleDeleteBroker);
    });
}

function handleRecordBrokerPayment() {
    const brokerId = this.getAttribute('data-id');
    openBrokerPaymentModal(brokerId);
}

function handleViewBrokerPayments() {
    const brokerId = this.getAttribute('data-id');
    openBrokerPaymentHistoryModal(brokerId);
}

function handleEditBroker() {
    const brokerId = this.getAttribute('data-id');
    openBrokerModal(brokerId);
}

function handleDeleteBroker() {
    const brokerId = this.getAttribute('data-id');
    deleteBroker(brokerId);
}

function openBrokerModal(brokerId = null) {
    const modalTitle = document.getElementById('broker-modal-title');
    
    if (brokerId) {
        modalTitle.textContent = 'Edit Broker';
        const broker = brokers.find(b => b.id === brokerId);
        if (broker) {
            document.getElementById('brokerId').value = broker.id;
            document.getElementById('brokerName').value = sanitizeInput(broker.name);
            document.getElementById('brokerPhone').value = sanitizeInput(broker.phone);
            document.getElementById('brokerAddress').value = sanitizeInput(broker.address);
            document.getElementById('brokerTotal').value = broker.totalDue || 0;
            document.getElementById('brokerPaid').value = broker.paidAmount || 0;
            
            const remaining = (broker.totalDue || 0) - (broker.paidAmount || 0);
            document.getElementById('brokerRemaining').value = `PKR ${remaining.toFixed(2)}`;
        }
    } else {
        modalTitle.textContent = 'Add New Broker';
        document.getElementById('brokerForm').reset();
        document.getElementById('brokerId').value = '';
        document.getElementById('brokerTotal').value = '0';
        document.getElementById('brokerPaid').value = '0';
        document.getElementById('brokerRemaining').value = 'PKR 0.00';
    }
    
    document.getElementById('broker-modal').style.display = 'block';
}

function deleteBroker(brokerId) {
    if (confirm('Are you sure you want to delete this broker?')) {
        brokers = brokers.filter(broker => broker.id !== brokerId);
        saveDataToStorage();
        renderBrokers();
        showSuccessMessage('Broker deleted successfully');
    }
}

function openBrokerPaymentModal(brokerId) {
    const broker = brokers.find(b => b.id === brokerId);
    if (!broker) return;

    const today = new Date().toISOString().split('T')[0];
    document.getElementById('brokerPaymentDate').value = today;
    document.getElementById('brokerPaymentId').value = brokerId;
    
    const totalDue = broker.totalDue || 0;
    const paidAmount = broker.paidAmount || 0;
    const currentDue = Math.max(0, totalDue - paidAmount);
    
    document.getElementById('broker-current-due-amount').textContent = `PKR ${currentDue.toFixed(2)}`;
    document.getElementById('brokerPaymentAmount').value = '';
    document.getElementById('brokerPaymentMethod').value = 'cash';
    document.getElementById('brokerPaymentReference').value = '';
    
    document.getElementById('broker-payment-modal').style.display = 'block';
}

function handleBrokerPaymentSubmit(e) {
    e.preventDefault();
    
    const brokerId = document.getElementById('brokerPaymentId').value;
    const date = document.getElementById('brokerPaymentDate').value;
    const amount = parseFloat(document.getElementById('brokerPaymentAmount').value);
    const method = document.getElementById('brokerPaymentMethod').value;
    const reference = sanitizeInput(document.getElementById('brokerPaymentReference').value);
    
    if (!brokerId || !date || !amount || amount <= 0) {
        alert('Please fill in all required fields with valid values');
        return;
    }
    
    const broker = brokers.find(b => b.id === brokerId);
    if (!broker) {
        alert('Broker not found');
        return;
    }
    
    const payment = {
        id: 'broker-payment-' + Date.now(),
        date: date,
        amount: amount,
        method: method,
        reference: reference,
        recordedBy: currentUser,
        createdAt: new Date().toISOString()
    };
    
    if (!broker.payments) {
        broker.payments = [];
    }
    
    broker.payments.push(payment);
    broker.paidAmount = (broker.paidAmount || 0) + amount;
    
    saveDataToStorage();
    renderBrokers();
    closeModalFunc(document.getElementById('broker-payment-modal'));
    
    showSuccessMessage(`Payment of PKR ${amount.toFixed(2)} recorded successfully for broker!`);
}

function openBrokerPaymentHistoryModal(brokerId) {
    const broker = brokers.find(b => b.id === brokerId);
    if (!broker) return;

    document.getElementById('broker-history-name').textContent = sanitizeInput(broker.name);
    document.getElementById('broker-history-details').textContent = 
        `Phone: ${sanitizeInput(broker.phone)} | Address: ${sanitizeInput(broker.address)}`;
    
    const totalDue = broker.totalDue || 0;
    const paidAmount = broker.paidAmount || 0;
    const remaining = Math.max(0, totalDue - paidAmount);
    
    document.getElementById('broker-history-total-due').textContent = `PKR ${totalDue.toFixed(2)}`;
    document.getElementById('broker-history-total-paid').textContent = `PKR ${paidAmount.toFixed(2)}`;
    document.getElementById('broker-history-remaining').textContent = `PKR ${remaining.toFixed(2)}`;
    
    renderBrokerPaymentHistory(brokerId);
    document.getElementById('broker-payment-history-modal').style.display = 'block';
}

function renderBrokerPaymentHistory(brokerId) {
    const tableBody = document.getElementById('brokerPaymentHistoryTableBody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    const broker = brokers.find(b => b.id === brokerId);
    if (!broker || !broker.payments || broker.payments.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No payment history found</td></tr>';
        return;
    }
    
    const sortedPayments = [...broker.payments].sort((a, b) => new Date(b.date) - new Date(a.date));
    const fragment = document.createDocumentFragment();
    
    sortedPayments.forEach(payment => {
        const row = document.createElement('tr');
        const paymentDate = new Date(payment.date).toLocaleDateString();
        
        row.innerHTML = `
            <td>${paymentDate}</td>
            <td>PKR ${payment.amount.toFixed(2)}</td>
            <td>${formatPaymentMethod(payment.method)}</td>
            <td>${sanitizeInput(payment.reference || '-')}</td>
            <td>
                <button class="btn-icon btn-delete delete-broker-payment" 
                        data-broker-id="${brokerId}" 
                        data-payment-id="${payment.id}" 
                        title="Delete Payment">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        
        fragment.appendChild(row);
    });
    
    tableBody.appendChild(fragment);
    
    document.querySelectorAll('.delete-broker-payment').forEach(button => {
        button.removeEventListener('click', handleDeleteBrokerPayment);
        button.addEventListener('click', handleDeleteBrokerPayment);
    });
}

function handleDeleteBrokerPayment() {
    const brokerId = this.getAttribute('data-broker-id');
    const paymentId = this.getAttribute('data-payment-id');
    deleteBrokerPayment(brokerId, paymentId);
    renderBrokerPaymentHistory(brokerId);
}

function deleteBrokerPayment(brokerId, paymentId) {
    if (!confirm('Are you sure you want to delete this payment record?')) {
        return;
    }
    
    const broker = brokers.find(b => b.id === brokerId);
    if (!broker || !broker.payments) return;
    
    const paymentIndex = broker.payments.findIndex(p => p.id === paymentId);
    if (paymentIndex === -1) return;
    
    const payment = broker.payments[paymentIndex];
    broker.paidAmount = Math.max(0, (broker.paidAmount || 0) - payment.amount);
    broker.payments.splice(paymentIndex, 1);
    
    if (broker.payments.length === 0) {
        delete broker.payments;
    }
    
    saveDataToStorage();
    renderBrokers();
    
    showSuccessMessage('Broker payment record deleted successfully');
}

// Reminder Management Functions
function setupReminders() {
    // Check for reminders every minute
    setInterval(checkDueReminders, 60000);
}

function openReminderModal() {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    document.getElementById('reminderForm').reset();
    document.getElementById('reminderId').value = '';
    document.getElementById('reminderDate').value = today.toISOString().split('T')[0];
    document.getElementById('reminderTime').value = '09:00';
    document.getElementById('reminderRepeat').value = 'once';
    
    reminderModal.style.display = 'block';
}

function handleReminderSubmit(e) {
    e.preventDefault();
    
    const reminderId = document.getElementById('reminderId').value;
    const title = sanitizeInput(document.getElementById('reminderTitle').value);
    const description = sanitizeInput(document.getElementById('reminderDescription').value);
    const date = document.getElementById('reminderDate').value;
    const time = document.getElementById('reminderTime').value;
    const repeat = document.getElementById('reminderRepeat').value;
    
    if (!title || !date || !time) {
        alert('Please fill in all required fields');
        return;
    }
    
    const reminderDateTime = new Date(`${date}T${time}`);
    
    if (reminderId) {
        // Update existing reminder
        const index = reminders.findIndex(r => r.id === reminderId);
        if (index !== -1) {
            reminders[index] = {
                ...reminders[index],
                title,
                description,
                dateTime: reminderDateTime.toISOString(),
                repeat,
                active: true
            };
        }
        showSuccessMessage('Reminder updated successfully!');
    } else {
        // Create new reminder
        const newReminder = {
            id: 'reminder-' + Date.now(),
            title,
            description,
            dateTime: reminderDateTime.toISOString(),
            repeat,
            active: true,
            createdBy: currentUser,
            createdAt: new Date().toISOString()
        };
        reminders.push(newReminder);
        showSuccessMessage('Reminder saved successfully!');
    }
    
    saveDataToStorage();
    renderReminders();
    closeModalFunc(reminderModal);
}

function renderReminders() {
    if (!remindersList) return;
    
    remindersList.innerHTML = '';
    
    // Sort by date/time
    const sortedReminders = [...reminders].sort((a, b) => 
        new Date(a.dateTime) - new Date(b.dateTime)
    ).filter(r => r.active);
    
    if (sortedReminders.length === 0) {
        remindersList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-bell-slash"></i>
                <p>No reminders set</p>
            </div>
        `;
        return;
    }
    
    const fragment = document.createDocumentFragment();
    
    sortedReminders.forEach(reminder => {
        const reminderItem = document.createElement('div');
        reminderItem.className = 'reminder-item';
        
        const reminderDate = new Date(reminder.dateTime);
        const dateStr = reminderDate.toLocaleDateString();
        const timeStr = reminderDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        const repeatText = {
            'once': 'Once',
            'daily': 'Daily',
            'weekly': 'Weekly',
            'monthly': 'Monthly'
        }[reminder.repeat] || reminder.repeat;
        
        reminderItem.innerHTML = `
            <div class="reminder-header">
                <h4>${sanitizeInput(reminder.title)}</h4>
                <span class="reminder-time">${timeStr}</span>
            </div>
            <div class="reminder-body">
                <p>${sanitizeInput(reminder.description || 'No description')}</p>
                <div class="reminder-meta">
                    <span class="reminder-date">${dateStr}</span>
                    <span class="reminder-repeat">${repeatText}</span>
                </div>
            </div>
            <div class="reminder-actions">
                <button class="btn-icon btn-edit edit-reminder" data-id="${reminder.id}" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon btn-delete delete-reminder" data-id="${reminder.id}" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
                <button class="btn-icon btn-complete complete-reminder" data-id="${reminder.id}" title="Mark Complete">
                    <i class="fas fa-check"></i>
                </button>
            </div>
        `;
        
        fragment.appendChild(reminderItem);
    });
    
    remindersList.appendChild(fragment);
    
    // Add event listeners
    document.querySelectorAll('.edit-reminder').forEach(btn => {
        btn.removeEventListener('click', handleEditReminder);
        btn.addEventListener('click', handleEditReminder);
    });
    
    document.querySelectorAll('.delete-reminder').forEach(btn => {
        btn.removeEventListener('click', handleDeleteReminder);
        btn.addEventListener('click', handleDeleteReminder);
    });
    
    document.querySelectorAll('.complete-reminder').forEach(btn => {
        btn.removeEventListener('click', handleCompleteReminder);
        btn.addEventListener('click', handleCompleteReminder);
    });
}

function handleEditReminder() {
    const reminderId = this.getAttribute('data-id');
    editReminder(reminderId);
}

function handleDeleteReminder() {
    const reminderId = this.getAttribute('data-id');
    deleteReminder(reminderId);
}

function handleCompleteReminder() {
    const reminderId = this.getAttribute('data-id');
    completeReminder(reminderId);
}

function editReminder(reminderId) {
    const reminder = reminders.find(r => r.id === reminderId);
    if (!reminder) return;
    
    const reminderDate = new Date(reminder.dateTime);
    const dateStr = reminderDate.toISOString().split('T')[0];
    const timeStr = reminderDate.toTimeString().split(' ')[0].substring(0, 5);
    
    document.getElementById('reminderId').value = reminder.id;
    document.getElementById('reminderTitle').value = sanitizeInput(reminder.title);
    document.getElementById('reminderDescription').value = sanitizeInput(reminder.description || '');
    document.getElementById('reminderDate').value = dateStr;
    document.getElementById('reminderTime').value = timeStr;
    document.getElementById('reminderRepeat').value = reminder.repeat;
    
    reminderModal.style.display = 'block';
}

function deleteReminder(reminderId) {
    if (confirm('Are you sure you want to delete this reminder?')) {
        reminders = reminders.filter(r => r.id !== reminderId);
        saveDataToStorage();
        renderReminders();
        showSuccessMessage('Reminder deleted successfully!');
    }
}

function completeReminder(reminderId) {
    const reminder = reminders.find(r => r.id === reminderId);
    if (!reminder) return;
    
    reminder.active = false;
    saveDataToStorage();
    renderReminders();
    showSuccessMessage('Reminder completed: ' + reminder.title);
}

function checkDueReminders() {
    const now = new Date();
    const upcomingReminders = reminders.filter(reminder => {
        if (!reminder.active) return false;
        
        const reminderTime = new Date(reminder.dateTime);
        const timeDiff = reminderTime - now;
        
        // Check if reminder is due within the next 5 minutes
        return timeDiff > 0 && timeDiff <= 300000; // 5 minutes in milliseconds
    });
    
    upcomingReminders.forEach(reminder => {
        showNotification(`Reminder: ${reminder.title}`, 'warning');
        playNotificationSound();
    });
}

// Bill Management Functions
function openScheduleBillModal() {
    const today = new Date();
    const nextMonth = new Date(today);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    
    document.getElementById('scheduleBillForm').reset();
    document.getElementById('scheduleBillId').value = '';
    
    // Get the client select element
    const clientSelect = document.getElementById('billClient');
    if (clientSelect) {
        clientSelect.innerHTML = '<option value="">Select Client</option>';
        clients.forEach(client => {
            const option = document.createElement('option');
            option.value = client.id;
            option.textContent = `${client.name} - ${client.phone}`;
            clientSelect.appendChild(option);
        });
    }
    
    document.getElementById('billDate').value = today.toISOString().split('T')[0];
    document.getElementById('dueDate').value = nextMonth.toISOString().split('T')[0];
    document.getElementById('billTime').value = '10:00';
    document.getElementById('billRepeat').value = 'monthly';
    
    scheduleBillModal.style.display = 'block';
}

function handleScheduleBillSubmit(e) {
    e.preventDefault();
    
    const scheduleBillId = document.getElementById('scheduleBillId').value;
    const clientId = document.getElementById('billClient').value;
    const billDate = document.getElementById('billDate').value;
    const dueDate = document.getElementById('dueDate').value;
    const billTime = document.getElementById('billTime').value;
    const repeat = document.getElementById('billRepeat').value;
    const notes = sanitizeInput(document.getElementById('billNotes').value);
    
    if (!clientId || !billDate || !dueDate || !billTime) {
        alert('Please fill in all required fields');
        return;
    }
    
    const client = clients.find(c => c.id === clientId);
    if (!client) {
        alert('Client not found');
        return;
    }
    
    const billDateTime = new Date(`${billDate}T${billTime}`);
    
    if (scheduleBillId) {
        // Update existing scheduled bill
        const index = scheduledBills.findIndex(b => b.id === scheduleBillId);
        if (index !== -1) {
            scheduledBills[index] = {
                ...scheduledBills[index],
                clientId,
                clientName: client.name,
                billDateTime: billDateTime.toISOString(),
                dueDate,
                repeat,
                notes,
                active: true
            };
        }
        showSuccessMessage('Bill schedule updated successfully!');
    } else {
        // Create new scheduled bill
        const newScheduledBill = {
            id: 'scheduled-bill-' + Date.now(),
            clientId,
            clientName: client.name,
            clientPhone: client.phone,
            billDateTime: billDateTime.toISOString(),
            dueDate,
            repeat,
            notes,
            active: true,
            createdBy: currentUser,
            createdAt: new Date().toISOString(),
            lastSent: null,
            sentCount: 0
        };
        scheduledBills.push(newScheduledBill);
        showSuccessMessage('Bill scheduled successfully!');
    }
    
    saveDataToStorage();
    renderScheduledBills();
    closeModalFunc(scheduleBillModal);
}

function renderScheduledBills() {
    if (!scheduledBillsList) return;
    
    scheduledBillsList.innerHTML = '';
    
    // Sort by date/time
    const sortedBills = [...scheduledBills].sort((a, b) => 
        new Date(a.billDateTime) - new Date(b.billDateTime)
    ).filter(b => b.active);
    
    if (sortedBills.length === 0) {
        scheduledBillsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-file-invoice"></i>
                <p>No scheduled bills</p>
            </div>
        `;
        return;
    }
    
    const fragment = document.createDocumentFragment();
    
    sortedBills.forEach(bill => {
        const billItem = document.createElement('div');
        billItem.className = 'scheduled-bill-item';
        
        const billDate = new Date(bill.billDateTime);
        const dateStr = billDate.toLocaleDateString();
        const timeStr = billDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const dueDateStr = new Date(bill.dueDate).toLocaleDateString();
        
        const repeatText = {
            'once': 'Once',
            'daily': 'Daily',
            'weekly': 'Weekly',
            'monthly': 'Monthly'
        }[bill.repeat] || bill.repeat;
        
        const client = clients.find(c => c.id === bill.clientId);
        const totalDue = client ? (client.totalDue || 0) - (client.paidAmount || 0) : 0;
        
        billItem.innerHTML = `
            <div class="bill-header">
                <h4>${sanitizeInput(bill.clientName)}</h4>
                <span class="bill-amount">PKR ${totalDue.toFixed(2)}</span>
            </div>
            <div class="bill-body">
                <div class="bill-info">
                    <div class="info-row">
                        <span class="info-label">Send Time:</span>
                        <span class="info-value">${dateStr} at ${timeStr}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Due Date:</span>
                        <span class="info-value">${dueDateStr}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Repeat:</span>
                        <span class="info-value">${repeatText}</span>
                    </div>
                    ${bill.notes ? `<div class="info-row">
                        <span class="info-label">Notes:</span>
                        <span class="info-value">${sanitizeInput(bill.notes)}</span>
                    </div>` : ''}
                </div>
                <div class="bill-stats">
                    <span class="stat">Sent: ${bill.sentCount || 0} times</span>
                    ${bill.lastSent ? `<span class="stat">Last: ${new Date(bill.lastSent).toLocaleDateString()}</span>` : ''}
                </div>
            </div>
            <div class="bill-actions">
                <button class="btn-icon btn-send send-bill-now" data-id="${bill.id}" title="Send Now">
                    <i class="fas fa-paper-plane"></i>
                </button>
                <button class="btn-icon btn-edit edit-scheduled-bill" data-id="${bill.id}" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon btn-delete delete-scheduled-bill" data-id="${bill.id}" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        fragment.appendChild(billItem);
    });
    
    scheduledBillsList.appendChild(fragment);
    
    // Add event listeners
    document.querySelectorAll('.send-bill-now').forEach(btn => {
        btn.removeEventListener('click', handleSendBillNow);
        btn.addEventListener('click', handleSendBillNow);
    });
    
    document.querySelectorAll('.edit-scheduled-bill').forEach(btn => {
        btn.removeEventListener('click', handleEditScheduledBill);
        btn.addEventListener('click', handleEditScheduledBill);
    });
    
    document.querySelectorAll('.delete-scheduled-bill').forEach(btn => {
        btn.removeEventListener('click', handleDeleteScheduledBill);
        btn.addEventListener('click', handleDeleteScheduledBill);
    });
}

function handleSendBillNow() {
    const billId = this.getAttribute('data-id');
    sendScheduledBillNow(billId);
}

function handleEditScheduledBill() {
    const billId = this.getAttribute('data-id');
    editScheduledBill(billId);
}

function handleDeleteScheduledBill() {
    const billId = this.getAttribute('data-id');
    deleteScheduledBill(billId);
}

function editScheduledBill(billId) {
    const bill = scheduledBills.find(b => b.id === billId);
    if (!bill) return;
    
    const billDate = new Date(bill.billDateTime);
    const dateStr = billDate.toISOString().split('T')[0];
    const timeStr = billDate.toTimeString().split(' ')[0].substring(0, 5);
    
    document.getElementById('scheduleBillId').value = bill.id;
    document.getElementById('billClient').value = bill.clientId;
    document.getElementById('billDate').value = dateStr;
    document.getElementById('dueDate').value = bill.dueDate;
    document.getElementById('billTime').value = timeStr;
    document.getElementById('billRepeat').value = bill.repeat;
    document.getElementById('billNotes').value = sanitizeInput(bill.notes || '');
    
    scheduleBillModal.style.display = 'block';
}

function deleteScheduledBill(billId) {
    if (confirm('Are you sure you want to delete this scheduled bill?')) {
        scheduledBills = scheduledBills.filter(b => b.id !== billId);
        saveDataToStorage();
        renderScheduledBills();
        showSuccessMessage('Scheduled bill deleted successfully!');
    }
}

function sendScheduledBillNow(billId) {
    const bill = scheduledBills.find(b => b.id === billId);
    if (!bill) return;
    
    const client = clients.find(c => c.id === bill.clientId);
    if (!client) {
        alert('Client not found');
        return;
    }
    
    // Update bill statistics
    bill.lastSent = new Date().toISOString();
    bill.sentCount = (bill.sentCount || 0) + 1;
    
    // Send the bill
    sendBillToClient(bill.clientId, bill.notes);
    
    saveDataToStorage();
    renderScheduledBills();
}

function sendImmediateBill() {
    const clientSelect = document.getElementById('immediateBillClient');
    if (!clientSelect) return;
    
    const clientId = clientSelect.value;
    if (!clientId) {
        alert('Please select a client');
        return;
    }
    
    const notes = sanitizeInput(document.getElementById('immediateBillNotes')?.value || '');
    sendBillToClient(clientId, notes);
}

function sendBillToClient(clientId, notes = '') {
    const client = clients.find(c => c.id === clientId);
    if (!client) {
        alert('Client not found');
        return;
    }
    
    const clientOrders = orders.filter(order => order.clientId === clientId && order.completed === true);
    const totalDue = client.totalDue || 0;
    const paidAmount = client.paidAmount || 0;
    const remaining = Math.max(0, totalDue - paidAmount);
    
    // Create bill HTML
    const billHTML = generateBillHTML(client, clientOrders, totalDue, paidAmount, remaining);
    
    // Create modal with bill
    const billModal = document.createElement('div');
    billModal.className = 'modal bill-modal';
    billModal.id = 'bill-display-modal';
    billModal.innerHTML = `
        <div class="modal-content bill-modal-content">
            <div class="modal-header">
                <h3>Bill for ${sanitizeInput(client.name)}</h3>
                <div class="modal-actions">
                    <button class="btn btn-sm btn-secondary" id="print-bill-btn">
                        <i class="fas fa-print"></i> Print
                    </button>
                    <button class="btn btn-sm btn-info" id="whatsapp-bill-btn">
                        <i class="fab fa-whatsapp"></i> WhatsApp
                    </button>
                    <button class="btn btn-sm btn-success" id="copy-bill-btn">
                        <i class="fas fa-copy"></i> Copy
                    </button>
                    <span class="close">&times;</span>
                </div>
            </div>
            <div class="bill-container" id="bill-content">
                ${billHTML}
            </div>
        </div>
    `;
    
    document.body.appendChild(billModal);
    
    // Event listeners
    billModal.querySelector('.close').addEventListener('click', () => billModal.remove());
    
    billModal.querySelector('#print-bill-btn').addEventListener('click', () => {
        const printContent = document.getElementById('bill-content').innerHTML;
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html dir="${currentLang === 'ur' ? 'rtl' : 'ltr'}">
            <head>
                <meta charset="UTF-8">
                <title>Bill - ${sanitizeInput(client.name)}</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { 
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        background: white;
                        padding: 20px;
                    }
                    .bill-container { max-width: 800px; margin: 0 auto; }
                    ${getBillCSS()}
                    @media print {
                        body { padding: 0; }
                        .no-print { display: none; }
                    }
                </style>
            </head>
            <body>
                ${printContent}
                <div style="text-align: center; margin-top: 30px; font-size: 12px; color: #666;">
                    <p>Generated on ${new Date().toLocaleString()}</p>
                </div>
                <script>
                    window.print();
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    });
    
    billModal.querySelector('#copy-bill-btn').addEventListener('click', () => {
        const billText = generateBillText(client, clientOrders, totalDue, paidAmount, remaining);
        navigator.clipboard.writeText(billText).then(() => {
            showSuccessMessage('Bill copied to clipboard!');
        });
    });
    
    billModal.querySelector('#whatsapp-bill-btn').addEventListener('click', () => {
        const billText = generateBillText(client, clientOrders, totalDue, paidAmount, remaining);
        const whatsappUrl = `https://wa.me/${client.phone.replace(/\D/g, '')}?text=${encodeURIComponent(billText)}`;
        window.open(whatsappUrl, '_blank');
        showSuccessMessage(`Opening WhatsApp for ${client.name}...`);
    });
    
    billModal.style.display = 'block';
    
    // Close on outside click
    window.addEventListener('click', function(event) {
        if (event.target === billModal) {
            billModal.remove();
        }
    });
}

function generateBillHTML(client, orders, totalDue, paidAmount, remaining) {
    const billDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const billNumber = 'BILL-' + Date.now();
    
    let ordersHTML = '';
    orders.forEach((order, index) => {
        ordersHTML += `
            <tr>
                <td>${index + 1}</td>
                <td>${new Date(order.date).toLocaleDateString()}</td>
                <td>${sanitizeInput(order.type)}</td>
                <td>${order.quantity} kg</td>
                <td>PKR ${order.pricePerKg}</td>
                <td>PKR ${order.total.toFixed(2)}</td>
            </tr>
        `;
    });
    
    return `
        <div class="bill-header">
            <div class="company-info">
                <h1 class="company-name">
                    <i class="fas fa-drumstick-bite"></i> Ali Khail Poultry
                </h1>
                <p class="bill-title">BILL / RECEIPT</p>
            </div>
            <div class="bill-details">
                <p><strong>Bill No:</strong> ${billNumber}</p>
                <p><strong>Date:</strong> ${billDate}</p>
            </div>
        </div>
        
        <div class="bill-body">
            <div class="section client-section">
                <h3>CLIENT DETAILS</h3>
                <table class="details-table">
                    <tr>
                        <td><strong>Name:</strong></td>
                        <td>${sanitizeInput(client.name)}</td>
                    </tr>
                    <tr>
                        <td><strong>Phone:</strong></td>
                        <td>${sanitizeInput(client.phone)}</td>
                    </tr>
                    <tr>
                        <td><strong>Address:</strong></td>
                        <td>${sanitizeInput(client.address)}</td>
                    </tr>
                </table>
            </div>
            
            <div class="section orders-section">
                <h3>ORDER DETAILS</h3>
                <table class="orders-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Date</th>
                            <th>Type</th>
                            <th>Quantity</th>
                            <th>Price/kg</th>
                            <th>Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${ordersHTML || '<tr><td colspan="6" style="text-align: center; padding: 20px;">No orders found</td></tr>'}
                    </tbody>
                </table>
            </div>
            
            <div class="section summary-section">
                <div class="summary-grid">
                    <div class="summary-item">
                        <span class="label">Total Orders:</span>
                        <span class="value">${orders.length}</span>
                    </div>
                    <div class="summary-item">
                        <span class="label">Total Amount:</span>
                        <span class="value">PKR ${totalDue.toFixed(2)}</span>
                    </div>
                    <div class="summary-item">
                        <span class="label">Paid Amount:</span>
                        <span class="value">PKR ${paidAmount.toFixed(2)}</span>
                    </div>
                    <div class="summary-item highlight">
                        <span class="label">Remaining Balance:</span>
                        <span class="value">PKR ${remaining.toFixed(2)}</span>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="bill-footer">
            <p class="thank-you">Thank You for Your Business!</p>
            <p class="company-contact">
                <i class="fas fa-phone"></i> 0300-XXXXXXX | 
                <i class="fas fa-map-marker-alt"></i> Peshawar, Pakistan
            </p>
            <p class="footer-note">This is a computer-generated bill. No signature required.</p>
        </div>
    `;
}

function generateBillText(client, orders, totalDue, paidAmount, remaining) {
    const billDate = new Date().toLocaleDateString();
    const billNumber = 'BILL-' + Date.now();
    
    let billText = `
╔════════════════════════════════════════════════════╗
║           ALI KHAIL POULTRY - BILL                 ║
╠════════════════════════════════════════════════════╣

BILL #: ${billNumber}
DATE: ${billDate}

CLIENT INFORMATION:
─────────────────────────────────────────────────────
Name: ${client.name}
Phone: ${client.phone}
Address: ${client.address}

ORDER SUMMARY:
─────────────────────────────────────────────────────`;

    orders.forEach((order, index) => {
        billText += `
${index + 1}. Date: ${new Date(order.date).toLocaleDateString()}
   Type: ${order.type}
   Quantity: ${order.quantity} kg @ PKR ${order.pricePerKg}/kg
   Amount: PKR ${order.total.toFixed(2)}`;
    });

    billText += `

FINANCIAL SUMMARY:
─────────────────────────────────────────────────────
Total Orders:         ${orders.length}
Total Amount:         PKR ${totalDue.toFixed(2)}
Paid Amount:          PKR ${paidAmount.toFixed(2)}
Remaining Balance:    PKR ${remaining.toFixed(2)}

─────────────────────────────────────────────────────
Thank you for your business!
Ali Khail Poultry | 0300-XXXXXXX | Peshawar
═════════════════════════════════════════════════════
    `;

    return billText.trim();
}

function getBillCSS() {
    return `
        .bill-container {
            background: white;
            border: 2px solid #333;
            border-radius: 8px;
            padding: 40px;
            font-family: 'Segoe UI', sans-serif;
            color: #333;
        }
        
        .bill-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 3px solid #4a6fa5;
        }
        
        .company-info h1 {
            font-size: 28px;
            color: #4a6fa5;
            margin-bottom: 5px;
        }
        
        .bill-title {
            font-size: 16px;
            font-weight: 600;
            color: #ff9900;
            letter-spacing: 2px;
        }
        
        .bill-details {
            text-align: right;
            font-size: 13px;
        }
        
        .section {
            margin-bottom: 25px;
        }
        
        .section h3 {
            font-size: 14px;
            font-weight: 700;
            text-transform: uppercase;
            color: #4a6fa5;
            margin-bottom: 12px;
            padding-bottom: 8px;
            border-bottom: 2px solid #f0f0f0;
        }
        
        .details-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
            margin-bottom: 15px;
        }
        
        .details-table tr {
            border-bottom: 1px solid #f0f0f0;
        }
        
        .details-table td {
            padding: 8px 0;
        }
        
        .orders-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
        }
        
        .orders-table thead {
            background: #f5f5f5;
        }
        
        .orders-table th {
            padding: 10px;
            text-align: left;
            font-weight: 700;
            color: #4a6fa5;
            border-bottom: 2px solid #4a6fa5;
        }
        
        .orders-table td {
            padding: 10px;
            border-bottom: 1px solid #f0f0f0;
            text-align: right;
        }
        
        .orders-table td:first-child,
        .orders-table td:nth-child(2),
        .orders-table td:nth-child(3) {
            text-align: left;
        }
        
        .summary-section {
            background: linear-gradient(135deg, #f5f7fa 0%, #e9ecef 100%);
            padding: 20px;
            border-radius: 6px;
            border-left: 4px solid #4a6fa5;
        }
        
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
        }
        
        .summary-item {
            display: flex;
            justify-content: space-between;
            padding: 10px;
            font-size: 13px;
        }
        
        .summary-item.highlight {
            background: white;
            padding: 15px;
            border-radius: 4px;
            grid-column: 1 / -1;
            border: 2px solid #ff9900;
            font-weight: 700;
            font-size: 14px;
        }
        
        .summary-item .value {
            font-weight: 600;
            color: #4a6fa5;
        }
        
        .summary-item.highlight .value {
            color: #ff9900;
        }
        
        .bill-footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 2px dashed #ccc;
        }
        
        .thank-you {
            font-size: 14px;
            font-weight: 700;
            color: #4a6fa5;
            margin-bottom: 10px;
        }
        
        .company-contact {
            font-size: 12px;
            color: #666;
            margin-bottom: 8px;
        }
        
        .footer-note {
            font-size: 11px;
            color: #999;
            font-style: italic;
        }
    `;
}

// Notification System
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-bell"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close">&times;</button>
    `;
    
    // Add to notification center
    if (notificationList) {
        const notificationItem = document.createElement('div');
        notificationItem.className = 'notification-item';
        notificationItem.innerHTML = `
            <div class="notification-item-content">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'warning' ? 'exclamation-circle' : 'info-circle'}"></i>
                <div>
                    <p>${message}</p>
                    <small>${new Date().toLocaleTimeString()}</small>
                </div>
            </div>
        `;
        notificationList.insertBefore(notificationItem, notificationList.firstChild);
        
        // Limit notifications to prevent memory issues
        if (notificationList.children.length > 30) {
            notificationList.removeChild(notificationList.lastChild);
        }
        
        // Update badge
        updateNotificationBadge();
    }
    
    // Show floating notification
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 5000);
    
    // Close button
    notification.querySelector('.notification-close').addEventListener('click', () => {
        notification.classList.add('fade-out');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    });
}

function updateNotificationBadge() {
    if (notificationBadge && notificationList) {
        const count = notificationList.children.length;
        notificationBadge.textContent = count;
        notificationBadge.style.display = count > 0 ? 'block' : 'none';
    }
}

function toggleNotificationCenter() {
    if (notificationCenter) {
        const dropdown = notificationCenter.querySelector('.notification-dropdown');
        if (dropdown) {
            dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
            
            // Mark as read when opening
            if (dropdown.style.display === 'block') {
                notificationBadge.style.display = 'none';
            }
        }
    }
}

function playNotificationSound() {
    try {
        notificationSound.currentTime = 0;
        notificationSound.play();
    } catch (error) {
        console.log('Error playing notification sound:', error);
    }
}

// Utility Functions
function closeModalFunc(modal) {
    if (modal) modal.style.display = 'none';
}

function showUserOrders(user) {
    // Implementation for user-specific orders
    alert(`Showing orders for ${user}`);
}

// Check for scheduled bills every hour
setInterval(() => {
    const now = new Date();
    scheduledBills.forEach(bill => {
        if (!bill.active) return;
        
        const billTime = new Date(bill.billDateTime);
        const timeDiff = billTime - now;
        
        // Check if bill should be sent now
        if (timeDiff > 0 && timeDiff <= 3600000) { // Within next hour
            sendScheduledBillNow(bill.id);
            
            // Reschedule if repeating
            if (bill.repeat !== 'once') {
                const newBillTime = new Date(billTime);
                switch(bill.repeat) {
                    case 'daily':
                        newBillTime.setDate(newBillTime.getDate() + 1);
                        break;
                    case 'weekly':
                        newBillTime.setDate(newBillTime.getDate() + 7);
                        break;
                    case 'monthly':
                        newBillTime.setMonth(newBillTime.getMonth() + 1);
                        break;
                }
                bill.billDateTime = newBillTime.toISOString();
                saveDataToStorage();
            }
        }
    });
}, 3600000); // Check every hour