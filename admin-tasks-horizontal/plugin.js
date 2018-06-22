
arc.run(['$rootScope', function ($rootScope) {

    $rootScope.plugin("adminTasksHorizontal", "Admin Tasks Horizontal", "page", {
        menu: "tools",
        icon: "fa-arrow-circle-o-right",
        description: "This plugin can be used to search any TM1 objects",
        author: "Cubewise",
        url: "https://github.com/cubewise-code/arc-plugins",
        version: "1.0.0"
    });

}]);

arc.directive("adminTasksHorizontal", function () {
    return {
        restrict: "EA",
        replace: true,
        scope: {
            instance: "=tm1Instance"
        },
        templateUrl: "__/plugins/admin-tasks-horizontal/template.html",
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
                { title:'Monthly', stepPercentage:0, content:[
                    {
                        title: '1 - Update System Info Parameters',
                        open: true,
                        actions: [{
                            category: 'bg-info',
                            name: 'Open System Info cube',
                            cube: 'System Info',
                            view: 'Default'
                        },{
                            category: 'bg-info',
                            name: 'Check Region Subset',
                            dimension: 'Region',
                            hierarchy: 'Region',
                            subset: 'All Countries'
                        },{
                            category: 'bg-warning',
                            name: 'Run Time subsets update',
                            process: 'Dim.Date.LoadFromODBC'
                        }]
                    },
                    {
                        title: '2 - Load General Ledger Data',
                        open: true,
                        actions: [{
                            category: 'bg-warning',
                            name: 'Load from File',
                            process: 'Cube.GeneralLedger.LoadFromFile'
                        },
                        {
                            category: 'bg-warning',
                            name: 'Run Migrate Daily chore',
                            chore: 'Migrate Daily'
                        },
                        {
                            category: 'bg-info',
                            name: 'Save Data',
                            process: 'Bedrock.Server.SaveDataAll'
                        }]
                    },
                    {
                        title: '3 - Run TI and then check view',
                        open: true,
                        actions: [{
                            category: 'bg-warning',
                            name: 'Bedrock Server Wait',
                            process: 'Bedrock.Server.Wait'
                        },
                        {
                            category: 'bg-success',
                            name: 'System Info',
                            type: 'openView',
                            cube: 'System Info',
                            view: 'Default'
                        }]
                    },
                    {
                        title: '4 - Check Reporting',
                        open: true,
                        actions: [{
                            category: 'bg-warning',
                            name: 'Load from File',
                            process: 'Cube.GeneralLedger.LoadFromFile'
                        },
                        {
                            category: 'bg-success',
                            name: 'System Info',
                            type: 'openView',
                            cube: 'System Info',
                            view: 'Default'
                        }]
                    }
                ] },
                { 
                    title:'Weekly', stepPercentage:0, content:[
                    {
                        title: 'Update System Info Parameters',
                        open: true,
                        actions: [{
                            category: '',
                            name: 'Open System Info cube',
                            cube: 'System Info',
                            view: 'Default'
                        },{
                            category: '',
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
               for(var step in tab.content){
                    nbStepsTotal ++;
                    if(tab.content[step].open == false){
                        nbStepsOpen ++;
                    }
               } 
               tab.stepPercentage = parseInt(nbStepsOpen / nbStepsTotal * 100);
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
                if (args.page == "adminTasksHorizontal" && args.instance == $scope.instance && args.name == null) {
                    // The page matches this one so close it
                    $rootScope.close(args.page, { instance: $scope.instance });
                }
            });

            $scope.$on("$destroy", function (event) {

            });


        }]
    };
});