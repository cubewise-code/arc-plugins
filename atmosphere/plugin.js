arc.run(['$rootScope', '$settings', '$atmosphere',
  function ($rootScope, $settings, $atmosphere) {
    // Register plugin
    var plugin = $rootScope.plugin("cubewiseAtmospherePortal", "ATMOSPHEREPLUGINTITLEPORTAL", "page", {
      menu: "atmosphere",
      icon: "fa-globe",
      description: "This plugin allows users to interface with Atmosphere.",
      author: "Cubewise",
      url: "https://github.com/cubewise-code/arc-plugins",
      version: "1.0.0",
      topMenu: {
        title: "ATMOSPHEREPLUGINTITLETOPMENU",
        icon: "Atmosphere",
        onClick: function () {
          $atmosphere.showConnectionsDialog();
        },
        isDisabled: function () {
          return false;
        }
      }
    });

    $settings.settings()
      .then(function (settings) {
        plugin.topMenu.isHidden = _.isEmpty(settings.AtmosphereURL);
      });
  }]);

arc.service('$atmosphere', ['$rootScope', '$http', '$q', '$helper', '$dialogs', '$timeout', '$tm1',
  function ($rootScope, $http, $q, $helper, $dialogs, $timeout, $tm1) {

    var _service = this;

    const atmosphereDelayFirst = 100;
    const atmosphereDelayPoll = 1000;
    const atmosphereMaxPollAttempts = 15;

    this.atmosphereAPIRoot = '_atmosphere';

    this.atmosphereAPILoginPath = '/login';
    this.atmosphereAPILogoutPath = '/logout';
    this.atmosphereAPIInitPath = '/init';
    this.atmosphereAPIPollPath = '/poll';
    this.atmosphereAPIUpdateSecretPath = '/update-secret';
    this.atmosphereAPIDeleteConnectionPath = '/delete-secret';

    this.atmosphereAPIConnectionInfoFunctionName = 'connection-info';
    this.atmosphereAPIFunctionInfoFunctionName = 'function-info';
    this.atmosphereAPIUsageInfoFunctionName = 'usage-info';
    this.atmosphereAPILogsInfoFunctionName = 'logs-info';
    this.atmosphereAPIQuotaInfoFunctionName = "quota-info"
    this.atmosphereAPIUpdateSecretFunctionName = 'update-secret';
    this.atmosphereAPIIPInfoFunctionName = 'ip-info';
    this.atmosphereAPICreateProcessesFunctionName = 'create-processes';
    this.atmosphereAPIPingConnectionFunctionPrefix = 'ping-';
    this.atmosphereAPIValueConnectionNone = null;

    // Turn on big buttons by default
    if (!$rootScope.uiPrefs.atmospherePortalBigButtons) {
      $rootScope.uiPrefs.atmospherePortalBigButtons = true;
    }

    this.hasAtmosphere = function () {
      if (!$rootScope.settings) return null;
      return !_.isEmpty($rootScope.settings.AtmosphereURL);
    };

    this.getAtmosphereUrl = function () {
      if (!$rootScope.settings) return null;
      return $rootScope.settings.AtmosphereURL;
    };

    this.getAtmosphereTenant = function () {
      if (!$rootScope.settings || _.isEmpty($rootScope.settings.AtmosphereURL)) return null;
      let tenant = "";
      let strs = $rootScope.settings.AtmosphereURL.split('//');

      if (strs.length == 2) {
        tenant = strs[1].split(".")[0];
      }
      return tenant;
    };

    this.isLoggedIn = function () {
      return $rootScope.uiPrefs.atmosphereIsLoggedIn;
    };

    this.loginAtmosphere = function (apiKey) {
      var defer = $q.defer();

      var url = _service.atmosphereAPIRoot + _service.atmosphereAPILoginPath;
      var credentials = { "apiKey": apiKey };

      $http.post(url, credentials)
        .then(function (success) {
          if (success.status === 200) {
            if ($rootScope.uiPrefs.atmosphereStoreCredentials) {
              $rootScope.uiPrefs.atmosphereCredentials = JSON.stringify(credentials);
            }
            $rootScope.uiPrefs.atmosphereIsLoggedIn = true;
            $rootScope.$broadcast("atmosphere-login-reload");
            defer.resolve(success);
          } else {
            $rootScope.uiPrefs.atmosphereStoreCredentials = false;
            $rootScope.uiPrefs.atmosphereIsLoggedIn = false;
            $rootScope.uiPrefs.atmosphereCredentials = null;
            defer.reject(new Error('loginAtmosphere status incorrect'));
          }
        }, function (error) {
          $rootScope.uiPrefs.atmosphereStoreCredentials = false;
          $rootScope.uiPrefs.atmosphereIsLoggedIn = false;
          $rootScope.uiPrefs.atmosphereCredentials = null;
          defer.reject(new Error('loginAtmosphere error'));
        });

      return defer.promise;
    };

    this.logoutAtmosphere = function () {
      var defer = $q.defer();

      var url = _service.atmosphereAPIRoot + _service.atmosphereAPILogoutPath;
      $http.post(url)
        .then(function (success) {
          if (success.status === 200) {
            $rootScope.uiPrefs.atmosphereCredentials = null;
            $rootScope.uiPrefs.atmosphereIsLoggedIn = false;
            $rootScope.uiPrefs.atmosphereConnections = null;
            defer.resolve(success);
          } else {
            defer.reject(new Error('logoutAtmosphere status incorrect'));
          }
        }, function (error) {
          console.error('logoutAtmosphere error', error);
          defer.reject(new Error('logoutAtmosphere error'));
        });

      return defer.promise;
    };

    this.loginDialog = function (options) {
      var defer = $q.defer();
      $dialogs.showDialog('atmosphereLoginDialog', { options: options }, null,
        function (result) {
          if (result.actionName === "OK") {
            _service.loginAtmosphere(result.data.credentials.apiKey)
              .then(function () {
                defer.resolve();
              }, function () {
                console.log('login failed');
                defer.reject(new Error('login failed'));
              });
          }
        });

      return defer.promise;
    };

    this.runFunctionAsyncDirectRequest = function (connectionName, functionName, functionParameters) {
      var _this = this;
      var url = _this.atmosphereAPIRoot + "/" + functionName;

      // Handle default parameters
      var parameters = {
        run_mode: "response"
      };

      if (!(functionParameters && functionParameters['no_tm1_connection'])) {
        parameters["tm1_connection"] = connectionName;
      } else {
        delete functionParameters['no_tm1_connection'];
      }

      // Merge any additional parameters
      if (functionParameters) {
        parameters = _.merge(parameters, functionParameters);
      }

      var payload = {
        parameters: parameters
      };

      return $http.post(url, payload)
        .then(function (success) {
          return success;
        }, function (error) {
          console.error('runFunctionAsync failed', error);
          return Promise.reject(error);
        });
    };


    this.runFunctionAsync = function (connectionName, functionName, functionParameters) {
      var defer = $q.defer();
      var _this = this;

      var defaultInitPayload = {
        function_name: functionName,
        parameters: {
          "tm1_connection": connectionName,
          "run_mode": "response"
        }
      };

      if (functionParameters && functionParameters['no_tm1_connection']) {
        delete defaultInitPayload['parameters']['tm1_connection'];
        delete functionParameters['no_tm1_connection']
      }

      var pollForResult = function (asyncId, defer, i) {
        var url = _this.atmosphereAPIRoot + _this.atmosphereAPIPollPath;
        // Request the async response
        $http.post(url, {
          "request_mode": "poll",
          "parameters": {
            "unique_id": asyncId
          }
        }).then(function (success) {
          if (i !== 0) {
            if (success.status === 200) {
              // The response is ready, resolve the promise
              var data = success.data;
              defer.resolve(data);
            } else if (success.status === 204) {
              // Response is not yet ready, try again in 1 second
              $timeout(function () {
                pollForResult(asyncId, defer, --i);
              }, atmosphereDelayPoll);
            } else {
              // We got some other error, reject the promise
              defer.reject(success);
            }
          } else {
            defer.reject(new Error('pollForResult exceeded maximum attempts'));
          }
        }, function (error) {
          console.error('pollForResult failed', error);
          defer.reject(error);
        });
      };

      var url = this.atmosphereAPIRoot + this.atmosphereAPIInitPath;
      $http.post(url, _.merge(defaultInitPayload, { parameters: functionParameters }))
        .then(function (success) {
          if (success.status === 201) {
            var id = success.data;
            // Poll for the result after a short delay
            $timeout(function () {
              pollForResult(id, defer, atmosphereMaxPollAttempts);
            }, atmosphereDelayFirst);
          } else {
            defer.reject(success);
          }
        }, function (error) {

          console.error('runFunctionAsync failed', error);
          defer.reject(error);
        });

      return defer.promise;
    };



    this.generalPOSTRequest = function (path, parameters) {
      var defer = $q.defer();
      var url = this.atmosphereAPIRoot + path;
      $http.post(url, parameters)
        .then(function (success) {
          if (success.status === 200 || success.status === 201) {
            defer.resolve(success);
          } else {
            defer.reject(success);
          }
        }, function (error) {
          defer.reject(error);
        });

      return defer.promise;
    };

    this.generalArcPOSTRequest = function (path, parameters) {
      return $tm1.async($scope.instance, method, restApiQuery, mdxClean)
    };

    this.atmosphereLoginRequired = function (options) {
      var defer = $q.defer();
      if (!_.isEmpty($rootScope.uiPrefs.atmosphereCredentials)) {
        var credentials = JSON.parse($rootScope.uiPrefs.atmosphereCredentials);
        _service.loginAtmosphere(credentials.apiKey)
          .then(function () {
            defer.resolve();
          }, function () {
            _service.loginDialog(options)
              .then(function () {
                defer.resolve();
              }, function () {
                defer.reject();
              });
          });
      } else {
        _service.loginDialog(options)
          .then(function () {
            defer.resolve();
          }, function () {
            defer.reject();
          });
      }
      return defer.promise;
    };

    this.getConnectionInfo = function () {
      var defer = $q.defer();
      _service.runFunctionAsyncDirectRequest(_service.atmosphereAPIValueConnectionNone, _service.atmosphereAPIConnectionInfoFunctionName, {})
        .then(function (success) {
          var status = success.status;
          if (status === 200) {
            var connections = success.data.value;
            $tm1.instances(false)
              .then(function (instances) {
                if (!$rootScope.uiPrefs.atmosphereConnections) $rootScope.uiPrefs.atmosphereConnections = {};
                _.each(connections, function (connection) {
                  // get the selected instance from localStorage
                  connection.selectedInstance = $rootScope.uiPrefs.atmosphereConnections[connection['Connection Name']];
                  // get the test status from localStorage
                  if ($rootScope.uiPrefs.atmosphereConnectionResult[connection['Connection Name']] && $rootScope.uiPrefs.atmosphereConnectionResult[connection['Connection Name']].status != 'testing') {
                    // valid status, load it
                    connection.testStatus = $rootScope.uiPrefs.atmosphereConnectionResult[connection['Connection Name']] ? $rootScope.uiPrefs.atmosphereConnectionResult[connection['Connection Name']].status : null;
                  } else {
                    // invalid status 'testing', clear it
                    $rootScope.uiPrefs.atmosphereConnectionResult[connection['Connection Name']] = null;
                  }
                });
                defer.resolve({ connections: connections, instances: _.map(instances, function (instance) { return instance; }) });
              });
          } else {
            defer.reject(new Error('getConnectionInfo status incorrect'));
          }
        }, function (error) {
          if (error.status !== 403) {
            console.error('getConnectionInfo failed', error);
          }
          defer.reject(error);
        });

      return defer.promise;
    };

    this.getFunctionInfo = function (connectionName, functionName) {
      var defer = $q.defer();
      _service.runFunctionAsyncDirectRequest(connectionName, _service.atmosphereAPIFunctionInfoFunctionName, { function_name: functionName })
        .then(function (success) {
          var status = success.status;
          if (status === 200) {
            defer.resolve({ functions: success.data.value });
          } else {
            defer.reject(new Error('getFunctionInfo status incorrect'));
          }
        }, function (error) {
          console.error('getFunctionInfo failed', error);
          defer.reject(error);
        });
      return defer.promise;
    };

    function parseDateTime(value) {
      var m = moment(value);
      return m.isValid() ? m.format('YYYY-MM-DD HH:mm:ss') : '';
    }

    function parseDate(value) {
      var m = moment(value);
      return m.isValid() ? m.format('YYYY-MM-DD') : '';
    }

    function parseTime(seconds) {
      if (!!seconds) {
        seconds = parseInt(seconds)
        var duration = moment.duration(seconds, 'seconds');
        var hour = duration.hours().toString()
        var minutes = Math.floor(duration.minutes()).toString().padStart(2, '0')
        seconds = Math.floor(duration.seconds()).toString().padStart(2, '0')
        return hour !== '' ? `${hour}:${minutes}:${seconds}` : `${minutes}:${seconds}`
      }
      return '';
    }

    function parseDateTimeToLocal(value) {
      var m = moment.utc(value);
      return m.isValid() ? m.local().format('YYYY-MM-DD HH:mm:ss') : '';
    }

    this.getUsageHistory = function (connectionName, filter) {
      var defer = $q.defer();

      var parameters = {
        function_name: filter.functionName,
        top: filter.top !== '' ? parseInt(filter.top) : "",
        since: filter.sinceDate !== '' ? parseDate(filter.sinceDate) : "",
        until: filter.untilDate !== '' ? parseDate(filter.untilDate) : ""
      };
      _service.runFunctionAsyncDirectRequest(connectionName, _service.atmosphereAPIUsageInfoFunctionName, parameters)
        .then(function (success) {
          var status = success.status;
          if (status === 200) {
            var data = success.data;
            if (filter.success !== '') {
              data.value = data.value.filter(function (i) {
                return i.Success !== null && ("" + i.Success).toLowerCase() === filter.success;
              });
            }
            defer.resolve(data.value.map(function (i) {
              var r = _.merge({}, i, {
                InvocationTime: parseDateTime(i.InvocationTime),
                InvocationTimeLocal: parseDateTimeToLocal(i.InvocationTime),
                StartTime: parseDateTime(i.StartTime),
                StartTimeLocal: parseDateTimeToLocal(i.StartTime),
                Duration: parseTime(i['Duration (secs)']),
                ExtractStepTime: parseTime(i.ExtractStepTime),
                LoadStepTime: parseTime(i.LoadStepTime),
                TransformStepTime: parseTime(i.TransformStepTime),
                EndTime: parseDateTime(i.EndTime),
                EndTimeLocal: parseDateTimeToLocal(i.EndTime),
              });
              return r;
            }));
          } else {
            defer.reject(new Error('getUsageHistory status incorrect'));
          }
        }, function (error) {
          console.error('getUsageHistory failed', error);
          defer.reject(error);
        });

      return defer.promise;
    };

    this.getFunctionLogs = function (connectionName, functionName) {
      var defer = $q.defer();

      var parameters = {
        "tm1_connection": connectionName,
        "mail_recipients": "",
        "file": "",
        "function_name": functionName
      };

      _service.runFunctionAsyncDirectRequest(connectionName, _service.atmosphereAPILogsInfoFunctionName, parameters)
        .then(function (success) {
          var status = success.status;
          if (status === 200) {
            // defer.resolve(data.value);
            data = success.data
            defer.resolve(data.value.map(function (i) {
              var r = _.merge({}, i, {
                Timestamp: parseDateTime(i.Timestamp),
                TimestampLocal: parseDateTimeToLocal(i.Timestamp),
              });
              return r;
            }));
          } else {
            defer.reject(new Error('getLogs status incorrect'));
          }
        }, function (error) {
          console.error('getLogs failed', error);
          defer.reject(error);
        });

      return defer.promise;
    };

    this.getFunctionQuota = function (connectionName) {
      var defer = $q.defer();

      var parameters = {
        'mail_recipients': ''
      };

      _service.runFunctionAsyncDirectRequest(connectionName, _service.atmosphereAPIQuotaInfoFunctionName, parameters)
        .then(function (success) {
          var status = success.status;
          if (status === 200) {
            var value = success.data.value;
            //fix sometimes return string
            if (typeof (value) === "string") {
              value = value.split(" Extract:")[0];
              var decoded = atob(value);
              value = JSON.parse(decoded);
            }
            defer.resolve(value);
          } else {
            defer.reject(new Error('get quota status incorrect'));
          }
        }, function (error) {
          console.error('get quota status failed', error);
          defer.reject(error);
        });

      return defer.promise;
    };

    this.createProcesses = function (connectionName, update, domain, function_name, api_key) {
      var defer = $q.defer();

      var data = {
        "tm1_connection": connectionName,
        "update": update ? "True" : "False",
        "domain": domain,
        "function_name": function_name,
        "api_key": api_key
      };

      _service.runFunctionAsync(connectionName, _service.atmosphereAPICreateProcessesFunctionName, data)
        .then(function (data) {
          var status = data.status_code;
          if (status === 200) {
            defer.resolve(data.value);
          } else {
            defer.reject(new Error('createProcesses status incorrect'));
          }
        }, function (error) {
          console.error('createProcesses failed', error);
          defer.reject(error);
        });
      return defer.promise;
    };

    this.testConnection = function (connection, testFunctionMapping) {
      var defer = $q.defer();

      var connectionName = connection['Connection Name'];
      var connectionType = connection['Connection Type'];

      (testFunctionMapping ? $q.resolve({ status: 200, data: testFunctionMapping }) : $http.get('__/plugins/atmosphere/connection-test-functions.json'))
        .then(function (success) {
          if (success.status === 200) {
            var connectionTestConfig = success.data[connectionType];
            if (!connectionTestConfig) {
              console.error('Connection Type not support');
              defer.reject(new Error('Connection Type not support'));
            }

            var parameters = connectionTestConfig['parameters'] || {};

            parameters[connectionTestConfig['connection_param_name']] = connectionName;
            if (connectionType !== 'tm1') {
              parameters['no_tm1_connection'] = true;
            }

            _service.runFunctionAsync(connectionName, connectionTestConfig['function_name'], parameters)
              .then(function (data) {
                var status = data.status_code;
                if (status === 200) {
                  defer.resolve(data.value);
                } else {
                  defer.reject(new Error('pingConnection status incorrect (' + status + ')'));
                }
              }, function (error) {
                console.error('pingConnection failed', error);
                defer.reject(error);
              });
          } else {
            console.log('error loading test functions mapping - status incorrect(' + success.status + ')', success);
          }
        }, function (error) {
          console.error('error loading test functions mapping', error);
        });

      return defer.promise;
    };

    this.showConnectionsDialog = function (tm1Only) {
      let data = {
        tm1Only: !!tm1Only
      }
      $dialogs.showDialog('atmosphereConnectionsDialog', data, null, null);
    };

    this.setConnectionInstance = function (connection, instanceName) {
      var connectionName = connection['Connection Name'];
      if (!$rootScope.uiPrefs.atmosphereConnections) $rootScope.uiPrefs.atmosphereConnections = {};
      if (!_.isEmpty(instanceName)) {
        $rootScope.uiPrefs.atmosphereConnections[connectionName] = instanceName;
        connection.selectedInstance = instanceName;
      } else {
        delete $rootScope.uiPrefs.atmosphereConnections[connectionName];
        delete connection.selectedInstance;
      }
      $rootScope.$broadcast('update-atmosphere-connection');
    };

    this.getConnectionInstance = function (connection) {
      var connectionName = connection['Connection Name'];
      return $rootScope.uiPrefs.atmosphereConnections[connectionName];
    };

    this.createConnectionIconStyle = function (connectionIcon, connectionType) {
      var colorizeIconObj = _.isString(connectionIcon.icon.colorizeIcon) ? { dark: connectionIcon.icon.colorizeIcon, light: connectionIcon.icon.colorizeIcon } : _.isObject(connectionIcon.icon.colorizeIcon) ? connectionIcon.icon.colorizeIcon : null;
      var colorizeIcon = colorizeIconObj ? colorizeIconObj[$rootScope.uiPrefs.theme] : null;

      var cssText = "." + connectionType + ":before{";
      if (connectionIcon.icon.pngPath) {
        if (colorizeIcon) {
          cssText += connectionIcon.icon.pngPath ? "mask-image:url(../../__/plugins/atmosphere/" + connectionIcon.icon.pngPath + ");" : "";
          cssText += "background: " + colorizeIcon + ";"
          cssText += "mask-repeat: no-repeat;";
          cssText += "mask-size: contain;";
        } else if (connectionIcon.icon.desaturateIcon) {
          cssText += connectionIcon.icon.pngPath ? "background-image:url(../../__/plugins/atmosphere/" + connectionIcon.icon.pngPath + ");" : "";
          cssText += "filter:saturate(0%);";
          cssText += "background-size:13.64px;";
          cssText += "background-repeat:no-repeat;";
          cssText += "background-position:center;";
        } else {
          cssText += connectionIcon.icon.pngPath ? "background-image:url(../../__/plugins/atmosphere/" + connectionIcon.icon.pngPath + ");" : "";
          cssText += "background-size:13.64px;";
          cssText += "background-repeat:no-repeat;";
          cssText += "background-position:center;";
        }
        cssText += "content:' ';";
        cssText += "display:block;";
        cssText += "height:13.64px;";
        cssText += "position:relative;";
      } else {
        cssText += colorizeIcon ? "color:" + colorizeIcon + ";" : "";
      }
      cssText += "}";

      return cssText;
    };

    this.loadConnectionIcons = function () {
      $http.get('__/plugins/atmosphere/connection-icons.json')
        .then(function (success) {
          if (success.status === 200) {
            _service.connectionIcons = success.data;
          } else {
            console.log('loadConnectionIcons status incorrect', success);
          }
        }, function (error) {
          console.error('loadConnectionIcons error', error);
        });
    };

    this.showUpdateLicense = function ($scope) {
      $dialogs.showDialog('atmosphereLicenseUpdateDialog', null, null, function (result) {
        if (result.actionName === "OK") {
          var secret_value = [];
          try {
            var obj = JSON.parse(result.data.jsonValue);
            Object.keys(obj).forEach(function (key) {
              var val = obj[key];
              if (typeof (val) == "string") {
                val = '\"' + val + '\"'
              }
              var str = '\"' + key + '\":' + val
              secret_value.push(str)
            })
            secret_value = '{' + secret_value.join(',') + '}'
          } catch (err) {
            $scope.$emit('show-error', {
              operationTranslation: 'ATMOSPHEREERRORCREATECONEECTIONINFO',
              errorTranslation: 'ATMOSPHEREERRORCREATECONEECTIONINFO',
              errorMessage: "JSON parse error"
            });
            return;
          }

          var data = {
            "secret_key": 'license',
            "secret_value": secret_value
          }

          $scope.isLoading = true;

          _service.generalPOSTRequest(_service.atmosphereAPIUpdateSecretPath, data)
            .then(function (data) {
              $scope.$emit('show-success', {
                operationTranslation: 'ATMOSPHERELABELUPDATELICENSE',
                messageTranslation: 'ATMOSPHERESUCCESS'
              });
              $rootScope.isLoading = false;
            }, function (error) {
              $scope.$emit('show-error', {
                operationTranslation: 'ATMOSPHERELABELUPDATELICENSE',
                errorTranslation: 'ATMOSPHEREFAILED',
                errorMessage: "(status: " + error.status + ") " + (error.statusText ? error.statusText : "No error message.")
              });
              $scope.isLoading = false;
            })
        }
      })
    }

    this.loadConnectionIcons();
  }]);

