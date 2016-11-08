var AWS = require('aws-sdk');
var async = require('async');
var config = require('./config');
 
var increaseReadPercentage = 70;
var increaseWritePercentage = 70;
var readAlarmThreshold = 50;
var writeAlarmThreshold = 50;
 
exports.handler = function(event, context, callback) {
  
  var message = JSON.parse(event.Records[0].Sns.Message);
  if (message.NewStateValue =! 'ALARM') {
    context.callbackWaitsForEmptyEventLoop = false;
    callback(null, message);
  }
 
  AWS.config.update({ region: config.region});
  // Waterfall을 통해서 동기적인 작업을 합니다.
  var dynamodb = new AWS.DynamoDB();
  // dynamoDBTableName을 가져옵시다.
  var dynamodbTable = message.Trigger.Dimensions[0].value;
  async.waterfall(
    [
      // 일단 DynamoDB 을 새로운 Capacity을 갖도록 업데이트를 해줍시다.
      function (cb) {
        var dynamodb = new AWS.DynamoDB();
        // dynamoDBTableName을 가져옵시다.
        var dynamodbTable = message.Trigger.Dimensions[0].value;
        dynamodb.describeTable({TableName: dynamodbTable}, function(err, tableInfo) {
          // dynamodbTable이라는 이름을 가진 table 정보를 가져옵니다.
          if (err) cb(err);
          else {
            var params = {
              TableName: dynamodbTable
            }

            var tableConfig = config.tables.filter(function(table) {
              return table.tableName === params.TableName
            })[0];

            if (tableConfig) {
              increaseReadPercentage = tableConfig.increase_reads_with;  
              increaseWritePercentage = tableConfig.increase_writes_with;
            }
 
            var currentThroughput = tableInfo.Table.ProvisionedThroughput;
            // Alarm이 ReadCapacity에 의해서 생겼다면, ReadCapacity을 업그레이드 해줍시다.
            if (message.Trigger.MetricName == 'ConsumedReadCapacityUnits') {
              params.ProvisionedThroughput = {
                ReadCapacityUnits: Math.ceil(currentThroughput.ReadCapacityUnits * (100 + increaseReadPercentage)/100),
                WriteCapacityUnits: currentThroughput.WriteCapacityUnits
              };
            }
            // 마찬가지로 WriteCapacity에 의해서 생겼다면, WriteCapacity을 업그레이드 해줍시다.
            else if (message.Trigger.MetricName == 'ConsumedWriteCapacityUnits') {
              params.ProvisionedThroughput = {
                ReadCapacityUnits: currentThroughput.ReadCapacityUnits,
                WriteCapacityUnits: Math.ceil(currentThroughput.WriteCapacityUnits * (100 + increaseWritePercentage)/100)
              };
            }
            else {
              cb(message);
            }
            // 테이블을 업데이트 합시다.
            dynamodb.updateTable(params, function(err, response) {
              if (err) cb(err);
              else {
                console.log('modify provisioned throughput:', currentThroughput, params);
                cb(null, params.ProvisionedThroughput);
              }
            });
          }
        });
      },
      // CloudWatch의 알람도 업데이트 해주어야 합니다. 새로운 Capacity을 가졌기 때문이죠.
      function (newThroughput, cb) {
        var cloudwatch = new AWS.CloudWatch();
        cloudwatch.describeAlarms({AlarmNames: [message.AlarmName]}, function(err, alarms) {
          if (err) cb(err);
          else {
            var currentAlarm = alarms.MetricAlarms[0];
            var params = {
              AlarmName: currentAlarm.AlarmName,
              ComparisonOperator: currentAlarm.ComparisonOperator,
              EvaluationPeriods: currentAlarm.EvaluationPeriods,
              MetricName: currentAlarm.MetricName,
              Namespace: currentAlarm.Namespace,
              Period: currentAlarm.Period,
              Statistic: currentAlarm.Statistic,
              ActionsEnabled: currentAlarm.ActionsEnabled,
              AlarmActions: currentAlarm.AlarmActions,
              AlarmDescription: currentAlarm.AlarmDescription,
              Dimensions: currentAlarm.Dimensions,
              InsufficientDataActions: currentAlarm.InsufficientDataActions,
              OKActions: currentAlarm.OKActions,
              Unit: currentAlarm.Unit,
            }

            var tableConfig = config.tables.filter(function(table) {
              return table.tableName === newThroughput.TableName
            })[0];

            if (tableConfig) {
              readAlarmThreshold = tableConfig.reads_upper_threshold;
              writeAlarmThreshold = tableConfig.writes_upper_threshold;
            }

            if (message.Trigger.MetricName == 'ConsumedReadCapacityUnits') {
              params.Threshold = newThroughput.ReadCapacityUnits * params.Period * readAlarmThreshold / 100;
            }
            else {
              params.Threshold = newThroughput.WriteCapacityUnits * params.Period * writeAlarmThreshold / 100;
            }
            cloudwatch.putMetricAlarm(params, function(err, response) {
              if (err) cb(err);
              else {
                console.log('modify alarm:', currentAlarm, params);
                cb(null, response);
              }
            });
          }
        });
      }
    ],
    function (err, result) {
      context.callbackWaitsForEmptyEventLoop = false; 
      if (err) {callback(err);}
      else {callback(null, result);}
    }
  );
}