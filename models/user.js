// Copyright IBM Corp. 2014,2015. All Rights Reserved.
// Node module: loopback-example-user-management
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT
'use strict';
var config = require('../../server/config.json');
var path = require('path');

module.exports = function(User) {
  User.afterRemote('create', function(context, user, next) {
    var options = {
      type: 'email',
      to: user.email,
      from: 'wpssupport@163.com',
      subject: '感谢注册 WPS 统计平台',
      template: path.resolve(__dirname, '../../server/views/verify.ejs'),
      redirect: 'http://' + config.host + ':' + config.port + '/v2/auth/verified',
      text: '请通过浏览器访问以下链接: {href} 验证邮箱 ',
      host: config.host,
      port: config.port,
      user: user,
    };

    user.verify(options, function(err, response) {
      if (err) {
        User.deleteById(user.id);
        return next(err);
      }
      context.res.statusCode = 201;
      context.res.json({
        success: true,
        message: 'verification email',
        step: 'VerificationEmail',
      });
    });
  });

  //send password reset link when requested
  User.on('resetPasswordRequest', function(info) {
    var url = 'http://' + config.host + ':' + config.port + '/reset-password';
    var html = 'Click <a href="' + url + '?access_token=' +
        info.accessToken.id + '">here</a> to reset your password';
    User.app.models.Email.send({
      to: info.email,
      from: 'wpssupport@163.com',
      subject: '重置密码',
      html: html,
    }, function(err) {
      if (err) return console.log('> error sending password reset email');
      console.log('> sending password reset email to:', info.email);
    });
  });
};
