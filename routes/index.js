var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/botometer', function(req, res, next) {
  res.json({
    "response_type": "in_channel", 
    "text": `
      ---
      #### Weather in Toronto, Ontario for the Week of February 16th, 2016
      
      | Day                 | Description                      | High   | Low    |
      |:--------------------|:---------------------------------|:-------|:-------|
      | Monday, Feb. 15     | Cloudy with a chance of flurries | 3 °C   | -12 °C |
      | Tuesday, Feb. 16    | Sunny                            | 4 °C   | -8 °C  |
      | Wednesday, Feb. 17  | Partly cloudly                   | 4 °C   | -14 °C |
      | Thursday, Feb. 18   | Cloudy with a chance of rain     | 2 °C   | -13 °C |
      | Friday, Feb. 19     | Overcast                         | 5 °C   | -7 °C  |
      | Saturday, Feb. 20   | Sunny with cloudy patches        | 7 °C   | -4 °C  |
      | Sunday, Feb. 21     | Partly cloudy                    | 6 °C   | -9 °C  |
      ---`
  });
});

module.exports = router;
