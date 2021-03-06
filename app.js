require('dotenv').config();
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');

const botometerAnalyserRouter = require('./botometerAnalyser/routes').router;
const sendToAnalysisRouter = require('./sendToAnalysis/routes');
const mediaScaleRouter = require('./mediaScale/routes');
const reverseRouter = require('./reverse/routes');

const app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/botometer/', botometerAnalyserRouter);
app.use('/sendToAnalysis/', sendToAnalysisRouter);
app.use('/media-scale/', mediaScaleRouter);
app.use('/reverse/', reverseRouter);

module.exports = app;
