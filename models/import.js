'use strict';
const CONTAINERS_URL = './server/storage';
const XLSX = require('xlsx');
const constant = require('../utils/constant.js');
var Promise = require('bluebird');

module.exports = function(Import) {
  Import.companyInfo = function(ctx, options, cb) {
    if (!options) options = {};
    ctx.req.params.container = 'import';

    // 解析导入文件
    const workbook = XLSX.readFile(`${CONTAINERS_URL}/import/${'import-hsj.xlsx'}`);
    const sheet_name_list = workbook.SheetNames;
    const company = Import.app.models.company;
    const companyOrder = Import.app.models.companyOrder;
    const companySn = Import.app.models.companySn;

    const data = [];
    sheet_name_list.forEach(
      (name) => {
        if (name === 'data') {
          var worksheet = workbook.Sheets[name];
          var headers = {};

          for (let cell in worksheet) {
            if (cell[0] === '!') continue;
            //parse out the column, row, and value
            var index = 0;
            for (var i = 0; i < cell.length; i++) {
              if (!isNaN(cell[i])) {
                index = i;
                break;
              }
            };
            var col = cell.substring(0, index);
            var row = parseInt(cell.substring(index));
            var value = worksheet[cell].v;
            if (typeof value === 'string') value = value.trim();
            //store header names
            if (row == 1 && value) {
              headers[col] = constant.IMPORTDIC[value];
              continue;
            }

            if (!data[row]) data[row] = {};
            data[row][headers[col]] = value;
          }
          //drop those first two rows which are empty
          data.shift();
          data.shift();
        }
      });

    //同步完成数据库处理。
    Promise.reduce(data, (total, importData, index)=> {
      return company.find({where: {name: importData.company_name}}).then((finds) => {
        if (finds.length !== 0) {
          return  finds[0];
        }
        const companyItem = {
          name: importData.company_name,
          region: importData.company_region,
          province: importData.company_province,
          city: importData.company_city,
          county: importData.company_country,
          address: importData.company_address,
          type: importData.company_type,
          industry: importData.company_industry,
        };
        return company.create(companyItem);
      })
      .then((companyItem) => {
        const companyOrderItem = {
          company_id: companyItem.id,
          sns: importData.order_sn,
          sales: importData.order_sales,
          order_number: importData.order_number || 0,
          order_type: importData.order_type,
          order_area: importData.order_area,
          order_name: importData.order_name,
          prediction: importData.order_prediction || 0,
          after_authorization: importData.order_afterAuthNum || 0,
          authorization_date: importData.authorization_date,
          authorization_years: importData.authorization_years,
          service_date: importData.service_date,
          length_of_service: importData.length_of_service,
        };
        return companyOrder.create(companyOrderItem);
      })
      .then((orderItem) => {
        if (orderItem.sns) {
          return Promise.all(
            orderItem.sns.split(',').map((sn) => {
              let snItem = sn.trim();
              return companySn.find({where: {sn: snItem}}).then(findsn => {
                if (findsn.length === 0 && snItem.length === 25) {
                  const companySnItem = {
                    company_id: orderItem.company_id,
                    sn: snItem,
                  };
                  return companySn.create(companySnItem);
                }
                return undefined;
              });
            })
          );
        }
        return undefined;
      }).then((createSn) => {
      })
      .catch(err => {
        console.log(err);
        cb(err);
      });
    }, 0)
    .then(() => {
      console.log('导入结束');
    }).catch(() => console.log('导入发生错误！'));
    cb();
  };

  Import.remoteMethod(
    'companyInfo', {
      description: '导入企业信息',
      accepts: [{
        arg: 'ctx',
        type: 'object',
        http: {
          source: 'context',
        },
      }, {
        arg: 'options',
        type: 'object',
        http: {
          source: 'query',
        },
      }],
      returns: {
        arg: 'fileObject',
        type: 'object',
        root: true,
      },
      http: {
        verb: 'get',
      },
    }
  );
};
