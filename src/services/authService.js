const bcrypt = require('bcrypt');
const { generateToken, generateRefreshToken } = require('../config/jwt');
const { prisma } = require('../models');

/**
 * Authentication service handling user authentication operations
 */
class AuthService {
  /**
   * Hash password using bcrypt
   * @param {string} password - Plain text password
   * @returns {Promise<string>} Hashed password
   */
  static async hashPassword(password) {
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
    return await bcrypt.hash(password, saltRounds);
  }

  /**
   * Compare password with hash
   * @param {string} password - Plain text password
   * @param {string} hash - Hashed password
   * @returns {Promise<boolean>} True if password matches
   */
  static async comparePassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }

  /**
   * Authenticate user with email and password
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<Object>} Authentication result with user and tokens
   */
  static async login(email, password) {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        team: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await this.comparePassword(password, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    // Generate tokens
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      teamId: user.teamId
    };

    const accessToken = generateToken(tokenPayload);
    const refreshToken = generateRefreshToken({ userId: user.id });

    // Remove password from user object
    const { password: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      accessToken,
      refreshToken
    };
  }

  /**
   * Get user profile by ID
   * @param {number} userId - User ID
   * @returns {Promise<Object>} User profile without password
   */
  static async getUserProfile(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        team: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Remove password from user object
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Validate user exists and is active
   * @param {number} userId - User ID
   * @returns {Promise<Object>} User object without password
   */
  static async validateUser(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        team: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Remove password from user object
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}

module.exports = AuthService;