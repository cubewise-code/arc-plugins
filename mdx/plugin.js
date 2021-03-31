
arc.run(['$rootScope', function ($rootScope) {

   $rootScope.plugin("cubewiseMdx", "MDX", "page", {
      menu: "tools",
      icon: "fa-table",
      description: "This plugin can be used to test MDX queries.",
      author: "Cubewise",
      url: "https://github.com/cubewise-code/arc-plugins",
      version: "1.0.0"
   });

}]);

arc.directive("cubewiseMdx", function () {
   return {
      restrict: "EA",
      replace: true,
      scope: {
         instance: "=tm1Instance"
      },
      templateUrl: "__/plugins/mdx/template.html",
      link: function ($scope, element, attrs) {

      },
      controller: ["$scope", "$rootScope", "$http", "$tm1", "$translate", "$timeout", "$q", "$document",
         function ($scope, $rootScope, $http, $tm1, $translate, $timeout, $q, $document) {

         // Store the active tab index
         $scope.selections = {
            activeTab: 0,
            queryCounter: 0,
            findText: ""
         };
         
         $scope.result = {clear: true};

         $scope.mdx = {activeTabIndex: 1};

         if(!$rootScope.uiPrefs.mdxSplitter){
            $rootScope.uiPrefs.mdxSplitter = "150px";
         }

         $rootScope.uiPrefs.showMDXChecked = true;
         $rootScope.uiPrefs.showMDXHistory = true;

         $scope.clearMDXHistory = function () {
            $rootScope.uiPrefs.mdxHistory = [];
         }

         $scope.clearMDXChecked = function () {
            $rootScope.uiPrefs.mdxChecked = [];
         }

         $scope.clearAllHistory = function () {
            $scope.clearMDXHistory();
            $scope.clearMDXChecked();         
         }

         if (!$rootScope.uiPrefs.mdxHistory || $rootScope.uiPrefs.mdxHistory.length === 0) {
            $scope.clearMDXHistory();
         }
         
         if (!$rootScope.uiPrefs.mdxChecked || $rootScope.uiPrefs.mdxChecked.length === 0) {
            $scope.clearMDXChecked();
         }

         $scope.options = {
            name: "",
            mdx: "SELECT \n"
            + "\tNON EMPTY {[Version].[Actual], [Version].[Budget]} ON COLUMNS, \n"
            + "\tNON EMPTY {TM1SUBSETALL([Account])} ON ROWS \n"
            + "FROM [General Ledger] \n"
            + "WHERE ([Department].[Corporate], [Year].[2012])",
            queryType:"ExecuteMDX",
            maxRows: 1000,
            message: null,
            showAttributes: false,
            showUniqueName: false,
            resultType: "table"
         };

         if(!$rootScope.uiPrefs.maxRows){
            $rootScope.uiPrefs.maxRows = 1000;
         }
         

         $scope.lists = {
            ExecuteMDX: [
               {
                  badge: 'badge-primary', name: 'Cube', query: "SELECT \n"
                     + "\tNON EMPTY {[Version].[Actual], [Version].[Budget]} ON COLUMNS, \n"
                     + "\tNON EMPTY {TM1SUBSETALL([Account])} ON ROWS \n"
                     + "FROM [General Ledger] \n"
                     + "WHERE ([Department].[Corporate], [Year].[2012])"
               }
            ],
            ExecuteMDXSetExpression: [
               { badge: 'badge-info', name: 'Dimension', query: '{TM1SUBSETALL( [Time] )}' },
               { badge: 'badge-info', name: 'Dimension Filter by Level', query: "{\n" + "\tTM1FILTERBYLEVEL(\n" + "\t{TM1SUBSETALL( [Employee] )}\n" + "\t, 0\n" + ")}" },
               { badge: 'badge-info', name: 'Dimension Filter by Attribute', query: "{\n" + "\tFILTER(\n" + "\t {TM1SUBSETALL( [Employee] )}\n" + "\t, \n" + "\t[Employee].[Region] = 'England'\n" + ")}" },
               { badge: 'badge-info', name: 'Dimension Filter by Windcard', query: "{\n" + "\tTM1FILTERBYPATTERN(\n" + "\t {\n" + "\tTM1SUBSETALL( [Employee] )}\n" + "\t, \n" + "\t'*Da*'\n)}" }
            ]
         };

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
               if(height < 0){
                  height = 0;
               }
               $rootScope.uiPrefs.mdxSplitter = height + "px";
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

         $scope.closeTab = function (index) {
            // Remove a tab
            $scope.tabs.splice(index, 1);
         };

         $scope.tabSelected = function () {
            // This is required to resize the MDX panel after clicking on a tab
            //$scope.$broadcast("auto-height-resize");
         };

         $scope.toggleQuery = function (tab) {
            // Show and hide the query tab
            hideQuery = !hideQuery;
            $scope.$broadcast("auto-height-resize");
         };

         $scope.editorLoaded = function (_editor) {
            // Initialise the editor settings
            _editor.setTheme($rootScope.uiPrefs.editorTheme);
            _editor.getSession().setMode("ace/mode/mdx");
            _editor.getSession().setOptions({ tabSize: $rootScope.uiPrefs.editorTabSpaces, useSoftTabs: true });
            _editor.$blockScrolling = Infinity;
            _editor.setFontSize($rootScope.uiPrefs.fontSize);
            _editor.setShowPrintMargin(false);
                _editor.getSession().setUseWrapMode($rootScope.uiPrefs.editorWrapLongLines);
         };

         $scope.find = _.debounce(function(){
            if($scope.hotGrid){
               $scope.hotGrid.find($scope.selections.findText);
            }
         }, 500);

         $scope.complete = function(){
            $scope.executing = false;
         };

         $scope.tabSelected = function(){
            $scope.$broadcast("auto-height-resize");
         };

         var updateHeights = function(){
            $scope.$broadcast("height-matcher-resize");
            $scope.$broadcast("auto-height-resize");
         };

         $scope.resultRefreshed = true;
         $scope.hotGrid = {};
         $scope.execute = function (options) {
            $scope.mdx.activeTabIndex = 0;
            $scope.resultRefreshed = false;
            $scope.options.message = null;
            var sendDate = (new Date()).getTime();
            //If dimension execute
            var n = $scope.options.mdx.indexOf("WHERE");
            if ($scope.options.queryType == "ExecuteMDX") {
               var args = "$expand=Axes($expand=Hierarchies($select=Name;$expand=Dimension($select=Name)),Tuples($top="+$rootScope.uiPrefs.maxRows+";$expand=Members($select=Name,UniqueName,Ordinal,Attributes))),Cells($select=Ordinal,Status,Value,FormatString,FormattedValue,Updateable,RuleDerived,Annotated,Consolidated,Language,HasDrillthrough)"
            } else {
               var args = "$expand=Hierarchies($select=Name;$expand=Dimension($select=Name)),Tuples($top="+$rootScope.uiPrefs.maxRows+";$expand=Members($select=Name,UniqueName,Ordinal,Attributes))";
            }
            message = null;                 
            $scope.result = {clear: true};
            $tm1.post($scope.instance, "/" + $scope.options.queryType + "?"+ args, { MDX: $scope.options.mdx }).then(function (success) {
               $scope.resultRefreshed = true;
               if (success.status == 401) {
                  return;
               } else if (success.status >= 400) {
                  // Error
                  $scope.options.message = success.data;
                  if (success.data.error && success.data.error.message) {
                     $scope.options.message = success.data.error.message;
                     $scope.options.queryStatus = 'failed';
                  }
               } else {
                  $scope.mdx.activeTabIndex = 0;
                  $scope.options.queryStatus = 'success';
                  $scope.options.message = null;
                  // Success
                  if ($scope.options.queryType == "ExecuteMDX") {
                     $tm1.cellsetDelete($scope.instance, success.data.ID);
                     var regex = /FROM\s*\[(.*)\]/g;
                     var match = regex.exec($scope.options.mdx);
                     var cube = match[1];
                     $scope.result = $tm1.resultsetTransform($scope.instance, cube, success.data);
                     $scope.result.mdx = 'cube';
                     $scope.result.json = success.data;
                     $scope.result.reload = true;
                     $scope.hotGrid.loading();
                     updateHeights();
                  } else {
                     // Get attributes for each member
                     var table = _.cloneDeep(success.data.Tuples);
                     //GET ALL ATTRIBUTES NAME
                     $scope.allAttributes = [];
                     if($scope.options.showAttributes){
                        _.each(table, function(tuple){
                           _.each(tuple.Members, function(member){
                              var attr = _.clone(member.Attributes);
                              //ignore captions
                              delete attr.Caption; 
                              delete attr.Caption_Default
                              memberAttributes = _.keys(attr);
                              _.each(memberAttributes, function(a){
                                 if($scope.allAttributes.indexOf(a)==-1){
                                    $scope.allAttributes.push(a);
                                 }
                              });
                           });
                        });
                     }
                     //CREATE TUPLE
                     _.each(table, function(tuple){
                        tuple.attributeList = [];
                        _.each(tuple.Members, function(member){
                           member.allAttributes = [];
                           var attr = _.clone(member.Attributes);
                           //ignore captions
                           delete attr.Caption; 
                           delete attr.Caption_Default
                           memberAttributes = _.keys(attr);
                           _.each($scope.allAttributes, function(a){
                              member.allAttributes.push(member.Attributes[a]);
                           });

                        });

                     });
                     
                     $scope.result = {
                        mdx: 'dimension',
                        json: _.cloneDeep(success.data),
                        dimension: success.data.Hierarchies[0].Name,
                        table: table,
                     };
                     $scope.resultTransformForHandsOnTable();

                  }
                  var receiveDate = (new Date()).getTime();
                  $scope.options.responseTimeMs = receiveDate - sendDate;
               }
               var newQuery = {
                  mdx: $scope.options.mdx,
                  message: $scope.options.message,
                  bookmark: false,
                  queryType: $scope.options.queryType,
                  queryStatus: $scope.options.queryStatus,
                  responseTimeMs: $scope.options.responseTimeMs,
                  name: $scope.options.name,
                  uniqueID: Math.random().toString(36).slice(2)
               }
               $rootScope.uiPrefs.mdxHistory.splice(0, 0, newQuery);
            });
            // If more than 10 remove the last one
               if($rootScope.uiPrefs.mdxHistory.length>99){
                  $rootScope.uiPrefs.mdxHistory.splice($rootScope.uiPrefs.mdxHistory.length-1, 1);
               }
         };

         $scope.resultTransformForHandsOnTable = function(){
            // Define headers
            $scope.result.headers = [];
            $scope.result.dimensions = {rows:[]};
            var i=0;
            $scope.result.headers[0] = {columns:[],rows:[]};
            $scope.result.headers[0].rows[0] = {
               colspan: 1,
               dimension: $scope.result.dimension,
               rowspan: 1,
               visible: true
            };
            if($scope.options.showUniqueName){
               key = "UniqueName";
               $scope.result.headers[0].columns[i] = {
                  alias: key, 
                  colspan: 1,
                  dataset: $scope.result,
                  dimension:"",
                  element:{alias: key, 
                           name: key, 
                           key: key, 
                           topLevel:0}, 
                  hierarchy:"",
                  index:0, 
                  key: key,
                  name: key,  
                  rowspan: 1,  
                  visible: true,
               };
               i++;
            }
            var attrHeaders = _.clone($scope.allAttributes);
            _.each(attrHeaders, function(key){
               $scope.result.headers[0].columns[i] = {
                  alias: key, 
                  colspan: 1,
                  dataset: $scope.result,
                  dimension:"",
                  element:{alias: key, 
                           name: key, 
                           key: key, 
                           topLevel:0}, 
                  hierarchy:"",
                  index:0, 
                  key: key,
                  name: key,  
                  rowspan: 1,  
                  visible: true,
               };
               i++;
            });
            // Update rows
            $scope.result.rows = [];
            _.each($scope.result.table, function(tuple){
               tuple.attributeList = [];
               _.each(tuple.Members, function(member){
                  // Define element
                  var row = {elements:[], cells:[]};
                  row.elements[0] = {
                     alias: member.Name, 
                     colspan: 1,
                     dataset: $scope.result,
                     dimension:"",
                     element:{alias: member.Name, 
                              name: member.Name, 
                              key: member.UniqueName, 
                              topLevel:0}, 
                     hierarchy:"",
                     index:0, 
                     key: member.UniqueName,
                     name: member.Name,  
                     rowspan: 1,  
                     visible: true,
                  };
                  var attr = _.clone(member.allAttributes);
                  // Define cells
                  var i=1;
                  if($scope.options.showUniqueName){
                     val = member.UniqueName;
                     var element = {alias: member.Name, 
                        name: member.Name, 
                        key: member.UniqueName, 
                        topLevel:0};
                     var cell = {
                        FormatString: "",
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
                        value:val};
                     row.cells.push(cell);
                     row[i] = cell;
                     i++;
                  }
                  _.each(attr, function(val){
                     var cell = {
                        FormatString: "",
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
                        value:val}
                     row.cells.push(cell);
                     row[i] = cell;
                     i++;
                  });                  
                  $scope.result.rows.push(row);
               });
            });
            $scope.mdx.activeTabIndex = 0;
            $scope.resultRefreshed = true;
            updateHeights();
         };

         $scope.removeOneQuery = function(queryToBeRemoved,index){
            $rootScope.uiPrefs.mdxHistory.splice(index, 1);
            _.each($rootScope.uiPrefs.mdxChecked, function (query, key) {
               if(query.uniqueID == queryToBeRemoved.uniqueID){
                  $rootScope.uiPrefs.mdxChecked.splice(key, 1);
               }
            });
         }

         $scope.removeOneQueryFromChecked = function(list, index, uniqueID){
            if(list == 'mdxChecked'){
            //Remove from checked
            $rootScope.uiPrefs.mdxChecked.splice(index, 1);
            //Remove Bookmark from History
            _.each($rootScope.uiPrefs.mdxHistory, function (query, key) {
               if(query.uniqueID == uniqueID){
                  query.bookmark = false;
               }
            });
            } else{
               $rootScope.uiPrefs.mdxHistory[index].bookmark = false;
               _.each($rootScope.uiPrefs.mdxChecked, function (query, key) {
                  if(query.uniqueID == uniqueID){
                     $rootScope.uiPrefs.mdxChecked.splice(key, 1);
                  }
               });
            }
         }

         $scope.moveOneQuery = function(query, index, move){
            if(move == 'top'){
               query.bookmark = true;
               $rootScope.uiPrefs.mdxChecked.push(query);
            } else if(move == 'up'){
               $rootScope.uiPrefs.mdxChecked.splice(index, 1);  
               if(index == 0){
                  $rootScope.uiPrefs.mdxChecked.push(query); 
               } else {
               $rootScope.uiPrefs.mdxChecked.splice(index-1, 0, query); 
               }
            } else {
               $rootScope.uiPrefs.mdxChecked.splice(index, 1); 
               if(index == $rootScope.uiPrefs.mdxChecked.length){
               $rootScope.uiPrefs.mdxChecked.splice(0, 0, query);  
               } else {
                  $rootScope.uiPrefs.mdxChecked.splice(index+1, 0, query);    
               }             
            }
         }

         $scope.indexTiFunctions = $rootScope.uiPrefs.mdxHistory.length - 1;

         $scope.updateCurrentQuery = function (item) {
            $scope.options.mdx = item.mdx;
            $scope.options.message = item.message;
            $scope.options.name = item.name;
            $scope.options.queryType = item.queryType;

         }

         $scope.updateindexTiFunctions = function (string) {
            if (string == "reset") {
               $scope.indexTiFunctions = $rootScope.uiPrefs.mdxHistory.length - 1;
            } else if (string == "+1") {
               var newindex = $scope.indexTiFunctions + 1;
               if (newindex > $rootScope.uiPrefs.mdxHistory.length - 1) {
                  $scope.indexTiFunctions = 0;
               } else {
                  $scope.indexTiFunctions = newindex;
               }
            } else if (string == "-1") {
               var newindex = $scope.indexTiFunctions - 1;
               if (newindex < 0) {
                  $scope.indexTiFunctions = $rootScope.uiPrefs.mdxHistory.length - 1;
               } else {
                  $scope.indexTiFunctions = newindex;
               }
            }
         };

         $scope.$on("login-reload", function (event, args) {

         });

         $scope.$on("close-tab", function (event, args) {
            // Event to capture when a user has clicked close on the tab
            if (args.page == "cubewiseMdx" && args.instance == $scope.instance && args.name == null) {
               // The page matches this one so close it
               $rootScope.close(args.page, { instance: $scope.instance });
            }
         });

         $scope.$on("$destroy", function (event) {

         });


      }]
   };
});