arc.directive("atmosphereLoginForm", function () {
  return {
    restrict: "EA",
    replace: true,
    scope: {
      data: "=arcModelData",
      options: "=arcOptions",
      dialog: "=arcDialog"
    },
    templateUrl: "__/plugins/atmosphere/directives/forms/login-form.html",
    link: function ($scope, element, attrs) {

    },
    controller: ["$scope", "$rootScope", "$http", "$q", "$translate", "$timeout", "uuid2", "$atmosphere",
      function ($scope, $rootScope, $http, $q, $translate, $timeout, uuid2, $atmosphere) {
        $scope.id = uuid2.newuuid();
        $scope.data.credentials = {};
      }]
  }
});

arc.directive("atmosphereMessageUrlMissing", ["$rootScope", "$timeout", function ($rootScope, $timeout) {
  return {
    restrict: "E",
    scope: {
      pulseURL: "=atmosphereUrl",
      message: "=message"
    },
    templateUrl: "__/plugins/atmosphere/directives/messages/atmosphere-message-check-url.html",
    link: function ($scope, element, attrs) { },
    controller: ["$scope", "$rootScope",
      function ($scope, $rootScope) {

      }]
  }
}]);

arc.directive("atmosphereConnectionsForm", ['$rootScope', '$atmosphere', '$dialogs',
  function ($rootScope, $atmosphere, $dialogs) {
    return {
      restrict: "E",
      replace: true,
      scope: {
        data: "=arcModelData",
        options: "=arcOptions",
        dialog: "=arcDialog"
      },
      templateUrl: "__/plugins/atmosphere/directives/forms/connections-form.html",
      link: function ($scope, element, attrs) {

      },
      controller: ["$scope", "$rootScope", "$http", "$translate", "$timeout", "uuid2", "Notification", "$helper", "$tabs", "$tm1", "$atmosphere",
        function ($scope, $rootScope, $http, $translate, $timeout, uuid2, Notification, $helper, $tabs, $tm1, $atmosphere) {
          $scope.id = uuid2.newuuid();
          $scope.isLoading = false;
          $scope.atmosphereTenant = $atmosphere.getAtmosphereTenant();
          $scope.tm1ConnectionOnly = $scope.data.tm1Only;

          if (!$rootScope.uiPrefs.atmosphereConnectionResult) $rootScope.uiPrefs.atmosphereConnectionResult = {};

          $scope.resetData = function () {
            $scope.data = {
              items: [],
              checkedNum: 0,
              itemNum: 0
            };
          };
          $scope.resetData();

          $scope.connectionIcons = _.mapValues($atmosphere.connectionIcons, function (connectionIcon, connectionType) {
            return { connectionType: connectionType, icon: connectionIcon };
          });

          var cssText = "";
          _.each($scope.connectionIcons,
            function (connectionIcon, connectionType) {
              cssText += $atmosphere.createConnectionIconStyle(connectionIcon, connectionType);
            });
          $scope.connectionIconStyleText = cssText;

          var createHSLColourBorderBottom = function (color) {
            return $helper.createHSLColourBorder(color);
          };

          var createHSLColourBorderLeft = function (color) {
            return {
              "border-left-style": "solid",
              "border-left-width": "medium",
              "border-left-color": color
            };
          };

          var createHSLColourText = function (color) {
            return $helper.createHSLColourText(color);
          };

          var generateHSLColourBorderBottom = function (color) {
            return $helper.generateHSLColourBorder(color);
          };

          var generateHSLColourBorderLeft = function (text) {
            return $scope.createHSLColourBorderLeft($helper.generateColour(text));
          };

          var generateHSLColourText = function (color) {
            return $helper.generateHSLColourText(color);
          };

          $scope.connectionIconStyles = _.mapValues($atmosphere.connectionIcons, function (connectionIcon, connectionType) {
            return {
              bottomBorderStyle: connectionIcon.accentColor ? createHSLColourBorderBottom(connectionIcon.accentColor) : generateHSLColourBorderBottom(connectionType),
              leftBorderStyle: connectionIcon.accentColor ? createHSLColourBorderLeft(connectionIcon.accentColor) : generateHSLColourBorderLeft(connectionType),
              searchIconStyle: connectionIcon.accentColor ? createHSLColourText(connectionIcon.accentColor) : generateHSLColourText(connectionType),
              connectionIconStyle: createHSLColourText('#888')
            };
          });

          $scope.settings = {
            key: 'connections',
            allChecked: false,
            filter: {
              'Connection Name': '',
              'Connection Type': []
            },
            columns: [
              { key: '"Connection Name"', translateKey: 'ATMOSPHERECOLUMNHEADERCONNECTIONNAME', display: true, width: 0 },
              { key: '"Connection Type"', translateKey: 'ATMOSPHERECOLUMNHEADERCONNECTIONTYPE', display: true, width: 250 },
              { key: 'selectedInstance', translateKey: 'ATMOSPHERECOLUMNHEADERCONNECTIONINSTANCE', display: true, width: 180 },
              { key: 'testStatus', translateKey: 'ATMOSPHERECOLUMNHEADERCONNECTIONTESTSTATUSSHORT', display: true, width: -1 },
              { key: 'delete', translateKey: 'ATMOSPHERECOLUMNHEADERCONNECTIONDELETESHORT', display: true, width: -1 }
            ],
            sortColumn: {
              key: '"Connection Name"',
              direction: false
            },
            pageState: {
              totalItems: -1,
              currentItems: -1,
              itemsPerPage: 20,
              currentPage: 1
            },
            pageOptions: {
              alwaysShow: false
            }
          };

          if (!$scope.leftSplitterWidth)
            $scope.leftSplitterWidth = 456;

          $scope.toggleConnectionType = function (connectionType) {
            var icon = _.find($scope.connectionIcons, { connectionType: connectionType });
            if (!icon) return;
            icon.checked = !icon.checked;
            $scope.settings.filter['Connection Type'] = _.filter($scope.connectionIcons, 'checked').map(function (icon) {
              return icon.connectionType;
            });
          };

          if ($scope.tm1ConnectionOnly) {
            $scope.toggleConnectionType('tm1');
          }

          $scope.sortBy = function (key) {
            if (!key) return;

            if ($scope.settings.sortColumn.key === key) {
              $scope.settings.sortColumn.direction = !$scope.settings.sortColumn.direction;
            } else {
              $scope.settings.sortColumn.key = key;
              $scope.settings.sortColumn.direction = false;
            }
          };

          $scope.goToPortal = function (instanceName) {
            $tabs.open("cubewiseAtmospherePortal", { instance: instanceName });
            if ($scope.dialog)
              $scope.dialog.closeThisDialog();
          };

          $scope.loadTestFunctionMapping = function () {
            $http.get('__/plugins/atmosphere/connection-test-functions.json')
              .then(function (success) {
                if (success.status === 200) {
                  $scope.testFunctionMapping = success.data;
                } else {
                  console.log('error loading test functions mapping - status incorrect (' + success.status + ')', success);
                }
              }, function (error) {
                console.log('error loading test functions mapping', error);
              });
          };
          $scope.loadTestFunctionMapping();

          $scope.refreshData = function () {
            $scope.isLoading = true;

            return $atmosphere.getConnectionInfo()
              .then(function (data) {

                $scope.data.items = data.connections;
                $scope.data.itemNum = $scope.data.items.length;
                $scope.instances = data.instances;

                $scope.isLoading = false;
              }, function (error) {

                $scope.data.items = [];
                $scope.data.itemNum = 0;

                console.error(error);
                Notification.error({
                  title: "<i class='fa fa-exchange'></i> <b>" + $helper.translate("ATMOSPHEREERRORGETCONEECTIONINFO") + "</b>",
                  message: "<i class='fa fa-remove'></i> " + "(status: " + error.status + ") " + $helper.errorText(error)
                });

                $scope.isLoading = false;
              });
          };
          $scope.refreshData();

          $scope.testConnection = function (connection) {
            var connectionName = connection['Connection Name'];

            $rootScope.uiPrefs.atmosphereConnectionResult[connectionName] = {
              testedDate: new Date(),
              status: 'testing',
              message: $helper.translate('ATMOSPHERETITLECONNECTIONTESTING', { connectionName: connectionName })
            };
            connection.testStatus = $rootScope.uiPrefs.atmosphereConnectionResult[connectionName].status;

            $atmosphere.testConnection(connection, $scope.testFunctionMapping)
              .then(function (data) {
                var completionDate = new Date();
                $rootScope.uiPrefs.atmosphereConnectionResult[connectionName] = _.merge(
                  $rootScope.uiPrefs.atmosphereConnectionResult[connectionName],
                  {
                    completionDate: completionDate,
                    status: 'success',
                    message: $helper.translate('ATMOSPHERETITLECONNECTIONTESTSUCCESS', { connectionName: connectionName, completionDate: completionDate })
                  });
                connection.testStatus = $rootScope.uiPrefs.atmosphereConnectionResult[connectionName].status;
              }, function (error) {
                var completionDate = new Date();
                $rootScope.uiPrefs.atmosphereConnectionResult[connectionName] = _.merge(
                  $rootScope.uiPrefs.atmosphereConnectionResult[connectionName],
                  {
                    completionDate: completionDate,
                    status: 'fail',
                    message: $helper.translate('ATMOSPHERETITLECONNECTIONTESTFAILED', { connectionName: connectionName, completionDate: completionDate, errorMessage: error })
                  });
                connection.testStatus = $rootScope.uiPrefs.atmosphereConnectionResult[connectionName].status;
              });
          };

          $scope.createConnection = function () {
            var options = null;
            $dialogs.showDialog('atmosphereConnectionCreateDialog', { options: options }, null,
              function (result) {
                if (result.actionName === "OK") {
                  var name = result.data.name;
                  if (!name) {
                    $rootScope.$broadcast('show-error', {
                      operationTranslation: 'ATMOSPHEREERRORCREATECONEECTIONINFO',
                      errorTranslation: 'ATMOSPHEREERRORCREATECONEECTIONINFO',
                      errorMessage: "Connection name can't be empty"
                    });
                    return;
                  }
                  var settingType = result.data.settingType;

                  var secret_value = [];
                  try {
                    var obj = JSON.parse(result.data.jsonValue);
                    Object.keys(obj).forEach(function (key) {
                      var val = obj[key];
                      if (typeof (val) == "string") {
                        val = '\"' + val + '\"'
                      }
                      var str = '\"' + key + '\":' + val
                      secret_value.push(str)
                    })
                    secret_value = '{' + secret_value.join(',') + '}'
                  } catch (err) {
                    $rootScope.$broadcast('show-error', {
                      operationTranslation: 'ATMOSPHEREERRORCREATECONEECTIONINFO',
                      errorTranslation: 'ATMOSPHEREERRORCREATECONEECTIONINFO',
                      errorMessage: "JSON parse error"
                    });
                    return;
                  }

                  var data = {
                    "secret_key": name,
                    "secret_value": secret_value
                  }
                  $scope.isLoading = true;

                  $atmosphere.generalPOSTRequest($atmosphere.atmosphereAPIUpdateSecretPath, data)
                    .then(function (data) {
                      $scope.$emit('show-success', {
                        operationTranslation: 'ATMOSPHERETITLECONNECTIONCREATE',
                        messageTranslation: 'ATMOSPHEREHISTORYCOLUMNSUCCESS'
                      });
                      $scope.isLoading = false;
                      $scope.refreshData();
                    }, function (error) {
                      $scope.$emit('show-error', {
                        operationTranslation: 'ATMOSPHEREERRORCREATECONEECTIONINFO',
                        errorTranslation: 'ATMOSPHEREERRORCREATECONEECTIONINFO',
                        errorMessage: "(status: " + error.status + ") " + (error.statusText ? error.statusText : "No error message.")
                      });
                      $scope.isLoading = false;
                    })
                }
              });
          };

          $scope.deleteConnection = function (connection) {
            $dialogs.showDialog('atmosphereConnectionDeleteConfirmDialog', { connection: connection }, null,
              function (result) {
                if (result.actionName === "OK") {
                  let data = {
                    'secret_key': connection['Connection Name']
                  }

                  $scope.isLoading = true;

                  $atmosphere.generalPOSTRequest($atmosphere.atmosphereAPIDeleteConnectionPath, data)
                    .then(function (data) {
                      $scope.$emit('show-success', {
                        operationTranslation: 'ATMOSPHERECOLUMNHEADERCONNECTIONDELETE',
                        messageTranslation: 'ATMOSPHEREHISTORYCOLUMNSUCCESS'
                      });
                      $scope.isLoading = false;
                      $scope.refreshData();
                    }, function (error) {
                      $scope.$emit('show-error', {
                        operationTranslation: 'ATMOSPHEREERRORDELEtECONEECTIONINFO',
                        errorTranslation: 'ATMOSPHEREERRORDELEtECONEECTIONINFO',
                        errorMessage: "(status: " + error.status + ") " + (error.statusText ? error.statusText : "No error message.")
                      });
                      $scope.isLoading = false;
                    })
                }
              })
          }

          $scope.setConnectionInstance = function (connection, instanceName) {
            $atmosphere.setConnectionInstance(connection, instanceName);
          };

          $scope.clearConnectionInstance = function (connection) {
            $atmosphere.setConnectionInstance(connection, null);
          };

          $scope.filterByName = function (connection) {
            if ($scope.settings.filter.Connction !== '') {
              return connection['Connection Name'].indexOf($scope.settings.filter.Connction) >= 0;
            }
            return true;
          };

          $scope.logout = function () {
            $scope.isLoading = true;

            $atmosphere.logoutAtmosphere()
              .then(function () {
                $rootScope.$broadcast('atmosphere-logout', null);
                $scope.$emit('show-success', {
                  operationTranslation: 'ATMOSPHEREDIALOGTITLELOGOUT',
                  messageTranslation: 'ATMOSPHEREHISTORYCOLUMNSUCCESS'
                });
                $scope.resetData();
                $scope.isLoading = false;
              }, function () {
                $scope.$emit('show-error', {
                  operationTranslation: 'ATMOSPHEREOPERATIONLOGOUT',
                  messageTranslation: 'ATMOSPHEREERRORLOGOUT'
                });

                $scope.isLoading = false;
              });
          };

          $rootScope.$on("atmosphere-login-reload", function (event, args) {
            $scope.refreshData();
          });
        }]
    }
  }]);

