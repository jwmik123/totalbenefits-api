const jwt = require('jsonwebtoken');

const authenticateJWT = (req, res, next) => {
  // 1. Haal de volledige header op
  const authHeader = req.header('Authorization');

  // 2. Check of de header überhaupt bestaat en begint met 'Bearer '
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied, token missing or malformed!' });
  }

  // 3. Nu is het pas veilig om de string te bewerken
  const token = authHeader.replace('Bearer ', '');

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
    req.user = decoded;
    next();
  } catch (err) {
    // Tip: log de error intern voor debugging, maar stuur een nette JSON terug
    console.error("JWT Verification Error:", err.message);
    res.status(400).json({ error: 'Invalid token' });
  }
};

module.exports = authenticateJWT;