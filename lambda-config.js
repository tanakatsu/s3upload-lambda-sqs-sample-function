require('dotenv').config();
console.log('role=', process.env.LAMBDA_ROLE);

module.exports = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: 'ap-northeast-1',
  handler: 'CreateThumbsWithMessaging.handler', // 実行したいファイル名と同じにする
  role: process.env.LAMBDA_ROLE,
  functionName: 'CreateThumbsWithMessaging',
  timeout: 10
  // eventSource: {
  //  EventSourceArn: <event source such as kinesis ARN>,
  //  BatchSize: 200,
  //  StartingPosition: "TRIM_HORIZON"
  //}
}
