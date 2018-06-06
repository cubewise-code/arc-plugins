
arc.run(['$rootScope', function ($rootScope) {

    $rootScope.plugin("arcTrello", "Trello", "page", {
        menu: "tools",
        icon: "fa-trello",
        description: "This plugin can be used to search any TM1 objects",
        author: "Cubewise",
        url: "https://github.com/cubewise-code/arc-plugins",
        version: "1.0.0"
    });

}]);

arc.directive("arcTrello", function () {
    return {
        restrict: "EA",
        replace: true,
        scope: {
            instance: "=tm1Instance"
        },
        templateUrl: "__/plugins/trello/template.html",
        link: function ($scope, element, attrs) {

        },
        controller: ["$scope", "$rootScope", "$http", "$tm1", "$translate", "$timeout", function ($scope, $rootScope, $http, $tm1, $translate, $timeout) {

            $scope.defaults = {
                trelloApiKey: '4c0cab5d9132a3a3f5372432af186a3d',
                trelloApiToken: '1aa3e0702b784cbc026355b18cf7b0d377d437205e302b9763773cf4cab6f5a4'
            };

            $scope.trelloApiUrl = {
                start: 'https://api.trello.com/1/',
                end: '?key='+$scope.defaults.trelloApiKey+'&token='+$scope.defaults.trelloApiToken
            } 

            $scope.selections = {
            };

            //Get All Boards
            $scope.getAllBoards = function () {
                console.log($scope.trelloApiUrl.start + 'members/me/boards' + $scope.trelloApiUrl.end);
                $http.get($scope.trelloApiUrl.start + 'members/me/boards' + $scope.trelloApiUrl.end ).then(function (result) {
                    console.log(result);
                });
            };

            $scope.getAllBoards();

            $scope.$on("login-reload", function (event, args) {

            });

            $scope.$on("close-tab", function (event, args) {
                // Event to capture when a user has clicked close on the tab
                if (args.page == "arcTrello" && args.instance == $scope.instance && args.name == null) {
                    // The page matches this one so close it
                    $rootScope.close(args.page, { instance: $scope.instance });
                }
            });

            $scope.$on("$destroy", function (event) {

            });


        }]
    };
});