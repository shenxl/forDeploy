'use strict';
var loopback = require('loopback');
var LoopBackContext = require('loopback-context');
const CONTAINERS_URL = './server/storage';
const XLSX = require('xlsx');
var Promise = require('bluebird');
const constant = require('../utils/constant.js');
var ImportStates = require('../utils/ImportStates.js');

module.exports = function(ImportContainer) {
  const importFile = (downloadUrl) =>{
    const workbook = XLSX.readFile(`${CONTAINERS_URL}/importTemp/${downloadUrl}`);
    const sheet_name_list = workbook.SheetNames;
    const company = ImportContainer.app.models.company;
    const companyOrder = ImportContainer.app.models.companyOrder;
    const companySn = ImportContainer.app.models.companySn;

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
          order_name: importData.order_name || companyItem.name,
          prediction: importData.order_prediction || 0,
          after_authorization: importData.order_afterAuthNum || 0,
          authorization_date: importData.authorization_date || '2000-1-1',
          authorization_years: importData.authorization_years || 0,
          service_date: importData.service_date || '2000-1-1',
          length_of_service: importData.length_of_service || 0,
        };
        return companyOrder.create(companyOrderItem);
      })
      .then((orderItem) => {
        if (orderItem.sns) {
          return Promise.all(
            orderItem.sns.split(',').map((sn) => {
              let snItem = sn.replace('&#10;', '').trim();
              console.log(snItem);
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
      });
    }, 0)
    .then(() => console.log('导入结束')).catch(() => console.log('导入发生错误！'));
  };

  const updateFile = (ctx, options, callback) => {
    ImportContainer.upload(ctx.req, ctx.result, options, function(err, fileObj) {
      if (err) {
        console.log('upload', err);
        callback(err);
      } else {
        console.log(fileObj);
        var fileInfo = fileObj.files.import[0];
        const _downloadUrl = fileInfo.container + '/download/' + fileInfo.name;
        const _systemUrl = fileInfo.container + '/' + fileInfo.name;
        options.fileManager.create({
          name: fileInfo.name,
          type: fileInfo.type,
          container: fileInfo.container,
          option: 'import',
          downloadUrl: _downloadUrl,
          user_id: options.user_id,
          state: ImportStates.uploaded,
        }, function(err, obj) {
          if (err !== null) {
            callback(err);
          } else {
            importFile(_systemUrl);
            callback(null, obj);
          }
        });
      }
    });
  };

  ImportContainer.import = function(ctx, options, callback) {
    if (!options) options = {};
    const context = LoopBackContext.getCurrentContext();
    const currentUser = context && context.get('currentUser');
    const containerName = (currentUser && currentUser.email) || 'temp';
    const user_id = (currentUser && currentUser.id) || 0;
    ctx.req.params.container = containerName;
    options.user_id = user_id;
    options.fileManager = ImportContainer.app.models.fileManager;
    ImportContainer.getContainer(containerName, (err, result) => {
      if (err && err.status === 404) {
        ImportContainer.createContainer({name: containerName}, (err, result) => {
          if (err) {
            console.log('createContainer', err);
            callback(err);
          }
          updateFile(ctx, options, callback);
        });
      } else if (err) {
        console.log('getContainer', err);
        callback(err);
      }
      updateFile(ctx, options, callback);
    });
  };

  ImportContainer.remoteMethod(
        'import',
    {
      description: '导入一个订单系统的模板',
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
