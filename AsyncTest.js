var async = require('async');

exports.handler = function(event, context) {
  console.log('start');

  var userlist = [
    {name:'Mike'},
    {name:'John'},
    {name:'Marry'}
  ];

  async.auto({
    getdata: [
      function (done) {
        console.log('getdata');
        done(null, 'func1');
        //done('error in func1', 'func1');
      }
    ],
    makefolder: [
      function (done) {
        console.log('makefolder');
        // シリーズ実行
        async.forEachSeries(userlist, function(item, done){
          console.log('helo ' + item.name);

          async.waterfall([
            function func1(done) {
              done(null, 'waterfall val1');
            },
            function func2(val, done) {
              console.log('func2.val=' + val);
              done(null, 'waterfall val2');
            },
            function func3(val, done) {
              console.log('func3.val=' + val);
              done(null, 'waterfall val3');
            },
          ], function (err, result) {
            if (err) console.error(err);
            else console.log('result=' + result);
            done();
          });
          //done();
        }, function(err){
          if (err) console.error(err);
          done(null, 'func2');
        });
        //done(null, 'func2');
      }
    ],
    makedatafile: ['getdata', 'makefolder',
      function (done) {
        console.log('makedatafile');
        done(null, 'func3');
      }
    ],
    sendmail: ['makedatafile',
      function (done) {
        console.log('sendmail');
        done(null, 'func4');
      }
    ],
  }, function (err, result) {
    if (err) console.error(err);
    else console.log(result);

    setTimeout(function() {
      console.log("finished");
      context.done();
    }, 100);
    console.log("almost finished");
  });
}
