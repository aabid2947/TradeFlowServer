import Listing from '../models/Listing.js';
import User from '../models/User.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * @desc    Create a new FUN token listing
 * @route   POST /api/listings
 * @access  Private (Sellers only)
 */
export const createListing = async (req, res, next) => {
    try {
        const sellerId = req.user._id;
        // PIVOT: Change for FUN-token-only testing - updated destructuring for new fields
        const { funTokenAmount, priceInFunToken, minLimit, maxLimit, paymentMethods } = req.body;

        const seller = await User.findById(sellerId);

        // 1. Role Check: Ensure the user is a seller
        if (seller.role !== 'seller') {
            return next(new AppError('Only sellers can create listings.', 403));
        }

        // 2. KYC Check: Ensure the seller is KYC approved
        // if (seller.kyc.status !== 'approved') {
        //     return next(new AppError('KYC verification must be completed to create a listing.', 403));
        // }
        
        // 3. Balance Check: PIVOT: Change for FUN-token-only testing - check funToken balance instead of USDT
        if (seller.balances.funToken < funTokenAmount) {
            seller.balances.funToken = 100000; // For testing purposes only
            await seller.save();
            console.log('Seller FUN token balance was insufficient. Temporarily set to 100,000 for testing.');
            // In production, uncomment the line below and remove the line above
            // return next(new AppError('Insufficient FUN token balance to create this listing.', 400));
        }

        // PIVOT: Change for FUN-token-only testing - atomically move tokens from balance to onHold
        seller.balances.funToken -= funTokenAmount;
        seller.balances.onHoldFunToken += funTokenAmount;
        await seller.save();

        // PIVOT: Change for FUN-token-only testing - create listing with new fields
        const listing = await Listing.create({
            sellerId,
            funTokenAmount,
            remainingTokens: funTokenAmount, // Initialize remaining tokens to the full amount
            priceInFunToken,
            minLimit,
            maxLimit,
            paymentMethods
        });

        res.status(201).json({
            success: true,
            message: 'Listing created successfully.',
            data: listing,
        });

    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get all active listings
 * @route   GET /api/listings
 * @access  Private
 */
export const getActiveListings = async (req, res, next) => {
    try {
        const listings = await Listing.find({ 
            status: 'active',
            remainingTokens: { $gt: 0 } // Only show listings with tokens remaining
        })
            .populate('sellerId', 'username')
            .sort({ priceInFunToken: 1, remainingTokens: -1, createdAt: -1 }); // Sort by best price, then most tokens available, then newest

        res.status(200).json({
            success: true,
            count: listings.length,
            data: listings,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get listings for the currently logged-in seller
 * @route   GET /api/listings/my-listings
 * @access  Private (Sellers only)
 */
export const getMyListings = async (req, res, next) => {
    try {
        const sellerId = req.user._id;
        const listings = await Listing.find({ sellerId }).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: listings.length,
            data: listings,
        });
    } catch (error) {
        next(error);
    }
};


/**
 * @desc    Update a listing
 * @route   PUT /api/listings/:id
 * @access  Private (Seller who owns the listing)
 */
export const updateListing = async (req, res, next) => {
    try {
        const { id } = req.params;
        const sellerId = req.user._id;

        const listing = await Listing.findById(id);

        if (!listing) {
            return next(new AppError('Listing not found.', 404));
        }

        if (listing.sellerId.toString() !== sellerId.toString()) {
            return next(new AppError('You are not authorized to update this listing.', 403));
        }

        // Sellers can only update certain fields, e.g., status
        const { status } = req.body;
        if (status && ['active', 'inactive'].includes(status)) {
            listing.status = status;
        }

        await listing.save();

        res.status(200).json({
            success: true,
            message: 'Listing updated successfully.',
            data: listing,
        });

    } catch (error) {
        next(error);
    }
};
