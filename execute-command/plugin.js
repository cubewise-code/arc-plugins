
arc.run(['$rootScope', function ($rootScope) {

	$rootScope.plugin("executeCommand", "EXEC", "page", {
		menu: "tools",
		icon: "fa-terminal",
		description: "This plugin can be to execute an external command from Arc",
		author: "Cubewise",
		url: "https://github.com/cubewise-code/arc-plugins",
		version: "1.0.0"
	});

}]);

arc.directive("executeCommand", function () {
	return {
		restrict: "EA",
		replace: true,
		scope: {
			instance: "=tm1Instance"
		},
		templateUrl: "__/plugins/execute-command/template.html",
		link: function ($scope, element, attrs) {

		},
		controller: ["$scope", "$rootScope", "$http", "$tm1", "$translate", "$timeout", "$q", "$document", "uuid2",
			function ($scope, $rootScope, $http) {

				$scope.data = {};

				$scope.load = function(){
					$scope.loading = true;
					$http.get("/_api/command?file=test.json").then(function(success){
						$scope.loading = false;
						if (success.status === 200) {
							if (success.data) {
								$scope.data = success.data;
							}
						}
					});
				}
				$scope.load();

				$scope.save = function() {
					$scope.saving = true;
					var data = {
						Name: "test.json",
						Data: $scope.data
					};
					$http.post("/_api/command", data).then(function(success){
						$scope.saving = false;
						if (success.status === 200) {
	
						}
					});
				};

				$scope.execute = function() {
					$scope.executing = true;
					$scope.output = null;
					$scope.stdout = null;
					var data = {
						Script: $scope.data.script,
						Input: "test.json"
					};
					$http.post(encodeURIComponent($scope.instance) + "/command/exec", data).then(function(success){
						$scope.executing = false;
						if (success.status === 200) {
							$scope.output = success.data.Output;
							$scope.stdout = success.data.StdOut;
						}
					});
				};

				$scope.$on("login-reload", function (event, args) {

				});

				$scope.$on("close-tab", function (event, args) {
					// Event to capture when a user has clicked close on the tab
					if (args.page == "executeCommand" && args.instance == $scope.instance && args.name == null) {
						// The page matches this one so close it
						$rootScope.close(args.page, { instance: $scope.instance });
					}
				});

				$scope.$on("$destroy", function (event) {

				});

			}]
	};
});