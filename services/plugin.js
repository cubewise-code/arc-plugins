
arc.run(['$rootScope', function ($rootScope) {

    $rootScope.plugin("arcServices", "Arc Services", "page", {
        menu: "tools",
        icon: "fa-arrows-h",
        description: "This plugin can be used to search any TM1 objects",
        author: "Cubewise",
        url: "https://github.com/cubewise-code/arc-plugins",
        version: "1.0.0"
    });

}]);

arc.directive("arcServices", function () {
    return {
        restrict: "EA",
        replace: true,
        scope: {
            instance: "=tm1Instance"
        },
        templateUrl: "__/plugins/services/template.html",
        link: function ($scope, element, attrs) {

        },
        controller: ["$scope", "$rootScope", "$http", "$tm1", "$translate", "$timeout", "ngDialog", function ($scope, $rootScope, $http, $tm1, $translate, $timeout, ngDialog) {

            $scope.defaults = {
                systemCube: 'System info',
                element1: 'Current Date',
                element2: 'Numeric'
            };

            $scope.selections = {
                chore: 'Save Data - Morning',
                process: 'Bedrock.Server.Wait',
                cube: 'General Ledger',
                instance: 'Canvas Sample',
                valueToBeSent: '15'
            };

            $scope.results = {};

            $scope.values = {
                currentDate: '0'
            }

            $scope.options = {
                showInstanceInfo: false
            }

            $scope.lists = {
                instances: [],
                instanceData: []
            }

            $scope.executeChore = function (name) {
                $tm1.choreExecute($scope.instance, name);
            };

            $scope.executeProcess = function (name) {
                $tm1.processExecute($scope.instance, name);
            };

            $scope.getInstances = function () {
                $tm1.instances().then(function (data) {
                    $scope.lists.instances = data;
                    //Open Modal
                    $scope.openModalInstances("List of instances",$scope.lists.instances);
                });
            };

            $scope.getInstance = function (name) {
                $scope.options.showInstanceInfo = !$scope.options.showInstanceInfo;
                $tm1.instance(name).then(function (data) {
                    $scope.lists.instanceData = data;
                    $scope.openModalInstances($scope.selections.instance, $scope.lists.instanceData);
                });
            };

            $scope.getCubeDimensions = function (cube) {
                $tm1.cubeDimensions($scope.instance, cube).then(function (data) {
                    $scope.lists.dimensions = data;
                    $scope.openModalInstances($scope.selections.cube, $scope.lists.dimensions);
                });
            };

            $scope.getValueFromCell = function () {
                var mdxQuery = "SELECT NON EMPTY {[System Info Parameter].["+$scope.defaults.element1+"]} ON COLUMNS,NON EMPTY {[System Info Measures].["+$scope.defaults.element2+"]} ON ROWS FROM ["+$scope.defaults.systemCube+"]";
                var mdxJSON = {MDX: mdxQuery};
                $http.post(encodeURIComponent($scope.instance) + "/ExecuteMDX?$expand=Cells", mdxJSON).then(function (values) {
                    //console.log(values.data.Cells[0].Value);
                   // $scope.values.CurrentDate = values.data.Cells[0].Value;
                });
            };

            $scope.getValueFromCell();

            $scope.sendValueToCell = function (value) {
                $tm1.cellUpdate(value, $scope.instance, $scope.defaults.systemCube, $scope.defaults.element1, $scope.defaults.element2).then(function (data) {
                    //console.log(data.status);
                    $scope.getValueFromCell();
                });
            };

            $scope.openModalInstances = function (title, message){
                var dialog = ngDialog.open({
                    className: "ngdialog-theme-default large",
                    template: "__/plugins/services/modal.html",
                    name: "Instances",
                    controller: ['$rootScope', '$scope', function ($rootScope, $scope) {
                       
                       $scope.title =  $scope.ngDialogData.title;
                       $scope.message =  $scope.ngDialogData.message;
        
                    }], 
                    data: {
                       title: title,
                       message: message
                    }
                });
            };      
    
            
            $scope.$on("login-reload", function (event, args) {

            });

            $scope.$on("close-tab", function (event, args) {
                // Event to capture when a user has clicked close on the tab
                if (args.page == "arcServices" && args.instance == $scope.instance && args.name == null) {
                    // The page matches this one so close it
                    $rootScope.close(args.page, { instance: $scope.instance });
                }
            });

            $scope.$on("$destroy", function (event) {

            });


        }]
    };
});