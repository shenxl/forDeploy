'use strict';
var _ = require('lodash');

module.exports = function(companyMonthlyReport) {
  companyMonthlyReport.data = (ctx, filter, cb) => {
    const options = _.assign({}, filter, {fields: ['server_id', 'year', 'month', 'activity_sum', 'activity_avg', 'install_sum']});
    companyMonthlyReport.find(options).then((monthly) => {
      const result = _.chain(monthly).map((item) => {
        return _.assign({}, item.toJSON(), {
          key: `${item.server_id}-${item.year}-${item.month}`,
        });
      }).groupBy('key').map((keyItem) => {
        if (keyItem.length > 0) {
          const result = {
            server_id: keyItem[0].server_id,
            year: keyItem[0].year,
            month: keyItem[0].month,
          };
          const data =  _.reduce(keyItem, (init, item) => {
            return {
              activity_sum: init.activity_sum + item.activity_sum,
              activity_avg: init.activity_avg + item.activity_avg,
              install_sum: init.install_sum + item.install_sum,
            };
          }, {
            activity_sum: 0,
            activity_avg: 0,
            install_sum: 0,
          });
          return  _.assign({}, result, data);
        }
      }).value();

      ctx.res.statusCode = 201;
      ctx.res.json({
        success: true,
        data: result,
      });
    }).catch((err) => cb(err));
  };

  companyMonthlyReport.remoteMethod(
      'data',
    {
      description: ['测试 Relations'],
      accepts: [
              {arg: 'ctx', type: 'object', http: {source: 'context'}},
              {arg: 'filter', type: 'object', http: {source: 'query'}},
      ],
      returns: {
        arg: 'monthly', type: 'object', root: true,
      },
      http: {verb: 'get'},
    }
  );
};
