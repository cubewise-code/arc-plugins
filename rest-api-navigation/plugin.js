
arc.run(['$rootScope', function ($rootScope) {

    $rootScope.plugin("arcRestApiNavigation", "REST API Navigation", "page", {
        menu: "tools",
        icon: "fa-map-o",
        description: "This plugin can be used to search any TM1 objects",
        author: "Cubewise",
        url: "https://github.com/cubewise-code/arc-plugins",
        version: "1.0.0"
    });

}]);

arc.directive("arcRestApiNavigation", function () {
    return {
        restrict: "EA",
        replace: true,
        scope: {
            instance: "=tm1Instance"
        },
        templateUrl: "__/plugins/rest-api-navigation/template.html",
        link: function ($scope, element, attrs) {

        },
        controller: ["$scope", "$rootScope", "$http", "$tm1", "$translate", "$timeout", function ($scope, $rootScope, $http, $tm1, $translate, $timeout) {

            //Define variables
            $scope.defaults = {};
            $scope.selections = {};
            $scope.lists = {};
            $scope.values = {};

            // GET CUBE COUNT
            var request = new XMLHttpRequest();
            $scope.getMetadata = function () {
                $http.get(encodeURIComponent($scope.instance) + "/$metadata").then(function (request) {
                    //metadata = result.data;
                    var xml = request.data.responseXML;
                    console.log(xml);
                });
            };
            $scope.getMetadata(); 

            //Trigger an event after the login screen
            $scope.$on("login-reload", function (event, args) {

            });

            //Close the tab
            $scope.$on("close-tab", function (event, args) {
                // Event to capture when a user has clicked close on the tab
                if (args.page == "arcRestApiNavigation" && args.instance == $scope.instance && args.name == null) {
                    // The page matches this one so close it
                    $rootScope.close(args.page, { instance: $scope.instance });
                }
            });

            //Trigger an event after the plugin closes
            $scope.$on("$destroy", function (event) {

            });


        }]
    };
});