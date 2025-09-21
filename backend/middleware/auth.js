import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const auth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ message: 'No token, authorization denied' });
        }

        // This line is the fix. It now correctly looks for 'userId'.
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        if (!decoded.userId) {
            return res.status(401).json({ message: 'Token is invalid (missing user ID)' });
        }

        const user = await User.findById(decoded.userId).select('-password');
        
        if (!user) {
            return res.status(401).json({ message: 'User not found' });
        }

        req.user = { id: user._id }; // We continue to use req.user.id throughout the app
        
        next();
    } catch (error) {
        console.error('Auth middleware error:', error.message);
        res.status(401).json({ message: 'Token is not valid' });
    }
};

export default auth;