const User = require('../models/User');

const authMiddleware = (req, res, next) => {
  // Verificar se é uma rota que não precisa de autenticação
  const publicRoutes = ['/api/admin/login', '/api/admin/setup'];
  if (publicRoutes.includes(req.path)) {
    return next();
  }

  // Verificar se está logado
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  next();
};

const setupRequired = async (req, res, next) => {
  // Verificar se já existe usuário admin
  const userExists = await User.exists();
  
  if (!userExists && req.path !== '/api/admin/setup') {
    return res.status(403).json({ 
      error: 'Setup necessário',
      setupRequired: true 
    });
  }

  next();
};

module.exports = {
  authMiddleware,
  setupRequired
};