const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'ali-khail-poultry-secret-key-2024';

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('.'));

// Database setup
const db = new sqlite3.Database('./poultry.db', (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database.');
        initializeDatabase();
    }
});

// Initialize database tables
function initializeDatabase() {
    const tables = [
        // Users table
        `CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            name TEXT NOT NULL,
            role TEXT DEFAULT 'user',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        // Clients table
        `CREATE TABLE IF NOT EXISTS clients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            phone TEXT,
            address TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        // Orders table
        `CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_date DATE NOT NULL,
            client_id INTEGER,
            customer_name TEXT,
            phone TEXT,
            address TEXT,
            chicken_type TEXT NOT NULL,
            price_per_kg REAL NOT NULL,
            quantity REAL NOT NULL,
            total_price REAL NOT NULL,
            status TEXT DEFAULT 'pending',
            created_by INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (client_id) REFERENCES clients (id),
            FOREIGN KEY (created_by) REFERENCES users (id)
        )`,
        // Cars table
        `CREATE TABLE IF NOT EXISTS cars (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            number_plate TEXT,
            driver_name TEXT,
            phone TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        // Workers table
        `CREATE TABLE IF NOT EXISTS workers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            phone TEXT,
            address TEXT,
            salary REAL,
            role TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        // Waste sales table
        `CREATE TABLE IF NOT EXISTS waste_sales (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date DATE NOT NULL,
            quantity REAL NOT NULL,
            price_per_kg REAL NOT NULL,
            total_price REAL NOT NULL,
            buyer_name TEXT,
            phone TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        // Brokers table
        `CREATE TABLE IF NOT EXISTS brokers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            phone TEXT,
            commission_rate REAL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        // Shops table
        `CREATE TABLE IF NOT EXISTS shops (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            location TEXT,
            owner_name TEXT,
            phone TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        // Reminders table
        `CREATE TABLE IF NOT EXISTS reminders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            reminder_date DATE NOT NULL,
            priority TEXT DEFAULT 'medium',
            status TEXT DEFAULT 'active',
            created_by INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (created_by) REFERENCES users (id)
        )`,
        // Scheduled bills table
        `CREATE TABLE IF NOT EXISTS scheduled_bills (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            amount REAL NOT NULL,
            due_date DATE NOT NULL,
            category TEXT,
            status TEXT DEFAULT 'pending',
            created_by INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (created_by) REFERENCES users (id)
        )`
    ];

    let index = 0;

    function createNextTable() {
        if (index < tables.length) {
            db.run(tables[index], (err) => {
                if (err) {
                    console.error('Error creating table:', err.message);
                } else {
                    console.log(`Table ${index + 1} created successfully`);
                }
                index++;
                createNextTable();
            });
        } else {
            // All tables created, now initialize default users
            initializeDefaultUsers();
        }
    }

    createNextTable();
}

// Initialize default users
function initializeDefaultUsers() {
    const defaultUsers = [
        { username: 'jawad', name: 'Jawad', password: 'khoog123' },
        { username: 'fawad', name: 'Fawad', password: 'khoog123' },
        { username: 'shal-dada', name: 'Shal Dada', password: 'khoog123' }
    ];

    defaultUsers.forEach(user => {
        const hashedPassword = bcrypt.hashSync(user.password, 10);
        db.run(`INSERT OR IGNORE INTO users (username, password, name) VALUES (?, ?, ?)`,
            [user.username, hashedPassword, user.name]);
    });
}

// Authentication middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
    });
}

// Routes

// Login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        if (!bcrypt.compareSync(password, user.password)) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, name: user.name },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                name: user.name
            }
        });
    });
});

// Get all orders
app.get('/api/orders', authenticateToken, (req, res) => {
    db.all(`
        SELECT o.*, c.name as client_name
        FROM orders o
        LEFT JOIN clients c ON o.client_id = c.id
        ORDER BY o.created_at DESC
    `, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(rows);
    });
});

// Create order
app.post('/api/orders', authenticateToken, (req, res) => {
    const { order_date, client_id, customer_name, phone, address, chicken_type, price_per_kg, quantity } = req.body;
    const total_price = price_per_kg * quantity;

    db.run(`
        INSERT INTO orders (order_date, client_id, customer_name, phone, address, chicken_type, price_per_kg, quantity, total_price, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [order_date, client_id, customer_name, phone, address, chicken_type, price_per_kg, quantity, total_price, req.user.id], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json({ id: this.lastID, message: 'Order created successfully' });
    });
});

// Update order
app.put('/api/orders/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    db.run('UPDATE orders SET status = ? WHERE id = ?', [status, id], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json({ message: 'Order updated successfully' });
    });
});

// Delete order
app.delete('/api/orders/:id', authenticateToken, (req, res) => {
    const { id } = req.params;

    db.run('DELETE FROM orders WHERE id = ?', [id], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json({ message: 'Order deleted successfully' });
    });
});

// Get all clients
app.get('/api/clients', authenticateToken, (req, res) => {
    db.all('SELECT * FROM clients ORDER BY name', [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(rows);
    });
});

// Create client
app.post('/api/clients', authenticateToken, (req, res) => {
    const { name, phone, address } = req.body;

    db.run('INSERT INTO clients (name, phone, address) VALUES (?, ?, ?)',
        [name, phone, address], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json({ id: this.lastID, message: 'Client created successfully' });
    });
});

// Get all cars
app.get('/api/cars', authenticateToken, (req, res) => {
    db.all('SELECT * FROM cars ORDER BY name', [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(rows);
    });
});

