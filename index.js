const app = require('./src/app');
const sequelize = require('./src/config/database');
const TokenService = require('./src/auth/TokenService');
const logger = require('./src/shared/logger');
sequelize.sync();

logger.error('error 1');
logger.warn('warn 2');
logger.info('info 3');
logger.verbose('verbose 4');
logger.debug('debug 5');
logger.silly('silly 6');

TokenService.scheduledCleanup();

app.listen(3000, () => logger.info('app is running!'));
