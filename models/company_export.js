'use strict';
var _ = require('lodash');

module.exports = function(CompanyViewer) {
  CompanyViewer.afterRemote('findOne', function(context, company, next) {
    console.log('afterRemote', company);
  });

  CompanyViewer.beforeRemote('findOne', function(context, company, next) {
    console.log('beforeRemote', company);
  });
};
