'use strict';
var _ = require('lodash');

module.exports = function(CompanyViewer) {
  CompanyViewer.getRecord = function(ctx, filter, cb) {
  //   var CompanyViewerDetail =  CompanyViewer.app.models.CompanyViewerDetail;
  //

  //   var countSumForMonthly = function(monthly,fiterFunc) {
  //     return _.chain(monthly)
  //       .filter(fiterFunc || function(){ return true })
  //       .reduce(function(result, item) {
  //         return {
  //           sum: result.sum + item.activity_sum,
  //           avg: result.avg + item.activity_avg,
  //           install: result.install + item.install_sum,
  //         }
  //       }, {
  //         sum: 0,
  //         avg: 0,
  //         install: 0
  //       })
  //   };
  //
  //   var getReportByMonthly = function(monthly) {
  //     return _.chain(monthly).
  //     groupBy('server_id').
  //     map(function(server, key) {
  //       return {
  //         server_id: key,
  //         item: _.chain(server).groupBy('year').map(function(year, key) {
  //           return {
  //             year: key,
  //             item: _.chain(year).groupBy('month').map(function(month, key) {
  //               return {
  //                 month: key,
  //                 recode: countSumForMonthly(month).value()
  //               }
  //             }).value()
  //           };
  //         })
  //       }
  //     })
  //   }

    // 获取所有激活个数
    var acitvityFilter = _.cloneDeep(filter.where);
    _.find(acitvityFilter.and, (o) => {
      if (o.or) {
        _.find(o.or, (item) => {
          if (item.and) {
            acitvityFilter.and = _.concat(acitvityFilter.and, item.and);
          }
        });
      }
    });

    _.remove(acitvityFilter.and, (o) => {
      return o.or;
    });

    // var activityTemp = _.cloneDeep(filter);
    // _.remove(activityTemp.where.and, (o) => {
    //   return o.or
    // });

    // var activityIdFilter = _.assign({} , { where : activityTemp.where } ,
    //   { fields: { year:true, month:true, server_id:true, install_sum:true, activity_avg:true, activity_sum :true} });
    // var monthlyList = [];

    Promise.all([
      CompanyViewer.count(filter.where),
      CompanyViewer.count(acitvityFilter),
      CompanyViewer.find(filter),
    ]).then((result) => {
      ctx.res.statusCode = 201;
      ctx.res.json({
        success: true,
        activity_count: result[1],
        data: result[2],
        total: result[0],
        current: (filter && filter.skip) || 0,
      });
        // CompanyViewerDetail.find(activityIdFilter).then((monthly) => {
        //   const report_data = getReportByMonthly(monthly).value();
        //
        // }).catch((err) => cb(err))
    }).catch((err) => cb(err));
  };

  CompanyViewer.remoteMethod(
      'getRecord',
    {
      description: ['根据查询条件返回报活情况 , 其中:',
                    'filter: company的查询条件'],
      accepts: [
              {arg: 'ctx', type: 'object', http: {source: 'context'}},
              {arg: 'filter', type: 'object', http: {source: 'query'}},
      ],
      returns: {
        arg: 'record', type: 'object', root: true,
      },
      http: {verb: 'get'},
    }
  );
};
