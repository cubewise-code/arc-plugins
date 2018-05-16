
arc.run(['$rootScope', function ($rootScope) {

    $rootScope.plugin("cubewiseArcSearch", "Search", "page", {
        menu: "tools",
        icon: "fa-search",
        description: "This plugin can be used to search any TM1 objects",
        author: "Cubewise",
        url: "https://github.com/cubewise-code/arc-plugins",
        version: "1.0.0"
    });

}]);

arc.directive("cubewiseArcSearch", function () {
    return {
        restrict: "EA",
        replace: true,
        scope: {
            instance: "=tm1Instance"
        },
        templateUrl: "__/plugins/search/template.html",
        link: function ($scope, element, attrs) {

        },
        controller: ["$scope", "$rootScope", "$http", "$tm1", "$translate", "$timeout", function ($scope, $rootScope, $http, $tm1, $translate, $timeout) {

            // Store the active tab index
            $scope.selections = {
                dimension: '',
                hierarchy: '',
                subset: ''
            };

            $scope.lists = {
                dimensions: [],
                hierarchies: [],
                subsets: []
            }

            // GET DIMENSION DATA
            $scope.getDimensionsList = function () {
                $http.get(encodeURIComponent($scope.instance) + "/Dimensions").then(function (dimensionsData) {
                    $scope.lists.dimensions = dimensionsData.data.value;
                });
            };
            $scope.getDimensionsList();

            // GET HIERARCHY DATA
            $scope.getHierarchies = function () {
                $http.get(encodeURIComponent($scope.instance) + "/Dimensions('"+$scope.selections.dimension+"')/Hierarchies").then(function (hierarchiesData) {
                    $scope.lists.hierarchies = hierarchiesData.data.value;
                });
            };
            // GET SUBSET DATA
            $scope.getSubsets = function () {
                $http.get(encodeURIComponent($scope.instance) + "/Dimensions('"+$scope.selections.dimension+"')/Hierarchies('"+$scope.selections.subset+"')/Subsets").then(function (subsetsData) {
                    $scope.lists.subsets = subsetsData.data.value;
                });
            };
            $scope.$on("login-reload", function (event, args) {

            });

            $scope.$on("close-tab", function (event, args) {
                // Event to capture when a user has clicked close on the tab
                if (args.page == "cubewiseArcSearch" && args.instance == $scope.instance && args.name == null) {
                    // The page matches this one so close it
                    $rootScope.close(args.page, { instance: $scope.instance });
                }
            });

            $scope.$on("$destroy", function (event) {

            });


        }]
    };
});