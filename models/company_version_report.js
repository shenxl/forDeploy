'use strict';
var _ = require('lodash');

module.exports = function(companyVersionReport) {
  companyVersionReport.data = (ctx, filter, type, cb) => {
    const options = _.assign({}, filter, {fields: ['server_id', 'year', 'month', 'activity_sum', 'version', 'install_sum']});
    companyVersionReport.find(options).then((version) => {
      const result = _.chain(version).groupBy('version').map((keyItem) => {
        if (keyItem.length > 0) {
          return {
            server_id: keyItem[0].server_id,
            version: keyItem[0].version,
            year: keyItem[0].year,
            month: keyItem[0].month,
            value: _.sumBy(keyItem, (item) => {
              if (type === 'install') {
                return item.install_sum;
              } else {
                return item.activity_sum;
              }
            }),
          };
        }
      }).
      orderBy('value', 'desc').
      slice(0, 8).
      filter((item) => { return item.value > 0; }).
      value();

      ctx.res.statusCode = 201;
      ctx.res.json({
        success: true,
        data: result,
      });
    }).catch((err) => cb(err));
  };

  companyVersionReport.remoteMethod(
      'data',
    {
      description: ['测试 Relations'],
      accepts: [
              {arg: 'ctx', type: 'object', http: {source: 'context'}},
              {arg: 'filter', type: 'object', http: {source: 'query'}},
              {arg: 'type', type: 'string', http: {source: 'query'}},
      ],
      returns: {
        arg: 'version', type: 'object', root: true,
      },
      http: {verb: 'get'},
    }
  );
};