// Create car
app.post('/api/cars', authenticateToken, (req, res) => {
    const { name, number_plate, driver_name, phone } = req.body;

    db.run('INSERT INTO cars (name, number_plate, driver_name, phone) VALUES (?, ?, ?, ?)',
        [name, number_plate, driver_name, phone], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json({ id: this.lastID, message: 'Car created successfully' });
    });
});

// Get all workers
app.get('/api/workers', authenticateToken, (req, res) => {
    db.all('SELECT * FROM workers ORDER BY name', [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(rows);
    });
});

// Create worker
app.post('/api/workers', authenticateToken, (req, res) => {
    const { name, phone, address, salary, role } = req.body;

    db.run('INSERT INTO workers (name, phone, address, salary, role) VALUES (?, ?, ?, ?, ?)',
        [name, phone, address, salary, role], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json({ id: this.lastID, message: 'Worker created successfully' });
    });
});

// Get all waste sales
app.get('/api/waste', authenticateToken, (req, res) => {
    db.all('SELECT * FROM waste_sales ORDER BY date DESC', [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(rows);
    });
});

// Create waste sale
app.post('/api/waste', authenticateToken, (req, res) => {
    const { date, quantity, price_per_kg, buyer_name, phone } = req.body;
    const total_price = price_per_kg * quantity;

    db.run('INSERT INTO waste_sales (date, quantity, price_per_kg, total_price, buyer_name, phone) VALUES (?, ?, ?, ?, ?, ?)',
        [date, quantity, price_per_kg, total_price, buyer_name, phone], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json({ id: this.lastID, message: 'Waste sale recorded successfully' });
    });
});

// Get all brokers
app.get('/api/brokers', authenticateToken, (req, res) => {
    db.all('SELECT * FROM brokers ORDER BY name', [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(rows);
    });
});

// Create broker
app.post('/api/brokers', authenticateToken, (req, res) => {
    const { name, phone, commission_rate } = req.body;

    db.run('INSERT INTO brokers (name, phone, commission_rate) VALUES (?, ?, ?)',
        [name, phone, commission_rate], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json({ id: this.lastID, message: 'Broker created successfully' });
    });
});

// Get all shops
app.get('/api/shops', authenticateToken, (req, res) => {
    db.all('SELECT * FROM shops ORDER BY name', [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(rows);
    });
});

// Create shop
app.post('/api/shops', authenticateToken, (req, res) => {
    const { name, location, owner_name, phone } = req.body;

    db.run('INSERT INTO shops (name, location, owner_name, phone) VALUES (?, ?, ?, ?)',
        [name, location, owner_name, phone], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json({ id: this.lastID, message: 'Shop created successfully' });
    });
});

// Get all reminders
app.get('/api/reminders', authenticateToken, (req, res) => {
    db.all('SELECT * FROM reminders WHERE created_by = ? ORDER BY reminder_date', [req.user.id], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(rows);
    });
});

// Create reminder
app.post('/api/reminders', authenticateToken, (req, res) => {
    const { title, description, reminder_date, priority } = req.body;

    db.run('INSERT INTO reminders (title, description, reminder_date, priority, created_by) VALUES (?, ?, ?, ?, ?)',
        [title, description, reminder_date, priority, req.user.id], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json({ id: this.lastID, message: 'Reminder created successfully' });
    });
});

// Get all scheduled bills
app.get('/api/bills', authenticateToken, (req, res) => {
    db.all('SELECT * FROM scheduled_bills WHERE created_by = ? ORDER BY due_date', [req.user.id], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(rows);
    });
});

// Create scheduled bill
app.post('/api/bills', authenticateToken, (req, res) => {
    const { title, amount, due_date, category } = req.body;

    db.run('INSERT INTO scheduled_bills (title, amount, due_date, category, created_by) VALUES (?, ?, ?, ?, ?)',
        [title, amount, due_date, category, req.user.id], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json({ id: this.lastID, message: 'Bill scheduled successfully' });
    });
});

// Get dashboard stats
app.get('/api/dashboard/stats', authenticateToken, (req, res) => {
    const queries = {
        totalOrders: 'SELECT COUNT(*) as count FROM orders',
        totalRevenue: 'SELECT SUM(total_price) as total FROM orders',
        totalChicken: 'SELECT SUM(quantity) as total FROM orders',
        totalClients: 'SELECT COUNT(*) as count FROM clients'
    };

    const results = {};

    let completed = 0;
    const total = Object.keys(queries).length;

    Object.keys(queries).forEach(key => {
        db.get(queries[key], [], (err, row) => {
            if (err) {
                results[key] = 0;
            } else {
                results[key] = row.total || row.count || 0;
            }
            completed++;
            if (completed === total) {
                res.json({
                    totalOrders: results.totalOrders,
                    totalRevenue: results.totalRevenue || 0,
                    totalChicken: results.totalChicken || 0,
                    totalClients: results.totalClients
                });
            }
        });
    });
});

// Start server with port fallback if the default port is in use
function attemptListen(startPort, maxAttempts = 10) {
    let port = startPort;
    let attempts = 0;

    const server = app.listen(port, () => {
        console.log(`Server running on port ${port}`);
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE' && attempts < maxAttempts) {
            attempts++;
            port++;
            console.warn(`Port ${port - 1} in use, trying port ${port}...`);
            setTimeout(() => {
                attemptListen(port, maxAttempts - attempts);
            }, 200);
        } else {
            console.error('Failed to start server:', err);
            process.exit(1);
        }
    });
}

attemptListen(PORT);

// Graceful shutdown
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err.message);
        } else {
            console.log('Database connection closed.');
        }
        process.exit(0);
    });
});