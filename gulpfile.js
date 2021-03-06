var gulp = require('gulp');
var zip = require('gulp-zip');
var replace = require('gulp-replace');
var del = require('del');
var install = require('gulp-install');
var runSequence = require('run-sequence');
var awsLambda = require('node-aws-lambda');
require('date-utils');

var mainJsFile = 'CreateThumbsWithMessaging.js'; // Lambdaファンクションの本体
var dotEnvFile = '.env';

// distディレクトリのクリーンアップと作成済みのdist.zipの削除
gulp.task('clean', function() {
  return del(['./dist', './dist.zip']);
});
 
// AWS Lambdaファンクション本体(index.jsなど)をdistディレクトリにコピー
gulp.task('js', function() {
  return gulp.src(mainJsFile)
    .pipe(gulp.dest('dist/'));
});

// .envファイルをdistディレクトリにコピー
gulp.task('dotenv', function() {
  // デプロイ日時を環境変数に追加
  var dt = new Date();
  var deployed_at = 'DEPLOYED_AT=' + dt.toFormat("YYYY/MM/DD HH24:MI:SS");

  return gulp.src(dotEnvFile)
    .pipe(replace(/DEPLOYED_AT=.*/, deployed_at))
    .pipe(gulp.dest('dist/'));
});
 
// AWS Lambdaファンクションのデプロイメントパッケージ(ZIPファイル)に含めるnode.jsパッケージをdistディレクトリにインストール
// ({production: true} を指定して、開発用のパッケージを除いてインストールを実施)
gulp.task('node-mods', function() {
  return gulp.src('./package.json')
    .pipe(gulp.dest('dist/'))
    .pipe(install({production: true}));
});
 
// デプロイメントパッケージの作成(distディレクトリをZIP化)
gulp.task('zip', function() {
  return gulp.src(['dist/**/*', '!dist/package.json', 'dist/.env'])
    .pipe(zip('dist.zip'))
    .pipe(gulp.dest('./'));
});
 
// AWS Lambdaファンクションの登録(ZIPファイルのアップロード)
// (既にFunctionが登録済みの場合はFunctionの内容を更新)
gulp.task('upload', function(callback) {
  awsLambda.deploy('./dist.zip', require("./lambda-config.js"), callback);
});
 
gulp.task('deploy', function(callback) {
  return runSequence(
    ['clean'],
    ['js', 'dotenv', 'node-mods'],
    ['zip'],
    ['upload'],
    callback
  );
});
