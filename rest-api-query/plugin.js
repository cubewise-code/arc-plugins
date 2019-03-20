
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
                types: ['GET', 'POST', 'PATCH', 'DELETE'],
                resultQuery: [],
                GET: [
                    { icon: 'cubes', name: 'Get list', query: 'Cubes' },
                    { icon: 'cubes', name: 'Get list only names', query: 'Cubes?$select=Name' },
                    { icon: 'cubes', name: 'Count All', query: 'Cubes/$count' },
                    { icon: 'cubes', name: 'Get Dimensions', query: "Cubes('cubeName')/Dimensions" },
                    { icon: 'cubes', name: 'Get only model cubes', query: 'ModelCubes()' },
                    { icon: 'dimensions', name: 'Get list', query: 'Dimensions' },
                    { icon: 'dimensions', name: 'Get one dimension', query: "Dimensions('dimensionName')" },
                    { icon: 'dimensions', name: 'Get hierarchies', query: "Dimensions('dimensionName')/Hierarchies" },
                    { icon: 'dimensions', name: 'Get list of attributes', query: "Dimensions('dimensionName')/Hierarchies('dimensionName')/ElementAttributes" },
                    { icon: 'processes', name: 'Get list', query: 'Processes' },
                    { icon: 'processes', name: 'Get only Model TI', query: "Processes?$filter=substringof('}',Name) eq false&$select=Name" },
                    { icon: 'processes', name: 'Get hierarchies', query: "Processes('processName')" },
                    { icon: 'fa-server', name: 'Metadata', query: "$metadata" },
                    { icon: 'fa-server', name: 'Get Configuration', query: "Configuration" },
                    { icon: 'fa-server', name: 'Get TM1 Version', query: "Configuration/ProductVersion/$value" },
                    { icon: 'fa-server', name: 'Get Sessions', query: "Threads?$expand=Session" }
                ],
                POST: [
                    { icon: 'cubes', name: 'Execute MDX', query: 'ExecuteMDX?' },
                    { icon: 'cubes', name: 'Execute MDX with Cells', query: 'ExecuteMDX?$expand=Cells' },
                    { icon: 'cubes', name: 'Execute MDX with Axes', query: 'ExecuteMDX?$expand=Axes($expand=Hierarchies($select=Name;$expand=Dimension($select=Name)))' }
                ],
                PATCH: [
                    { icon: 'chores', name: 'Update Chore', query: "Chores('choreName')" }
                ],
                DELETE: [
                    { icon: 'cubes', name: 'Delete a view', query: "Cubes('cubeName')/Views('viewName')" },
                    { icon: 'dimensions', name: 'Delete a dimension', query: "Dimensions('dimensionName')" },
                    { icon: 'subset', name: 'Delete a subset', query: "Dimensions('dimensionName')/Hierarchies('hierarchyName')/Subsets('subsetName')"}
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
                    + 'WHERE ([Department].[Corporate], [Year].[2012])"}',
                    hideBody: false,
                    message: null
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

            //Execute Query
            $scope.executeQuery = function () {
                var tab = $scope.tabs[$scope.selections.activeTab];
                var sendDate = (new Date()).getTime();
                var mdxClean = tab.body.replace(/(\n|\t)/gm,"");
                var config = {method: tab.type, 
                                url: encodeURIComponent($scope.instance) + "/" + tab.restApiQuery,
                                data:mdxClean
                                };
                $http(config).then(function (result) {
                    if (result.status == 200 || result.status == 201 || result.status == 204) {
                        tab.queryStatus = 'success';
                        tab.resultQuery = result.data;
                        tab.message = null;
                    } else {
                        tab.queryStatus = 'failed';
                        tab.resultQuery = result.data.error;
                        tab.message = result.data.error.message;
                    }
                    var receiveDate = (new Date()).getTime();
                    tab.responseTimeMs = receiveDate - sendDate;
                });
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