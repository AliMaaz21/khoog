// Test script to verify API endpoints
const API_BASE_URL = 'http://localhost:3000/api';

// Test login
async function testLogin() {
    try {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: 'jawad',
                password: 'khoog123'
            })
        });

        const data = await response.json();
        console.log('Login test:', data);

        if (data.token) {
            // Test getting orders with token
            const ordersResponse = await fetch(`${API_BASE_URL}/orders`, {
                headers: {
                    'Authorization': `Bearer ${data.token}`
                }
            });
            const orders = await ordersResponse.json();
            console.log('Orders test:', orders);

            // Test dashboard stats
            const statsResponse = await fetch(`${API_BASE_URL}/dashboard/stats`, {
                headers: {
                    'Authorization': `Bearer ${data.token}`
                }
            });
            const stats = await statsResponse.json();
            console.log('Dashboard stats test:', stats);
        }
    } catch (error) {
        console.error('Test failed:', error);
    }
}

// Run test
testLogin();