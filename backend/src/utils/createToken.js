import jwt from 'jsonwebtoken';

export default function createToken(user) {
  return jwt.sign(
    {
      id: user._id.toString(),
      role: user.role,
      tokenVersion: user.tokenVersion ?? 0
    },
    process.env.JWT_SECRET,
    {
      expiresIn: '7d'
    }
  );
}