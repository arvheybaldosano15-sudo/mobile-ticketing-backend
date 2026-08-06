const KnowledgeBase = require('../models/KnowledgeBase');
const { successResponse, serverError, notFound } = require('../utils/response');

class KnowledgeBaseController {
  
  async getArticles(req, res) {
    try {
      const search = req.query.search || '';
      const categoryId = req.query.categoryId || null;
      
      // If admin/technician, they can see unpublished. Public can only see published.
      const isPublished = (req.user && req.user.role === 'admin') ? null : true;
      
      const articles = await KnowledgeBase.getAll(search, categoryId, isPublished);
      
      return successResponse(res, 200, 'Articles retrieved', articles);
    } catch (error) {
      return serverError(res, error);
    }
  }

  async getArticleById(req, res) {
    try {
      const article = await KnowledgeBase.findById(req.params.id);
      
      if (!article) {
        return notFound(res, 'Article not found');
      }

      // If public request and article not published, hide it
      if (!article.is_published && (!req.user || req.user.role !== 'admin')) {
        return notFound(res, 'Article not found');
      }

      // Increment view count asynchronously
      KnowledgeBase.incrementViewCount(req.params.id).catch(err => console.error('View count error', err));

      return successResponse(res, 200, 'Article retrieved', article);
    } catch (error) {
      return serverError(res, error);
    }
  }

  async createArticle(req, res) {
    try {
      const article = await KnowledgeBase.create(req.body, req.user.id);
      return successResponse(res, 201, 'Article created successfully', article);
    } catch (error) {
      return serverError(res, error);
    }
  }

  async getCategories(req, res) {
    try {
      const categories = await KnowledgeBase.getCategories();
      return successResponse(res, 200, 'Categories retrieved', categories);
    } catch (error) {
      return serverError(res, error);
    }
  }
}

module.exports = new KnowledgeBaseController();
