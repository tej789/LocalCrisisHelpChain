const express = require('express');
const { getNearbyServices } = require('../controllers/nearbyServicesController');

const router = express.Router();

/**
 * @route GET /api/nearby-services
 * @query {number} lat - Latitude
 * @query {number} lon - Longitude
 * @returns {Object} Nearby hospitals and shelters
 */
router.get('/', getNearbyServices);

module.exports = router;
