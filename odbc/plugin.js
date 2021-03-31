
// Uncomment the code arc.run.. below to enable this plugin



arc.run(['$rootScope', function ($rootScope) {

   $rootScope.plugin("arcDatabaseConnect", "ODBC", "page", {
      menu: "tools",
      icon: "fa-database",
      description: "This plugin can be used to compare two objects",
      author: "Cubewise",
      url: "https://github.com/cubewise-code/arc-plugins",
      version: "1.0.0"
   });

}]);



arc.directive("arcDatabaseConnect", function () {
   return {
      restrict: "EA",
      replace: true,
      scope: {
         instance: "=tm1Instance"
      },
      templateUrl: "__/plugins/odbc/template.html",
      link: function ($scope, element, attrs) {

      },
      controller: ["$scope", "$rootScope", "$http", "$tm1", "$translate", "$timeout", "$helper", "$interval", "$document", function ($scope, $rootScope, $http, $tm1, $translate, $timeout, $helper, $interval, $document) {

         $rootScope.uiPrefs.showSQLChecked = true;
         $rootScope.uiPrefs.showSQLHistory = true;

         if(!$rootScope.uiPrefs.maxRows){
            $rootScope.uiPrefs.maxRows = 1000;
         }

         $scope.hotGrid = {};
         $scope.selections = {findText: ""};

         if (!$rootScope.uiPrefs.odbcSplitter) {
            $rootScope.uiPrefs.odbcSplitter = "150px";
         }

         $scope.odbc = { activeTabIndex: 1 };


         $scope.splitDown = function (e) {
            e.preventDefault();
            $scope.splitClicked = true;
            $scope.mdxTop = $(e.target).prev().offset().top + 7;
            $document.on('mousemove', $scope.splitMove);
            $document.on('mouseup', $scope.splitUp);
         };



         $scope.splitMove = function (e) {
            if ($scope.splitClicked) {
               var height = e.clientY - $scope.mdxTop;
               if (height < 0) {
                  height = 0;
               }
               $rootScope.uiPrefs.odbcSplitter = height + "px";
               $scope.$apply();
            }
         };

         $scope.splitUp = function (e) {
            if ($scope.splitClicked) {
               $document.unbind('mousemove', $scope.splitMove);
               $document.unbind('mouseup', $scope.splitUp);
            }
            $scope.splitClicked = false;
            $scope.$broadcast("auto-height-resize");
         };

         $scope.clearMDXHistory = function () {
            $rootScope.uiPrefs.sqlHistory = [];
         }

         $scope.clearMDXChecked = function () {
            $rootScope.uiPrefs.sqlChecked = [];
         }

         $scope.clearAllHistory = function () {
            $scope.clearMDXHistory();
            $scope.clearMDXChecked();
         }

         if (!$rootScope.uiPrefs.sqlHistory || $rootScope.uiPrefs.sqlHistory.length === 0) {
            $scope.clearMDXHistory();
         }

         if (!$rootScope.uiPrefs.sqlChecked || $rootScope.uiPrefs.sqlChecked.length === 0) {
            $scope.clearMDXChecked();
         }

         if (!$rootScope.uiPrefs.odbc) {
            $rootScope.uiPrefs.odbc = {};
         }

         var addEvents = function (editor) {

            editor.commands.addCommand({
               name: 'goBack',
               bindKey: {
                  win: 'Alt-Left',
                  mac: 'Alt-Left',
                  sender: 'editor|cli'
               },
               exec: function () {
                  $rootScope.goBack();
               }
            });

            editor.commands.addCommand({
               name: 'goForward',
               bindKey: {
                  win: 'Alt-Right',
                  mac: 'Alt-Right',
                  sender: 'editor|cli'
               },
               exec: function () {
                  $rootScope.goForward();
               }
            });

            editor.container.addEventListener("drop", function (e) {
               $scope.handleDrop(editor, e);
            }, true);

         };

         $scope.sqlEditorLoaded = function (_editor) {

            $scope.$sqlEditor = _editor;
            $scope.$sqlEditor.processProcedure = "SQL";
            $scope.$sqlEditor.setTheme($rootScope.uiPrefs.editorTheme);
            $scope.$sqlEditor.getSession().setMode("ace/mode/sql");
            $scope.$sqlEditor.getSession().setOptions({
               tabSize: $rootScope.uiPrefs.editorTabSpaces,
               useSoftTabs: $rootScope.uiPrefs.editorSoftTabs
            });
            $scope.$sqlEditor.$blockScrolling = Infinity;
            $scope.$sqlEditor.setFontSize($rootScope.uiPrefs.fontSize);
            $scope.$sqlEditor.setShowPrintMargin(false);
            $scope.$sqlEditor.getSession().setUseWrapMode($rootScope.uiPrefs.editorWrapLongLines);
            $scope.$sqlEditor.setOptions({
               enableBasicAutocompletion: false,
               enableLiveAutocompletion: false
            });

            addEvents($scope.$sqlEditor);

            var sqlTimer = $interval(function () {
               if ($rootScope.uiPrefs.odbc.sql) {
                  $scope.$sqlEditor.setValue($rootScope.uiPrefs.odbc.sql, -1);
                  $scope.$sqlEditor.getSession().setUndoManager(new ace.UndoManager());
               }
               $interval.cancel(sqlTimer);
            }, 50);
         };


         $scope.sqlChanged = function () {
            if ($scope.$sqlEditor) {
               $rootScope.uiPrefs.odbc.sql = $scope.$sqlEditor.getValue();
            }
         };

         $tm1.instance($scope.instance).then(function (i) {
            $scope.instanceObject = i;

            $scope.dimensions = [];
            _.each($scope.instanceObject.dimensions, function (d) {
               if (d.Hierarchies.length === 1) {
                  $scope.dimensions.push(d.Name);
               } else {
                  _.each(d.Hierarchies, function (h) {
                     if (h.Name === d.Name) {
                        $scope.dimensions.push(d.Name);
                     } else {
                        $scope.dimensions.push(d.Name + ":" + h.Name);
                     }
                  });
               }
            });

            if ($helper.versionCompare($scope.instanceObject.ProductVersion, "11.3.0") >= 0) {
               $scope.odbcDSNSelect = true;
               $http.get(encodeURIComponent($scope.instance) + "/SQLDataSources").then(function (success, error) {
                  if (success.status == 200) {
                     $scope.odbcDataSources = success.data.value;
                     datasourceCheck();
                  }
               });
            }

            var datasourceCheck = function () {
               if ($scope.odbcDataSources && $scope.process && $scope.process.DataSource && $scope.Type == "ODBC" && $rootScope.uiPrefs.odbc.dataSourceNameForServer) {
                  if (!_.find($scope.odbcDataSources, { Name: $rootScope.uiPrefs.odbc.dataSourceNameForServer })) {
                     $scope.odbcDataSources.push({
                        Name: $rootScope.uiPrefs.odbc.dataSourceNameForServer,
                        Description: $helper.translate("DATASOURCENOTFOUND")
                     });
                  }
               }
            }

            $scope.odbcPreview = function (dataSource) {

               var sendDate = (new Date()).getTime();

               var query = {
                  DSN: $rootScope.uiPrefs.odbc.dataSourceNameForServer,
                  UserName: $rootScope.uiPrefs.odbc.userName,
                  Password: $rootScope.uiPrefs.odbc.password,
                  SQL: $rootScope.uiPrefs.odbc.sql,
                  MaxRows: $rootScope.uiPrefs.maxRows
               };

               $scope.odbcError = null;
               $scope.odbcResult = null;
               $scope.result = {
                  headers: [],
                  rows: [],
                  table: {},
                  dimensions: {rows:[]}
               };

               //find SQL dynamic parameters
               var sqlParameters = [];
               var findSqlParameters = /\?([a-zA-Z0-9_\u00a1-\uffff]*)\?/g
               var match = "";
               while ((match = findSqlParameters.exec(query.SQL)) != null) {
                  // Add the sql parameter and set the default replacement value to an empty string
                  sqlParameters.push({
                     name: match[1],
                     value: ""
                  });
               }

               // Find the sql parameters in parameters and set their value
               _.each(sqlParameters, function (sqlParameter) {
                  // Check the parameters
                  _.each($scope.process.Parameters, function (parameter) {
                     if (parameter.Name.toLowerCase() === sqlParameter.name.toLowerCase()) {
                        // Found it so set the value
                        sqlParameter.value = parameter.Value;
                     }
                  });

                  // Check the prolog for the variable (it has to be a string)
                  var regex = "[^#a-zA-Z0-9_;\\u00a1-\\uffff]\\s*(" + sqlParameter.name + ")\\s*\\=\\s*\\'(\\s*[\\sa-zA-Z0-9_\\u00a1-\\uffff]*\\s*)\\'\\s*\\;";
                  var findTabParameters = new RegExp(regex, "g");
                  while ((match = findTabParameters.exec($scope.process["PrologProcedure"])) !== null) {
                     // Found it so set the value overwriting the parameter value
                     sqlParameter.value = match[2];
                  }

               });

               // Find and replace sql
               if (sqlParameters.length) {
                  var replaceAll = function (source, find, replace) {
                     var esc = find.replace(/[-\/\\^$*+?.()|[\]{} ]/g, '\\$&');
                     var reg = new RegExp(esc, 'ig');
                     return source.replace(reg, replace);
                  };
                  var adjustedSQL = query.SQL;
                  _.each(sqlParameters, function (parameter) {
                     adjustedSQL = replaceAll(adjustedSQL, "?" + parameter.name + "?", parameter.value);
                  });

                  query.SQL = adjustedSQL;
               }

               $scope.odbcExecuting = true;
               if ($helper.versionCompare($scope.instanceObject.ProductVersion, "11.3.0") < 0) {

                  var pwd = null;
                  if ($rootScope.uiPrefs.storeODBCCredentials) {
                     pwd = $rootScope.uiPrefs.storedODBCCredentials[query.DSN + "-" + query.UserName];
                  } else {
                     pwd = $rootScope.storedODBCCredentials[query.DSN + "-" + query.UserName];
                  }
                  if (pwd) {
                     query.Password = "@@" + pwd;
                  }

                  // Prior to 11.3 we had to use the internal Go ODBC driver
                  $tm1.post($scope.instance, "/datasource/odbc", query).then(function (success, error) {

                     $scope.odbcExecuting = false;

                     if (success.status == 401) {
                        return;
                     } else if (success.status == 403) {
                        $scope.odbcError = success.data;
                        $scope.queryStatus = 'success';
                        if (!_.isEmpty($scope.userName)) {
                           var handler = function (dataSource) {
                              $scope.odbcPreview(dataSource);
                           };
                           $processDialogs.odbcCredentials($scope.process.DataSource, handler);
                        } else {
                           $scope.odbc.activeTabIndex = 0;
                        }
                     } else if (success.status >= 400) {
                        $scope.odbcError = success.data;
                        $scope.odbc.activeTabIndex = 0;
                        $scope.queryStatus = 'failed';
                     } else {
                        if (!_.startsWith(query.Password, "@@")) {
                           // Encrypt the password if it hasn't already
                           $helper.encrypt(query.DSN + ":::" + query.UserName + ":::" + query.Password).then(function (encypted) {
                              if ($rootScope.uiPrefs.storeODBCCredentials) {
                                 $rootScope.uiPrefs.storedODBCCredentials[query.DSN + "-" + query.UserName] = encypted;
                              } else {
                                 $rootScope.storedODBCCredentials[query.DSN + "-" + query.UserName] = encypted;
                              }
                           });
                        }
                        $scope.odbcResult = success.data;
                        $scope.odbc.activeTabIndex = 0;
                     }

                     addQueryToHistory(sendDate, query, $scope.odbcError, $scope.queryStatus);
                     $timeout(function () {
                        $scope.$broadcast("auto-height-resize");
                     });

                  });
               } else {

                  // From v11.3 we can use the ExecuteRelationalDrillthrough action

                  var data = {
                     DrillthroughProcess: {
                        DataSource: {
                           Type: "ODBC",
                           dataSourceNameForServer: query.DSN,
                           query: query.SQL,
                           userName: query.UserName,
                           password: query.Password
                        },
                        EpilogProcedure: "ReturnSqlTableHandle;"
                     }
                  };

                  $tm1.post($scope.instance, "/ExecuteRelationalDrillthrough?$top=" + $rootScope.uiPrefs.maxRows, data).then(function (success, error) {

                     $scope.odbcExecuting = false;

                     if (success.status == 401) {
                        return;
                     } else if (success.status >= 400) {
                        if (success.data.error && success.data.error.message) {
                           if (!_.isEmpty($scope.userName) && _.includes(success.data.error.message, "(0):") && _.includes(success.data.error.message, '"' + $rootScope.uiPrefs.odbc.dataSourceNameForServer + '"')) {
                              var handler = function (dataSource) {
                                 $scope.queryStatus = 'success';
                                 $scope.odbcPreview(dataSource);
                              };
                              $processDialogs.odbcCredentials($scope.process.DataSource, handler);
                           } else {
                              $scope.queryStatus = 'failed';
                              $scope.odbcError = success.data.error.message;
                           }
                        } else {
                           $scope.queryStatus = 'failed';
                           $scope.odbcError = success.data;
                        }
                        $scope.odbc.activeTabIndex = 0;
                     } else {
                        $scope.result.table = {
                           Columns: [],
                           Rows: [],
                           RowsDisplayed: []
                        };
                        if (success.data.value && success.data.value.length) {
                           for (var name in success.data.value[0]) {
                              if (success.data.value[0].hasOwnProperty(name)) {
                                 $scope.result.table.Columns.push(name);
                              }
                           }
                           _.each(success.data.value, function (item) {
                              var row = [];
                              var id = "";
                              for (var name in item) {
                                 if (item.hasOwnProperty(name)) {
                                    row.push(item[name]);
                                    id += item[name];
                                 }
                              }
                              $scope.result.table.Rows.push({
                                 Name: id, Values: row
                              });
                              $scope.result.table.RowsDisplayed.push({
                                 Name: id, Values: row
                              });
                           });
                        }
                        $scope.odbc.activeTabIndex = 0;
                        $scope.resultTransformForHandsOnTable();
                        $timeout(function () {
                           $scope.$broadcast("auto-height-resize");
                        });
                     }
                     addQueryToHistory(sendDate, query, $scope.odbcError, $scope.queryStatus);
                     $timeout(function () {
                        $scope.$broadcast("auto-height-resize");
                     });

                  });

               }

            };


         });

         $scope.find = _.debounce(function(){
            if($scope.hotGrid){
               $scope.hotGrid.find($scope.selections.findText);
            }
         }, 500);

         var updateHeights = function(){
            $scope.$broadcast("height-matcher-resize");
            $scope.$broadcast("auto-height-resize");
         };

         var addQueryToHistory = function (sendDate, query, odbcError, queryStatus) {
            var receiveDate = (new Date()).getTime();
            $scope.responseTimeMs = receiveDate - sendDate;
            var newQuery = {
               query: query,
               message: odbcError,
               bookmark: false,
               queryStatus: queryStatus,
               responseTimeMs: $scope.responseTimeMs,
               uniqueID: Math.random().toString(36).slice(2)
            }
            $rootScope.uiPrefs.sqlHistory.splice(0, 0, newQuery);
         };

         $scope.removeOneQuery = function (queryToBeRemoved, index) {
            $rootScope.uiPrefs.sqlHistory.splice(index, 1);
            _.each($rootScope.uiPrefs.sqlChecked, function (query, key) {
               if (query.uniqueID == queryToBeRemoved.uniqueID) {
                  $rootScope.uiPrefs.sqlChecked.splice(key, 1);
               }
            });
         }

         $scope.removeOneQueryFromChecked = function (list, index, uniqueID) {
            if (list == 'sqlChecked') {
               //Remove from checked
               $rootScope.uiPrefs.sqlChecked.splice(index, 1);
               //Remove Bookmark from History
               _.each($rootScope.uiPrefs.sqlHistory, function (query, key) {
                  if (query.uniqueID == uniqueID) {
                     query.bookmark = false;
                  }
               });
            } else {
               $rootScope.uiPrefs.sqlHistory[index].bookmark = false;
               _.each($rootScope.uiPrefs.sqlChecked, function (query, key) {
                  if (query.uniqueID == uniqueID) {
                     $rootScope.uiPrefs.sqlChecked.splice(key, 1);
                  }
               });
            }
         }

         $scope.moveOneQuery = function (query, index, move) {
            if (move == 'top') {
               query.bookmark = true;
               $rootScope.uiPrefs.sqlChecked.push(query);
            } else if (move == 'up') {
               $rootScope.uiPrefs.sqlChecked.splice(index, 1);
               if (index == 0) {
                  $rootScope.uiPrefs.sqlChecked.push(query);
               } else {
                  $rootScope.uiPrefs.sqlChecked.splice(index - 1, 0, query);
               }
            } else {
               $rootScope.uiPrefs.sqlChecked.splice(index, 1);
               if (index == $rootScope.uiPrefs.sqlChecked.length) {
                  $rootScope.uiPrefs.sqlChecked.splice(0, 0, query);
               } else {
                  $rootScope.uiPrefs.sqlChecked.splice(index + 1, 0, query);
               }
            }
         }

         $scope.options = { filterSQL: "" };

         $scope.filteringRows = function (text) {
            if (text) {
               $scope.result.table.RowsDisplayed = [];
               _.each($scope.result.table.Rows, function (r) {
                  if (r.Name.toLowerCase().includes(text.toLowerCase())) {
                     $scope.result.table.RowsDisplayed.push({
                        Name: r.Name, Values: r.Values
                     })
                  }
               });
            } else {
               $scope.result.table.RowsDisplayed = $scope.result.table.Rows;
            }
            $scope.resultTransformForHandsOnTable();

         }
         
         $scope.resultRefreshed = true;
         $scope.resultTransformForHandsOnTable = function () {
            $scope.resultRefreshed = false;            
            // Define headers
            $scope.result.headers = [];
            var i = 0;
            $scope.result.headers[0] = { columns: [], rows: [] };
            _.each($scope.result.table.Columns, function (key) {
               $scope.result.headers[0].columns[i] = {
                  alias: key,
                  colspan: 1,
                  dataset: $scope.result,
                  dimension: "",
                  element: {
                     alias: key,
                     name: key,
                     key: key,
                     topLevel: 0
                  },
                  hierarchy: "",
                  index: 0,
                  key: key,
                  name: key,
                  rowspan: 1,
                  visible: true,
               };
               i++;
            });
            // Update rows
            $scope.result.rows = [];
            _.each($scope.result.table.RowsDisplayed, function (member) {
               // Define element
               var row = { elements: [], cells: [] };
               var name = "";
               var element = {
                  alias: name,
                  name: name,
                  key: name,
                  topLevel: 0
               };
               var attr = _.clone(member.Values);
               // Define cells
               var i = 0;
               _.each(attr, function (val) {
                  var cell = {
                     FormatString: "###",
                     HasPicklist: undefined,
                     Updateable: 290,
                     dataset: $scope.result,
                     elements: element,
                     isBaseValueDifferentInSandbox: false,
                     isConsolidated: false,
                     isNumeric: true,
                     isReadOnly: false,
                     isRuleDerived: false,
                     key: i,
                     lastValue: val,
                     reference: {},
                     row: row,
                     sandbox: "",
                     status: "Data",
                     value: val
                  }
                  row.cells.push(cell);
                  row[i] = cell;
                  i++;
               });
               $scope.result.rows.push(row);
            });
            $scope.resultRefreshed = true;       
            updateHeights();
         };

         $scope.tabSelected = function(){
            $scope.$broadcast("auto-height-resize");
         };

         $scope.updateCurrentQuery = function (item) {
            $rootScope.uiPrefs.odbc.dataSourceNameForServer = item.query.DSN;
            $rootScope.uiPrefs.odbc.userName = item.query.UserName;
            $rootScope.uiPrefs.odbc.password = item.query.Password;
            $rootScope.uiPrefs.odbc.sql = item.query.SQL;
            $scope.$sqlEditor.setValue($rootScope.uiPrefs.odbc.sql, -1);
         }

         //Trigger an event after the login screen
         $scope.$on("login-reload", function (event, args) {

         });

         //Close the tab
         $scope.$on("close-tab", function (event, args) {
            // Event to capture when a user has clicked close on the tab
            if (args.page == "arcDatabaseConnect" && args.instance == $scope.instance && args.name == null) {
               // The page matches this one so close it
               $rootScope.close(args.page, { instance: $scope.instance });
            }
         });

         //Trigger an event after the plugin closes
         $scope.$on("$destroy", function (event) {

         });


      }]
   };
});