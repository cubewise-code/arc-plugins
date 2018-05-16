
arc.run(['$rootScope', function ($rootScope) {

    $rootScope.plugin("cubewiseInstanceOverviewTabs", "Overview Tabs", "page", {
        menu: "tools",
        icon: "fa-eye",
        description: "Instance Overview",
        author: "Cubewise",
        url: "https://github.com/cubewise-code/arc-plugins",
        version: "1.0.0"
    });

}]);

arc.directive("cubewiseInstanceOverviewTabs", function () {
    return {
        restrict: "EA",
        replace: true,
        scope: {
            instance: "=tm1Instance"
        },
        templateUrl: "__/plugins/overview-tabs/template.html",
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
                { key: 'AdminHost', value: '' },
                { key: 'HttpPortNumber', value: '' },
                { key: 'DataBaseDirectory', value: '' },
                { key: 'ServerName', value: '' }
            ]

            $scope.tm1ObjectsTabs = [
                { index: 0, key: 'Users', icon: 'fa-users', count: 0, body: [], col1: 'Type' },
                { index: 1, key: 'Cubes', icon: 'fa-cubes', count: 0, body: [], col1: 'Rules' },
                { index: 2, key: 'Dimensions', icon: 'dimensions', count: 0, body: [], col1: 'UniqueName' },
                { index: 3, key: 'Processes', icon: 'processes', count: 0, body: [], col1: 'HasSecurityAccess', col2: 'Parameters' },
                { index: 4, key: 'Chores', icon: 'chores', count: 0, body: [], col1: 'Active' }
            ]

            $scope.$on("login-reload", function (event, args) {

            });
            // GET CONFIGURATION SETTINGS
            $scope.getConfiguration = function () {
                $http.get(encodeURIComponent($scope.instance) + "/Configuration").then(function (config) {
                    $scope.configurations[0].value = config.data.AdminHost;
                    $scope.configurations[1].value = config.data.HTTPPortNumber;
                    $scope.configurations[2].value = config.data.DataBaseDirectory;
                    $scope.configurations[3].value = config.data.ServerName;
                });
            };
            $scope.getConfiguration();

            // GET USERS COUNT
            $scope.getUsersCount = function () {
                $http.get(encodeURIComponent($scope.instance) + "/Users/$count").then(function (value) {
                    $scope.tm1ObjectsTabs[0].count = value.data;
                });
            };
            $scope.getUsersCount();
            // GET USER DATA
            $scope.getUsersList = function () {
                $http.get(encodeURIComponent($scope.instance) + "/Users").then(function (usersData) {
                    $scope.tm1ObjectsTabs[0].body = usersData.data.value;
                });
            };
            $scope.getUsersList();
            // GET CUBE COUNT
            $scope.getCubesCount = function () {
                $http.get(encodeURIComponent($scope.instance) + "/Cubes/$count").then(function (value) {
                    $scope.tm1ObjectsTabs[1].count = value.data;
                });
            };
            $scope.getCubesCount();
            // GET CUBE DATA
            $scope.getCubesList = function () {
                $http.get(encodeURIComponent($scope.instance) + "/Cubes").then(function (cubesData) {
                    $scope.tm1ObjectsTabs[1].body = cubesData.data.value;
                });
            };
            $scope.getCubesList();

            // GET DIMENSIONS COUNT
            $scope.getDimensionsCount = function () {
                $http.get(encodeURIComponent($scope.instance) + "/Dimensions/$count").then(function (value) {
                    $scope.tm1ObjectsTabs[2].count = value.data;
                });
            };
            $scope.getDimensionsCount();
            // GET DIMENSION DATA
            $scope.getDimensionsList = function () {
                $http.get(encodeURIComponent($scope.instance) + "/Dimensions").then(function (dimensionsData) {
                    $scope.tm1ObjectsTabs[2].body = dimensionsData.data.value;
                });
            };
            $scope.getDimensionsList();

            // GET PROCESSES COUNT
            $scope.getProcessesCount = function () {
                $http.get(encodeURIComponent($scope.instance) + "/Processes/$count").then(function (value) {
                    $scope.tm1ObjectsTabs[3].count = value.data;
                });
            };
            $scope.getProcessesCount();

            // GET CUBE DATA
            $scope.getProcessesList = function () {
                $http.get(encodeURIComponent($scope.instance) + "/Processes").then(function (processesData) {
                    $scope.tm1ObjectsTabs[3].body = processesData.data.value;
                });
            };
            $scope.getProcessesList();

            // GET CHORES COUNT
            $scope.getChoresCount = function () {
                $http.get(encodeURIComponent($scope.instance) + "/Chores/$count").then(function (value) {
                    $scope.tm1ObjectsTabs[4].count = value.data;
                });
            };
            $scope.getChoresCount();

            // GET CUBE DATA
            $scope.getChoresList = function () {
                $http.get(encodeURIComponent($scope.instance) + "/Chores").then(function (choresData) {
                    $scope.tm1ObjectsTabs[4].body = choresData.data.value;
                });
            };
            $scope.getChoresList();

            $scope.$on("close-tab", function (event, args) {
                // Event to capture when a user has clicked close on the tab
                if (args.page == "cubewiseInstanceOverviewTabs" && args.instance == $scope.instance && args.name == null) {
                    // The page matches this one so close it
                    $rootScope.close(args.page, { instance: $scope.instance });
                }
            });

            $scope.$on("$destroy", function (event) {

            });


        }]
    };
});