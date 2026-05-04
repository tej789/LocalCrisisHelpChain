const express = require('express');
const { verifyToken } = require('../middleware/auth');
const {
  submitRating,
  getVolunteerRatings,
  getRating,
  updateRating,
  deleteRating,
  markHelpful,
  getTopVolunteers
} = require('../controllers/ratingController');

const router = express.Router();

// Public routes
router.get('/volunteer/:volunteerId', getVolunteerRatings);
router.get('/top-volunteers', getTopVolunteers);
router.get('/:ratingId', getRating);

// Protected routes (user must be authenticated)
router.post('/', verifyToken, submitRating);
router.put('/:ratingId', verifyToken, updateRating);
router.delete('/:ratingId', verifyToken, deleteRating);
router.put('/:ratingId/helpful', verifyToken, markHelpful);

module.exports = router;
