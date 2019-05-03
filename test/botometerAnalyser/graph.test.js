const { expect } = require('chai');
const request = require('supertest');
const fs = require('fs');
const looksSame = require('looks-same');
const graph = require('../../botometerAnalyser/graph');
const app = require('../../app');

const expectedGeneratedGraphPath = './test/botometerAnalyser/fixtures/graph/expectedGraph.png';

describe('BotometerAnalyser graph', () => {
	describe('#generateFromScores', () => {
		let fileName;
		let response;
		let generatedImagePath;
		const sharesScores = [1, 1, 2, 3, 4, 5];
		const uniqueUsersScores = [1, 2, 3, 4, 5];

		before(async () => {
			fileName = await graph.generateFromScores(uniqueUsersScores, sharesScores);
			generatedImagePath = `./public/images/botometerAnalyser/${fileName}.png`;
			response = await request(app)
				.get(`/images/botometerAnalyser/${fileName}.png`);
		});

		after(() => {
			fs.unlinkSync(generatedImagePath);
		});

		it('should return a file name', () => {
			expect(fileName).to.be.a('string');
		});

		it('should make the graph available', () => {
			expect(response.status).to.equal(200);
		});

		it('should make generate the expected graph', (done) => {
			looksSame(generatedImagePath, expectedGeneratedGraphPath, (error, { equal }) => {
				if (error) {
					done(error);
				}

				expect(equal).to.be.true;
				done();
			});
		});
	});
});
