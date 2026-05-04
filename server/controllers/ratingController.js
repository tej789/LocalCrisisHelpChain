const asyncHandler = require('express-async-handler');
const Rating = require('../models/Rating');
const Volunteer = require('../models/Volunteer');
const HelpRequest = require('../models/HelpRequest');
const User = require('../models/User');
const AppError = require('../utils/AppError');

function calculateVolunteerRatingStats(allRatings) {
  const ratingCount = allRatings.length;

  if (ratingCount === 0) {
    return {
      totalRatings: 0,
      averageRating: 0,
      categorySums: { responsiveness: 0, professionalism: 0, helpfulness: 0 },
      categoryCount: 0,
      badges: []
    };
  }

  const sum = allRatings.reduce((acc, ratingDoc) => acc + ratingDoc.rating, 0);
  const categorySums = allRatings.reduce((acc, ratingDoc) => ({
    responsiveness: acc.responsiveness + (ratingDoc.categories?.responsiveness || 0),
    professionalism: acc.professionalism + (ratingDoc.categories?.professionalism || 0),
    helpfulness: acc.helpfulness + (ratingDoc.categories?.helpfulness || 0)
  }), { responsiveness: 0, professionalism: 0, helpfulness: 0 });

  const averageRating = Number((sum / ratingCount).toFixed(2));
  const averageResponsiveness = categorySums.responsiveness / ratingCount;
  const averageProfessionalism = categorySums.professionalism / ratingCount;
  const averageHelpfulness = categorySums.helpfulness / ratingCount;

  const badges = [];
  if (averageResponsiveness >= 4.7) badges.push('Excellent Response');
  if (averageProfessionalism >= 4.7) badges.push('Very Professional');
  if (averageHelpfulness >= 4.7) badges.push('Highly Helpful');
  if (averageRating >= 4.8 && ratingCount >= 10) badges.push('Trustworthy');

  return {
    totalRatings: ratingCount,
    averageRating,
    categorySums,
    categoryCount: ratingCount,
    badges: [...new Set(badges)]
  };
}

// @desc   Submit a rating for a volunteer
// @route  POST /api/ratings
// @access Private (User/Requester only)
exports.submitRating = asyncHandler(async (req, res, next) => {
  const { requestId, volunteerId, rating, comment, categories, badges, isPublic } = req.body;
  const userId = req.user.id;

  // Validation
  if (!requestId || !volunteerId || !rating) {
    throw new AppError('Request ID, Volunteer ID, and rating are required', 400);
  }

  if (rating < 1 || rating > 5) {
    throw new AppError('Rating must be between 1 and 5', 400);
  }

  // Check if request exists and is resolved
  const request = await HelpRequest.findById(requestId);
  if (!request) {
    throw new AppError('Help request not found', 404);
  }

  if (request.status !== 'resolved') {
    throw new AppError('Can only rate completed requests', 400);
  }

  // Verify the volunteer is assigned to this request
  if (request.assignedTo.toString() !== volunteerId) {
    throw new AppError('Volunteer was not assigned to this request', 400);
  }

  // Check if user already rated this request
  const existingRating = await Rating.findOne({
    requestId,
    volunteerId,
    ratedBy: userId
  });

  if (existingRating) {
    throw new AppError('You have already rated this volunteer for this request', 400);
  }

  // Calculate completion time in minutes
  const completionTime = request.updatedAt 
    ? Math.round((request.updatedAt - request.createdAt) / (1000 * 60))
    : null;

  // Create rating
  const newRating = await Rating.create({
    requestId,
    volunteerId,
    ratedBy: userId,
    rating,
    comment: comment?.trim(),
    categories: {
      responsiveness: categories?.responsiveness || rating,
      professionalism: categories?.professionalism || rating,
      helpfulness: categories?.helpfulness || rating
    },
    badges: badges || [],
    isPublic: isPublic !== false,
    requestDetails: {
      title: request.title,
      requestType: request.type,
      urgency: request.urgency,
      completionTime
    }
  });

  // Mark the request as rated
  request.isRated = true;
  request.ratedAt = new Date();
  await request.save();

  // Update volunteer's rating statistics
  const volunteer = await Volunteer.findById(volunteerId);
  if (!volunteer) {
    throw new AppError('Volunteer not found', 404);
  }

  const allRatings = await Rating.find({ volunteerId });
  const volunteerStats = calculateVolunteerRatingStats(allRatings);

  await Volunteer.updateOne(
    { _id: volunteerId },
    {
      $set: {
        'ratings.totalRatings': volunteerStats.totalRatings,
        'ratings.averageRating': volunteerStats.averageRating,
        'ratings.categorySums': volunteerStats.categorySums,
        'ratings.categoryCount': volunteerStats.categoryCount,
        'ratings.badges': volunteerStats.badges,
        'ratings.mostRecentRating': new Date(),
        requestsCompleted: (volunteer.requestsCompleted || 0) + 1
      }
    },
    { runValidators: false }
  );

  res.status(201).json({
    success: true,
    message: 'Rating submitted successfully',
    data: newRating
  });
});

// @desc   Get ratings for a volunteer
// @route  GET /api/ratings/volunteer/:volunteerId
// @access Public
exports.getVolunteerRatings = asyncHandler(async (req, res, next) => {
  const { volunteerId } = req.params;
  const { limit = 10, page = 1 } = req.query;

  const ratings = await Rating.find({ volunteerId, isPublic: true })
    .populate('ratedBy', 'name email')
    .populate('requestId', 'title type urgency')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await Rating.countDocuments({ volunteerId, isPublic: true });

  const volunteer = await Volunteer.findById(volunteerId, 'ratings name requestsCompleted');

  res.json({
    success: true,
    data: {
      volunteer,
      ratings,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit)
      }
    }
  });
});

