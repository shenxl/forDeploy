/*eslint camelcase: ["off", { properties: "never"}]*/
/*eslint max-len: ["off"]*/
'use strict';
var _ = require('lodash');
var loopback = require('loopback');
var LoopBackContext = require('loopback-context');
var moment = require('moment');
var crypto = require('crypto');

module.exports = function(companyInstall) {
  companyInstall.observe('before save', function(ctx, next) {
    const dateUpdater = ctx.instance ? ctx.instance : ctx.data;
    if (!dateUpdater.platform) dateUpdater.platform = 'windows';
    if (!dateUpdater.hashkey) dateUpdater.hashkey = crypto.createHash('md5').
      update(`${dateUpdater.company_id};${dateUpdater.server_id};${dateUpdater.platform}`).
      digest('hex');
    if (!ctx.isNewInstance) {
      dateUpdater.updated_at = moment().format();
      const newItem = ctx.data;
      const oldItem = ctx.currentInstance;

      const diff = _.reduce(oldItem, function(result, value, field) {
        return _.isEqual(value, newItem[field]) ?
              result : result.concat({field: field, new_value: newItem[field], old_value: value});
      }, []);
      const modelName =  ctx.Model.modelName;
      const context = LoopBackContext.getCurrentContext();
      const currentUser = context && context.get('currentUser');
      const user_id = (currentUser && currentUser.id) || 0;

      const operation = _.chain(diff).
        filter((item) => { return _.indexOf(['created_at', 'updated_at', 'deleted_at'], item.field) === -1; }).
        map((item) => {
          return _.assign(item, {user_id, type: 'update', table_name: modelName, table_id: oldItem.id, created_at: moment().format()});
        }).value();

      const OperationHistory = companyInstall.app.models.operationHistory;
      OperationHistory.create(operation, function(err, result) {
        if (err) {
          return next(err);
        } else {
          next();
        }
      });
    } else {
      dateUpdater.created_at = moment().format();
      next();
    }
  });

  companyInstall.observe('after save', function(ctx, next) {
    const newItem = ctx.instance.toJSON();
    const add = _.reduce(newItem, function(result, value, field) {
      return result.concat({field: field, new_value: newItem[field], old_value: ''});
    }, []);
    const modelName =  ctx.Model.modelName;
    const context = LoopBackContext.getCurrentContext();
    const currentUser = context && context.get('currentUser');
    const user_id = (currentUser && currentUser.id) || 0;
    const table_id = `${newItem.hashkey}`;
    let type = 'create';
    if (!ctx.isNewInstance) {
      type = 'update';
    }
    const operation = _.chain(add).
      filter((item) => { return _.indexOf(['created_at', 'updated_at', 'deleted_at'], item.field) === -1; }).
      map((item) => {
        return _.assign(item, {user_id, type, table_name: modelName, table_id, created_at: new Date()});
      }).value();

    const OperationHistory = companyInstall.app.models.operationHistory;
    OperationHistory.create(operation, function(err, result) {
      if (err) {
        return next(err);
      } else {
        next();
      }
    });
  });
};
