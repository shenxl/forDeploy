'use strict';
var _ = require('lodash');
var loopback = require('loopback');
var LoopBackContext = require('loopback-context');

module.exports = function(CompanySn) {
  CompanySn.observe('before save', function(ctx, next) {
    const dateUpdater = ctx.instance ? ctx.instance : ctx.data;
    if (!ctx.isNewInstance) {
      dateUpdater.updated_at = new Date();

      const newItem = ctx.data;
      const oldItem = ctx.currentInstance.toJSON();

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
          return _.assign(item, {user_id, type: 'update', table_name: modelName, table_id: oldItem.id, created_at: new Date()});
        }).value();

      const OperationHistory = CompanySn.app.models.operationHistory;
      OperationHistory.create(operation, function(err, result) {
        if (err) {
          return next(err);
        } else {
          next();
        }
      });
    } else {
      dateUpdater.created_at = new Date();
      next();
    }
  });

  CompanySn.observe('after save', function(ctx, next) {
    if (ctx.isNewInstance) {
      const modelName =  ctx.Model.modelName;
      const context = LoopBackContext.getCurrentContext();
      const currentUser = context && context.get('currentUser');
      const OperationHistory = CompanySn.app.models.operationHistory;
      const user_id = (currentUser && currentUser.id) || 0;
      const newItem = ctx.instance.toJSON();
      const add = _.reduce(newItem, function(result, value, field) {
        return result.concat({field: field, new_value: newItem[field], old_value: ''});
      }, []);
      const operation = _.chain(add).
        filter((item) => { return _.indexOf(['created_at', 'updated_at', 'deleted_at'], item.field) === -1; }).
        map((item) => {
          return _.assign(item, {user_id, type: 'create', table_name: modelName, table_id: newItem.id, created_at: new Date()});
        }).value();

      OperationHistory.create(operation, function(err, result) {
        if (err) {
          return next(err);
        } else {
          next();
        }
      });
    } else {
      next();
    }
  });
};
