const config = require('config');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

const adapter = new FileSync(config.get('hooks.botometerAnalyser.dbFileName'));
const db = low(adapter);

// Set some defaults (required if your JSON file is empty)
db.defaults({ users: {} }).write();

function addUserScore(userName, score) {
	db.set(`users.${userName}.score`, score).write();
}

function getUserScore(userName) {
	return db.get(`users.${userName}.score`).value();
}

module.exports = {
	addUserScore,
	getUserScore,
};
