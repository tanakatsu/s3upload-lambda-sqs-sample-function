var AWS = require('aws-sdk');
var sqs = new AWS.SQS({region: 'ap-northeast-1'});
var SQS_QUEUE_URL = process.env.SQS_QUEUE_URL;

require('dotenv').config();
var creds = AWS.Credentials(process.env.AWS_ACCESS_KEY_ID, process.env.AWS_SECRET_ACCESS_KEY);
AWS.config.credentials = creds;

exports.handler = function(event, context) {
  var body = "hello";
  var params = {
    MessageBody: body, //string
    QueueUrl: SQS_QUEUE_URL
  };


  console.log("sending message: " + body);
  sqs.sendMessage(params, function (err, data) {
    //callback処理
    if (err) {
      console.error(err);
    } else {
      console.log("sent successfully");
    }
    context.done();
  });
}
