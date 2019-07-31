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
var environment = "botbuilder.consumerna.citigroup.net";
// Organisation ID
var orgId = "o-cb2456bb-e157-5b21-93a6-7c40dc591e25";
// Authorization token
var token = "rFLJlJ9PQmoEFoKEkgGt7MVeeV6OxyBV5LBV3wNd4B6rPsLgi1CmkLezQ4cstO6h";
// From date in GMT
var fromDate = "2019-07-25T12:00:00.000Z";
//To date in GMT
var toDate = "2019-07-29T12:00:00.000Z";
// Stream Ids seperated by comma.
var body = '{"streamIds":["st-e545489f-97f1-528b-baf1-f9a36517d9ee"]}';
// Admin user ID
var adminUserId = "u-600fb8c8-6be5-5dc6-8eb1-31fa3f0ffafe";
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
    accountid: '5be71ed9ee788c42c5817657'
};
app.use(bodyParser.json());

function getHistory() {
    var options = {
        method: 'POST',
        url: 'https://' + environment + '/api/1.1/organization/' + orgId + '/botChatHistory',
        qs: {
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
        console.log(error);
        if (typeof body === "string") {
            body = JSON.parse(body);
        }
        if (!body || (body && body.total === 0)) {
            console.log("No records");
        } else if (body.errors) {
            console.log("No records");
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
                qs: {
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
                console.log("No records", error)
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
                fs.writeFileSync("history.csv", csv);
                console.log("download the history");
            });
        })
    });
}

function getString(messages, type) {
    //console.info("message: " + messages);
    var str = "";
    if (IsJsonString(messages) && isNaN(messages)) {
        var template = JSON.parse(messages);
        if (template && template.payload && template.payload.template_type === "button") {
            str = str + "Bot: " + template.payload.text + "\n";
            template.payload.buttons.forEach(function (button) {
                str = str + " " + button.title + "\n";
            });
        } else if (template && template.payload && template.payload.template_type === "live_agent") {
            str = str + "Bot: " + template.payload.text + "\n";
        } else {}
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

getHistory();