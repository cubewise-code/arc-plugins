
arc.run(['$rootScope', function ($rootScope) {

   $rootScope.plugin("arcTemplate2", "Ghost TI", "page", {
      menu: "tools",
      icon: "fa-snapchat-ghost",
      description: "This plugin can be used to search any TM1 objects",
      author: "Cubewise",
      url: "https://github.com/cubewise-code/arc-plugins",
      version: "1.0.0"
   });

}]);

arc.directive("arcTemplate2", function () {
   return {
      restrict: "EA",
      replace: true,
      scope: {
         instance: "=tm1Instance"
      },
      templateUrl: "__/plugins/ti-console/template.html",
      link: function ($scope, element, attrs) {

      },
      controller: ["$scope", "$rootScope", "$http", "$tm1", "$translate", "$timeout", "$helper", function ($scope, $rootScope, $http, $tm1, $translate, $timeout,$helper) {

         //Define variables
         $scope.defaults = {};
         $scope.selections = {};
         $scope.lists = {};
         $scope.values = {};
         $scope.code = {
            prolog : '',
            epilog: ''
         };
         $scope.queryStatus = '';

         //Check TM1 Version
         $scope.checkTM1Version = function () {
            $scope.tm1VersionSupported = false;
            $scope.instanceData = {};
            $tm1.instance($scope.instance).then(function (data) {
                $scope.instanceData = data;
                if ($helper.versionCompare($scope.instanceData.ProductVersion, "11.1.0") >= 0) {
                   $scope.tm1VersionSupported = true;
                };
            });
        };
        // Execute checkTM1Version
        $scope.checkTM1Version();

         //Functions
         $scope.Execute = function () {
            $scope.queryStatus = 'executing';
            body = {
               Process: {
                  PrologProcedure: $scope.code.prolog,
                  EpilogProcedure: $scope.code.epilog
               }
            };
            var config = {
               method: "POST",
               url: encodeURIComponent($scope.instance) + "/ExecuteProcess",
               data: body
            };
            $http(config).then(function (result) {
               if (result.status == 200 || result.status == 201 || result.status == 204) {
                  $scope.queryStatus = 'success';
               } else {
                  $scope.queryStatus = 'failed';
               }
            });
         };

         //Trigger an event after the login screen
         $scope.$on("login-reload", function (event, args) {

         });

         //Close the tab
         $scope.$on("close-tab", function (event, args) {
            // Event to capture when a user has clicked close on the tab
            if (args.page == "arcTemplate2" && args.instance == $scope.instance && args.name == null) {
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