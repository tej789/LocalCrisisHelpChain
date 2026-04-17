const Feedback = require('../models/Feedback');
const User = require('../models/User');

async function assertUserAccount(req, res) {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }

  const account = await User.findById(userId).select('role');

  if (!account) {
    res.status(404).json({ error: 'User not found' });
    return null;
  }

  if ((account.role || '').toLowerCase() !== 'user') {
    res.status(403).json({ error: 'Only users can submit feedback' });
    return null;
  }

  return account;
}

exports.createFeedback = async (req, res) => {
  try {
    const account = await assertUserAccount(req, res);
    if (!account) return;

    const { rating, category = 'general', message } = req.body || {};

    const parsedRating = Number(rating);

    if (!Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    if (typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Feedback message is required' });
    }

    const feedback = await Feedback.create({
      userId: req.user.id,
      rating: parsedRating,
      category,
      message: message.trim(),
    });

    res.status(201).json(feedback);
  } catch (err) {
    console.error('Create feedback error:', err);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
};

exports.getMyFeedback = async (req, res) => {
  try {
    const account = await assertUserAccount(req, res);
    if (!account) return;

    const feedback = await Feedback.find({ userId: req.user.id })
      .sort({ createdAt: -1 });

    res.status(200).json(feedback);
  } catch (err) {
    console.error('Fetch feedback error:', err);
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
};

exports.getAllFeedback = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const feedback = await Feedback.find()
      .populate('userId', 'name role')
      .sort({ createdAt: -1 });

    const payload = feedback.map((item) => ({
      _id: item._id,
      rating: item.rating,
      category: item.category,
      message: item.message,
      createdAt: item.createdAt,
      userName: item.userId?.name || 'Anonymous',
      userRole: item.userId?.role || 'user',
    }));

    res.status(200).json(payload);
  } catch (err) {
    console.error('Fetch all feedback error:', err);
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
};

exports.updateFeedback = async (req, res) => {
  try {
    const account = await assertUserAccount(req, res);
    if (!account) return;

    const { rating, category = 'general', message } = req.body || {};
    const parsedRating = Number(rating);

    if (!Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    if (typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Feedback message is required' });
    }

    const updated = await Feedback.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      {
        rating: parsedRating,
        category,
        message: message.trim(),
      },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    res.status(200).json(updated);
  } catch (err) {
    console.error('Update feedback error:', err);
    res.status(500).json({ error: 'Failed to update feedback' });
  }
};

exports.deleteFeedback = async (req, res) => {
  try {
    const account = await assertUserAccount(req, res);
    if (!account) return;

    const deleted = await Feedback.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!deleted) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    res.status(200).json({ success: true, id: deleted._id });
  } catch (err) {
    console.error('Delete feedback error:', err);
    res.status(500).json({ error: 'Failed to delete feedback' });
  }
};