arc.directive("atmosphereConnectionDeployProcessForm", function () {
  return {
    restrict: "EA",
    replace: true,
    scope: {
      data: "=arcModelData",
      options: "=arcOptions",
      dialog: "=arcDialog"
    },
    templateUrl: "__/plugins/atmosphere/directives/forms/connection-process-form.html",
    link: function ($scope, element, attrs) {

    },
    controller: ["$scope", "$rootScope", "$http", "$q", "$translate", "$timeout", "uuid2", "$atmosphere",
      function ($scope, $rootScope, $http, $q, $translate, $timeout, uuid2, $atmosphere) {
        $scope.id = uuid2.newuuid();
        $scope.data.domain = $atmosphere.getAtmosphereTenant();
      }]
  }
});

arc.directive("atmosphereConnectionCreateForm", function () {
  return {
    restrict: "EA",
    replace: true,
    scope: {
      data: "=arcModelData",
      options: "=arcOptions",
      dialog: "=arcDialog"
    },
    templateUrl: "__/plugins/atmosphere/directives/forms/connection-create-form.html",
    link: function ($scope, element, attrs) {

    },
    controller: ["$scope", "$rootScope", "$http", "$q", "$translate", "$timeout", "uuid2", "$atmosphere",
      function ($scope, $rootScope, $http, $q, $translate, $timeout, uuid2, $atmosphere) {
        $scope.id = uuid2.newuuid();
        $scope.data = {
          jsonValue: `{
   "atmosphere_connection_type": "tm1",
   "base_url": "https://pa-cloud-service/tm1/api/tm1", 
   "user": "user", 
   "namespace": "namespace", 
   "password": "...", 
   "ssl": true, 
   "verify": true, 
   "async_requests_mode": true, 
   "session_context": "Atmosphere"
}`};

        $scope.jsonValidateMessage = "";

        $scope.triggerFunction = function (event) {

        }

        $scope.$watch('data.jsonValue', function () {
          try {
            $scope.data.jsonValueObj = JSON.parse($scope.data.jsonValue);
            $scope.jsonValidateMessage = '';
          } catch (err) {
            $scope.data.jsonValueObj = "JSON format incorrect";
            $scope.jsonValidateMessage = 'JSON format incorrect';
          }
        })
      }]
  }
});

