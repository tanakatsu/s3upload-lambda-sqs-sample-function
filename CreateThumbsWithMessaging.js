// dependencies
var async = require('async');
var AWS = require('aws-sdk');
var gm = require('gm').subClass({ imageMagick: true });
var util = require('util');
var path = require('path');
var inkjet = require('inkjet');

// load envirnment variables
require('dotenv').config();

// set credentials
var creds = AWS.Credentials(process.env.AWS_ACCESS_KEY_ID, process.env.AWS_SECRET_ACCESS_KEY);
AWS.config.credentials = creds;

// constants
var SQS_QUEUE_URL = process.env.SQS_QUEUE_URL;


// get reference to S3/SQS client
var s3 = new AWS.S3();
var sqs = new AWS.SQS({ region: 'ap-northeast-1' });

function getId(key) {
  return path.basename(key, '.jpg');
}

exports.handler = function(event, context) {
  // Read options from the event.
  console.log("Reading options from event:\n", util.inspect(event, {depth: 5}));

  var srcBucket = event.Records[0].s3.bucket.name;
  // Object key may have spaces or unicode non-ASCII characters.
  var srcKey = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, " ")); 
  var dstBucket = srcBucket;

  var srcKeyPrefix = srcKey.split('/')[1]; // development/image_original/1.jpg -> image_original
  var targetParams = [[256, "image_thumb_l"], [128, "image_thumb_s"]]; // pair of (size, prefix)
  targetParams = targetParams.map(function(p) { 
    p.push(srcKey.replace(srcKeyPrefix, p[1])); // (size, prefix) => (size, prefix, path)
    return p;
  });
  var dstKeys = targetParams.map(function(p) { return p[2] });
  console.log('srcKey:', srcKey);
  console.log('targetParams:', targetParams);

  // Sanity check: validate that source and destination are in different directories.
  if (targetParams.map(function(v) { return v[2].split('/')[1] }).indexOf(srcKeyPrefix) >= 0) {
    console.error("Destination key prefix must not match source key prefix.");
    return;
  }

  // Infer the image type.
  var typeMatch = srcKey.match(/\.([^.]*)$/);
  if (!typeMatch) {
    console.error('unable to infer image type for key ' + srcKey);
    return;
  }
  var imageType = typeMatch[1];
  if (imageType != "jpg") {
    console.error('skipping non-image ' + srcKey);
    return;
  }

  console.log('start');
  var imageInfo = {};
  var processStart = Date.now();

  async.waterfall([
    function download(done) {
      // Download the image from S3 into a buffer.
      console.log('download:', srcKey);
      s3.getObject({
        Bucket: srcBucket,
        Key: srcKey
      }, function(err, data) {
        console.log('downloaded');
        if (err) {
          done(err);
        } else {
          // Getting EXIF tags
          inkjet.exif(data.Body, function(err, metadata) {
            // metadata -- an object that map EXIF tags to string value
            if (err) {
              done(err);
            } else {
              console.log('EXIF tags', metadata);
              if (metadata["DateTime"]) {
                imageInfo["datetime"] = metadata["DateTime"]["value"];
              }
              done(null, data);
            }
          });
        }
      });
    },
    function resize_and_upload(response, done) {
      console.log('resize_and_upload');
      console.log("file size:", response.Body.length);

      // シリーズ実行
      async.forEachSeries(targetParams, function(targetParam, done){
        console.log('param=', targetParam);
        var targetSize = targetParam[0];
        var dstKey = targetParam[2];

        async.waterfall([
          // resize
          function transform(done) {
            console.log('resizing to', targetSize);
            gm(response.Body).size(function(err, size) {
              var scalingFactor = Math.min(targetSize / size.width, targetSize / size.height);
              var width = scalingFactor * size.width;
              var height = scalingFactor * size.height;
              imageInfo["width"] = size.width;
              imageInfo["height"] = size.height;
              imageInfo["filesize"] = response.Body.length;
              console.log("scale=", scalingFactor, "width=", width, "height=", height);

              // Transform the image buffer in memory.
              this.resize(width, height)
              .toBuffer(imageType, function(err, buffer) {
                if (err) {
                  done(err);
                } else {
                  console.log('resize done.');
                  done(null, response.ContentType, buffer);
                }
              });
            });
          },
          // upload
          function upload(contentType, data, done) {
            // Stream the transformed image to a different directory.
            console.log('uploading to', dstKey);
            s3.putObject({
              Bucket: dstBucket,
              Key: dstKey,
              Body: data,
              ContentType: contentType
            }, function(err, resp) {
              if (err) {
                console.error(err);
                done(err);
              }
              console.log("uploaded.");
              done(null, resp);
            });
          },
        ], function (err, result) {
          if (err) console.error(err);
          done();
        });
      }, function(err){
        if (err) console.error(err);
        done(null);
      });
    },
  ], function (err, result) {
    rails_env = srcKey.split('/')[0];
    processTime = Date.now() - processStart;
    processResult = {id: getId(srcKey), srcKey: srcKey, dstKeys: dstKeys, env: rails_env, image: imageInfo, processTime: processTime};
    if (err) {
      console.error(err);
      processResult["status"] = "failed";
      processResult["error"] = err;
    } else {
      processResult["status"] = "success";
    }
    console.log('processResult:', processResult);
    console.log('SQS_QUEUE_URL=', SQS_QUEUE_URL);

    var msg = {
      MessageBody: JSON.stringify(processResult),
      QueueUrl: SQS_QUEUE_URL
    };
    console.log("posting message:", msg);
    sqs.sendMessage(msg, function(err, data) {
      if (err) {
        console.error(err);
      } else {
        console.log("completed successfully");
      }
      context.done();
    });
  });
}
