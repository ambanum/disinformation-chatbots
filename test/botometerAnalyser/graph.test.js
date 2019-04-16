const { expect } = require('chai');
const request = require('supertest');
const graph = require('../../botometerAnalyser/graph');
const app = require('../../app');


describe('BotometerAnalyser utils', () => {
	describe('#generateFromScores', () => {
		let fileName;
		let response;

		before(async () => {
			fileName = await graph.generateFromScores([1, 3, 4], [1, 4, 4]);
			response = await request(app)
				.get(`/images/botometerAnalyser/${fileName}.png`);
		});

		it('should return a file name', () => {
			expect(fileName).to.be.a('string');
		});

		it('should make available the graph', () => {
			expect(response.status).to.equal(200);
		});
	});
});
