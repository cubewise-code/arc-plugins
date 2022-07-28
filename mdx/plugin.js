
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
      controller: ["$scope", "$rootScope", "$http", "$tm1", "$translate", "$timeout", "$q", "$document", "uuid2",
         function ($scope, $rootScope, $http, $tm1, $translate, $timeout, $q, $document, uuid2) {

         var _hotTable = null;
         var _hotTableSettings = {};
         var _cells = [];
         var _colHeaders = [];
         var _columns = null;
   
         $scope.id = uuid2.newuuid();
            
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

         if(!$rootScope.uiPrefs.options){
            $rootScope.uiPrefs.options = {
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
         }

         $rootScope.uiPrefs.showMDXChecked = true;
         $rootScope.uiPrefs.showMDXHistory = true;

         $scope.clearMDXHistory = function () {
            $rootScope.uiPrefs.mdxHistory = [];
         };

         $scope.clearMDXChecked = function () {
            $rootScope.uiPrefs.mdxChecked = [];
         };

         $scope.clearAllHistory = function () {
            $scope.clearMDXHistory();
            $scope.clearMDXChecked();         
         };

         if (!$rootScope.uiPrefs.mdxHistory || $rootScope.uiPrefs.mdxHistory.length === 0) {
            $scope.clearMDXHistory();
         }
         
         if (!$rootScope.uiPrefs.mdxChecked || $rootScope.uiPrefs.mdxChecked.length === 0) {
            $scope.clearMDXChecked();
         }

         if(!$rootScope.uiPrefs.maxRows){
            $rootScope.uiPrefs.maxRows = 1000;
         };

         $scope.lists =  [
               {
                  badge: 'badge-primary', name: 'Cube', query: "SELECT \n"
                     + "\tNON EMPTY {[Version].[Actual], [Version].[Budget]} ON COLUMNS, \n"
                     + "\tNON EMPTY {TM1SUBSETALL([Account])} ON ROWS \n"
                     + "FROM [General Ledger] \n"
                     + "WHERE ([Department].[Corporate], [Year].[2012])"
               },
               { badge: 'badge-info', name: 'Dimension', query: '{TM1SUBSETALL( [Time] )}' },
               { badge: 'badge-info', name: 'Dimension Filter by Level', query: "{\n" + "\tTM1FILTERBYLEVEL(\n" + "\t{TM1SUBSETALL( [Employee] )}\n" + "\t, 0\n" + ")}" },
               { badge: 'badge-info', name: 'Dimension Filter by Attribute', query: "{\n" + "\tFILTER(\n" + "\t {TM1SUBSETALL( [Employee] )}\n" + "\t, \n" + "\t[Employee].[Region] = 'England'\n" + ")}" },
               { badge: 'badge-info', name: 'Dimension Filter by Windcard', query: "{\n" + "\tTM1FILTERBYPATTERN(\n" + "\t {\n" + "\tTM1SUBSETALL( [Employee] )}\n" + "\t, \n" + "\t'*Da*'\n)}" }
            ];

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
            //overriding ace-editor selection event to store selected code at the editor 
            // _.debounce(function() {
               _editor.selection.on("changeSelection", function () {
               $rootScope.uiPrefs.options.selectedMdx = _editor.getSelectedText();
             })
            // }, 50);
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
            updateHeights();
         };

         $scope.resultRefreshed = true;
         $scope.hotGrid = {};

         $scope.execute = function (options) {
            $scope.resultRefreshed = false;
            $rootScope.uiPrefs.options.message = null;
            var sendDate = (new Date()).getTime();
            //If dimension execute

            $rootScope.uiPrefs.options.mdxToExecute = ($rootScope.uiPrefs.options.selectedMdx) ? $rootScope.uiPrefs.options.selectedMdx : $rootScope.uiPrefs.options.mdx;
            var firstWord = $rootScope.uiPrefs.options.mdxToExecute.trim().split(" ")[0].toUpperCase();

            if(firstWord.startsWith("SELECT") || firstWord.startsWith("WITH")) {
               isSetExpression = false;
            } else {
               isSetExpression = true;
            };

            if (!isSetExpression) {
               // maxRows applied in the resultOption of the handsontable (required for nested columns)
               var args = "$expand=Cube($select=Name),Axes($expand=Hierarchies($select=Name;$expand=Dimension($select=Name)),Tuples($expand=Members($select=Name,UniqueName,Ordinal,Attributes))),Cells($select=Ordinal,Status,Value,FormatString,FormattedValue,Updateable,RuleDerived,Annotated,Consolidated,Language,HasDrillthrough)";
               $rootScope.uiPrefs.options.queryType = "ExecuteMDX"
            } else {
               var args = "$expand=Hierarchies($select=Name;$expand=Dimension($select=Name)),Tuples($top="+$rootScope.uiPrefs.maxRows+";$expand=Members($select=Name,UniqueName,Ordinal,Attributes))";
               $rootScope.uiPrefs.options.queryType = "ExecuteMDXSetExpression";
            };

            message = null;                 
            $scope.result = {clear: true};
            $tm1.post($scope.instance, "/" + $rootScope.uiPrefs.options.queryType + "?"+ args, { MDX: $rootScope.uiPrefs.options.mdxToExecute }).then(function (success) {
               $scope.resultRefreshed = true;
               if (success.status == 401) {
                  return;
               } else if (success.status >= 400) {
                  // Error
                  $rootScope.uiPrefs.options.message = success.data;
                  if (success.data.error && success.data.error.message) {
                     $rootScope.uiPrefs.options.message = success.data.error.message;
                     $rootScope.uiPrefs.options.queryStatus = 'failed';
                     console.log($rootScope.uiPrefs.options.message);
                  }
               } else {
                  $rootScope.uiPrefs.options.queryStatus = 'success';
                  $rootScope.uiPrefs.options.message = null;
                  // Success
                  if (!isSetExpression) {
                     $tm1.cellsetDelete($scope.instance, success.data.ID);
                     var cube = success.data.Cube.Name;
                     var resultOptions = {
                        maxRows: $rootScope.uiPrefs.maxRows
                     };
                     $scope.result = $tm1.resultsetTransform($scope.instance, cube, success.data, resultOptions);
                     $scope.result.mdx = 'cube';
                     $scope.result.json = success.data;
                     $scope.result.reload = true; 
                     $timeout(function () {
                        $scope.mdx.activeTabIndex = 0;
                        updateHeights();
                     });
                  } else {
                     // Get attributes for each member
                     var table = _.cloneDeep(success.data.Tuples);             
                     $scope.result = {
                        mdx: 'dimension',
                        json: _.cloneDeep(success.data),
                        dimension: success.data.Hierarchies[0].Name,
                        table: table
                     };           
                     $scope.prepareResultForHandsOneTable();
                  }
                  var receiveDate = (new Date()).getTime();
                  $rootScope.uiPrefs.options.responseTimeMs = receiveDate - sendDate;
               }
               var newQuery = {
                  mdx: $rootScope.uiPrefs.options.mdxToExecute,
                  message: $rootScope.uiPrefs.options.message,
                  bookmark: false,
                  queryType: $rootScope.uiPrefs.options.queryType,
                  queryStatus: $rootScope.uiPrefs.options.queryStatus,
                  responseTimeMs: $rootScope.uiPrefs.options.responseTimeMs,
                  name: $rootScope.uiPrefs.options.name,
                  uniqueID: Math.random().toString(36).slice(2)
               }
               $rootScope.uiPrefs.mdxHistory.splice(0, 0, newQuery);
            });
            // If more than 10 remove the last one
            if($rootScope.uiPrefs.mdxHistory.length>99){
               $rootScope.uiPrefs.mdxHistory.splice($rootScope.uiPrefs.mdxHistory.length-1, 1);
            }
         };

         $scope.refreshTable = function(){
            if (!isSetExpression) {
               updateHeights(); 
            } else {
               $scope.prepareResultForHandsOneTable();
            };
         };
         
         $scope.prepareResultForHandsOneTable = function(){
            var columns = [];
            var rows = [];
            $scope.result.titles = [];
            titlesName = [];
            titlesValues = [];
            var data = $scope.result.json;

            $rootScope.uiPrefs.options.mdxToExecute = ($rootScope.uiPrefs.options.selectedMdx) ? $rootScope.uiPrefs.options.selectedMdx : $rootScope.uiPrefs.options.mdx;
            var firstWord = $rootScope.uiPrefs.options.mdxToExecute.trim().split(" ")[0].toUpperCase();

            if(firstWord.startsWith("SELECT") || firstWord.startsWith("WITH")) {
               isSetExpression = false;
            } else {
               isSetExpression = true;
            };
   
            if (!isSetExpression) {
               // Get the elements from the titles
               if (data.Axes.length > 2) {
                  _.each(data.Axes[2].Hierarchies, function (h) {
                     titlesName.push(h.Name);
                  });
                  _.each(data.Axes[2].Tuples[0].Members, function (m) {
                     titlesValues.push(m.Name);
                  });
                  _.each(titlesName, function (name, key) {
                     title = {Name: name, value: titlesValues[key] };
                     $scope.result.titles.push(title);
                  });
               };
               _.each(data.Axes[1].Hierarchies, function (h) {
                  columns.push(h.Name);
                });
                 // Get the elements from the columns
                 _.each(data.Axes[0].Tuples[0].Members, function (m) {
                  columns.push(m.Name);
                });
               // Rows
               var rowNo = 0;
               var colNo = 0;
               _.each(data.Cells, function (c, i) {
                 var row = [];
                 // Get the elements from the rows
                 _.each(data.Axes[1].Tuples[rowNo].Members, function (m) {
                   row.push(m.Name);
                 });
                 if (colNo < data.Axes[0].Tuples.length - 1) {
                   colNo++;
                 } else {
                   colNo = 0;
                   rowNo++;
                 };
                 row.push(c.Value);
                 rows.push(row);
               }); 
            } else {
               // DIMENSIONS
               _.each(data.Hierarchies, function(hierarchy) {
                  var dimensionName = hierarchy.Name;
                  columns.push(dimensionName);
                  if($rootScope.uiPrefs.options.showUniqueName){
                     columns.push('UniqueName');
                     
                  };
                  $scope.allAttributes = [];
                  if($rootScope.uiPrefs.options.showAttributes){
                     _.each(data.Tuples, function(tuple){
                        _.each(tuple.Members, function(member){
                           var attr = _.clone(member.Attributes);
                           //ignore captions
                           delete attr.Caption; 
                           delete attr.Caption_Default;
                           memberAttributes = _.keys(attr);
                           _.each(memberAttributes, function(a){
                              if($scope.allAttributes.indexOf(a)==-1){
                                 $scope.allAttributes.push(a);
                                 columns.push(a);
                              }
                           });
                        });
                     });
                  };
               });
               //CREATE TUPLE
               _.each(data.Tuples, function(tuple){
                  tuple.attributeList = [];
                  var values = [];
                  _.each(tuple.Members, function(member){
                     member.allAttributes = [];
                     values.push(member.Name);
                     if($rootScope.uiPrefs.options.showUniqueName){
                        values.push(member.UniqueName);
                     }
                     var attr = _.clone(member.Attributes);
                     //ignore captions
                     delete attr.Caption; 
                     delete attr.Caption_Default;
                     memberAttributes = _.keys(attr);
                     _.each($scope.allAttributes, function(a){
                        member.allAttributes.push(member.Attributes[a]);
                        values.push(member.Attributes[a]);
                     });
                     rows.push(values);
                  });
               });
            };
            populateGridProcess(columns, rows);
           };
   
         var populateGridProcess = function(headers, rows){
            _colHeaders = [];
            _columns = [];   
            _.each(headers, function (header) {
               _colHeaders.push(header);
               _columns.push({type: "text", readOnly: true});
            });            
            // Select elements
            _cells = [];
            _.each(rows, function(values, r){
               var row = [];
               _cells.push(row);
               _.each(values, function (val,i) {
                  row.push(val);
               });
            });
            reCreateHotTableProcess();
            $timeout(function () {
               $scope.mdx.activeTabIndex = 0;
               updateHeights();
            });
         };

         var reCreateHotTableProcess = function(){
            var container = document.getElementById($scope.id + "-tableInstance");
            if(_hotTable){
               _hotTable.destroy();
               _hotTable = null;
            }
            _hotTableSettings = {
               autoColumnSize: { useHeaders: true },
               autoRowSize: true,
               autoWrapRow: true,
               comments: true,
               undo: true,
               licenseKey: '45fa7-848ba-11370-34b17-8900d',
               manualColumnResize: true,
               multiColumnSorting: true,
               persistentState: false,
               manualRowMove: true,
               viewportColumnRenderingOffset: 10,
               viewportRowRenderingOffset: 10,
               outsideClickDeselects: false,
               fixedColumnsLeft: 1,
               colHeaders: _colHeaders,
               columns: _columns,
               data: _cells,
               rowHeaders: function(index) {
                  if(!_hotTable){
                     return index + 1;
                  }
                  var r = _hotTable.toPhysicalRow(index);
                  return index + 1;
               },
               beforeKeyDown: function(e){
                  // Prevent Handsontable from stealing input from dialog
                  if($(e.target).hasClass("form-control") || $(e.target.parentElement).hasClass("modal-footer")){
                     e.stopImmediatePropagation();
                  } else if (e.altKey && e.keyCode == 37) {
                     e.stopImmediatePropagation();
                     $rootScope.goBack();
                  } else if (e.altKey && e.keyCode == 39) {
                     e.stopImmediatePropagation();
                     $rootScope.goForward();
                  }
               },
               afterDeselect: function(){
                  
               },
               beforePaste: function(data, coords){
               },
               beforeCopy: function(data, coords){
              
               },
               beforeCut: function(data, coords){
               },
               afterSelectionEnd: function(row, col, row2, col2, selectionLayerLevel){
   
               },
               afterOnCellContextMenu: function($event, coords){
                  //contextMenu($event, coords);
               },
               beforeRowMove: function(rows, target){
               }
            };   
            _hotTable = new Handsontable(container, _hotTableSettings);
         };

         var updateHeights = function(){
            setTimeout(function () {
               if(_hotTable){
                  _hotTable.render();
               };
            }, 500);
            $scope.$broadcast("height-matcher-resize");
            $scope.$broadcast("auto-height-resize");
         };

         $scope.removeOneQuery = function(queryToBeRemoved,index){
            $rootScope.uiPrefs.mdxHistory.splice(index, 1);
            _.each($rootScope.uiPrefs.mdxChecked, function (query, key) {
               if(query.uniqueID == queryToBeRemoved.uniqueID){
                  $rootScope.uiPrefs.mdxChecked.splice(key, 1);
               };
            });
         };

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
            };
         };

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
               };
            } else {
               $rootScope.uiPrefs.mdxChecked.splice(index, 1); 
               if(index == $rootScope.uiPrefs.mdxChecked.length){
               $rootScope.uiPrefs.mdxChecked.splice(0, 0, query);  
               } else {
                  $rootScope.uiPrefs.mdxChecked.splice(index+1, 0, query);    
               }; 
            };
         };

         $scope.indexTiFunctions = $rootScope.uiPrefs.mdxHistory.length - 1;

         $scope.updateCurrentQuery = function (item) {
            $rootScope.uiPrefs.options.mdx = item.mdx;
            $rootScope.uiPrefs.options.message = item.message;
            $rootScope.uiPrefs.options.name = item.name;
            $rootScope.uiPrefs.options.queryType = item.queryType;
         };

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
            };
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
            if(_hotTable){
               _hotTable.destroy();
            };
         });

      }]
   };
});