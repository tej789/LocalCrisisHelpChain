const express = require('express');
const router = express.Router();

const { verifyToken } = require('../middleware/auth');
const feedbackController = require('../controllers/feedbackController');

router.get('/my-feedback', verifyToken, feedbackController.getMyFeedback);
router.get('/all', verifyToken, feedbackController.getAllFeedback);
router.post('/', verifyToken, feedbackController.createFeedback);
router.put('/:id', verifyToken, feedbackController.updateFeedback);
router.delete('/:id', verifyToken, feedbackController.deleteFeedback);

module.exports = router;