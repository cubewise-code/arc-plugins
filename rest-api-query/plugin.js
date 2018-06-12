
arc.run(['$rootScope', function ($rootScope) {

    $rootScope.plugin("tm1RestApiQuery", "REST API", "page", {
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
        controller: ["$scope", "$rootScope", "$http", "$tm1", "$translate", "$timeout", function ($scope, $rootScope, $http, $tm1, $translate, $timeout) {

            // Create the tabs
            $scope.tabs = [];

            $scope.selections = {
                activeTab: 0,
                queryCounter: 0,
                type: 'GET',
                restApiQuery: 'Cubes',
                queryStatus: ''
            };

            $scope.lists = {
                types: ['GET', 'POST', 'DELETE'],
                resultQuery: [],
                gets: [
                    { badge: 'badge-primary', name: 'Get list', query: 'Cubes' },
                    { badge: 'badge-primary', name: 'Get list only names', query: 'Cubes?$select=Name' },
                    { badge: 'badge-primary', name: 'Count All', query: 'Cubes/$count' },
                    { badge: 'badge-primary', name: 'Get Dimensions', query: "Cubes('cubeName')/Dimensions" },
                    { badge: 'badge-primary', name: 'Get only model cubes', query: 'ModelCubes()' },
                    { badge: 'badge-info', name: 'Get list', query: 'Dimensions' },
                    { badge: 'badge-info', name: 'Get one dimension', query: "Dimensions('dimensionName')" },
                    { badge: 'badge-info', name: 'Get hierarchies', query: "Dimensions('dimensionName')/Hierarchies" },
                    { badge: 'badge-secondary', name: 'Get list', query: 'Processes' },
                    { badge: 'badge-secondary', name: 'Get only Model TI', query: "Processes?$filter=substringof('}',Name) eq false&$select=Name" },
                    { badge: 'badge-secondary', name: 'Get hierarchies', query: "Processes('processName')" },
                    { badge: 'badge-dark', name: 'Get Configuration', query: "Configuration" },
                    { badge: 'badge-dark', name: 'Get Sessions', query: "Threads?$expand=Session" }
                ],
                posts: [
                    { badge: 'badge-primary', name: 'Execute MDX', query: 'ExecuteMDX?' },
                    { badge: 'badge-primary', name: 'Execute MDX with Cells', query: 'ExecuteMDX?$expand=Cells' }
                ],
                deletes: [
                    { badge: 'badge-primary', name: 'Delete a view', query: "Cubes('cubeName')/Views('viewName')" },
                    { badge: 'badge-info', name: 'Delete a dimension', query: "Dimensions('dimensionName')" }
                ]
            }

            $scope.addTab = function () {
                // Add a tab
                $scope.selections.queryCounter++;
                $scope.tabs.push({
                    name: $translate.instant("QUERY") + " " + $scope.selections.queryCounter,
                    type: "GET",
                    restApiQuery: "Cubes",
                    body: '{"MDX":"SELECT \n'
                    + '\tNON EMPTY {[Version].[Actual], [Version].[Budget]} ON COLUMNS, \n'
                    + '\tNON EMPTY {TM1SUBSETALL([Account])} ON ROWS \n'
                    + 'FROM [General Ledger] \n'
                    + 'WHERE ([Department].[Corporate], [Year].[2012])"}'
                });
                $timeout(function () {
                    $scope.selections.activeTab = $scope.tabs.length - 1;
                });
            };
            // Add the initial tab
            $scope.addTab();

            $scope.closeTab = function (index) {
                // Remove a tab
                $scope.tabs.splice(index, 1);
            };

            $scope.tabSelected = function () {
                // This is required to resize the MDX panel after clicking on a tab
                //$scope.$broadcast("auto-height-resize");
            };

            // GET Query
            $scope.getQuery = function () {
                var sendDate = (new Date()).getTime();
                var tab = $scope.tabs[$scope.selections.activeTab];
                $http.get(encodeURIComponent($scope.instance) + "/" + tab.restApiQuery).then(function (result) {
                    console.log(result);
                    if (result.status == 200) {
                        tab.queryStatus = 'success';
                        tab.resultQuery = result;
                    } else {
                        tab.queryStatus = 'failed';
                        tab.resultQuery = result.data.error;
                    }
                    var receiveDate = (new Date()).getTime();
                    tab.responseTimeMs = receiveDate - sendDate;
                });
            };

            // DELETE Query
            $scope.deleteQuery = function () {
                var tab = $scope.tabs[$scope.selections.activeTab];
                $http.delete(encodeURIComponent($scope.instance) + "/" + tab.restApiQuery).then(function (result) {
                    console.log(result);
                    if (result.status == 204) {
                        tab.queryStatus = 'success';
                        tab.resultQuery = result;
                    } else {
                        tab.queryStatus = 'failed';
                        tab.resultQuery = result.data.error;
                    }
                });
            };

            // POST Query
            $scope.postQuery = function () {
                var sendDate = (new Date()).getTime();
                var tab = $scope.tabs[$scope.selections.activeTab];
                var mdxJSON = { MDX: tab.body };
                $http.post(encodeURIComponent($scope.instance) + "/" + tab.restApiQuery, tab.body).then(function (result) {
                    console.log(result);
                    if (result.status == 201) {
                        tab.queryStatus = 'success';
                        tab.resultQuery = result;
                    } else {
                        tab.queryStatus = 'failed';
                        tab.resultQuery = result.data.error;
                    }
                    var receiveDate = (new Date()).getTime();
                    tab.responseTimeMs = receiveDate - sendDate;
                });
            };

            //Execute Query
            $scope.executeQuery = function () {
                var tab = $scope.tabs[$scope.selections.activeTab];
                if (tab.type == 'GET') {
                    $scope.getQuery();
                } else if (tab.type == 'POST') {
                    $scope.postQuery();
                } else if (tab.type == 'DELETE') {
                    $scope.deleteQuery();
                } else {
                    console.log("NOT READY");
                }
            }

            $scope.$on("login-reload", function (event, args) {

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