arc.directive("atmosphereLicenseUpdateForm", function () {
  return {
    restrict: "EA",
    replace: true,
    scope: {
      data: "=arcModelData",
      options: "=arcOptions",
      dialog: "=arcDialog"
    },
    templateUrl: "__/plugins/atmosphere/directives/forms/license-update-form.html",
    link: function ($scope, element, attrs) {

    },
    controller: ["$scope", "$rootScope", "$http", "$q", "$translate", "$timeout", "uuid2", "$atmosphere",
      function ($scope, $rootScope, $http, $q, $translate, $timeout, uuid2, $atmosphere) {
        $scope.id = uuid2.newuuid();
        $scope.data = {
          jsonValue: `{
    "tenant": "tenant name",
    "product_name": "ATMOSPHERE",
    "expiry_date": "xxxx-xx-xx 00:00:00",
    "signature": "..."
}`};

        $scope.jsonValidateMessage = "";

        $scope.triggerFunction = function (event) {

        }

        $scope.$watch('data.jsonValue', function () {
          try {
            $scope.data.jsonValueObj = JSON.parse($scope.data.jsonValue);
            $scope.jsonValidateMessage = '';
          } catch (err) {
            $scope.data.jsonValueObj = "JSON format incorrect";
            $scope.jsonValidateMessage = 'JSON format incorrect';
          }
        })
      }]
  }
});

