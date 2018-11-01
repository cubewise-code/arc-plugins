
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
        controller: ["$scope", "$rootScope", "$http", "$tm1", "$translate", "$timeout", function ($scope, $rootScope, $http, $tm1, $translate, $timeout) {

            // Create the tabs
            $scope.tabs = [];
            // Store the active tab index
            $scope.selections = {
                activeTab: 0,
                queryCounter: 0
            };

            $scope.addTab = function () {
                // Add a tab
                $scope.selections.queryCounter++;
                $scope.tabs.push({
                    name: $translate.instant("QUERY") + " " + $scope.selections.queryCounter,
                    mdx: "SELECT \n"
                        + "\tNON EMPTY {[Version].[Actual], [Version].[Budget]} ON COLUMNS, \n"
                        + "\tNON EMPTY {TM1SUBSETALL([Account])} ON ROWS \n"
                        + "FROM [General Ledger] \n"
                        + "WHERE ([Department].[Corporate], [Year].[2012])",
                    queryType: "ExecuteMDX",
                    maxRows: 1000
                });
                $timeout(function () {
                    $scope.selections.activeTab = $scope.tabs.length - 1;
                });
            };

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

            $scope.toggleQuery = function (tab) {
                // Show and hide the query tab
                tab.hideQuery = !tab.hideQuery;
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
            };

            $scope.execute = function () {
                var sendDate = (new Date()).getTime();
                var tab = $scope.tabs[$scope.selections.activeTab];
                //If dimension execute
                var mdx = tab.mdx;
                var n = mdx.indexOf("WHERE");
                if (tab.queryType == "ExecuteMDX") {
                    var args = "$expand=Axes($expand=Hierarchies($select=Name;$expand=Dimension($select=Name)),Tuples($expand=Members($select=Name,UniqueName,Ordinal,Attributes))),Cells($select=Ordinal,Status,Value,FormatString,FormattedValue,Updateable,RuleDerived,Annotated,Consolidated,Language,HasDrillthrough)"
                } else {
                    var args = "$expand=Hierarchies($select=Name;$expand=Dimension($select=Name)),Tuples($expand=Members($select=Name,UniqueName,Ordinal,Attributes))";
                }
                $scope.message = null;
                $http.post(encodeURIComponent($scope.instance) + "/" + tab.queryType + "?" + args, { MDX: tab.mdx }).then(function (success) {
                    tab.executing = false;
                    if (success.status == 401) {
                        return;
                    } else if (success.status >= 400) {
                        // Error
                        $scope.message = success.data;
                        if (success.data.error && success.data.error.message) {
                            $scope.message = success.data.error.message;
                        }
                    } else {
                        // Success
                        if (tab.queryType == "ExecuteMDX") {
                            $tm1.cellsetDelete($scope.instance, success.data.ID);
                            var regex = /FROM\s\[(.*)\]/g;
                            var match = regex.exec(tab.mdx);
                            var cube = match[1];
                            tab.result = {
                                mdx: 'cube',
                                json: success.data,
                                table: $tm1.resultsetTransform($scope.instance, cube, success.data)
                            }
                        } else {
                           //Get attributes
                           var dimension = success.data.Hierarchies[0].Dimension.Name;
                           var hierarchy = success.data.Hierarchies[0].Name;
                           $http.get(encodeURIComponent($scope.instance) + "/Dimensions('"+dimension+"')/Hierarchies('"+hierarchy+"')/ElementAttributes?$select=Name").then(function (result) {
                              tab.result = {
                                 mdx: 'dimension',
                                 json: success.data,
                                 table: success.data.Tuples,
                                 attributes: result.data.value
                             }
                           });
                        }
                        var receiveDate = (new Date()).getTime();
                        $scope.responseTimeMs = receiveDate - sendDate;
                    }
                });
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