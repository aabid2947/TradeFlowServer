import express from 'express';
import { 
    createListing, 
    getActiveListings, 
    getMyListings,
    updateListing
} from '../controllers/listingController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validateListingCreation } from '../validators/listingValidators.js';

const router = express.Router();

// @route   GET /api/listings
// @desc    Get all active listings for buyers to see (PUBLIC ACCESS)
// @access  Public
router.get('/', getActiveListings);

// All routes below require authentication
router.use(authenticate);

// @route   POST /api/listings
// @desc    Create a new FUN token listing
// @access  Private (Sellers only)
router.post('/', authorize('seller'), validateListingCreation, createListing);

// @route   GET /api/listings/my-listings
// @desc    Get all listings created by the logged-in seller
// @access  Private (Sellers only)
router.get('/my-listings', authorize('seller'), getMyListings);

// @route   PUT /api/listings/:id
// @desc    Update a listing (e.g., to deactivate it)
// @access  Private (Owner of the listing)
router.put('/:id', authorize('seller'), updateListing);


export default router;