arc.directive("atmosphereConnectionDeleteConfirmForm", function () {
  return {
    restrict: "EA",
    replace: true,
    scope: {
      data: "=arcModelData",
      options: "=arcOptions",
      dialog: "=arcDialog"
    },
    templateUrl: "__/plugins/atmosphere/directives/forms/connection-delete-confirm-form.html",
    link: function ($scope, element, attrs) {

    },
    controller: ["$scope", "uuid2",
      function ($scope, uuid2) {
        $scope.id = uuid2.newuuid();
      }]
  }
});

arc.directive("cubewiseAtmosphereFunctions", ['$rootScope', '$atmosphere', '$tm1', '$dialogs',
  function ($rootScope, $atmosphere, $tm1, $dialogs) {
    return {
      restrict: "EA",
      // replace: true,
      scope: {
        instance: "=instance",
        connection: "=connection",
        functions: "=functions",
        isActive: '=isActive'
      },
      templateUrl: "__/plugins/atmosphere/directives/tabs/functions.html",
      link: function ($scope, element, attrs) {

      },
      controller: ["$scope", "$rootScope", "$http", "$translate", "$timeout", "uuid2", "$settings", "$atmosphere",
        function ($scope, $rootScope, $http, $translate, $timeout, uuid2, $settings, $atmosphere) {
          $scope.id = uuid2.newuuid();
          $scope.data = {
            filteredFunctions: [],
            processes: [],
            filteredProcesses: []
          };

          $scope.functionsPanel = {
            key: 'functions',
            allChecked: false,
            filter: {
              function: ''
            },
            sortColumn: {
              'key': '"Function Name"',
              'direction': false
            },
            columns: [
              { key: '"Function Name"', translateKey: 'ATMOSPHERETITLEFUNCTIONNAME', display: true, width: 0 },
              { key: '"Function Type"', translateKey: 'ATMOSPHERETITLEFUNCTIONTYPE', display: true, width: 100 },
            ],
            pageState: {
              totalItems: -1,
              currentItems: -1,
              itemsPerPage: 20,
              currentPage: 1
            },
            pageOptions: {
              alwaysShow: false
            }
          };

          $scope.processesPanel = {
            key: 'processes',
            allChecked: false,
            filter: {
              process: '',
              selectedFunction: ''
            },
            sortColumn: {
              'key': 'Name',
              'direction': false
            },
            columns: [
              { key: 'Name', translateKey: 'ATMOSPHERETITLEPROCESSNAME', display: true, width: 0 },
              { key: null, translateKey: 'ATMOSPHERETITLEPROCESSEXECUTE', display: true, width: 100 }
            ],
            pageState: {
              totalItems: -1,
              currentItems: -1,
              itemsPerPage: 20,
              currentPage: 1
            },
            pageOptions: {
              alwaysShow: false
            }
          };


          // Track which functions are expanded
          $scope.expandedFunctions = {};

          // Toggle expanded state for a function
          $scope.toggleFunction = function (funcName) {
            $scope.expandedFunctions[funcName] = !$scope.expandedFunctions[funcName];
          };

          // Check if a function is expanded
          $scope.isExpanded = function (funcName) {
            return !!$scope.expandedFunctions[funcName];
          };

          // Get processes related to a function
          $scope.getProcessesForFunction = function (funcName) {
            if (!$scope.data.processes || !$scope.data.processes.length) return [];
            var matchStr = funcName.split('-').join('.');
            return $scope.data.processes.filter(function (proc) {
              return proc.Name.indexOf(matchStr) >= 0;
            });
          };

          if (!$scope.leftSplitterWidth)
            $scope.leftSplitterWidth = 456;

          $scope.sortBy = function (panelName, key) {
            if (!key) return;

            if ($scope[panelName].sortColumn.key === key) {
              $scope[panelName].sortColumn.direction = !$scope[panelName].sortColumn.direction;
            } else {
              $scope[panelName].sortColumn.key = key;
              $scope[panelName].sortColumn.direction = false;
            }
          };

          $scope.refreshData = function () {
            $scope.executionStatus = true;

            $scope.filterFunctions();

            var url = "/Processes?$select=Name,Parameters/Name,Parameters/Type&$filter=startswith(Name, '}atmosphere') eq true";
            return $tm1.async($scope.instance, 'GET', url)
              .then(function (data) {
                if (data && data.data && data.data.value) {
                  $scope.data.processes = data.data.value;
                  $scope.filterProcesses();

                  $scope.functionProcessMap = {};
                  _.each($scope.functions, function (func) {
                    $scope.functionProcessMap[func['Function Name']] = $scope.getProcessesForFunction(func['Function Name']);
                  });

                  $scope.executionStatus = false;
                }
              }, function (err) {
                $scope.data.processes = [];
                $scope.functionProcessMap = {};
                $scope.executionStatus = false;
              });
          };

          $scope.selectFunction = function (func) {
            if ($scope.processesPanel.filter.selectedFunction && $scope.processesPanel.filter.selectedFunction === func['Function Name']) {
              $scope.processesPanel.filter.selectedFunction = '';
            } else {
              $scope.processesPanel.filter.selectedFunction = func['Function Name'];
            }
          };

          $scope.deployProcesses = function () {
            $settings.settings()
              .then(function (settings) {

                var data = {
                  connection: $scope.connection,
                  update: false,
                  domains: settings.AtmosphereDomains,
                  domain: settings.AtmosphereDomains && settings.AtmosphereDomains.length > 0 ? settings.AtmosphereDomains[0].value : 'atmosphere-dev.run',
                  functionName: '',
                  functions: $scope.functions,
                  apiKey: "",
                  needApiKey: true
                };
                if (!_.isEmpty($rootScope.uiPrefs.atmosphereCredentials)) {
                  var credentials = JSON.parse($rootScope.uiPrefs.atmosphereCredentials);
                  if (credentials.apiKey) {
                    data.apiKey = credentials.apiKey;
                    data.needApiKey = false;
                  }
                }

                $dialogs.showDialog('atmosphereDeployConnectionTIDialog', data, null,
                  function (result) {
                    if (result.actionName === "OK") {
                      $scope.executionStatus = true;
                      $atmosphere.createProcesses(result.data.connection, result.data.update, result.data.domain, result.data.functionName, result.data.apiKey)
                        .then(function (data) {
                          $scope.executionStatus = false;
                          $scope.$emit('show-success', {
                            operationTranslation: 'ATMOSPHERETITLEDEPLOYTI',
                            messageTranslation: 'ATMOSPHERESUCCESS'
                          });
                        }, function (error) {
                          $scope.executionStatus = false;
                          $scope.$emit('show-error', {
                            operationTranslation: 'ATMOSPHERETITLEDEPLOYTI',
                            messageTranslation: 'ATMOSPHEREFAILED'
                          });
                        });
                    }
                  }
                );
              });
          };

          $scope.executeProcess = function (process) {
            $tm1.processExecute($scope.instance, process['Name'], null, true);
          };

          $scope.$watch('processesPanel.filter', function () {
            $scope.filterProcesses();
          }, true);

          $scope.filterProcesses = function () {
            $scope.data.filteredProcesses = $scope.data.processes
              .filter(
                function (item) {
                  var matched = true;
                  if ($scope.processesPanel.filter.selectedFunction && $scope.processesPanel.filter.selectedFunction !== '') {
                    var str = $scope.processesPanel.filter.selectedFunction.split('-').join('.');
                    matched = item['Name'].indexOf(str) >= 0;
                  }
                  return matched;
                })
              .filter(
                function (item) {
                  var matched = true;
                  if ($scope.processesPanel.filter.process) {
                    matched = item['Name'].indexOf($scope.processesPanel.filter.process) >= 0;
                  }
                  return matched;
                });

            $scope.processesPanel.pageState.totalItems = $scope.data.filteredProcesses.length;
            $scope.processesPanel.pageState.currentItems = $scope.data.filteredProcesses.length;
            $scope.$emit('heights-update');
          };

          $scope.$watch('functionsPanel.filter.function', function () {
            $scope.filterFunctions();
          });

          $scope.$watch('functions', function () {
            $scope.filterFunctions();
          });

          $scope.filterFunctions = function () {
            if ($scope.functionsPanel.filter.function) {
              $scope.data.filteredFunctions = $scope.functions.filter(function (item) {
                return item['Function Name'].indexOf($scope.functionsPanel.filter.function) >= 0;
              })
            } else {
              $scope.data.filteredFunctions = $scope.functions;
            }
            $scope.functionsPanel.pageState.totalItems = $scope.data.filteredFunctions.length;
            $scope.functionsPanel.pageState.currentItems = $scope.data.filteredFunctions.length;
            $scope.$emit('heights-update');
          };

          $scope.$watch('functions', function () {
            if ($scope.isActive && !$scope.dataLoaded)
              $scope.refreshData()
                .then(function () {
                  $scope.dataLoaded = true;
                }, function () {
                });
          });

          $scope.$watch('isActive', function () {
            if ($scope.isActive && !$scope.dataLoaded) {
              $scope.data.processes = [];
              // $scope.data.functions = [];
              $scope.processesPanel.pageState.totalItems = 0;
              $scope.processesPanel.pageState.currentItems = 0;
              $scope.processesPanel.pageState.totalItems = 0;
              $scope.processesPanel.pageState.currentItems = 0;
              $scope.refreshData()
                .then(function () {
                  $scope.dataLoaded = true;
                }, function () {
                });
            }
          });

          $scope.$on("atmosphere-portal-refresh", function (event, args) {
            if ($scope.isActive) {
              $scope.data.processes = [];
              // $scope.data.functions = [];
              $scope.processesPanel.pageState.totalItems = 0;
              $scope.processesPanel.pageState.currentItems = 0;
              $scope.processesPanel.pageState.totalItems = 0;
              $scope.processesPanel.pageState.currentItems = 0;
              $scope.refreshData()
                .then(function () {
                  $scope.dataLoaded = true;
                }, function () {
                });
            }
          });

        }]
    }
  }]);

