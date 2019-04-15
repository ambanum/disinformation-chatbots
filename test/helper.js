const fs = require('fs');
const config = require('config');

after((done) => {
	// Ensure removing test cache file
	if (fs.existsSync(config.get('hooks.botometerAnalyser.dbFileName'))) {
		fs.unlinkSync(config.get('hooks.botometerAnalyser.dbFileName'));
	}
});
