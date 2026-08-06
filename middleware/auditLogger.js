const AuditLog = require('../models/AuditLog');

const createAuditLogger = (action, entityType, idParamName = 'id') => {
  return async (req, res, next) => {
    // We want to log AFTER the response is sent successfully
    const originalSend = res.json;
    
    res.json = function(data) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        // Success response, extract entity ID from params or response body
        let entityId = req.params[idParamName];
        
        // If it's a create action, the ID will be in the response body
        if (!entityId && data.data && data.data.id) {
          entityId = data.data.id;
        }

        if (entityId) {
          const userId = req.user ? req.user.id : null;
          const ipAddress = req.ip || req.connection.remoteAddress;
          
          AuditLog.log(
            action, 
            entityType, 
            entityId, 
            req.body, // New values
            null,     // Old values (hard to get generically without a pre-hook)
            userId,
            ipAddress
          );
        }
      }
      
      return originalSend.call(this, data);
    };
    
    next();
  };
};

module.exports = {
  createAuditLogger
};