// @desc   Get a single rating
// @route  GET /api/ratings/:ratingId
// @access Public
exports.getRating = asyncHandler(async (req, res, next) => {
  const rating = await Rating.findById(req.params.ratingId)
    .populate('volunteerId', 'name profilePhoto ratings')
    .populate('ratedBy', 'name email')
    .populate('requestId');

  if (!rating) {
    throw new AppError('Rating not found', 404);
  }

  res.json({
    success: true,
    data: rating
  });
});

// @desc   Update a rating (only by the user who created it)
// @route  PUT /api/ratings/:ratingId
// @access Private
exports.updateRating = asyncHandler(async (req, res, next) => {
  const { rating, comment, categories, badges } = req.body;
  const userId = req.user.id;

  let ratingDoc = await Rating.findById(req.params.ratingId);
  if (!ratingDoc) {
    throw new AppError('Rating not found', 404);
  }

  // Check if user owns this rating
  if (ratingDoc.ratedBy.toString() !== userId.toString()) {
    throw new AppError('Not authorized to update this rating', 403);
  }

  // Cannot update after 7 days
  const daysSinceCreation = Math.floor(
    (new Date() - ratingDoc.createdAt) / (1000 * 60 * 60 * 24)
  );
  if (daysSinceCreation > 7) {
    throw new AppError('Can only edit ratings within 7 days of creation', 400);
  }

  if (rating && (rating < 1 || rating > 5)) {
    throw new AppError('Rating must be between 1 and 5', 400);
  }

  // Store old rating for recalculation
  const oldRating = ratingDoc.rating;

  // Update fields
  if (rating) ratingDoc.rating = rating;
  if (comment) ratingDoc.comment = comment;
  if (categories) {
    ratingDoc.categories = {
      responsiveness: categories.responsiveness || ratingDoc.categories.responsiveness,
      professionalism: categories.professionalism || ratingDoc.categories.professionalism,
      helpfulness: categories.helpfulness || ratingDoc.categories.helpfulness
    };
  }
  if (badges) ratingDoc.badges = badges;

  await ratingDoc.save();

  // Recalculate volunteer statistics
  const volunteer = await Volunteer.findById(ratingDoc.volunteerId);
  const allRatings = await Rating.find({ volunteerId: ratingDoc.volunteerId });
  const volunteerStats = calculateVolunteerRatingStats(allRatings);

  await Volunteer.updateOne(
    { _id: ratingDoc.volunteerId },
    {
      $set: {
        'ratings.totalRatings': volunteerStats.totalRatings,
        'ratings.averageRating': volunteerStats.averageRating,
        'ratings.categorySums': volunteerStats.categorySums,
        'ratings.categoryCount': volunteerStats.categoryCount,
        'ratings.badges': volunteerStats.badges
      }
    },
    { runValidators: false }
  );

  res.json({
    success: true,
    message: 'Rating updated successfully',
    data: ratingDoc
  });
});

// @desc   Delete a rating (only by the user who created it)
// @route  DELETE /api/ratings/:ratingId
// @access Private
exports.deleteRating = asyncHandler(async (req, res, next) => {
  const rating = await Rating.findById(req.params.ratingId);
  if (!rating) {
    throw new AppError('Rating not found', 404);
  }

  // Check if user owns this rating
  if (rating.ratedBy.toString() !== req.user.id.toString()) {
    throw new AppError('Not authorized to delete this rating', 403);
  }

  await Rating.deleteOne({ _id: req.params.ratingId });

  // Recalculate volunteer statistics
  const volunteer = await Volunteer.findById(rating.volunteerId);
  const allRatings = await Rating.find({ volunteerId: rating.volunteerId });

  if (allRatings.length === 0) {
    await Volunteer.updateOne(
      { _id: rating.volunteerId },
      {
        $set: {
          'ratings.totalRatings': 0,
          'ratings.averageRating': 0,
          'ratings.categorySums': { responsiveness: 0, professionalism: 0, helpfulness: 0 },
          'ratings.categoryCount': 0,
          'ratings.badges': []
        }
      },
      { runValidators: false }
    );
  } else {
    const volunteerStats = calculateVolunteerRatingStats(allRatings);

    await Volunteer.updateOne(
      { _id: rating.volunteerId },
      {
        $set: {
          'ratings.totalRatings': volunteerStats.totalRatings,
          'ratings.averageRating': volunteerStats.averageRating,
          'ratings.categorySums': volunteerStats.categorySums,
          'ratings.categoryCount': volunteerStats.categoryCount,
          'ratings.badges': volunteerStats.badges
        }
      },
      { runValidators: false }
    );
  }

  res.json({
    success: true,
    message: 'Rating deleted successfully'
  });
});

// @desc   Mark a review as helpful
// @route  PUT /api/ratings/:ratingId/helpful
// @access Private
exports.markHelpful = asyncHandler(async (req, res, next) => {
  const rating = await Rating.findByIdAndUpdate(
    req.params.ratingId,
    { $inc: { helpfulCount: 1 } },
    { new: true }
  );

  if (!rating) {
    throw new AppError('Rating not found', 404);
  }

  res.json({
    success: true,
    data: rating
  });
});

// @desc   Get top-rated volunteers
// @route  GET /api/ratings/top-volunteers
// @access Public
exports.getTopVolunteers = asyncHandler(async (req, res, next) => {
  const { limit = 10 } = req.query;

  const volunteers = await Volunteer.find({
    'ratings.totalRatings': { $gte: 5 }
  })
    .sort({ 'ratings.averageRating': -1, 'ratings.totalRatings': -1 })
    .limit(limit)
    .select('name profilePhoto ratings requestsCompleted');

  res.json({
    success: true,
    data: volunteers
  });
});
