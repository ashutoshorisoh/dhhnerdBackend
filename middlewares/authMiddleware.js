import jwt from 'jsonwebtoken';
import userModel from '../models/user.model.js';


export const verifyToken = async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      
      // Add logging for debugging
      console.log('Authorization header:', authHeader);
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'No token provided' });
      }
  
      const token = authHeader.split(' ')[1];
  
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
  
      req.user = await userModel.findById(decoded.userId).select('-password'); // Attach user data to request
      if (!req.user) {
        return res.status(401).json({ message: 'Invalid token user not found' });
      }
  
      next();
    } catch (error) {
      console.error('Token verification failed:', error);
      res.status(401).json({ message: 'Token is not valid' });
    }
  };
  
