'use strict';

module.exports = function(Company) {
  Company.afterRemote('findOne', function(context, company, next) {
    console.log('afterRemote', company);
  });

  Company.beforeRemote('findOne', function(context, company, next) {
    console.log('beforeRemote', company);
  });
};
