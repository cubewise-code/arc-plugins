
arc.run(['$rootScope', function ($rootScope) {

   $rootScope.plugin("cubewiseSearchByElement", "Search by Element ID", "page", {
      menu: "tools",
      icon: "fa-search",
      description: "This plugin can be used to search an dimension element ID",
      author: "Cubewise",
      url: "https://github.com/cubewise-code/arc-plugins",
      version: "1.0.0"
   });

}]);

arc.directive("cubewiseSearchByElement", function () {
   return {
      restrict: "EA",
      replace: true,
      scope: {
         instance: "=tm1Instance"
      },
      templateUrl: "__/plugins/search-element-id/template.html",
      link: function ($scope, element, attrs) {

      },
      controller: ["$scope", "$rootScope", "$http", "$tm1", "$translate", "$timeout", "ngDialog", function ($scope, $rootScope, $http, $tm1, $translate, $timeout, ngDialog) {

         // Store the active tab index
         $scope.selections = {
            dimension: '',
            hierarchy: '',
            subset: ''
         };

         $scope.options = {
            searched: false
         }

         $scope.lists = {
            dimensions: []
         }

         $scope.elementToSearch = '';

         //Functions
         $scope.getDimensions = function () {
            $scope.options.searched=false;
            $scope.lists.dimensions = [];
            $http.get(encodeURIComponent($scope.instance) + "/Dimensions?$filter=DefaultHierarchy/Elements/any(e: contains(replace(toupper(e/Name),' ',''), '" + $scope.elementToSearch.toUpperCase() + "'))").then(function (result) {
               $scope.lists.dimensions = result.data.value;
               $scope.options.searched=true;
            });
         };

         //When typing enter
         $scope.key = function ($event) {
            //Arrow up
            if ($event.keyCode == 13) {
               $scope.getDimensions();
            }
         }

         //Manage color:
         $scope.generateHSLColour = function (string) {
            //HSL refers to hue, saturation, lightness
            var styleObject = {
               "background-color": "",
               "color": "white"
            };
            //for ngStyle format
            var hash = 0;
            var saturation = "50";
            var lightness = "50";
            for (var i = 0; i < string.length; i++) {
               hash = string.charCodeAt(i) + ((hash << 5) - hash);
            }
            var h = hash % 360;
            styleObject["background-color"] = 'hsl(' + h + ', ' + saturation + '%, ' + lightness + '%)';
            return styleObject;
         };

         $scope.$on("login-reload", function (event, args) {

         });

         $scope.$on("close-tab", function (event, args) {
            // Event to capture when a user has clicked close on the tab
            if (args.page == "cubewiseSearchByElement" && args.instance == $scope.instance && args.name == null) {
               // The page matches this one so close it
               $rootScope.close(args.page, { instance: $scope.instance });
            }
         });

         $scope.$on("$destroy", function (event) {

         });


      }]
   };
});