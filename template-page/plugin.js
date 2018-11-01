
// Uncomment the code arc.run.. below to enable this plugin

/*

arc.run(['$rootScope', function ($rootScope) {

    $rootScope.plugin("arcTemplate", "Template Title", "page", {
        menu: "tools",
        icon: "fa-paw",
        description: "This plugin can be used as a starting point for building new page plugins",
        author: "Cubewise",
        url: "https://github.com/cubewise-code/arc-plugins",
        version: "1.0.0"
    });

}]);

*/

arc.directive("arcTemplate", function () {
    return {
        restrict: "EA",
        replace: true,
        scope: {
            instance: "=tm1Instance"
        },
        templateUrl: "__/plugins/template-page/template.html",
        link: function ($scope, element, attrs) {

        },
        controller: ["$scope", "$rootScope", "$http", "$tm1", "$translate", "$timeout", function ($scope, $rootScope, $http, $tm1, $translate, $timeout) {

            //Define variables
            $scope.defaults = {};
            $scope.selections = {};
            $scope.lists = {};
            $scope.values = {};

            //Functions
            $scope.myFirstFunction = function () {
            };

            //Trigger Functions
            $scope.myFirstFunction();

            //Trigger an event after the login screen
            $scope.$on("login-reload", function (event, args) {

            });

            //Close the tab
            $scope.$on("close-tab", function (event, args) {
                // Event to capture when a user has clicked close on the tab
                if (args.page == "arcTemplate" && args.instance == $scope.instance && args.name == null) {
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