arc.directive("cubewiseAtmosphereUsageHistory", ['$rootScope', '$atmosphere', function ($rootScope, $atmosphere) {
  return {
    restrict: "EA",
    // replace: true,
    scope: {
      instance: "=instance",
      functions: "=functions",
      connection: "=connection",
      isActive: '=isActive'
    },
    templateUrl: "__/plugins/atmosphere/directives/tabs/usage-history.html",
    link: function ($scope, element, attrs) {

    },
    controller: ["$scope", "$rootScope", "$http", "$translate", "$timeout", "uuid2", "$atmosphere",
      function ($scope, $rootScope, $http, $translate, $timeout, uuid2, $atmosphere) {
        $scope.id = uuid2.newuuid();
        $scope.data = {
          items: [],
          checkedNum: 0,
          itemNum: 0
        };
        $scope.settings = {
          key: 'history',
          columns: [
            { key: 'Function', translateKey: 'ATMOSPHEREHISTORYCOLUMNFUNCTION', display: true, width: 130 },
            { key: 'InvocationTime', translateKey: 'ATMOSPHEREHISTORYCOLUMNINVOCATIONTIMEUTC', display: true, width: 145 },
            { key: 'InvocationTimeLocal', translateKey: 'ATMOSPHEREHISTORYCOLUMNINVOCATIONTIMELOCAL', display: true, width: 145 },
            { key: 'StartTime', translateKey: 'ATMOSPHEREHISTORYCOLUMNSTARTTIMEUTC', display: true, width: 145 },
            { key: 'StartTimeLocal', translateKey: 'ATMOSPHEREHISTORYCOLUMNSTARTTIMELOCAL', display: true, width: 145 },
            { key: 'EndTime', translateKey: 'ATMOSPHEREHISTORYCOLUMNENDTIME', display: false, width: 145 },
            { key: 'EndTimeLocal', translateKey: 'ATMOSPHEREHISTORYCOLUMNENDTIMELOCAL', display: false, width: 145 },
            { key: 'Duration', translateKey: 'ATMOSPHEREHISTORYCOLUMNDURATION', display: true, width: 100 },
            { key: 'ExtractStepTime', translateKey: 'ATMOSPHEREHISTORYCOLUMNEXTRACTSTEPTIME', display: true, width: 140 },
            { key: 'TransformStepTime', translateKey: 'ATMOSPHEREHISTORYCOLUMNTRANSFORMSTEPTIME', display: true, width: 160 },
            { key: 'LoadStepTime', translateKey: 'ATMOSPHEREHISTORYCOLUMNLOADSTEPTIME', display: true, width: 130 },
            { key: 'Success', translateKey: 'ATMOSPHEREHISTORYCOLUMNSUCCESS', display: true, width: 90 }
          ],
          allChecked: false,
          sinceDateIsOpen: false,
          untilDateIsOpen: false,
          selectColumnsIsOpen: false,
          filter: {
            functionName: '',
            top: '1000',
            topOptions: ['10', '100', '1000'],
            sinceDate: '',
            untilDate: '',
            success: ''
          },
          sortColumn: {
            'key': 'InvocationTime',
            'direction': true
          },
          pageState: {
            totalItems: -1,
            currentItems: -1,
            itemsPerPage: 50,
            currentPage: 1
          },
          pageOptions: {
            alwaysShow: false
          }
        };

        $scope.refreshData = function () {
          $scope.executionStatus = true;

          return $atmosphere.getUsageHistory($scope.connection, $scope.settings.filter)
            .then(function (data) {
              $scope.data.items = data;
              $scope.data.itemNum = $scope.data.items.length;
              $scope.toggleChecked();
              $scope.executionStatus = false;
            }, function (error) {
              $scope.data.items = [];
              $scope.data.itemNum = 0;
              $scope.toggleChecked();
              $scope.$emit('show-error', {
                operationTranslation: 'ATMOSPHEREERRORGETHISTORYINFO',
                errorTranslation: 'ATMOSPHEREERRORGETHISTORYINFO',
                errorMessage: "(status: " + error.status + ") " + $helper.errorText(error)
              })
              $scope.executionStatus = false;
            });
        };

        $scope.toggleAllChecked = function () {
          $scope.settings.allChecked = !$scope.settings.allChecked;
          _.each($scope.data.items, function (item) {
            item.checked = $scope.settings.allChecked;
          });
          $scope.data.checkedNum = $scope.settings.allChecked ? $scope.data.items.length : 0;
        };

        $scope.toggleChecked = function (item) {
          if (item) {
            item.checked = !item.checked;
          }
          $scope.settings.allChecked = _.every($scope.data.items, 'checked');
          $scope.data.checkedNum = _.filter($scope.data.items, 'checked').length;
        };

        $scope.toggleColumnDisplay = function (key) {
          let column = $scope.settings.columns.find(function (n) { return n.key === key });
          if (column) {
            column.display = !column.display;
          }
        };

        $scope.sortBy = function (key) {
          if ($scope.settings.sortColumn.key === key) {
            $scope.settings.sortColumn.direction = !$scope.settings.sortColumn.direction;
          } else {
            $scope.settings.sortColumn.key = key;
            $scope.settings.sortColumn.direction = false;
          }
        };

        $scope.clearFilter = function (key) {
          $scope.settings.filter[key] = '';
        }

        $scope.export = function () {
          let rows = [];
          let headers = $scope.settings.columns.filter(function (col) { return col.display })
            .map(function (i) {
              return i.key
            });
          rows.push(headers);

          let index = 0;
          $scope.data.items.forEach(item => {
            if (item.checked) {
              var row = [];
              headers.forEach(function (key) {
                var value = item[key] ? item[key] + '' : '';
                row.push(value);
              })
              rows.push(row);
            }
          });

          if (rows.length > 1) {
            let csvContent = "data:text/csv;charset=utf-8,\ufeff"
              + rows.map(e => e.join(",")).join("\n");

            var encodedUri = encodeURI(csvContent);
            var link = document.createElement("a");

            link.setAttribute("href", encodedUri);
            link.setAttribute("download", "history_export.csv");
            document.body.appendChild(link); // Required for FF
            link.click();
            // link.remove(); 
          } else {
            $scope.$emit('show-error', {
              operationTranslation: 'ATMOSPHEREERROREXPORT',
              errorTranslation: 'ATMOSPHEREERROREXPORT',
              errorMessage: "No item selected"
            });
          }
        };

        $scope.$watch('functions', function () {
          if ($scope.isActive && !$scope.dataLoaded)
            $scope.refreshData()
              .then(function () {
                $scope.dataLoaded = true;
              }, function () {
              });
        });

        $scope.$watch('isActive', function () {
          if ($scope.isActive && !$scope.dataLoaded) {
            $scope.data.items = [];
            $scope.data.itemNum = 0;
            $scope.refreshData()
              .then(function () {
                $scope.dataLoaded = true;
              }, function () {
              });
          }
        });

        $scope.$watch('data.itemNum', function () {
          $scope.settings.pageState.totalItems = $scope.data.itemNum;
          $scope.settings.pageState.currentItems = $scope.data.itemNum;
          $scope.$emit('heights-update');
        })

        $scope.$on("atmosphere-portal-refresh", function (event, args) {
          if ($scope.isActive) {
            $scope.refreshData();
          }
        });
      }]
  }
}]);

