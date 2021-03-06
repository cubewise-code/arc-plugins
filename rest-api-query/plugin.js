
arc.run(['$rootScope', function ($rootScope) {

    $rootScope.plugin("tm1RestApiQuery", "RESTAPI", "page", {
        menu: "tools",
        icon: "fa-exchange",
        description: "This plugin can be used to search any TM1 objects",
        author: "Cubewise",
        url: "https://github.com/cubewise-code/arc-plugins",
        version: "1.0.0"
    });
}]);

arc.directive("tm1RestApiQuery", function () {
    return {
        restrict: "EA",
        replace: true,
        scope: {
            instance: "=tm1Instance"
        },
        templateUrl: "__/plugins/rest-api-query/template.html",
        link: function ($scope, element, attrs) {

        },
        controller: ["$scope", "$rootScope", "$tm1", "$translate",
         function ($scope, $rootScope, $tm1, $translate) {

            $scope.options = {
                activeTab: 0,
                queryCounter: 0,
                method: 'GET',
                restApiQuery: 'Cubes',
                queryStatus: '',
                name: $translate.instant("QUERY"),
                method: "GET",
                  body: '{"MDX":"SELECT \n'
                  + '\tNON EMPTY {[Version].[Actual], [Version].[Budget]} ON COLUMNS, \n'
                  + '\tNON EMPTY {TM1SUBSETALL([Account])} ON ROWS \n'
                  + 'FROM [General Ledger] \n'
                  + 'WHERE ([Department].[Corporate], [Year].[2012])"}',
               hideBody: false,
               message: null,
               executing: false,
               resultType: "json-tree"
            };

            $scope.lists = {
               methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
               resultQuery: [],
               GET: [
                   { icon: 'cubes', name: 'Get list', restApiQuery: 'Cubes' },
                   { icon: 'cubes', name: 'Get list only names', restApiQuery: 'Cubes?$select=Name' },
                   { icon: 'cubes', name: 'Count All', restApiQuery: 'Cubes/$count' },
                   { icon: 'cubes', name: 'Get Dimensions', restApiQuery: "Cubes('cubeName')/Dimensions" },
                   { icon: 'cubes', name: 'Get only model cubes', restApiQuery: 'ModelCubes()' },
                   { icon: 'dimensions', name: 'Get list', restApiQuery: 'Dimensions' },
                   { icon: 'dimensions', name: 'Get one dimension', restApiQuery: "Dimensions('dimensionName')" },
                   { icon: 'dimensions', name: 'Get hierarchies', restApiQuery: "Dimensions('dimensionName')/Hierarchies" },
                   { icon: 'dimensions', name: 'Get list of attributes', restApiQuery: "Dimensions('dimensionName')/Hierarchies('dimensionName')/ElementAttributes" },
                   { icon: 'processes', name: 'Get list', restApiQuery: 'Processes' },
                   { icon: 'processes', name: 'Get only Model TI', restApiQuery: "Processes?$filter=substringof('}',Name) eq false&$select=Name" },
                   { icon: 'processes', name: 'Get hierarchies', restApiQuery: "Processes('processName')" },
                   { icon: 'fa-server', name: 'Metadata', restApiQuery: "$metadata" },
                   { icon: 'fa-server', name: 'Get Configuration', restApiQuery: "Configuration" },
                   { icon: 'fa-server', name: 'Get TM1 Version', restApiQuery: "Configuration/ProductVersion/$value" },
                   { icon: 'fa-server', name: 'Get Sessions', restApiQuery: "Threads?$expand=Session" }
               ],
               POST: [
                   { icon: 'cubes', name: 'Execute MDX', restApiQuery: 'ExecuteMDX?' },
                   { icon: 'cubes', name: 'Execute MDX with Cells', restApiQuery: 'ExecuteMDX?$expand=Cells' },
                   { icon: 'cubes', name: 'Execute MDX with Axes', restApiQuery: 'ExecuteMDX?$expand=Axes($expand=Hierarchies($select=Name;$expand=Dimension($select=Name)))' }
               ],
               PATCH: [
                   { icon: 'chores', name: 'Update Chore', restApiQuery: "Chores('choreName')" }
               ],
               PUT: [
               ],
               DELETE: [
                   { icon: 'cubes', name: 'Delete a view', restApiQuery: "Cubes('cubeName')/Views('viewName')" },
                   { icon: 'dimensions', name: 'Delete a dimension', restApiQuery: "Dimensions('dimensionName')" },
                   { icon: 'subset', name: 'Delete a subset', restApiQuery: "Dimensions('dimensionName')/Hierarchies('hierarchyName')/Subsets('subsetName')"}
               ]
            };

            $scope.clearRestHistory = function () {
               $rootScope.uiPrefs.restHistory = [];
            };
   
            $scope.clearRestChecked = function () {
               $rootScope.uiPrefs.restChecked = [];
            };
   
            $scope.clearAllHistory = function () {
               $scope.clearRestHistory();
               $scope.clearRestChecked();
            };

            $scope.updateCurrentQuery = function(item){
               $scope.options.restApiQuery = item.restApiQuery;
               $scope.options.method = item.method;
               $scope.options.body = item.body;
            };

            //Execute Query
            $scope.executeQuery = function () {
               $scope.options.executing = true;
                var restApiQuery = "/" + $scope.options.restApiQuery;
                var sendDate = (new Date()).getTime();
                var mdxClean = $scope.options.body.replace(/(\n|\t)/gm,"");
                var method = $scope.options.method;
                $tm1.async($scope.instance, method, restApiQuery, mdxClean).then(function (result) {
                   $scope.currentTabIndex = 0;
                    if (result.status == 200 || result.status == 201 || result.status == 204) {
                        $scope.options.queryStatus = 'success';
                        $scope.options.resultQuery = result.data;
                        $scope.options.message = null;
                    } else {
                        $scope.options.queryStatus = 'failed';
                        $scope.options.resultQuery = result.data.error;
                        $scope.options.message = result.data.error.message;
                    }
                    var receiveDate = (new Date()).getTime();
                    $scope.options.responseTimeMs = receiveDate - sendDate;
                    var newQuery = { restApiQuery: $scope.options.restApiQuery, 
                                    method:method,
                                    body: mdxClean, 
                                    resultQuery: '', 
                                    queryStatus: $scope.options.queryStatus, 
                                    message: $scope.options.message,
                                    responseTimeMs: $scope.options.responseTimeMs,
                                    bookmark: false,
                                    uniqueID: Math.random().toString(36).slice(2)}
                    $rootScope.uiPrefs.restHistory.splice(0, 0, newQuery);
                    $scope.options.executing = false;
                });
               // If more than 100 remove the last one
               if($rootScope.uiPrefs.restHistory.length>99){
                  $rootScope.uiPrefs.restHistory.splice($rootScope.uiPrefs.restHistory.length-1, 1);
               }
            };

            $scope.removeOneQuery = function(queryToBeRemoved,index){
               $rootScope.uiPrefs.restHistory.splice(index, 1);
               _.each($rootScope.uiPrefs.restChecked, function (query, key) {
                  if(query.uniqueID == queryToBeRemoved.uniqueID){
                     $rootScope.uiPrefs.restChecked.splice(key, 1);
                  }
               });
            };
   
            $scope.removeOneQueryFromChecked = function(list, index, uniqueID){
               if(list == 'restChecked'){
                  //Remove from checked
                  $rootScope.uiPrefs.restChecked.splice(index, 1);
                  //Remove Bookmark from History
                  _.each($rootScope.uiPrefs.restHistory, function (query, key) {
                     if(query.uniqueID == uniqueID){
                        query.bookmark = false;
                     }
                  });
               } else{
                  $rootScope.uiPrefs.restHistory[index].bookmark = false;
                  _.each($rootScope.uiPrefs.restChecked, function (query, key) {
                     if(query.uniqueID == uniqueID){
                        $rootScope.uiPrefs.restChecked.splice(key, 1);
                     }
                  });
               }
            };
   
            $scope.moveOneQuery = function(query, index, move){
               if(move == 'top'){
                  query.bookmark = true;
                  $rootScope.uiPrefs.restChecked.push(query);
               } else if(move == 'up'){
                  $rootScope.uiPrefs.restChecked.splice(index, 1);  
                  if(index == 0){
                     $rootScope.uiPrefs.restChecked.push(query); 
                  } else {
                  $rootScope.uiPrefs.restChecked.splice(index-1, 0, query); 
                  }
               } else {
                  $rootScope.uiPrefs.restChecked.splice(index, 1); 
                  if(index == $rootScope.uiPrefs.restChecked.length){
                  $rootScope.uiPrefs.restChecked.splice(0, 0, query);  
                  } else {
                     $rootScope.uiPrefs.restChecked.splice(index+1, 0, query);    
                  }
               }
            };

            $scope.key = function ($event) {
               if($scope.indexTiFunctions == -1){
                  $scope.indexTiFunctions = 0;
               }
               var query = $scope.options.restApiQuery;
               var body = $scope.options.body;
               var currentQuery = $rootScope.uiPrefs.restHistory[$scope.indexTiFunctions];
               //Arrow up
               if ($event.keyCode == 38) {
                  $scope.updateCurrentQuery(currentQuery);
                  $scope.updateindexTiFunctions("-1");
               }
               //Arrow down
               else if ($event.keyCode == 40) {
                  $scope.updateCurrentQuery(currentQuery);
                  $scope.updateindexTiFunctions("+1");
               }
               //Enter
               else if ($event.keyCode == 13) {
                  $scope.executeQuery();
               }
            };

            $scope.updateindexTiFunctions = function (string) {
               if (string == "reset") {
                  $scope.indexTiFunctions = $rootScope.uiPrefs.restHistory.length - 1;
               } else if (string == "+1") {
                  var newindex = $scope.indexTiFunctions + 1;
                  if (newindex > $rootScope.uiPrefs.restHistory.length - 1) {
                     $scope.indexTiFunctions = 0;
                  } else {
                     $scope.indexTiFunctions = newindex;
                  }
               } else if (string == "-1") {
                  var newindex = $scope.indexTiFunctions - 1;
                  if (newindex < 0) {
                     $scope.indexTiFunctions = $rootScope.uiPrefs.restHistory.length - 1;
                  } else {
                     $scope.indexTiFunctions = newindex;
                  }
               }
            };
            
            var load = function(){

               $rootScope.uiPrefs.showRESTChecked = true;
               $rootScope.uiPrefs.showRESTHistory = true;
               if(!$rootScope.uiPrefs.restHistory || $rootScope.uiPrefs.restHistory.length === 0){
                  $scope.clearRestHistory();
               }
               if(!$rootScope.uiPrefs.restChecked || $rootScope.uiPrefs.restChecked.length === 0){
                  $scope.clearRestChecked();
               }
               $scope.indexTiFunctions = $rootScope.uiPrefs.restHistory.length - 1;

            };
            load();

            $scope.$on("login-reload", function (event, args) {

               if (args.instance == $scope.instance) {
                  load();
               }

            });

            $scope.$on("close-tab", function (event, args) {
                // Event to capture when a user has clicked close on the tab
                if (args.page == "tm1RestApiQuery" && args.instance == $scope.instance && args.name == null) {
                    // The page matches this one so close it
                    $rootScope.close(args.page, { instance: $scope.instance });
                }
            });

            $scope.$on("$destroy", function (event) {

            });

        }]
    };
});