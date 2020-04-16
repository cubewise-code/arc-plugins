
arc.run(['$rootScope', function ($rootScope) {

    $rootScope.plugin("cubewiseToDo", "To Do List", "page", {
        menu: "tools",
        icon: "fa-list-ol",
        description: "This plugin can be used to create To Do List",
        author: "Cubewise",
        url: "https://github.com/cubewise-code/arc-plugins-samples",
        version: "1.0.0"
    });

}]);

arc.directive("cubewiseToDo", function () {
    return {
        restrict: "EA",
        replace: true,
        scope: {
            instance: "=tm1Instance"
        },
        templateUrl: "__/plugins/to-do-list/template.html",
        link: function ($scope, element, attrs) {

        },
        controller: ["$scope", "$rootScope", "$http", "$tm1", "$translate", "$timeout", "ngDialog", function ($scope, $rootScope, $http, $tm1, $translate, $timeout, ngDialog) {

            // Store the active tab index
            $scope.selections = {
                chore: 'Save Data - Morning',
                process: 'Bedrock.Server.Wait',
                cube: 'General Ledger',
                instance: 'Canvas Sample',
                settingsName: 'First Setting'
            };

            $scope.link = {
                openView: 'cube/view/'+ $scope.instance,
                openTI: 'cube/view/'+ $scope.instance
            };
            $scope.values = {
               taskIndex : 0,
               settingsFileJSONError : false,
               mainProgressBar:0,
               editing:true,
               formatTable:false,
               view:'fa-trello'
            };
            $scope.options = {
               actionTypes:['process','chore','view','subset'],
               actionType: [{key:'Process', name:'Process'},
                           {key:'Rules', name:'Rules'},
                           {key:'Chore', name:'Chore'},
                           {key:'Cube View', name:'Cube View'},
                           {key:'Subset Editor', name:'Subset Editor'},
                           {key:'Dimension Editor', name:'Dimension Editor'}],
               icons: ['fa-list-ol','fa-server', 'fa-sliders','fa-shield','fa-star','fa-sitemap','fa-cubes'],
               iconList: 'fa-list-ol'
            }

            if (!$rootScope.uiPrefs.arcBauValues || $rootScope.uiPrefs.arcBauValues.length == 0) {
               $rootScope.uiPrefs.arcBauValues = [];
               $rootScope.uiPrefs.arcBauValues = _.cloneDeep($scope.values);
            }

            if (!$rootScope.uiPrefs.arcBauSettings) {
               $rootScope.uiPrefs.arcBauSettings = [];
            }

            $scope.changeView = function(){
               if($rootScope.uiPrefs.arcBauValues.view == 'fa-trello'){
                  $rootScope.uiPrefs.arcBauValues.view = 'fa-table';
               } else if($rootScope.uiPrefs.arcBauValues.view == 'fa-table'){
                  $rootScope.uiPrefs.arcBauValues.view = 'fa-list-alt';
               } else {
                  $rootScope.uiPrefs.arcBauValues.view = 'fa-trello';
               }
            }

            $scope.addLists = function(listName, listIcon){
               var newTask = { name: listName, 
               icon: listIcon,
               stepPercentage:0, editing:false, numbers:true, content:[]
               }
               $rootScope.uiPrefs.arcBauSettings.push(newTask)
               $rootScope.uiPrefs.arcBauValues.taskIndex = $rootScope.uiPrefs.arcBauSettings.length-1;
               //$scope.addStep();
               $scope.calculatePercentage();
            }

            $scope.removeLists = function (index) {
               $rootScope.uiPrefs.arcBauSettings.splice(index, 1);
               $rootScope.uiPrefs.arcBauValues.taskIndex = $rootScope.uiPrefs.arcBauSettings.length-1;
            }

         $scope.openModalRemoveList = function () {
            var dialog = ngDialog.open({
               className: "ngdialog-theme-default",
               template: "__/plugins/to-do-list/m-delete-list.html",
               name: "Instances",
               scope: $scope,
               controller: ['$rootScope', '$scope', function ($rootScope, $scope) {

               }],
               data: {
               }
            });
         };

         $scope.openModalAddList = function () {
            var dialog = ngDialog.open({
               className: "ngdialog-theme-default",
               template: "__/plugins/to-do-list/m-add-list.html",
               name: "Instances",
               scope: $scope,
               controller: ['$rootScope', '$scope', function ($rootScope, $scope) {
                  //$scope.options.icons = $scope.ngDialogData.icons;
               }],
               data: {
                  icons: $scope.options.icons,
                  iconList: $scope.options.iconList
               }
            });
         };

            $scope.updateSettings = function (index) {
               $rootScope.uiPrefs.arcBauValues.taskIndex = index;
            }

            var getEnableNewHierarchyCreationValue = function () {
               $http.get(encodeURIComponent($scope.instance) + "/ActiveConfiguration/Modelling/EnableNewHierarchyCreation").then(function (result) {
                     $scope.values.enableNewHierarchyCreation = result.data.value;
               });
            };
            getEnableNewHierarchyCreationValue();

                     //==========
         // Populate $scope.lists from settings-en.json file
         $scope.lists = [];

         $scope.removeTask = function (taskIndex) {
            $rootScope.uiPrefs.arcBauSettings.splice(taskIndex, 1);
            $rootScope.uiPrefs.arcBauValues.taskIndex=$rootScope.uiPrefs.arcBauSettings.length-1;
         }

         $scope.addStep = function(){
            var subTask = {
               "title": "",
               "open": true,
               "actions": []
            }
            $rootScope.uiPrefs.arcBauSettings[$rootScope.uiPrefs.arcBauValues.taskIndex].content.push(subTask);
         }

         $scope.updateActionType = function(action){
            if(action.type == 'view'){
               action.type = 'subset'
            } else if(action.type == 'subset'){
               action.type = 'process'
            } else if(action.type == 'process'){
               action.type = 'chore'
            } else if(action.type == 'chore'){
               action.type = 'view'
            }
         }

         $scope.updateIcon = function(){
            if($rootScope.uiPrefs.arcBauSettings[$rootScope.uiPrefs.arcBauValues.taskIndex].icon == 'fa-server'){
               $rootScope.uiPrefs.arcBauSettings[$rootScope.uiPrefs.arcBauValues.taskIndex].icon = 'fa-sliders'
            } else if($rootScope.uiPrefs.arcBauSettings[$rootScope.uiPrefs.arcBauValues.taskIndex].icon == 'fa-sliders'){
               $rootScope.uiPrefs.arcBauSettings[$rootScope.uiPrefs.arcBauValues.taskIndex].icon = 'fa-shield'
            } else if($rootScope.uiPrefs.arcBauSettings[$rootScope.uiPrefs.arcBauValues.taskIndex].icon == 'fa-shield'){
               $rootScope.uiPrefs.arcBauSettings[$rootScope.uiPrefs.arcBauValues.taskIndex].icon = 'fa-star'
            } else if($rootScope.uiPrefs.arcBauSettings[$rootScope.uiPrefs.arcBauValues.taskIndex].icon == 'fa-star'){
               $rootScope.uiPrefs.arcBauSettings[$rootScope.uiPrefs.arcBauValues.taskIndex].icon = 'fa-sitemap'
            } else if($rootScope.uiPrefs.arcBauSettings[$rootScope.uiPrefs.arcBauValues.taskIndex].icon == 'fa-sitemap'){
               $rootScope.uiPrefs.arcBauSettings[$rootScope.uiPrefs.arcBauValues.taskIndex].icon = 'fa-cubes'
            } else if($rootScope.uiPrefs.arcBauSettings[$rootScope.uiPrefs.arcBauValues.taskIndex].icon == 'fa-cubes'){
               $rootScope.uiPrefs.arcBauSettings[$rootScope.uiPrefs.arcBauValues.taskIndex].icon = 'fa-list-ol'
            } else if($rootScope.uiPrefs.arcBauSettings[$rootScope.uiPrefs.arcBauValues.taskIndex].icon == 'fa-list-ol'){
               $rootScope.uiPrefs.arcBauSettings[$rootScope.uiPrefs.arcBauValues.taskIndex].icon = 'fa-server'
            } else {
               $rootScope.uiPrefs.arcBauSettings[$rootScope.uiPrefs.arcBauValues.taskIndex].icon = 'fa-server'
            }
         }

         $scope.updateCategory = function(action){
            if(action.category == 'badge-info'){
               action.category = 'badge-secondary'
            } else if(action.category == 'badge-secondary'){
               action.category = 'badge-warning'
            } else if(action.category == 'badge-warning'){
               action.category = 'badge-danger'
            } else if(action.category == 'badge-danger'){
               action.category = 'badge-info'
            }
         }

         $scope.removeStep = function (index) {
            $rootScope.uiPrefs.arcBauSettings[$rootScope.uiPrefs.arcBauValues.taskIndex].content.splice(index, 1);
         }

         $scope.moveStep = function (indexOld, indexNew) {
            var step = _.cloneDeep($rootScope.uiPrefs.arcBauSettings[$rootScope.uiPrefs.arcBauValues.taskIndex].content[indexOld]);
            $rootScope.uiPrefs.arcBauSettings[$rootScope.uiPrefs.arcBauValues.taskIndex].content.splice(indexNew, 0,step);
            if(indexOld-indexNew<0){
               $scope.removeStep(indexOld);
            } else {
               $scope.removeStep(indexOld+1);
            }
          }

         $scope.addAction = function(parentIndex){
            var action = {
                   "category": "badge-info",
                   "name": "",
                   "cube": "",
                   "view": "",
                   "type": "Process"
            }
            $rootScope.uiPrefs.arcBauSettings[$rootScope.uiPrefs.arcBauValues.taskIndex].content[parentIndex].actions.push(action);
         }

         $scope.removeAction = function (parentIndex, index) {
            $rootScope.uiPrefs.arcBauSettings[$rootScope.uiPrefs.arcBauValues.taskIndex].content[parentIndex].actions.splice(index, 1);
         }

         $scope.moveAction = function (parentIndex, indexOld, indexNew) {
            var action = _.cloneDeep($rootScope.uiPrefs.arcBauSettings[$rootScope.uiPrefs.arcBauValues.taskIndex].content[parentIndex].actions[indexOld]);
            $rootScope.uiPrefs.arcBauSettings[$rootScope.uiPrefs.arcBauValues.taskIndex].content[parentIndex].actions.splice(indexNew, 0,action);
            if(indexOld-indexNew<0){
               $scope.removeAction(parentIndex, indexOld);
            } else {
               $scope.removeAction(parentIndex, indexOld+1);
            }
          }

         $scope.edit = function (taskIndex) {
            $rootScope.uiPrefs.arcBauSettings[taskIndex].editing = !$rootScope.uiPrefs.arcBauSettings[taskIndex].editing;
         }

            $scope.calculatePercentage = function () {
               var nbStepsOpen = 0 ;
               var nbStepsTotal = 0 ;
               _.each($rootScope.uiPrefs.arcBauSettings[$rootScope.uiPrefs.arcBauValues.taskIndex].content, function (step) {
                     nbStepsTotal ++;
                     if(step.open == false){
                        nbStepsOpen ++;
                    }
               });
               $rootScope.uiPrefs.arcBauSettings[$rootScope.uiPrefs.arcBauValues.taskIndex].stepPercentage = parseInt(nbStepsOpen / nbStepsTotal * 100);
            };

            $scope.resetPercentage = function () {
               _.each($rootScope.uiPrefs.arcBauSettings[$rootScope.uiPrefs.arcBauValues.taskIndex].content, function (step) {
                     step.open = true
               });
               $scope.calculatePercentage();
            };

            $scope.executeChore = function (name) {
                $tm1.choreExecute($scope.instance, name);
            };

            $scope.executeProcess = function (name) {
                $tm1.processExecute($scope.instance, name);
            };     
            
            var getProcessInfo = function () {
               //Get all dimensions
               $http.get(encodeURIComponent($scope.instance) + "/Processes?$select=Name").then(function (result) {
                  $scope.lists.processes = result.data.value;
               });
            };

            getProcessInfo();

            $scope.lists.dimensions = [];
            var getAllDimensionsName = function () {
               $http.get(encodeURIComponent($scope.instance) + "/Dimensions?$select=Name").then(function (result) {
                  $scope.lists.dimensions = result.data.value;
                  $scope.lists.hierarchies = [];
                  $scope.lists.subsets = [];
                  _.each($scope.lists.dimensions, function (dimension) {
                     $http.get(encodeURIComponent($scope.instance) + "/Dimensions('"+dimension.Name+"')/Hierarchies?$select=Name").then(function (hierarchies) {
                        $scope.lists.hierarchies[dimension.Name] = hierarchies.data.value;
                        _.each($scope.lists.hierarchies[dimension.Name], function (hierarchy) {
                           $http.get(encodeURIComponent($scope.instance) + "/Dimensions('"+dimension.Name+"')/Hierarchies('"+hierarchy.Name+"')/Subsets?$select=Name").then(function (subsets) {
                              $scope.lists.subsets[hierarchy.Name] = subsets.data.value;
                           });
                     });
                     });
               });
            })
         };

            getAllDimensionsName();

            $scope.lists.chores = [];
            var getAllChoresName = function () {
               $http.get(encodeURIComponent($scope.instance) + "/Chores?$select=Name").then(function (result) {
                  $scope.lists.chores = result.data.value;
               });
            };

            getAllChoresName();

            $scope.lists.cubes = [];
            var getAllCubesName = function () {
               $http.get(encodeURIComponent($scope.instance) + "/Cubes?$select=Name").then(function (result) {
                  $scope.lists.cubes = result.data.value;
                  //create views list
                  //Cubes('Balance Sheet')/Views?select=Name
                  $scope.lists.views = [];
               _.each($scope.lists.cubes, function (cube) {
                  $http.get(encodeURIComponent($scope.instance) + "/Cubes('"+cube.Name+"')/Views?$select=Name").then(function (views) {
                     $scope.lists.views[cube.Name] = views.data.value;
                  });
               });
               });
            };

            getAllCubesName();

            $scope.$on("login-reload", function (event, args) {

            });

            $scope.$on("close-tab", function (event, args) {
                // Event to capture when a user has clicked close on the tab
                if (args.page == "cubewiseToDo" && args.instance == $scope.instance && args.name == null) {
                    // The page matches this one so close it
                    $rootScope.close(args.page, { instance: $scope.instance });
                }
            });

            $scope.$on("$destroy", function (event) {

            });


        }]
    };
});