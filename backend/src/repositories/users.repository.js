import { prisma } from '../config/database.js';

/**
 * Database repository implementation for User operations.
 * Wraps DB operations using Prisma client singleton.
 */
export class UserRepository {
  /**
   * Queries user profile records by email identifier.
   *
   * @async
   * @param {string} email - Search email target
   * @returns {Promise<Object|null>} Resolved database user record or null if not found
   */
  async findUserByEmail(email) {
    return prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() }
    });
  }

  /**
   * Queries user profile records by user primary UUID.
   *
   * @async
   * @param {string} userId - Target primary identifier
   * @returns {Promise<Object|null>} Resolved database user record or null if not found
   */
  async findUserById(userId) {
    return prisma.user.findUnique({
      where: { id: userId }
    });
  }

  /**
   * Persists a new user record inside the database.
   *
   * @async
   * @param {Object} userData - Insert data payload parameters
   * @returns {Promise<Object>} Created user database record
   */
  async createUser(userData) {
    return prisma.user.create({
      data: userData
    });
  }

  /**
   * Mutates user profile database attributes.
   *
   * @async
   * @param {string} userId - Target primary identifier
   * @param {Object} updates - Target fields modifications
   * @returns {Promise<Object>} Updated user database record
   */
  async updateUser(userId, updates) {
    return prisma.user.update({
      where: { id: userId },
      data: updates
    });
  }

  /**
   * Queries a paginated list of users matching status and role filters.
   *
   * @async
   * @param {Object} params - Query and pagination criteria
   * @param {number} [params.page=1] - Page number
   * @param {number} [params.limit=20] - Items per page
   * @param {string} [params.role] - Role filter
   * @param {string} [params.status] - Status filter
   * @returns {Promise<Object>} List of users and total counter metadata
   */
  async listUsers({ page = 1, limit = 20, role, status } = {}) {
    const where = {};
    if (role) where.role = role;
    if (status) where.status = status;

    const [users, totalCount] = await prisma.$transaction([
      prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count({ where })
    ]);

    return { users, totalCount };
  }
}

export default UserRepository;
