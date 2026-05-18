function requirePlatformOwner(req, res, next) {
  if (req.user && req.user.role === 'platform_owner') return next();
  return res.status(403).json({ success: false, message: 'Platform owner access required' });
}

module.exports = requirePlatformOwner;
