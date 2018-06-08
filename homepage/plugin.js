
arc.run(['$rootScope', function ($rootScope) {

    $rootScope.plugin("overviewButton", "Home", "page", {
        menu: "tools",
        icon: "fa-home",
        description: "Instance Overview",
        author: "Cubewise",
        url: "https://github.com/cubewise-code/arc-plugins",
        version: "1.0.0"
    });

}]);

arc.directive("overviewButton", function () {
    return {
        restrict: "EA",
        replace: true,
        scope: {
            instance: "=tm1Instance"
        },
        templateUrl: "__/plugins/homepage/template.html",
        link: function ($scope, element, attrs) {

        },
        controller: ["$scope", "$rootScope", "$http", "$tm1", "$translate", "$timeout", function ($scope, $rootScope, $http, $tm1, $translate, $timeout) {

            // Store the active tab index
            $scope.selections = {
                activeTab: 0,
                queryCounter: 0,
                fromController: 'From Controller'
            };

            $scope.options = {
                tm1ObjectsOpen : true,
                administrationOpen : true,
                pluginsOpen : true
            }

            $scope.tm1Objects = [
                { key: 'Cubes', description: 'See all cubes',value: '', icon: 'cubes', class: 'object', link:'#/cube/' },
                { key: 'Dimensions', description: 'See all dimensions',value: '', icon: 'dimensions', class: 'object', link:'#/dimensions/' },
                { key: 'Processes', description: 'See all Processes',value: '', icon: 'processes', class: 'object', link:'#/processes/' },
                { key: 'Chores', description: 'See all chores',value: '', icon: 'chores', class: 'object',link:'#/chores/' }
                ]

            $scope.configurations = [
                { key: 'Users', description: 'All TM1 User',value: '', icon: 'fa-user', class: 'admin',link:'' },
                { key: 'Configuration', description: 'tm1s.cfg settings',value: '', icon: 'configuration', class: 'admin',link:'#/configuration/' },
                { key: 'Server Logs', description: 'TM1 Server Logs',value: '', icon: 'fa-list-alt', class: 'admin',link:'#/server-logs/' },
                { key: 'Threads', description: 'All Threads',value: '', icon: 'fa-users', class: 'admin',link:'#/threads/' }
             ]

            $scope.plugins = [
                { key: 'MDX Query', description: 'Test MDX Query',value: '', icon: 'fa-table', class: 'plugins',link:'#/cubewise-mdx/' }
            ]

            $scope.$on("login-reload", function (event, args) {

            });

            // GET USERS COUNT
            $scope.getUsersCount = function () {
                $http.get(encodeURIComponent($scope.instance) + "/Users/$count").then(function (value) {
                    $scope.configurations[0].value = value.data;
                });
            };
            $scope.getUsersCount();
            // GET CUBE COUNT
            $scope.getCubesCount = function () {
                $http.get(encodeURIComponent($scope.instance) + "/ModelCubes()?$select=Name").then(function (cubesList) {
                    $scope.tm1Objects[0].value = cubesList.data.value.length;
                });
            };
            $scope.getCubesCount();

            // GET DIMENSIONS COUNT
            $scope.getDimensionsCount = function () {
                $http.get(encodeURIComponent($scope.instance) + "/ModelDimensions()?$select=Name").then(function (dimensionsList) {
                    $scope.tm1Objects[1].value = dimensionsList.data.value.length;
                });
            };
            $scope.getDimensionsCount();

            // GET PROCESSES COUNT
            $scope.getProcessesCount = function () {
                $http.get(encodeURIComponent($scope.instance) + "/Processes/$count").then(function (value) {
                    $scope.tm1Objects[2].value = value.data;
                });
            };
            $scope.getProcessesCount();

            // GET CHORES COUNT
            $scope.getChoresCount = function () {
                $http.get(encodeURIComponent($scope.instance) + "/Chores/$count").then(function (value) {
                    $scope.tm1Objects[3].value = value.data;
                });
            };
            $scope.getChoresCount();

            $scope.$on("close-tab", function (event, args) {
                // Event to capture when a user has clicked close on the tab
                if (args.page == "overviewButton" && args.instance == $scope.instance && args.name == null) {
                    // The page matches this one so close it
                    $rootScope.close(args.page, { instance: $scope.instance });
                }
            });

            $scope.$on("$destroy", function (event) {

            });


        }]
    };
});