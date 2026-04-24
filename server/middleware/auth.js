const User = require('../models/User');

async function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  try {
    const user = await User.findById(req.session.userId).populate('assignedOutlets', '_id name city');
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'Account inactive or not found' });
    }
    req.user = user;
    next();
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = requireAuth;
