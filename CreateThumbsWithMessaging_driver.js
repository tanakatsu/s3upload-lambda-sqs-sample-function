require('dotenv').config();
console.log('bucket=', process.env.S3_BUCKET);

//YOUR DATA TO BE PASSED TO LAMBDA FUNCTION.
var event = {  
   "Records":[  
      {  
         "s3":{  
            "bucket":{  
               "name": process.env.S3_BUCKET,
            },
            "object":{  
               "key":"development/image_original/lena.jpg"
            }
         }
      }
   ]
};

//BUILD STAB OF context OBJECT.
var context = {
  invokeid: 'invokeid',
  done: function(err, message){
    return;
  }
};


//RUN YOUR HANDLER
//var lambda = require("./SqsTest.js");
//var lambda = require("./AsyncTest.js");
var lambda = require("./CreateThumbsWithMessaging.js");
lambda.handler(event, context);
