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

function getUserByName(screenName) {
	return db.get('users')
		.find({ screenName })
		.value();
}

function getUserById(userId) {
	return db.get('users')
		.find({ id: userId })
		.value();
}

function getUser({ screenName, userId }) {
	if (userId) {
		return getUserById(userId);
	}
	if (screenName) {
		return getUserByName(screenName);
	}
	throw new Error('Incorrect parameters');
}

module.exports = {
	addUser,
	getUserByName,
	getUserById,
	getUser,
};
