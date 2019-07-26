var jsonexport    = require('jsonexport');
var express       = require('express');
var bodyParser    = require('body-parser');
var app           = express();
var server        = require('http').Server(app);
var _             = require('lodash');
var Promise       = require('bluebird');
var fs            = require('fs');
var request       = Promise.promisify(require('request'));
var timezone      = require("moment-timezone");

//Environment where you want to pull the data.
var environment   = "bots.kore.ai";

// Organisation ID
var orgId         = "o-6823c711-49dd-57eb-bf52-fb8afacb00c8";

// Authorization token
var token         = "yvccKgXM1KfMtqQbnULWLgC1pr2SOqjXEIw_bszGPsmVhW9vWLbf76YFHBZBBOOY";

// From date in GMT
var fromDate      = "2018-03-19T10:47:18.285Z";

//To date in GMT
var toDate        = "2018-03-20T10:47:18.285Z";

// Admin user ID
var adminUserId   = "u-35571253-7c6a-5353-a61c-454fbeb604c7";
     
/*var environment = "bots.kore.ai";
 var orgId       = "o-f92008eb-b1c3-5e70-a24e-afdab80f8baa";
 var token       = "qBf2nzmu4HEieBGj-r-ELkJMvuLG1JPB_jCpB5rNu5-FsPjYWfz1KznvcDDduQl5";//"M1j4pk8RV3Lzy-DkY7NULWaKTES-iC3hHLrP2erXy41bdXAh0JRsvRDJ39fxeMX8";
 var fromDate    = "2017-12-04T15:30:00.000Z";
 var toDate      = "2017-12-04T23:59:00.000Z";*/


app.use(bodyParser.json());


app.get('/chatHistory',function(req,res){

var head = {
//accept: 'application/json',
    'content-type': 'application/x-www-form-urlencoded;',
    authorization: 'Basic Y2hhdGJvdDpDaGF0Ym90QDEyMzpsb3JlYWwxMjM='
};

var body = {"grant_type":"urn:demandware:params:oauth:grant-type:client-id:dwsid:dwsecuretoken"}


    var options = {
        method: 'POST',
        url: 'https://dev20-canada-loreal.demandware.net/dw/oauth2/access_token?client_id=ab69630b-61e3-4278-932a-cb670c4439e2',
        headers: head,
        form: body
    };
    
    request(options, function (error, response, body) {
        if(typeof body === "string"){
            body = JSON.parse(body);
        }

        if (!body || (body && body.total === 0)) {
            res.send("No records found");
        } else if (body.errors) {
            res.send(body);
        } else {
		res.send(body);		
	}

	});
});

server.listen(5252,function(){
    console.log('server started on port 5252');
});
