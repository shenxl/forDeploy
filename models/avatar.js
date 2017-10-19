'use strict';
var crypto = require('crypto');
var CONTAINERS_URL = '/api/containers/';
module.exports = function(Avatar) {
  Avatar.upload = function(ctx, options, cb) {
    if (!options) options = {};
    ctx.req.params.container = 'avatar';
    Avatar.app.models.container.upload(ctx.req, ctx.result, options, function(err, fileObj) {
      if (err) {
        cb(err);
      } else {
        var fileInfo = fileObj.files.file[0];
        // File.create({
        //   name: fileInfo.name,
        //   type: fileInfo.type,
        //   container: fileInfo.container,
        //   url: CONTAINERS_URL + fileInfo.container + '/download/' + fileInfo.name,
        // }, function(err, obj) {
        //   if (err !== null) {
        //     cb(err);
        //   } else {
        //     cb(null, obj);
        //   }
        // });
      }
    });
  };

  Avatar.testMd5 = function(ctx, options, cb) {
    if (!options) options = {};
    var md5 = crypto.createHash('md5').update('9187;99;2016;10;windows').digest('hex');
    var md5_1 = crypto.createHash('md5').update('17235;99;2016;9;windows').digest('hex');
    var md5_2 = crypto.createHash('md5').update('15440;99;2016;11;windows').digest('hex');
    var md5_3 = crypto.createHash('md5').update('8461;99;2016;8;windows').digest('hex');
    var test1 = crypto.createHash('md5').update('message').digest('hex');
    console.log(md5, md5_1, md5_2, md5_3);
    console.log(test1);
  };

  Avatar.remoteMethod(
        'testMd5',
    {
      description: '测试MD5',
      accepts: [
                {arg: 'ctx', type: 'object', http: {source: 'context'}},
                {arg: 'options', type: 'object', http: {source: 'query'}},
      ],
      returns: {
        arg: 'fileObject', type: 'object', root: true,
      },
      http: {verb: 'get'},
    }
    );

  Avatar.remoteMethod(
        'upload',
    {
      description: 'Uploads a avatar ',
      accepts: [
                {arg: 'ctx', type: 'object', http: {source: 'context'}},
                {arg: 'options', type: 'object', http: {source: 'query'}},
      ],
      returns: {
        arg: 'fileObject', type: 'object', root: true,
      },
      http: {verb: 'post'},
    }
    );
};
