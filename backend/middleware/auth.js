import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// The function name is 'auth' but we will export it as 'authMiddleware'
const auth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ message: 'No token, authorization denied' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_default_secret_key');
        
        const user = await User.findById(decoded.id || decoded.userId).select('-password');
        
        if (!user) {
            return res.status(401).json({ message: 'Token is not valid, user not found' });
        }

        req.user = {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role
        };
        
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(401).json({ message: 'Token is not valid' });
    }
};

// This is the critical fix: Exporting the function with the correct name.
export { auth as authMiddleware };