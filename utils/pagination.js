/**
 * Pagination helper
 * @param {Object} req - Express request object
 * @param {number} defaultLimit - Default items per page
 * @returns {Object} { limit, offset, page }
 */
const getPagination = (req, defaultLimit = 10) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || defaultLimit;
  
  // Ensure positive numbers
  const safePage = page > 0 ? page : 1;
  const safeLimit = limit > 0 ? limit : defaultLimit;
  
  const offset = (safePage - 1) * safeLimit;
  
  return { limit: safeLimit, offset, page: safePage };
};

/**
 * Format paginated response
 * @param {Array} data - Data array for current page
 * @param {number} totalCount - Total number of items
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @returns {Object} Paginated data object
 */
const formatPaginatedResponse = (data, totalCount, page, limit) => {
  const totalPages = Math.ceil(totalCount / limit);
  
  return {
    items: data,
    meta: {
      totalItems: parseInt(totalCount, 10),
      itemsPerPage: limit,
      currentPage: page,
      totalPages: totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    }
  };
};

module.exports = {
  getPagination,
  formatPaginatedResponse
};
