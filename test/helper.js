const fs = require('fs');
const config = require('config');
const redis = require('redis');

const client = redis.createClient();

before((done) => {
	client.select(1, done);
});

after((done) => {
	// Ensure removing test cache file
	if (fs.existsSync(config.get('hooks.botometerAnalyser.dbFileName'))) {
		fs.unlinkSync(config.get('hooks.botometerAnalyser.dbFileName'));
	}

	// Empty redis test database
	client.flushdb(done);
});
