var jsonexport = require('jsonexport');
var express = require('express');
var bodyParser = require('body-parser');
var app = express();
var server = require('http').Server(app);
var _ = require('lodash');
var Promise = require('bluebird');
var fs = require('fs');
var request = Promise.promisify(require('request'));
var timezone = require("moment-timezone");

//Environment where you want to pull the data.
var environment = "bots.kore.ai";

// Organisation ID
var orgId = "o-47e7833a-466d-540f-9aeb-5deffb05e109";

// Authorization token
var token = "m-NpLo8kdykP5rfwstQhFAM0LqM6ZpwE7iRcbMG_wcJ3NrBtON-FPAZJNHJvYgN5";

// From date in GMT
var fromDate = "2018-05-24T07:00:00.000Z";

//To date in GMT
var toDate = "2018-05-25T06:59:59.000Z";

// Stream Ids seperated by comma.
var body = '{"streamIds":["st-937faec9-6ce5-507f-be78-4b55b6a1e6c7"]}';

// Admin user ID
var adminUserId = "u-c87e05e7-6bbb-5f55-8ee4-13d6c33e4a15";

/*var environment = "bots.kore.ai";
 var orgId       = "o-f92008eb-b1c3-5e70-a24e-afdab80f8baa";
 var token       = "qBf2nzmu4HEieBGj-r-ELkJMvuLG1JPB_jCpB5rNu5-FsPjYWfz1KznvcDDduQl5";//"M1j4pk8RV3Lzy-DkY7NULWaKTES-iC3hHLrP2erXy41bdXAh0JRsvRDJ39fxeMX8";
 var fromDate    = "2017-12-04T15:30:00.000Z";
 var toDate      = "2017-12-04T23:59:00.000Z";*/

var head = {
    accept: 'application/json',
    'content-type': 'application/json;charset=UTF-8',
    authorization: 'bearer ' + token,
    'requester-type': 'admin',
    origin: 'https://bots.kore.ai',
    accountid: '5a0d69abc012ba9c6bcf7c6c'
};

app.use(bodyParser.json());


app.get('/chatHistory', function (req, res) {
    var options = {
        method: 'POST',
        url: 'https://' + environment + '/api/1.1/organization/' + orgId + '/botChatHistory',
        qs:
            {
                from: fromDate,
                to: toDate,
                skip: 0,
                limit: 1000
            },
        headers: head,
        body: body
    };

    console.info("options are : " + JSON.stringify(options));
    request(options, function (error, response, body) {
        if (typeof body === "string") {
            body = JSON.parse(body);

        }

        if (!body || (body && body.total === 0)) {
            res.send("No records found");
        } else if (body.errors) {
            res.send(body);
        }

        console.info("response: " + JSON.stringify(body));
        //var userIds = _.uniqBy(body.result, 'userId');
        //console.info("userId is size"+ userIds.size);
        var chatHistoryP = Promise.map(body.result, function (user) {

            //console.info("userId is: " + user.userId +" size"+ user.size);
            var options1 = {
                method: 'GET',
                url: 'https://' + environment + '/api/1.1/users/' + adminUserId + '/builder/streams/' + user.streamId + '/kora/logs',
                //url: 'https://'+environment+'/api/1.1/users/u-32234de9-5b5a-5554-a3e3-ba8d51862ff9/builder/streams/'+user.streamId+'/kora/logs',
                qs:
                    {
                        userId: user.userId,
                        from: fromDate,
                        to: toDate
                    },
                headers: head
            };
            return new Promise(function (resolve, reject) {
                request(options1).then(function (resp) {

                    if (!resp.body) {
                        res.send("No records found");
                    } else if (!(JSON.parse(resp.body).koralogs) || JSON.parse(resp.body).errors) {
                        res.send(resp.body);
                        //reject(resp.body);
                    }
                    var log = JSON.parse(resp.body).koralogs;

                    // console.info("logs data: " + JSON.stringify(log));
                    if (log && log.length > 0) {
                        log.sort(function (a, b) {
                            return new Date(a.createdOn).getTime() - new Date(b.createdOn).getTime();
                        })
                    }
                    var chats = [];


                    //var messageChatArray= {};
                    for (var y in log) {
                        var messageChatObj = {};
                        var msg = (log[y].components[0]) ? log[y].components[0].data.text : "No Message recorded";
                        var obj = {};
                        obj.type = log[y].type;
                        //obj.botId  = log[y].botId;
                        obj.userId = user.userId;
                        //obj.timeStamp  = timezone(log[y].createdOn).utcOffset(330).format('YYYY-MM-DDTHH:mm:ss')+' IST';
                        obj.timeStamp = timezone(log[y].createdOn).utcOffset('-0500').format('YYYY-MM-DDTHH:mm:ss') + ' EST';
                        obj.channel = log[y].channels[0].type;
                        obj.message = msg ? msg.trim() : "";

                        if (log[y].components[0] && log[y].components[0].data.text) {
                            chats.push(obj);
                        }

                    }

                    resolve(chats);
                });
            });
        })

        chatHistoryP.then(function (results) {
            if (error) {
                res.send(error);
            }

            //console.info(JSON.stringify(results));
            var hisArray = [];
            results.forEach(function (k) {
                var history = {};
                k.forEach(function (r) {
                    let mes = [];
                    if (history.userId == r.userId) {
                        mes = history.message;
                        mes.push(getString(r.message, r.type));
                        history.message = mes;
                        history.endTimeStamp = r.timeStamp;
                    } else {
                        mes.push(getString(r.message, r.type));
                        history.message = mes;
                        history.userId = r.userId;
                        history.startTime = r.timeStamp;
                    }
                });
                hisArray.push(history);
            });

            var temArray = [];
            hisArray.forEach(function (value) {
                if (value.message) {
                    value.message = value.message.join(" ");
                    temArray.push(value);
                }
            });

            console.info(JSON.stringify(temArray));
            jsonexport(temArray, function (err, csv) {
                if (err) return console.log(err);
                //console.log("Downloading CSV file: " + results);

                fs.writeFileSync("report.csv", csv);
                res.download("report.csv");
            });
        })
    });

});


function getString(messages, type) {
    //console.info("message: " + messages);
    var str = "";
    if (IsJsonString(messages) && isNaN(messages)) {
        var template = JSON.parse(messages);
        if (template && template.payload &&template.payload.template_type === "button") {
            str = str + "Bot: " + template.payload.text + "\n";
            template.payload.buttons.forEach(function (button) {
                str = str + " " + button.title + "\n";
            });
        } else if (template && template.payload && template.payload.template_type === "live_agent") {
            str = str + "Bot: " + template.payload.text + "\n";
        } else {
        }
        str = str + "\n";
    } else {
        if (type === "incoming") {
            str = str + "Visitor: " + messages + "\n\n";
        } else if (type === "outgoing") {
            str = str + "Bot: " + messages + "\n\n";
        }
    }
    return str;
}

function IsJsonString(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}

server.listen(5252, function () {
    console.log('server started on port 5252');
});
