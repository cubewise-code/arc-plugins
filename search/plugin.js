
arc.run(['$rootScope', function($rootScope) {

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

            // Create the tabs
            $scope.tabs = [];
            // Store the active tab index
            $scope.selections = {
               activeTab: 0,
               queryCounter: 0
            };

            $scope.$on("login-reload", function(event, args) {
                
            });
                
            $scope.$on("close-tab", function(event, args) {
                // Event to capture when a user has clicked close on the tab
                if(args.page == "cubewiseArcSearch" && args.instance == $scope.instance && args.name == null){
                    // The page matches this one so close it
                    $rootScope.close(args.page, {instance: $scope.instance});
                }
            });

            $scope.$on("$destroy", function(event){
   
            });
        

        }]
    };
});