
arc.run(['$rootScope', function($rootScope) {

    $rootScope.plugin("cubewiseInstanceOverview", "Overview", "page", {
        menu: "tools",
        icon: "fa-eye",
        description: "Instance Overview",
        author: "Cubewise",
        url: "https://github.com/cubewise-code/arc-plugins",
        version: "1.0.0"
    });

}]);

arc.directive("cubewiseInstanceOverview", function () {
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

            $scope.getConfiguration = function(){
                $http.get(encodeURIComponent($scope.instance) +"/Configuration").then(function(data){
                    console.debug(data);
                });
            };

            $scope.getConfiguration();

            $scope.testFunction = function(){
                console.debug("test!!!!!!!!!!!");
            };

            console.debug("NO FUNCTIONS!!!!!!!");

            $scope.$on("login-reload", function(event, args) {
                
            });
                
            $scope.$on("close-tab", function(event, args) {
                // Event to capture when a user has clicked close on the tab
                if(args.page == "cubewiseInstanceOverview" && args.instance == $scope.instance && args.name == null){
                    // The page matches this one so close it
                    $rootScope.close(args.page, {instance: $scope.instance});
                }
            });

            $scope.$on("$destroy", function(event){
   
            });
        

        }]
    };
});