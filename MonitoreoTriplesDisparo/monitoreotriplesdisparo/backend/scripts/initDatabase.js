const databaseService = require('../services/databaseService');

async function initialize() {
    try {
        await databaseService.initializeDatabase();
        console.log('✅ Base de datos lista para usar');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error inicializando base de datos:', error);
        process.exit(1);
    }
}

initialize();