arc.directive("cubewiseAtmosphereLogs", ['$rootScope', '$atmosphere', function ($rootScope, $atmosphere) {
  return {
    restrict: "EA",
    // replace: true,
    scope: {
      instance: "=instance",
      functions: "=functions",
      connection: "=connection",
      isActive: '=isActive'
    },
    templateUrl: "__/plugins/atmosphere/directives/tabs/logs.html",
    link: function ($scope, element, attrs) {

    },
    controller: ["$scope", "$rootScope", "$http", "$translate", "$timeout", "uuid2", "$atmosphere", "$q",
      function ($scope, $rootScope, $http, $translate, $timeout, uuid2, $atmosphere, $q) {
        $scope.id = uuid2.newuuid();
        $scope.data = {
          items: [],
          checkedNum: 0,
          itemNum: 0
        };

        $scope.settings = {
          filter: {
            functionName: ''
          },
          allChecked: false,
          levels: ["INFO"],
          sortColumn: {
            'key': 'Timestamp',
            'direction': true
          },
          pageState: {
            totalItems: -1,
            currentItems: -1,
            itemsPerPage: 50,
            currentPage: 1
          },
          pageOptions: {
            alwaysShow: false
          }
        }

        $scope.refreshData = function () {

          if (_.isEmpty($scope.settings.filter.functionName)) {
            $scope.data.items = [];
            $scope.data.itemNum = 0;
            return $q.resolve();
          }

          $scope.executionStatus = true;

          $atmosphere.getFunctionLogs($scope.connection, $scope.settings.filter.functionName)
            .then(function (data) {
              data.forEach(function (i) {
                i.Level = "";
                let strs = i.Message.split(" - ");
                if (strs.length > 1) {
                  // if(strs.length > 1 && $scope.settings.levels.indexOf(strs[0]) >= 0){
                  i.Message = strs[1]
                  i.Level = strs[0];
                }
              })
              $scope.data.items = data;
              $scope.data.itemNum = $scope.data.items.length;
              $scope.executionStatus = false;
            }, function (error) {
              $scope.$emit('show-error', {
                operationTranslation: 'ATMOSPHEREERRORGETHISTORYINFO',
                errorTranslation: 'ATMOSPHEREERRORGETHISTORYINFO',
                errorMessage: "(status: " + error.status + ") " + (error.statusText ? error.statusText : "No error message.")
              });
              $scope.executionStatus = false;
            });
        }

        $scope.toggleChecked = function (item) {
          if (item) {
            item.checked = !item.checked;
          }
          $scope.settings.allChecked = _.every($scope.data.items, 'checked');
          $scope.data.checkedNum = _.filter($scope.data.items, 'checked').length;
        };

        $scope.toggleAllChecked = function () {
          $scope.settings.allChecked = !$scope.settings.allChecked;
          _.each($scope.data.items, function (item) {
            item.checked = $scope.settings.allChecked;
          });
          $scope.data.checkedNum = $scope.settings.allChecked ? $scope.data.items.length : 0;
        };

        $scope.export = function () {
          let rows = [];
          let headers = ['Function', 'Time(UTC)', 'Time(Local)', 'Level', 'Message'];
          rows.push(headers);

          let index = 0;
          $scope.data.items.forEach(item => {
            if (item.checked) {
              var row = [];
              headers.forEach(function (key) {
                var value = '';
                if (key === 'Function') {
                  value = $scope.settings.filter.functionName;
                } else {
                  value = item[key] ? item[key] + '' : '';
                  if (key === 'Mesage') {
                    value = value.replaceAll("\n", " ").replaceAll(",", " ");
                  } else if (key === 'Time(UTC)') {
                    value = item['Timestamp'];
                  } else if (key === 'Time(Local)') {
                    value = item['TimestampLocal'];
                  }
                }
                row.push(value);
              })
              rows.push(row);
            }
          });
          if (rows.length > 1) {
            let csvContent = "data:text/csv;charset=utf-8,\ufeff"
              + rows.map(e => e.join(",")).join("\n");

            var encodedUri = encodeURI(csvContent);

            var link = document.createElement("a");

            link.setAttribute("href", encodedUri);
            link.setAttribute("download", "log_export.csv");
            document.body.appendChild(link); // Required for FF
            link.click();
            // link.remove(); 
          } else {
            $scope.$emit('show-error', {
              operationTranslation: 'ATMOSPHEREERROREXPORT',
              errorTranslation: 'ATMOSPHEREERROREXPORT',
              errorMessage: "No item selected"
            });
          }
        };

        $scope.$watch('functions', function () {
          if ($scope.isActive && !$scope.dataLoaded)
            $scope.refreshData()
              .then(function () {
                $scope.dataLoaded = true;
              }, function () {
              });
        });

        $scope.$watch('isActive', function () {
          if ($scope.isActive && !$scope.dataLoaded) {
            $scope.data.items = [];
            $scope.data.itemNum = 0;
            $scope.refreshData()
              .then(function () {
                $scope.dataLoaded = true;
              }, function () {
              });
          }
        });

        $scope.$watch('data.itemNum', function () {
          $scope.settings.pageState.totalItems = $scope.data.itemNum;
          $scope.settings.pageState.currentItems = $scope.data.itemNum;
          $scope.$emit('heights-update');
        });

        $scope.$on("atmosphere-portal-refresh", function (event, args) {
          if ($scope.isActive) {
            $scope.refreshData();
          }
        });
      }]
  }
}]);

arc.directive("cubewiseAtmosphereQuota", ['$rootScope', '$atmosphere', function ($rootScope, $atmosphere) {
  return {
    restrict: "EA",
    // replace: true,
    scope: {
      instance: "=instance",
      connection: "=connection",
      isActive: '=isActive'
    },
    templateUrl: "__/plugins/atmosphere/directives/tabs/quota.html",
    link: function ($scope, element, attrs) {

    },
    controller: ["$scope", "$rootScope", "$http", "$translate", "$timeout", "uuid2", "$atmosphere", "$q",
      function ($scope, $rootScope, $http, $translate, $timeout, uuid2, $atmosphere, $q) {
        $scope.id = uuid2.newuuid();
        $scope.data = {
          items: []
        };

        $scope.settings = {

        }

        $scope.refreshData = function () {
          $scope.executionStatus = true;

          return $atmosphere.getFunctionQuota($scope.connection)
            .then(function (data) {
              $scope.data.items = data;
              $scope.data.items.forEach(function (item) {
                item.periodElapsedProgressClass = $scope.progressClass(item['% Period Elapsed']);
                item.runtimeUsedProgressClass = $scope.progressClass(item['% Runtime Used']);
                item.availableRuntimeStr = $scope.timeStr(item['Available Runtime in Minutes']);
                item.actualRuntimeStr = $scope.timeStr(item['Actual Runtime in Minutes']);
              })
              $scope.executionStatus = false;
            }, function (error) {
              $scope.$emit('show-error', {
                operationTranslation: 'ATMOSPHEREERRORGETQUOTAINFO',
                errorTranslation: 'ATMOSPHEREERRORGETQUOTAINFO',
                errorMessage: "(status: " + error.status + ") " + (error.statusText ? error.statusText : "No error message.")
              });
              $scope.executionStatus = false;
            });
        }

        $scope.progressClass = function (value) {
          var v = parseInt(value);
          if (v < 60) {
            return 'progress-bar-success';
          } else if (v >= 60 && v < 80) {
            return 'progress-bar-warning';
          } else {
            return 'progress-bar-danger';
          }
        }

        $scope.timeStr = function (min) {
          min = min || 0;
          var strs = (min + "").split(".");
          var minStr = strs[0] + "min ";
          if (strs[0] === "0" && strs.length > 1) {
            minStr = "";
          }
          var secStr = "";
          if (strs.length > 1) {
            secStr = parseInt(parseFloat("0." + strs[1]) * 60) + 'sec';
          }
          return minStr + secStr;
        }

        $scope.$watch('isActive', function () {
          if ($scope.isActive && !$scope.dataLoaded) {
            $scope.data.items = [];
            $scope.refreshData()
              .then(function () {
                $scope.dataLoaded = true;
              }, function () {
              });
          }
        });

        $scope.$on("atmosphere-portal-refresh", function (event, args) {
          if ($scope.isActive) {
            $scope.refreshData();
          }
        });
      }]
  }
}]);

