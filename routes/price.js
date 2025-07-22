var mcache = require('memory-cache');
var express = require('express');
var router = express.Router();

router.get('/', async function(req, res, next) {

    // check cache
    let key = '__express__' + req.originalUrl || req.url;
    let cachedBody = mcache.get(key);
    var currency = req.query.currency;
    var source = req.query.source;
    var apikey = req.query.apikey;
    var crypto = req.query.crypto || 'btc';
    if (cachedBody) {
        console.log(`Cache hit: ${cachedBody}`);
        res.send(cachedBody);
    } else {

        var url = '';
        var headers = {};

        switch (source) {
            case 'coinbase':
                url = 'https://api.coinbase.com/v2/prices/' + crypto + '-' + currency + '/spot';
                break;
            case 'coinmarketcap':
                url = 'https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=' + crypto.toUpperCase() + '&convert=' + currency;
                headers = {'X-CMC_PRO_API_KEY': apikey || '842053ca-84bd-4d71-9658-9d309edd3b43'};
                break;
            case 'coingecko':
                url = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=' + currency;
                break;
            case 'kraken':
                var krakenCrypto = crypto.toUpperCase() == "BTC" ? "XBT" : "ETH";
                url = 'https://api.kraken.com/0/public/Ticker?pair=' + krakenCrypto + currency;
                break;
            case 'bitstamp':
                url = 'https://www.bitstamp.net/api/v2/ticker/' + crypto.toLowerCase() + currency.toLowerCase();
                break;
            default:
                break;
        }

        var options = {
            headers: headers
        }

        try {
            const response = await fetch(url, options);
            if (response.ok) {
                const jsonBody = await response.json();
                var btcPrice = 0;
                switch (source) {
                    case 'coinbase':
                        btcPrice = jsonBody.data.amount;
                        break;
                    case 'coinmarketcap':
                        btcPrice = jsonBody.data[crypto.toUpperCase()].quote[currency.toUpperCase()].price;
                        break;
                    case 'bitstamp':
                        btcPrice = jsonBody.last;
                        break;
                    case 'kraken':
                        var krakenCrypto = crypto.toUpperCase() == "BTC" ? "XBT" : "ETH";
                        btcPrice = jsonBody.result[`X${krakenCrypto}Z${currency.toUpperCase()}`].c[0];
                        break;
                    case 'coingecko':
                        var geckoCrypto = crypto.toUpperCase() == "BTC" ? "bitcoin" : "ethereum";
                        btcPrice = jsonBody[geckoCrypto][currency.toLowerCase()];
                        break;
                    default:
                        break;
                }
                
                var formattedResponse = {price: Math.round(btcPrice * 100) / 100};
                var cacheTime = source === 'coinmarketcap' ? 1 * 60 * 1000 : 5 * 1000; // 1 minute for coinmarketcap, 5 seconds everything else
                mcache.put(key, formattedResponse, cacheTime);
                console.debug(`Cache Miss`);
                res.send(formattedResponse);
            } else {
                console.error(`Error fetching data from ${source}:`, response.statusText);
                res.status(response.status).send({error: 'Failed to fetch data from source'});
            }
            
        } catch (error) {
            console.error('Error constructing request options:', error);
            res.status(500).send({error: 'Internal server error'});
            return;
        }
    }

});

module.exports = router;
