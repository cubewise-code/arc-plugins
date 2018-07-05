
arc.run(['$rootScope', function ($rootScope) {

    $rootScope.plugin("adminTasksVertical", "Admin Tasks Vertical", "page", {
        menu: "tools",
        icon: "fa-arrow-circle-o-down",
        description: "This plugin can be used to search any TM1 objects",
        author: "Cubewise",
        url: "https://github.com/cubewise-code/arc-plugins",
        version: "1.0.0"
    });

}]);

arc.directive("adminTasksVertical", function () {
    return {
        restrict: "EA",
        replace: true,
        scope: {
            instance: "=tm1Instance"
        },
        templateUrl: "__/plugins/admin-tasks-vertical/template.html",
        link: function ($scope, element, attrs) {

        },
        controller: ["$scope", "$rootScope", "$http", "$tm1", "$translate", "$timeout", function ($scope, $rootScope, $http, $tm1, $translate, $timeout) {

            // Store the active tab index
            $scope.selections = {
                chore: 'Save Data - Morning',
                process: 'Bedrock.Server.Wait',
                cube: 'General Ledger',
                instance: 'Canvas Sample'
            };

            $scope.link = {
                openView: 'cube/view/'+ $scope.instance,
                openTI: 'cube/view/'+ $scope.instance
            };

            $scope.tabs = [
                { number:0, title:'Monthly', stepPercentage:0, content:[
                    {
                        number: '1',
                        title: 'Update System Info Parameters',
                        open: true,
                        actions: [{
                            name: 'Open System Info cube',
                            cube: 'System Info',
                            view: 'Default'
                        },{
                            name: 'Check Region Subset',
                            dimension: 'Region',
                            hierarchy: 'Region',
                            subset: 'All Countries'
                        }]
                    },
                    {
                        number: '2',
                        title: 'Load General Ledger Data',
                        open: true,
                        actions: [{
                            name: 'Load from File',
                            process: 'Cube.GeneralLedger.LoadFromFile'
                        },
                        {
                            name: 'Run Migrate Daily chore',
                            chore: 'Migrate Daily'
                        },
                        {
                            name: 'Save Data',
                            process: 'Bedrock.Server.SaveDataAll'
                        }]
                    },
                    {
                        number: '3',
                        title: 'Run TI and then check view',
                        open: true,
                        actions: [{
                            name: 'Load from File',
                            process: 'Cube.GeneralLedger.LoadFromFile'
                        },
                        {
                            name: 'System Info',
                            type: 'openView',
                            cube: 'System Info',
                            view: 'Default'
                        }]
                    },{
                        number: '4',
                        title: 'Run TI and then check view',
                        open: true,
                        actions: [{
                            name: 'Load from File',
                            process: 'Cube.GeneralLedger.LoadFromFile'
                        },
                        {
                            name: 'System Info',
                            type: 'openView',
                            cube: 'System Info',
                            view: 'Default'
                        }]
                    }
                ] },
                { number:1, title:'Weekly', stepPercentage:0, content:[
                    {
                        number: '1',
                        title: 'Update System Info Parameters',
                        open: true,
                        actions: [{
                            name: 'Open System Info cube',
                            cube: 'System Info',
                            view: 'Default'
                        },{
                            name: 'Check Region Subset',
                            dimension: 'Region',
                            hierarchy: 'Region',
                            subset: 'All Countries'
                        }]
                    }
                ] }
              ];

              $scope.calculatePercentage = function (tab) {
                var nbStepsOpen = 0 ;
                var nbStepsTotal = 0 ;
                for(var step in $scope.tabs[tab].content){
                     nbStepsTotal ++;
                     if($scope.tabs[tab].content[step].open == false){
                         nbStepsOpen ++;
                     }
                } 
                $scope.tabs[tab].stepPercentage = parseInt(nbStepsOpen / nbStepsTotal * 100);
             };

            $scope.executeChore = function (name) {
                $tm1.choreExecute($scope.instance, name);
            };

            $scope.executeProcess = function (name) {
                $tm1.processExecute($scope.instance, name);
            };          

            $scope.$on("login-reload", function (event, args) {

            });

            $scope.$on("close-tab", function (event, args) {
                // Event to capture when a user has clicked close on the tab
                if (args.page == "adminTasksVertical" && args.instance == $scope.instance && args.name == null) {
                    // The page matches this one so close it
                    $rootScope.close(args.page, { instance: $scope.instance });
                }
            });

            $scope.$on("$destroy", function (event) {

            });


        }]
    };
});