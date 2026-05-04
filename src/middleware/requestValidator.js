const logger = require('../utils/logger');

const requestValidator = (req, res, next) => {
    logger.debug(`${req.method} ${req.path}`);

    if (['POST', 'PUT'].includes(req.method)) {
        const contentType = req.headers['content-type'];

        if (!contentType || !contentType.includes('application/json')) {
            return res.status(400).json({
                error: 'Content-Type must be application/json'
            });
        }
    }

    next();
};

module.exports = requestValidator;