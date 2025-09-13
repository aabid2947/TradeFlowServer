/**
 * Test script for withdrawal functionality
 * This script demonstrates how to test the withdrawal API endpoints
 */

const API_BASE_URL = 'http://localhost:5000/api';

// Test data
const testUser = {
    email: 'testuser@example.com',
    password: 'testpassword123',
    username: 'testuser',
    role: 'buyer'
};

const testWithdrawal = {
    tokenAmount: 100 // Withdraw 100 FUN tokens = ₹100
};

/**
 * Helper function to make API requests
 */
async function makeRequest(endpoint, method = 'GET', data = null, token = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
        },
    };

    if (token) {
        options.headers.Authorization = `Bearer ${token}`;
    }

    if (data) {
        options.body = JSON.stringify(data);
    }

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
        const result = await response.json();
        
        console.log(`\n=== ${method} ${endpoint} ===`);
        console.log('Status:', response.status);
        console.log('Response:', JSON.stringify(result, null, 2));
        
        return { response, result };
    } catch (error) {
        console.error(`Error making request to ${endpoint}:`, error.message);
        return null;
    }
}

/**
 * Test the withdrawal functionality
 */
async function testWithdrawal() {
    console.log('🧪 Testing Withdrawal Functionality\n');

    // Step 1: Register/Login to get token (assuming user exists)
    console.log('Step 1: Attempting to login...');
    const loginResult = await makeRequest('/auth/login', 'POST', {
        email: testUser.email,
        password: testUser.password
    });

    if (!loginResult || !loginResult.result.success) {
        console.log('❌ Login failed. Please ensure test user exists or register first.');
        return;
    }

    const token = loginResult.result.data.token;
    console.log('✅ Login successful');

    // Step 2: Check user balance
    console.log('\nStep 2: Checking user balance...');
    const profileResult = await makeRequest('/auth/profile', 'GET', null, token);
    
    if (profileResult && profileResult.result.success) {
        const balance = profileResult.result.data.balances.funToken;
        console.log(`Current FUN token balance: ${balance}`);
        
        if (balance < testWithdrawal.tokenAmount) {
            console.log(`❌ Insufficient balance. Need ${testWithdrawal.tokenAmount} FUN tokens.`);
            return;
        }
    }

    // Step 3: Test withdrawal
    console.log('\nStep 3: Testing withdrawal...');
    const withdrawalResult = await makeRequest('/payments/withdraw', 'POST', testWithdrawal, token);

    if (withdrawalResult && withdrawalResult.result.success) {
        console.log('✅ Withdrawal request successful!');
        console.log('Withdrawal details:', withdrawalResult.result.data);
    } else {
        console.log('❌ Withdrawal failed');
        if (withdrawalResult && withdrawalResult.result.message) {
            console.log('Error:', withdrawalResult.result.message);
        }
    }

    // Step 4: Check withdrawal history
    console.log('\nStep 4: Checking withdrawal history...');
    const historyResult = await makeRequest('/payments/withdrawals', 'GET', null, token);

    if (historyResult && historyResult.result.success) {
        console.log('✅ Withdrawal history retrieved');
        console.log('Recent withdrawals:', historyResult.result.data.withdrawals.length);
    }
}

/**
 * Test input validation
 */
async function testValidation() {
    console.log('\n🧪 Testing Input Validation\n');

    // Assuming we have a valid token (you'd get this from login)
    const token = 'your_test_token_here';

    // Test invalid amounts
    const invalidTests = [
        { tokenAmount: 0, description: 'Zero amount' },
        { tokenAmount: -10, description: 'Negative amount' },
        { tokenAmount: 'invalid', description: 'Non-numeric amount' },
        { tokenAmount: 100001, description: 'Amount exceeding limit' }
    ];

    for (const test of invalidTests) {
        console.log(`Testing: ${test.description}`);
        const result = await makeRequest('/payments/withdraw', 'POST', test, token);
        
        if (result && !result.result.success) {
            console.log('✅ Validation working correctly');
        } else {
            console.log('❌ Validation failed to catch invalid input');
        }
    }
}

// Export functions for use in other test files
export { testWithdrawal, testValidation, makeRequest };

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    console.log('Starting Withdrawal API Tests...\n');
    
    // Add delay to ensure server is running
    setTimeout(async () => {
        await testWithdrawal();
        // await testValidation(); // Uncomment to test validation
    }, 1000);
}