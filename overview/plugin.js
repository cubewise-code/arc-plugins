
arc.run(['$rootScope', function ($rootScope) {

    $rootScope.plugin("cubewiseInstanceOverviewList", "Overview", "page", {
        menu: "tools",
        icon: "fa-eye",
        description: "Instance Overview",
        author: "Cubewise",
        url: "https://github.com/cubewise-code/arc-plugins",
        version: "1.0.0"
    });

}]);

arc.directive("cubewiseInstanceOverviewList", function () {
    return {
        restrict: "EA",
        replace: true,
        scope: {
            instance: "=tm1Instance"
        },
        templateUrl: "__/plugins/overview/template.html",
        link: function ($scope, element, attrs) {

        },
        controller: ["$scope", "$rootScope", "$http", "$tm1", "$translate", "$timeout", function ($scope, $rootScope, $http, $tm1, $translate, $timeout) {

            // Store the active tab index
            $scope.selections = {
                activeTab: 0,
                queryCounter: 0,
                fromController: 'From Controller'
            };

            $scope.configurations = [
                { key: 'ServerName', value: '', icon: 'fa-server', link:'' },
                { key: 'AdminHost', value: '', icon: 'fa-server', link:'' },
                { key: 'DataBaseDirectory', value: '', icon: 'fa-server', link:'' },
                { key: 'PortNumber', value: '', icon: 'fa-server', link:'' },
                { key: 'HTTPPortNumber', value: '', icon: 'fa-server', link:'' }
            ]

            $scope.tm1Objects = [
                { key: 'Users', value: '', icon: 'fa-users', link:'' },
                { key: 'Cubes', value: '', icon: 'cubes', link:'#/cube/' },
                { key: 'Dimensions', value: '', icon: 'dimensions', link:'#/dimensions/' },
                { key: 'Processes', value: '', icon: 'processes', link:'#/processes/' },
                { key: 'Chores', value: '', icon: 'chores', link:'#/chores/' },
            ]

            $scope.$on("login-reload", function (event, args) {

            });
            // GET CONFIGURATION SETTINGS
            $scope.getConfiguration = function () {
                $http.get(encodeURIComponent($scope.instance) + "/Configuration").then(function (config) {
                    $scope.configurations[0].value = config.data.ServerName;
                    $scope.configurations[1].value = config.data.AdminHost;
                    $scope.configurations[2].value = config.data.DataBaseDirectory;
                    $scope.configurations[3].value = config.data.PortNumber;
                    $scope.configurations[4].value = config.data.HTTPPortNumber;
                });
            };
            $scope.getConfiguration();

            // GET USERS COUNT
            $scope.getUsersCount = function () {
                $http.get(encodeURIComponent($scope.instance) + "/Users/$count").then(function (value) {
                    $scope.tm1Objects[0].value = value.data;
                });
            };
            $scope.getUsersCount();
            // GET CUBE COUNT
            $scope.getCubesCount = function () {
                $http.get(encodeURIComponent($scope.instance) + "/Cubes/$count").then(function (value) {
                    $scope.tm1Objects[1].value = value.data;
                });
            };
            $scope.getCubesCount();

            // GET DIMENSIONS COUNT
            $scope.getDimensionsCount = function () {
                $http.get(encodeURIComponent($scope.instance) + "/Dimensions/$count").then(function (value) {
                    $scope.tm1Objects[2].value = value.data;
                });
            };
            $scope.getDimensionsCount();

            // GET PROCESSES COUNT
            $scope.getProcessesCount = function () {
                $http.get(encodeURIComponent($scope.instance) + "/Processes/$count").then(function (value) {
                    $scope.tm1Objects[3].value = value.data;
                });
            };
            $scope.getProcessesCount();

            // GET CHORES COUNT
            $scope.getChoresCount = function () {
                $http.get(encodeURIComponent($scope.instance) + "/Chores/$count").then(function (value) {
                    $scope.tm1Objects[4].value = value.data;
                });
            };
            $scope.getChoresCount();

            $scope.$on("close-tab", function (event, args) {
                // Event to capture when a user has clicked close on the tab
                if (args.page == "cubewiseInstanceOverviewList" && args.instance == $scope.instance && args.name == null) {
                    // The page matches this one so close it
                    $rootScope.close(args.page, { instance: $scope.instance });
                }
            });

            $scope.$on("$destroy", function (event) {

            });


        }]
    };
});