arc.directive("cubewiseAtmospherePortal", function () {
  return {
    restrict: "EA",
    replace: true,
    scope: {
      instance: "=tm1Instance"
    },
    templateUrl: "__/plugins/atmosphere/directives/portal.html",
    link: function ($scope, element, attrs) {

    },
    controller: ["$scope", "$rootScope", "$http", "$q", "$translate", "$timeout", "uuid2", "$helper", "$settings", "$dialogs", "Notification", "$atmosphere", "$tm1",
      function ($scope, $rootScope, $http, $q, $translate, $timeout, uuid2, $helper, $settings, $dialogs, Notification, $atmosphere, $tm1) {

        $scope.id = uuid2.newuuid();

        $scope.hasAtmosphere = $atmosphere.hasAtmosphere();
        $scope.atmosphereUrl = $atmosphere.getAtmosphereUrl();
        $scope.atmosphereMessage = !$scope.hasAtmosphere ? 'ATMOSPHEREURLNOTFOUNDMESSAGE' : null;

        $scope.iconStates = {
          refreshing: { class: 'fa-refresh', spin: true, disabled: true },
          disabled: { disabled: true },
          enabled: { disabled: false }
        };

        if (!$scope.leftSplitterWidth)
          $scope.leftSplitterWidth = 456;

        $scope.global = {
          connection: null,
          connections: [],
          functions: [],
          activeTab: 'functions',
          pageOptions: {
            alwaysShow: false
          },
          pageItemNumber: {
            connections: null,
            functions: null,
            history: null
          }
        };

        $scope.showSuccess = function (operationTranslation, messageTranslation, message) {
          Notification.success({
            title: "<i class='fa fa-globe'></i> " + $helper.translate(operationTranslation) + "</b>",
            message: "<i class='fa fa-check'></i> " + $helper.translate(messageTranslation, { message: (message ? message : "") })
          });
        };

        $scope.showError = function (operationTranslation, errorTranslation, errorMessage) {
          Notification.error({
            title: "<i class='fa fa-globe'></i> " + $helper.translate(operationTranslation) + "</b>",
            message: "<i class='fa fa-remove'></i> " + $helper.translate(errorTranslation, { errorMessage: (errorMessage ? errorMessage : "No error message.") })
          });
        };

        $scope.help = function () {
          $dialogs.helpDialog(['plugins/atmosphere/overview'], 'ATMOSPHEREPORTALHELP');
        };

        $scope.updateHeights = function () {
          $timeout(function () {
            $rootScope.$broadcast("auto-height-resize");
          });
        };

        $scope.tabChanged = function (tabName) {
          $scope.updateHeights();
          $scope.global.activeTab = tabName;
        };

        $scope.loadConnection = function () {
          $scope.global.connection = _.findKey($rootScope.uiPrefs.atmosphereConnections, function (instanceName) {
            return instanceName == $scope.instance;
          });

          $scope.initialized = true;
        };

        $scope.loadFunctions = function () {
          if (!$scope.global.connection) return;
          if ($scope.executionStatus) return;
          $scope.executionStatus = true;

          $atmosphere.getFunctionInfo($scope.global.connection)
            .then(function (data) {
              var functions = _.sortBy(data.functions, function (item) {
                return item['Function Name'];
              });

              $scope.global.functions = _.filter(functions, function (item) {
                return item['Function Type'] != 'Coordination Function' && item['Function Name'] != 'init' && item['Function Name'] != 'poll';
              });

              $scope.global.functionsUsage = _.filter(functions, function (item) {
                return item['Function Type'] != 'Coordination Function';
              });

              $scope.global.functionsLogs = _.filter(functions, function (item) {
                return item['Function Type'] != 'Coordination Function' && item['Function Name'] != 'init' && item['Function Name'] != 'poll';
              });

              $scope.executionStatus = false;
            }, function (error) {
              $scope.global.functions = [];

              if ($scope.hasAtmosphere) $scope.showError('ATMOSPHEREERRORGETFUNCTIONINFO', 'ATMOSPHEREERRORGETFUNCTIONINFO', "(status: " + error.status + ") " + $helper.errorText(error));

              $scope.executionStatus = false;
            });
        };

        $scope.loadConnection();

        $scope.reset = function () {
          $scope.updateHeights();
        };

        $scope.toggleCredentials = function () {
          $rootScope.uiPrefs.atmosphereStoreCredentials = !$rootScope.uiPrefs.atmosphereStoreCredentials;
          if (!$rootScope.uiPrefs.atmosphereStoreCredentials) {
            $rootScope.uiPrefs.atmosphereCredentials = null;
          } else {
            $rootScope.atmosphereLoginRequired();
          }
        };

        $scope.updateLicense = function () {
          $atmosphere.showUpdateLicense($scope);
        }

        $scope.refresh = function () {
          if ($scope.global.activeTab === 'functions') {
            $scope.loadConnection();
            $scope.loadFunctions();
          }
          $rootScope.$broadcast('atmosphere-portal-refresh');
        };

        $scope.showConnectionsDialog = function (tm1Only) {
          $atmosphere.showConnectionsDialog(tm1Only);
        };

        //init
        $settings.settings()
          .then(function (settings) {
            $scope.reset();
            // $scope.atmosphereURL = settings.AtmosphereURL;
          });

        $scope.$watch('global.connection', function () {
          if ($scope.global.connection) {
            $scope.loadFunctions();
          } else {
            $scope.global.functions = [];
          }
        });

        $scope.$on("update-atmosphere-connection", function (event, args) {
          $scope.loadConnection();
        });

        $scope.$on('show-error', function (event, args) {
          var operationTranslation = args.operationTranslation || 'ATMOSPHEREERRORNORMAL';
          var errorTranslation = args.errorTranslation || 'ATMOSPHEREERRORNORMAL';
          $scope.showError(operationTranslation, errorTranslation, args.errorMessage);
        });

        $scope.$on('show-success', function (event, args) {
          var operationTranslation = args.operationTranslation || 'ATMOSPHEREERRORNORMAL';
          var messageTranslation = args.messageTranslation || 'ATMOSPHEREERRORNORMAL';
          $scope.showSuccess(operationTranslation, messageTranslation, args.message);
        });

        $scope.$on('heights-update', function (event, args) {
          $scope.updateHeights();
        });

        //Close the tab
        $scope.$on("close-tab", function (event, args) {
          // Event to capture when a user has clicked close on the tab
          if (args.page == "cubewiseAtmospherePortal" && args.instance == $scope.instance) {
            // The page matches this one so close it
            $rootScope.close(args.page, { instance: $scope.instance });
          }
        });

        //Trigger an event after the plugin closes
        $scope.$on("$destroy", function (event) { });

        $scope.$on("atmosphere-logout", function (event, args) {
          $scope.global.connection = null;
          $scope.global.connections = [];
          $scope.global.functions = [];
          $scope.global.activeTab = 'functions';
        });

        $scope.$on("atmosphere-login-reload", function (event, args) {
          $scope.refresh();
        })
      }]
  };
});

arc.run(['$rootScope', '$helper', '$dialogs', '$atmosphere', 'Notification',
  function ($rootScope, $helper, $dialogs, $atmosphere, Notification) {
    // Register atmophere dialogs

    // Login
    $dialogs.registerDialog('atmosphereLoginDialog', {
      title: 'ATMOSPHEREDIALOGTITLELOGIN',
      directive: 'atmosphereLoginForm',
      icon: 'fa-globe',
      size: 'small',
      okButtonLabel: "Login",
      okButtonClass: 'btn-success',
      okButtonDisabled: function (data, options) {
        return false
      }
    });

    // Expose the login dialog via a function on the rootScope
    $rootScope.atmosphereLoginRequired = function (instance, options) {
      return $atmosphere.atmosphereLoginRequired(instance, options);
    };

    $dialogs.registerDialog('atmosphereConnectionsDialog', {
      title: 'ATMOSPHEREDIALOGTITLECONNECTIONS',
      directive: 'atmosphereConnectionsForm',
      icon: 'fa-exchange',
      size: 'large dialog-vh',
      okButtonClass: 'd-none',
      cancelButtonLabel: "CLOSE"
    });

    // Create Processes
    $dialogs.registerDialog('atmosphereDeployConnectionTIDialog', {
      title: 'ATMOSPHERETITLETIDEPLOY',
      directive: 'atmosphereConnectionDeployProcessForm',
      icon: 'fa-globe',
      size: 'middle',
      okButtonLabel: "Deploy",
      okButtonClass: 'btn-success',
      okButtonDisabled: function (data, options) {
        return false
      }
    });

    // Create Connection
    $dialogs.registerDialog('atmosphereConnectionCreateDialog', {
      title: 'ATMOSPHEREDIALOGTITLECONNECTIONCREATE',
      directive: 'atmosphereConnectionCreateForm',
      icon: 'fa-globe',
      size: 'middle',
      okButtonLabel: "Create",
      okButtonClass: 'btn-success',
      okButtonDisabled: function (data, options) {
        return false
      }
    });

    // License Update
    $dialogs.registerDialog('atmosphereLicenseUpdateDialog', {
      title: 'ATMOSPHERELABELUPDATELICENSE',
      directive: 'atmosphereLicenseUpdateForm',
      icon: 'fa-id-card-o',
      size: 'middle',
      okButtonLabel: "Update",
      okButtonClass: 'btn-success',
      okButtonDisabled: function (data, options) {
        return false
      }
    });

    $dialogs.registerDialog('atmosphereConnectionDeleteConfirmDialog', {
      title: 'ATMOSPHERECOLUMNHEADERCONNECTIONDELETE',
      directive: 'atmosphereConnectionDeleteConfirmForm',
      icon: 'fa-globe',
      size: 'small',
      okButtonLabel: "Delete",
      okButtonClass: 'btn-danger',
      okButtonDisabled: function (data, options) {
        return false
      }
    });


  }]);

arc.config(['$httpProvider', function ($httpProvider) {
  $httpProvider.interceptors.push('atmosphereHttpResponseInterceptor');
}]);

//Handle http errors
arc.factory('atmosphereHttpResponseInterceptor', ['$q', '$location', '$rootScope',
  function ($q, $location, $rootScope) {
    return {
      responseError: function (rejection) {
        var parts = rejection.config ? rejection.config.url.split("/") : null;
        if (parts && parts[0].toLowerCase() === "_atmosphere") {
          switch (rejection.status) {
            case 401:
              $rootScope.atmosphereLoginRequired()
                .then(function () {
                  // console.log('login success');
                }, function () {
                  console.error('Atmosphere login failed');
                  Notification.error('Atmosphere login failed');
                });
              return rejection;
            case 403:
              $rootScope.atmosphereLoginRequired()
                .then(function () {
                  // console.log('login success');
                }, function () {
                  console.error('Atmosphere login failed');
                  Notification.error('Atmosphere login failed');
                });
              return rejection;
          }
        }
        return $q.reject(rejection);
      }
    }
  }]);