const express = require('express');
const router = express.Router();
const kbController = require('../controllers/knowledgeBaseController');
const { verifyToken, requireAnyRole } = require('../middleware/auth');
const { createAuditLogger } = require('../middleware/auditLogger');

// Public routes (for customers via URL)
router.get('/', kbController.getArticles);
router.get('/categories', kbController.getCategories);
router.get('/:id', kbController.getArticleById);

// Protected routes
router.post('/', verifyToken, requireAnyRole, createAuditLogger('CREATE_KB_ARTICLE', 'KnowledgeBase'), kbController.createArticle);
// Put/Delete omitted for brevity but would follow same pattern

module.exports = router;
