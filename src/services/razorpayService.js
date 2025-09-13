import Razorpay from 'razorpay';
import { AppError } from '../middleware/errorHandler.js';
import dotenv from 'dotenv';
dotenv.config();

class RazorpayService {
    constructor() {
        this.razorpay = null;
        this.initialize();
    }

    initialize() {
        if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
            // Check if keys are placeholder values
            if (process.env.RAZORPAY_KEY_ID === 'your_razorpay_key_id_here' || 
                process.env.RAZORPAY_KEY_SECRET === 'your_razorpay_key_secret_here') {
                console.warn('Warning: Razorpay credentials are set to placeholder values. Please configure actual Razorpay credentials.');
                return;
            }
            
            this.razorpay = new Razorpay({
                key_id: process.env.RAZORPAY_KEY_ID,
                key_secret: process.env.RAZORPAY_KEY_SECRET,
            });
            console.log('Razorpay service initialized successfully');
        } else {
            console.warn('Warning: Razorpay credentials not found. Payment functionality will not work.');
        }
    }

    isInitialized() {
        return this.razorpay !== null;
    }

    /**
     * Create a Razorpay order for purchasing tokens
     * @param {Object} orderData - Order details
     * @returns {Promise<Object>} Razorpay order
     */
    async createOrder(orderData) {
        if (!this.isInitialized()) {
            throw new AppError('Razorpay service is not initialized', 503);
        }

        try {
            const order = await this.razorpay.orders.create(orderData);
            return order;
        } catch (error) {
            console.error('Error creating Razorpay order:', error);
            throw new AppError('Failed to create payment order', 500);
        }
    }

    /**
     * Create a contact for payout
     * @param {Object} contactData - Contact details
     * @returns {Promise<Object>} Razorpay contact
     */
    async createContact(contactData) {
        if (!this.isInitialized()) {
            throw new AppError('Razorpay service is not initialized', 503);
        }

        try {
            // Note: This requires Razorpay X (business banking) to be enabled
            const contact = await this.razorpay.contacts.create(contactData);
            return contact;
        } catch (error) {
            console.error('Error creating Razorpay contact:', error);
            throw new AppError('Failed to create contact for payout', 500);
        }
    }

    /**
     * Create a fund account for payout
     * @param {Object} fundAccountData - Fund account details
     * @returns {Promise<Object>} Razorpay fund account
     */
    async createFundAccount(fundAccountData) {
        if (!this.isInitialized()) {
            throw new AppError('Razorpay service is not initialized', 503);
        }

        try {
            const fundAccount = await this.razorpay.fundAccounts.create(fundAccountData);
            return fundAccount;
        } catch (error) {
            console.error('Error creating Razorpay fund account:', error);
            throw new AppError('Failed to create fund account for payout', 500);
        }
    }

    /**
     * Create a payout (bank transfer)
     * @param {Object} payoutData - Payout details
     * @returns {Promise<Object>} Razorpay payout
     */
    async createPayout(payoutData) {
        if (!this.isInitialized()) {
            throw new AppError('Razorpay service is not initialized', 503);
        }

        try {
            const payout = await this.razorpay.payouts.create(payoutData);
            return payout;
        } catch (error) {
            console.error('Error creating Razorpay payout:', error);
            throw new AppError('Failed to create payout', 500);
        }
    }

    /**
     * Process withdrawal with proper contact and fund account creation
     * @param {Object} withdrawalData - Withdrawal details
     * @returns {Promise<Object>} Complete withdrawal response
     */
    async processWithdrawal(withdrawalData) {
        if (!this.isInitialized()) {
            throw new AppError('Razorpay service is not initialized', 503);
        }

        const {
            amount,
            currency = 'INR',
            mode = 'IMPS',
            purpose = 'payout',
            narration,
            reference_id,
            user
        } = withdrawalData;

        try {
            // Step 1: Create contact
            const contactData = {
                // name: user.bankDetails.accountHolderName,
                name:"aabid",
                email: "aabid@gmail.com",
                contact: user.phoneNumber || '9999999999',
                type: 'employee',
                reference_id: user._id.toString()
            };

            const contact = await this.createContact(contactData);

            // Step 2: Create fund account
            const fundAccountData = {
                contact_id: contact.id,
                account_type: 'bank_account',
                bank_account: {
                    name: user.bankDetails.accountHolderName || 'Aabid' ,
                    ifsc: user.bankDetails.ifscCode || 'HDFC0000001',
                    account_number: user.bankDetails.accountNumber || '333333333333'
                }
            };

            const fundAccount = await this.createFundAccount(fundAccountData);

            // Step 3: Create payout
            const payoutData = {
                account_number: process.env.RAZORPAY_ACCOUNT_NUMBER,
                fund_account_id: fundAccount.id,
                amount: amount * 100, // Convert to paise
                currency,
                mode,
                purpose,
                queue_if_low_balance: true,
                reference_id,
                narration
            };

            const payout = await this.createPayout(payoutData);

            return {
                contact,
                fundAccount,
                payout
            };

        } catch (error) {
            console.error('Error processing withdrawal:', error);
            throw error;
        }
    }

    /**
     * Get payout status
     * @param {string} payoutId - Payout ID
     * @returns {Promise<Object>} Payout details
     */
    async getPayoutStatus(payoutId) {
        if (!this.isInitialized()) {
            throw new AppError('Razorpay service is not initialized', 503);
        }

        try {
            const payout = await this.razorpay.payouts.fetch(payoutId);
            return payout;
        } catch (error) {
            console.error('Error fetching payout status:', error);
            throw new AppError('Failed to fetch payout status', 500);
        }
    }
}

// Export singleton instance
const razorpayService = new RazorpayService();
export default razorpayService;