const config = require('config');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

const adapter = new FileSync(config.get('hooks.botometerAnalyser.dbFileName'));
const db = low(adapter);

// Set some defaults (required if your JSON file is empty)
db.defaults({ users: [] }).write();

function addUser(screenName, id, score) {
	const alreadyExists = db.get('users').find({ id }).value();
	if (alreadyExists) {
		db.get('users')
			.find({ id })
			.assign({ screenName, score })
			.write();
	} else {
		db.get('users')
			.push({ id, screenName, score })
			.write();
	}
}

function getUserById(userId) {
	return db.get('users')
		.find({ id: userId })
		.value();
}

module.exports = {
	addUser,
	getUserById,
};
