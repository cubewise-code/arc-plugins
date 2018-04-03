
arc.run(['$rootScope', function($rootScope) {

    $rootScope.plugin("threads", "THREADS", "page", {
        menu: "administration",
        icon: "fa-users",
        description: "This plugin displays the current threads in TM1 and allow you cancel running threads.",
        author: "Cubewise",
        url: "https://github.com/cubewise-code/arc-plugins",
        version: "1.0.0"
    });

}]);

arc.directive("threads", function () {
    return {
        restrict: "EA",
        replace: true,
        scope: {
            instance: "=tm1Instance"  
        },
        templateUrl: "__/plugins/threads/template.html",
        link: function ($scope, element, attrs) {

        },
        controller: ["$scope", "$rootScope", "$http", "$timeout", "$tm1", "$dialogs", "$helper", function ($scope, $rootScope, $http, $timeout, $tm1, $dialogs, $helper) {

            $scope.isPaused = false;
            $scope.activeOnly = false;
            $scope.now = new Date();
            $scope.selections = {
                filter: ""
            };

            if(!$rootScope.uiPrefs.sessionInterval){
                // Set the session interval if it doesn't exist
                // uiPrefs is stored in the browser
                $rootScope.uiPrefs.sessionInterval = 1000;
            }

            var load = function(){
                $scope.reload = false;
                // Loads the thread information from TM1
                // First part of URL is the encoded instance name and then REST API URL (excluding api/v1/)
                $http.get(encodeURIComponent($scope.instance) + "/Threads").then(function(success, error) {
                    if(success.status == 401){
                        // Set reload to true to refresh after the user logs in
                        $scope.reload = true;
                        return;
                    }
                    else if(success.status < 400){	
                        // Set the threads data		
                        $scope.now = new Date();
                        $scope.threads = success.data.value;
                        _.each($scope.threads, function(item){
                            item.canCancel = item.State != "Idle";
                            item.ElapsedTimeS = $helper.timespanToSeconds(item.ElapsedTime);
                            item.WaitTimeS = $helper.timespanToSeconds(item.WaitTime);
                        })
                        if(!$scope.isPaused){
                            // If the page is active retrieve the data again in 1 second
                            $scope.loadTimeout = setTimeout(function(){
                                load();
                            }, $rootScope.uiPrefs.sessionInterval);
                        }         
                    } else {
                        // Error to display
                        if(success.data && success.data.error && success.data.error.message){
                            $scope.message = success.data.error.message;
                        }
                        else {
                            $scope.message = success.data;
                        }
                        $timeout(function(){
                            $scope.message = null;
                        }, 5000);
                    }
                });
            };

            // Load the threads the first time
            load();

            $scope.togglePaused = function(){
                $scope.isPaused = !$scope.isPaused;
                if(!$scope.isPaused){
                    // Starting loading again
                    load();
                }
            };

            $scope.toggleActiveOnly = function(){
                $scope.activeOnly = !$scope.activeOnly;
            };

            $scope.listFilter = function(item) {
                // If active only hide Idle threads
                if($scope.activeOnly && item.State == "Idle"){
                    return false;
                }
                // Check text filter
                if(!$scope.selections.filter || !$scope.selections.filter.length){
                    return true;
                }
                var filter = $scope.selections.filter.toLowerCase();
                if(item.Name.toLowerCase().indexOf(filter) !== -1 || item.Function.toLowerCase().indexOf(filter) !== -1 || item.ObjectName.toLowerCase().indexOf(filter) !== -1){
                    return true;
                }
                return false;
            };

            $scope.cancelThread = function(id){

                $http.post(encodeURIComponent($scope.instance) + "/Threads(" + id + ")/tm1.CancelOperation",  {}).then(function(success, error) {
                        if(success.status == 401){
                            return;
                        } else if(success.status < 400){
                            // Success the thread was cancelled
                        } else {
                            if(success.data && success.data.error && success.data.error.message){
                                $scope.message = success.data.error.message;
                            }
                            else {
                                $scope.message = success.data;
                            }
                            $timeout(function(){
                                $scope.message = null;
                            }, 5000);
                        }            
                    }
                );

            };

            $scope.$on("login-reload", function(event, args) {
                // Event to reload the page, normally after the session has timed out
                // Check that instance in args matches your $scope
                if(args.instance === $scope.instance && $scope.reload){
                    load();
                }
            });
                
            $scope.$on("close-tab", function(event, args) {
                // Event to capture when a user has clicked close on the tab
                if(args.page == "threads" && args.instance == $scope.instance && args.name == null){
                    // The page matches this one so close it
                    $rootScope.close(args.page, {instance: $scope.instance});
                }
            });

            $scope.$on("$destroy", function(event){
                // Cancel the timeout and any other resources
                clearTimeout($scope.loadTimeout);
            });
        

        }]
    };
});