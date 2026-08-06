/**
 * Date formatting and calculation helpers
 */

// Calculate SLA deadline based on priority (if missing from DB trigger logic for some reason)
const calculateSLA = (priority, fromDate = new Date()) => {
  const date = new Date(fromDate);
  
  switch (priority.toLowerCase()) {
    case 'high':
      date.setHours(date.getHours() + 4);
      break;
    case 'medium':
      date.setHours(date.getHours() + 8);
      break;
    case 'low':
    default:
      date.setHours(date.getHours() + 24);
      break;
  }
  
  return date;
};

// Calculate elapsed time in hours
const calculateElapsedHours = (startDate, endDate = new Date()) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const diffInMs = end - start;
  return (diffInMs / (1000 * 60 * 60)).toFixed(2);
};

// Check if SLA is breached
const isSLABreached = (slaDeadline, currentDate = new Date()) => {
  const deadline = new Date(slaDeadline);
  const current = new Date(currentDate);
  
  return current > deadline;
};

// Get start and end of week/month for analytics queries
const getTimeWindowDates = (window) => {
  const end = new Date();
  const start = new Date();
  
  switch (window) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      break;
    case 'week':
      start.setDate(start.getDate() - 7);
      break;
    case 'month':
      start.setMonth(start.getMonth() - 1);
      break;
    case 'year':
      start.setFullYear(start.getFullYear() - 1);
      break;
    default:
      // Default to 30 days if unknown
      start.setDate(start.getDate() - 30);
  }
  
  return { start, end };
};

module.exports = {
  calculateSLA,
  calculateElapsedHours,
  isSLABreached,
  getTimeWindowDates
};
