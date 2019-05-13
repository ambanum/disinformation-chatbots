const config = require('config');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

const adapter = new FileSync(config.get('hooks.botometerAnalyser.dbFileName'));
const db = low(adapter);

// Set some defaults (required if your JSON file is empty)
db.defaults({ users: [] }).write();

function addUser(screenName, userId, score) {
	const alreadyExists = db.get('users').find({ userId }).value();
	if (alreadyExists) {
		db.get('users')
			.find({ userId })
			.assign({ screenName, score })
			.write();
	} else {
		db.get('users')
			.push({ userId, screenName, score })
			.write();
	}
}

function getUserById(userId) {
	return db.get('users')
		.find({ userId })
		.value();
}

module.exports = {
	addUser,
	getUserById,
};
