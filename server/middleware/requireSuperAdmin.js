function requireSuperAdmin(req, res, next) {
  if (req.user && req.user.role === 'super_admin') return next();
  res.status(403).json({ success: false, message: 'Super admin access required' });
}

module.exports = requireSuperAdmin;
