# Ali Khail Poultry Management System

A comprehensive poultry management system with frontend and backend components.

## Features

- User authentication (Jawad, Fawad, Shal Dada)
- Order management
- Client management
- Car/vehicle management
- Worker management
- Waste sales tracking
- Broker management
- Shop management
- Reminders and scheduled bills
- Multi-language support (English/Urdu)
- Responsive design

## Setup Instructions

### Backend Setup

1. Navigate to the project directory
2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the backend server:
   ```bash
   npm start
   ```

   The server will run on `http://localhost:3000`

### Frontend Setup

1. Open `index.html` in a web browser, or serve it through a local server
2. The frontend will connect to the backend API at `http://localhost:3000/api`

### Default Users

- **Username:** jawad, **Password:** password123
- **Username:** fawad, **Password:** password123
- **Username:** shal-dada, **Password:** password123

## API Endpoints

### Authentication
- `POST /api/login` - User login

### Orders
- `GET /api/orders` - Get all orders
- `POST /api/orders` - Create new order
- `PUT /api/orders/:id` - Update order
- `DELETE /api/orders/:id` - Delete order

### Clients
- `GET /api/clients` - Get all clients
- `POST /api/clients` - Create new client

### Cars
- `GET /api/cars` - Get all cars
- `POST /api/cars` - Create new car

### Workers
- `GET /api/workers` - Get all workers
- `POST /api/workers` - Create new worker

### Waste Sales
- `GET /api/waste` - Get all waste sales
- `POST /api/waste` - Create new waste sale

### Brokers
- `GET /api/brokers` - Get all brokers
- `POST /api/brokers` - Create new broker

### Shops
- `GET /api/shops` - Get all shops
- `POST /api/shops` - Create new shop

### Reminders
- `GET /api/reminders` - Get user reminders
- `POST /api/reminders` - Create new reminder

### Scheduled Bills
- `GET /api/bills` - Get user scheduled bills
- `POST /api/bills` - Create new scheduled bill

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics

## Database

The backend uses SQLite database (`poultry.db`) with the following tables:
- users
- clients
- orders
- cars
- workers
- waste_sales
- brokers
- shops
- reminders
- scheduled_bills

## Technologies Used

### Backend
- Node.js
- Express.js
- SQLite3
- bcryptjs (password hashing)
- jsonwebtoken (authentication)
- CORS

### Frontend
- HTML5
- CSS3
- JavaScript (ES6+)
- Font Awesome icons

## Development

To run in development mode with auto-restart:
```bash
npm run dev
```

## Security

- Passwords are hashed using bcrypt
- JWT tokens for authentication
- Input sanitization on frontend
- CORS enabled for cross-origin requests

## License

This project is proprietary software for Ali Khail Poultry Management.