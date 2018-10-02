var request = require('request');
var mcache = require('memory-cache');
var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {

    // check cache
    let key = '__express__' + req.originalUrl || req.url;
    let cachedBody = mcache.get(key);
    if (cachedBody) {
        res.send(cachedBody);
    } else {
        var currency = req.query.currency;
        var source = req.query.source;
        var url = '';
        var headers = {};
        if (source === 'coinbase') {
            url = 'https://api.coinbase.com/v2/prices/BTC-' + currency + '/spot';
        } else {
            url = 'https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=BTC&convert=' + currency;
            headers = {'X-CMC_PRO_API_KEY': '842053ca-84bd-4d71-9658-9d309edd3b43'};
        }

        var options = {
            url: url,
            headers: headers
        }
        request(options, function(error, response, body) {
            if (!error && response.statusCode === 200) {
                var btcPrice = 0;
                if (source === 'coinbase') {
                    btcPrice = JSON.parse(body).data.amount;
                } else {
                    btcPrice = JSON.parse(body).data.BTC.quote[currency].price;
                }
                
                var formattedResponse = {price: Math.round(btcPrice * 100) / 100};
                // mcache.put(key, formattedResponse, 5 * 60 * 1000);
                res.send(formattedResponse);
            } else {
                res.status(500).send({error: 'Error with API :('});
            }
        });
    }

});

module.exports = router;
