var express = require('express');
var session = require('express-session');
var router = express.Router();
var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
var fs = require('fs');
//var MemoryStream = require('memory-stream');
var multer = require('multer');
var request = require('request');

var Schema = mongoose.schema;

var conn = mongoose.connection;

mongoose.connect('mongodb://localhost:27017/data');

var Grid = require('gridfs-stream');

Grid.mongo = mongoose.mongo;

var gfs = Grid(conn.db);

var gridFs = require('./gridFs');
var customMongoose = require('./mongoose');

//router.use('/gridFs', gridFs);

var upload = multer({des: "./uploads"});
conn.once('open', function () {

  //customMongoose.signUpUser('tjdudwlsdl', '1234');

});

//url로부터 이미지를 다운로드한 뒤 디비에 넣고 다시 로컬파일 삭제
//imgProcess 함수는 gridFs에 들어갔음
/*
var imgProcess = function(url, filename, callback){
  gridFs.downloadImageFromUrl(url, filename, function () {
    gridFs.WriteFile("./"+filename, filename, gfs, function () {
      console.log('unlink start');
      fs.unlink(filename, function (err) {
        if(err) console.log(err);
        console.log('unlink done well');
      });
    });
  });
};
*/

/* GET home page. */
router.get('/', function(req, res, next) {

  // 이미지를 저장할 때
  // 1. db에 저장
  //gridFs.imgProcess('http://cfile25.uf.tistory.com/image/244B354651DF67ED33F603', 'final2.jpg', gfs);
  //res.send('TEST');

  //2. db에 있는 것을 불러온다.

  gridFs.ReturnImageSource('final2.jpg', gfs, function (img) {
    res.render('index', {title: 'gridFs', img: img});
  });

});

/*get test -> to be in main*/
router.get('/test', function(req, res) {
  console.log(req.session);
    if (req.session.logined) { //has logined
        res.render('main', {
            userName: req.session.userId
        });
    } else {
        res.render('main', {
            userName: ''
        });
    }
});

router.post('/checkDUP',function(req,res){
  var id = req.body.id;
  customMongoose.checkDuplicatedID(id,function(users){
    res.writeHead(200, {
        'Content-Type': 'text/plain'
    });
    if (users.length > 0) {
        res.end('DUP');
    } else {
        res.end('VALID');
    }
  });
});

router.get('/signUp',function(req,res){
  if (req.session.logined) { //has logined
      res.render('join', {
          userName: req.session.userId
      });
  } else {
      res.render('join', {
          userName: ''
      });
  }
});
router.post('/signUp',function(req,res){
  var id = req.body.id;
  var pw = req.body.password;
  var materials= req.body.materials;

  console.log('post signup');
  customMongoose.signUpUser(id,pw,materials,function(err){
    if (err){
    res.writeHead(500, {
        'Content-Type': 'text/plain'
    });
    res.end('ERROR');
  }else{
    console.log('new user registered');
    res.writeHead(200, {
        'Content-Type': 'text/plain'
    });
    res.end('SUCCESS');
  }
  });
});
/*log in by jodongmin*/
router.post('/login', function(req, res) {
  var id = req.body.id;
  var pw = req.body.password;
  console.log('----------------------login-------------------------');
  customMongoose.login(id,pw,function(user){
    if (user.length>0) {
        /*login success, set session*/
        req.session.regenerate(function() {
            req.session.logined = true;
            req.session.userId = user[0].userId;
            res.redirect('/test');
        });
    }
    else{
      res.redirect('/loginFail');
    }
  });
});

/*log out by jodongmin*/
router.post('/logout', function(req, res) {
  req.session.destroy(function(err){
    if(err) console.error('err',err);
    res.redirect('/test');
  });
});

//레시피 입력 페이지
router.get('/recipe-insert', function(req, res, next){
  var userId = req.session.userId
  res.render('createrecipe', {userId: userId});
});

//레시피 입력 페이지에서 서브밋 하면 여기로 온다
//재료 입력 추가
router.post('/recipe-inserted', function(req, res, next){
  var userId = req.body.userId;
  var recipeName = req.body.recipeName;
  var recipe = req.body.recipe;
  var imageURL = req.body.image;
  var materals = req.body.materials;

  var mAry = materals.split(',');


  customMongoose.uploadRecipe('tjdudwlsdl', recipeName, recipe, mAry, imageURL, gfs, function (id) {

    res.redirect('/recipe/'+id);
    //res.render('detailrecipe', {});
    //res.send('well done id: ' +id);
  })
});

//이제 이건 테스트용으로만
//나중에 지우자
router.get('/recipe-detail', function (req, res, next) {
  var name = '엄청맛있는거';
  var id = 'tjdudwlsdl';
  var date = 'now';
  var url = 'http://cfile9.uf.tistory.com/image/227A6E3553A823C724F802';
  var recommend = 77;
  var material = '이거랑, 저거랑, 이것도';
  var recipe = '이러저러하게 만들자';
  var commentID = 'tjdudwlsdl';
  var commentDate = 'now';
  var comment = '블라블라블라';

  res.render('detailrecipe', {recipeName: name, id: id, date: date, url: url,
    recommend: recommend, material: material, recipe: recipe, commentID: commentID,
    commentDate: commentDate, comment: comment});
});


//recipe 정보 보기
//레시피의 오브젝트아이디를 주소창에 치면 된다.->다른 페이지에서도 응용
//레시피 삭제 구현 필요
//레시피 댓글 구현 필요
router.get('/recipe/:id', function (req, res, next) {
  //res.send('this is '+req.params.id);
  var recipeId = req.params.id;
  console.log('param id: '+recipeId);

  var doc = customMongoose.findDocByID(recipeId, function (recipe) {
    /*res.render('detailrecipe', {recipeName: recipe.recipeName, id: recipe.userId, date: recipe.date,
     url: recipe.image, recommend: recipe.recommend, material: recipe.material,
     recipe: recipe.recipe, comment: recipe.comment});*/
    res.render('detailrecipe', {doc: recipe});
  });


});

module.exports = router;
