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

    this.atmosphereAPIConnectionInfoFunctionName = 'connection-info';
    this.atmosphereAPIFunctionInfoFunctionName = 'function-info';
    this.atmosphereAPIUsageInfoFunctionName = 'usage-info';
    this.atmosphereAPILogsInfoFunctionName = 'logs-info';
    this.atmosphereAPIUpdateSecretFunctionName = 'update-secret';
    this.atmosphereAPIIPInfoFunctionName = 'ip-info';
    this.atmosphereAPICreateProcessesFunctionName = 'create-processes';
    this.atmosphereAPIPingConnectionFunctionPrefix = 'ping-';
    this.atmosphereAPIValueConnectionNone = null;

    // Turn on big buttons by default
    if (!$rootScope.uiPrefs.atmospherePortalBigButtons) {
      $rootScope.uiPrefs.atmospherePortalBigButtons = true;
    }

    this.hasAtmosphere = function() {
      if(!$rootScope.settings) return null;
      return !_.isEmpty($rootScope.settings.AtmosphereURL);
    };

    this.getAtmosphereUrl = function() {
      if(!$rootScope.settings) return null;
      return $rootScope.settings.AtmosphereURL;
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
            console.log('loginAtmosphere status incorrect', success);
            $rootScope.uiPrefs.atmosphereIsLoggedIn = false;
            defer.reject(new Error('loginAtmosphere status incorrect'));
          }
        }, function (error) {
          console.error('loginAtmosphere error', error);
          $rootScope.uiPrefs.atmosphereIsLoggedIn = false;
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
            $rootScope.uiPrefs.atmosphereIsLoggedIn = false;
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
          console.log(success)
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

      _service.runFunctionAsync(_service.atmosphereAPIValueConnectionNone, _service.atmosphereAPIConnectionInfoFunctionName, {})
        .then(function (data) {
          var status = data.status_code;
          if (status === 200) {
            var connections = data.value;
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
      _service.runFunctionAsync(connectionName, _service.atmosphereAPIFunctionInfoFunctionName, { function_name: functionName })
        .then(function (data) {
          var status = data.status_code;
          if (status === 200) {
            defer.resolve({ functions: data.value });
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
      var m = moment(seconds, 's');
      return m.isValid() ? m.format('mm:ss') : '';
    }

    this.getUsageHistory = function (connectionName, filter) {
      var defer = $q.defer();

      var parameters = {
        function_name: filter.functionName,
        top: filter.top !== '' ? parseInt(filter.top) : "",
        since: filter.sinceDate !== '' ? parseDate(filter.sinceDate) : "",
        until: filter.untilDate !== '' ? parseDate(filter.untilDate) : ""
      };

      _service.runFunctionAsync(connectionName, _service.atmosphereAPIUsageInfoFunctionName, parameters)
        .then(function (data) {
          var status = data.status_code;
          if (status === 200) {
            if (filter.success !== '') {
              data.value = data.value.filter(function (i) {
                return i.Success !== null && ("" + i.Success).toLowerCase() === filter.success;
              });
            }
            defer.resolve(data.value.map(function (i) {
              var r = _.merge({}, i, {
                InvocationTime: parseDateTime(i.InvocationTime),
                StartTime: parseDateTime(i.StartTime),
                Duration: parseTime(i['Duration (secs)']),
                ExtractStepTime: parseTime(i.ExtractStepTime),
                LoadStepTime: parseTime(i.LoadStepTime),
                TransformStepTime: parseTime(i.TransformStepTime),
                EndTime: parseDateTime(i.EndTime)
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

      _service.runFunctionAsync(connectionName, _service.atmosphereAPILogsInfoFunctionName, parameters)
        .then(function (data) {
          var status = data.status_code;
          if (status === 200) {
            defer.resolve(data.value);
          } else {
            defer.reject(new Error('getLogs status incorrect'));
          }
        }, function (error) {
          console.error('getLogs failed', error);
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
            var functionName = success.data[connectionType];
            var parameters = {
              "tm1_connection": connectionName
            };

            console.log('running', connectionName, functionName, parameters);

            _service.runFunctionAsync(connectionName, functionName, parameters)
              .then(function (data) {
                console.log(data);
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

    this.showConnectionsDialog = function () {
      $dialogs.showDialog('atmosphereConnectionsDialog', null, null, null);
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
          $scope.instance = $scope.options.instance;
          $scope.globalConnectionName = $scope.options.globalConnectionName;
          $scope.isActive = $scope.options.isActive;

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

          $scope.connectionIconStyles = _.mapValues($atmosphere.connectionIcons, function (connectionIcon, connectionType) {
            return {
              borderStyle: connectionIcon.accentColor ? $helper.createHSLColourBorder(connectionIcon.accentColor) : $helper.generateHSLColourBorder(connectionType),
              searchIconStyle: connectionIcon.accentColor ? $helper.createHSLColourText(connectionIcon.accentColor) : $helper.generateHSLColourText(connectionType),
              connectionIconStyle: $helper.createHSLColourText('#888')
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
              { key: 'testStatus', translateKey: 'ATMOSPHERECOLUMNHEADERCONNECTIONTESTSTATUS', display: true, width: -1 }
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
            icon.checked = !icon.checked;
            $scope.settings.filter['Connection Type'] = _.filter($scope.connectionIcons, 'checked').map(function (icon) {
              return icon.connectionType;
            });
          };

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

            $atmosphere.getConnectionInfo()
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

            console.log('testConnection', connection);

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
                  // console.log(result.data)
                  var name = result.data.name;
                  var settingType = result.data.settingType;

                  var secret_value = result.data.value || "";
                  if (settingType === "tm1UserPassword") {
                    var base_url = result.data.baseurl || "";
                    var user = result.data.user || "";
                    var atmosphere_connection_type = "tm1";
                    var namespace = result.data.namespace || "";
                    var password = result.data.password || "";
                    var ssl = result.data.ssl || false;
                    secret_value = `
                    {\"base_url\": \"${base_url}\", 
                    \"user\": \"${user}\", 
                    \"namespace\": \"${namespace}\", 
                    \"password\": \"${password}\",
                    \"atmosphere_connection_type\": \"${atmosphere_connection_type}\", 
                    \"ssl\": ${ssl}, 
                    \"verify\": true,
                    \"async_requests_mode\": true,
                    \"session_context\": \"Atmosphere\"}`;
                  } else if (settingType === "json") {
                    secret_value = [];
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
                $scope.$emit('atmosphere-logout', null);
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
            if ($scope.isActive) {
              $scope.refreshData();
            }
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
          settingType: "tm1UserPassword",
          jsonValue: `{"atmosphere_connection_type": "tm1",
          "base_url": "https://company.planning-analytics.ibmcloud.com/tm1/api/tm1", 
          "user": "company01_tm1_automation", 
          "namespace": "LDAP", 
          "password": "...", 
          "ssl": true, 
          "verify": true, 
          "async_requests_mode": true, 
          "session_context": "Atmosphere"}`
        };

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
                  $scope.executionStatus = false;
                }
              }, function (err) {
                $scope.data.processes = [];
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
            if ($scope.isActive)
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
            { key: 'InvocationTime', translateKey: 'ATMOSPHEREHISTORYCOLUMNINVOCATIONTIME', display: true, width: 145 },
            { key: 'StartTime', translateKey: 'ATMOSPHEREHISTORYCOLUMNSTARTTIME', display: true, width: 145 },
            { key: 'EndTime', translateKey: 'ATMOSPHEREHISTORYCOLUMNENDTIME', display: false, width: 145 },
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
          if ($scope.isActive)
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

        $rootScope.$on("atmosphere-login-reload", function (event, args) {
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
          let headers = ['Function', 'Timestamp', 'Message'];
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
          if ($scope.isActive)
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

          $scope.executionStatus = true;

          $atmosphere.getFunctionInfo($scope.global.connection)
            .then(function (data) {
              $scope.global.functions = _.filter(data.functions, function (item) {
                return item['Function Type'] != 'Coordination Function' && item['Function Name'] != 'init' && item['Function Name'] != 'poll';
              });

              $scope.global.functionsUsage = _.filter(data.functions, function (item) {
                return item['Function Type'] != 'Coordination Function';
              });

              $scope.global.functionsLogs = _.filter(data.functions, function (item) {
                return item['Function Type'] != 'Coordination Function' && item['Function Name'] != 'init' && item['Function Name'] != 'poll';
              });

              $scope.executionStatus = false;
            }, function (error) {
              $scope.global.functions = [];

              if($scope.hasAtmosphere) $scope.showError('ATMOSPHEREERRORGETFUNCTIONINFO', 'ATMOSPHEREERRORGETFUNCTIONINFO', "(status: " + error.status + ") " + $helper.errorText(error));

              $scope.executionStatus = false;
            });
        };

        $scope.$watch('global.connection', function () {
          if ($scope.global.connection) {
            $scope.loadFunctions();
          } else {
            $scope.global.functions = [];
          }
        });

        $scope.loadConnection();

        $scope.reset = function () {
          $scope.updateHeights();
        };

        $scope.toggleCredentials = function () {
          $rootScope.uiPrefs.atmosphereStoreCredentials = !$rootScope.uiPrefs.atmosphereStoreCredentials;
          if (!$rootScope.uiPrefs.atmosphereStoreCredentials) {
            $rootScope.uiPrefs.atmosphereCredentials = null;
          }
        };

        $scope.refresh = function () {
          $scope.loadConnection();
          $scope.loadFunctions();
        };

        $scope.showConnectionsDialog = function () {
          $atmosphere.showConnectionsDialog();
        };

        //init
        $settings.settings()
          .then(function (settings) {
            $scope.reset();
            $scope.atmosphereURL = settings.AtmosphereURL;
          });

        //Trigger an event after the login screen
        $scope.$on("login-reload", function (event, args) { });

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
      }]
  };
});

arc.run(['$rootScope', '$helper', '$dialogs', '$atmosphere',
  function ($rootScope, $helper, $dialogs, $atmosphere) {
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