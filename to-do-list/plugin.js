
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

         $scope.values = {
            taskIndex: 0,
            editing: true,
            view: 'fa-trello',
            showJson: false,
            showBackgroundImage: true,
            backgroundImage: "background.jpg",
            toDoListVersion: "1"
         };
         $scope.options = {
            stringList: "",
            actionTypes: ['process', 'chore', 'view', 'subset'],
            actionType: [{ key: 'Process', name: 'Process', icon: 'processes' },
            { key: 'Rules', name: 'Rules', icon: 'rule' },
            { key: 'Chore', name: 'Chore', icon: 'chores' },
            { key: 'Cube View', name: 'Cube View', icon: 'cubes' },
            { key: 'Subset Editor', name: 'Subset Editor', icon: 'subset' },
            { key: 'Dimension Editor', name: 'Dimension Editor', icon: 'dimensions' },
            { key: 'Link', name: 'Link', icon: 'fa-globe' }],
            actionOperations: [
               { key: 'moveUp', name: 'Move Up', icon: 'fa-arrow-circle-o-up' },
               { key: 'moveDown', name: 'Move Down', icon: 'fa-arrow-circle-o-down' },
               { key: 'remove', name: 'Delete Action', icon: 'fa-trash' }],
            icons: ['fa-list-ol', 'fa-server', 'fa-sliders', 'fa-shield', 'fa-star', 'fa-sitemap', 'fa-cubes'],
            iconList: 'fa-list-ol',
            instances: []
         }

         $scope.getInstancesInfo = function () {
            $scope.options.instances = [];
            $tm1.instances().then(function (instancesData) {
               _.each(instancesData, function (instance) {
                  if (instance.isLoaded) {
                     $scope.options.instances.push(instance.Name)
                     getObjectsInfo(instance.Name)
                  }
               });
            });
         };

         // Watch broadcast logging-reload

         if (!$rootScope.uiPrefs.arcBauValues || $rootScope.uiPrefs.arcBauValues.length == 0) {
            $rootScope.uiPrefs.arcBauValues = [];
            $rootScope.uiPrefs.arcBauValues = _.cloneDeep($scope.values);
         }

         if (!$rootScope.uiPrefs.arcBauSettings) {
            $rootScope.uiPrefs.arcBauSettings = [];
         }

         $scope.changeView = function () {
            if ($rootScope.uiPrefs.arcBauValues.view == 'fa-trello') {
               $rootScope.uiPrefs.arcBauValues.view = 'fa-table';
            } else if ($rootScope.uiPrefs.arcBauValues.view == 'fa-table') {
               $rootScope.uiPrefs.arcBauValues.view = 'fa-list-alt';
            } else {
               $rootScope.uiPrefs.arcBauValues.view = 'fa-trello';
            }
         }

         $scope.saveAsLists = function (listName, listIcon) {
            var newTask = {
               name: listName,
               icon: listIcon,
               showBackgroundImage: true,
               stepPercentage: 0, editing: false, numbers: true,
               content: _.cloneDeep($rootScope.uiPrefs.arcBauSettings[$rootScope.uiPrefs.arcBauValues.taskIndex].content)
            }
            $rootScope.uiPrefs.arcBauSettings.push(newTask)
            $rootScope.uiPrefs.arcBauValues.taskIndex = $rootScope.uiPrefs.arcBauSettings.length - 1;
            $scope.calculatePercentage();
         }

         $scope.addLists = function (listName, listIcon) {
            var newTask = {
               name: listName,
               icon: listIcon,
               showBackgroundImage: true,
               stepPercentage: 0, editing: false, numbers: true, content: []
            }
            $rootScope.uiPrefs.arcBauSettings.push(newTask)
            $rootScope.uiPrefs.arcBauValues.taskIndex = $rootScope.uiPrefs.arcBauSettings.length - 1;
            //$scope.addStep();
            $scope.calculatePercentage();
         }

         $scope.removeLists = function (index) {
            $rootScope.uiPrefs.arcBauSettings.splice(index, 1);
            $rootScope.uiPrefs.arcBauValues.taskIndex = $rootScope.uiPrefs.arcBauSettings.length - 1;
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

         $scope.openModalSaveAsList = function () {
            var dialog = ngDialog.open({
               className: "ngdialog-theme-default",
               template: "__/plugins/to-do-list/m-save-as-list.html",
               name: "SaveAs",
               scope: $scope,
               controller: ['$rootScope', '$scope', function ($rootScope, $scope) {
                  //$scope.options.icons = $scope.ngDialogData.icons;
                  $scope.nameList = $rootScope.uiPrefs.arcBauSettings[$rootScope.uiPrefs.arcBauValues.taskIndex].name;
                  $scope.newIcon = $rootScope.uiPrefs.arcBauSettings[$rootScope.uiPrefs.arcBauValues.taskIndex].icon;

                  $scope.updateNewIcon = function (icon) {
                     $scope.newIcon = icon;
                  }
               }],
               data: {
                  nameList: $scope.nameList,
                  newIcon: $scope.newIcon,
                  iconList: $scope.options.iconList
               }
            });
         };

         $scope.updateSettings = function (index) {
            $rootScope.uiPrefs.arcBauValues.taskIndex = index;
            $scope.checkDueDate();
         }

         var getEnableNewHierarchyCreationValue = function (instanceName) {
            $scope.values.enableNewHierarchyCreation = {};
            $http.get(encodeURIComponent(instanceName) + "/ActiveConfiguration/Modelling/EnableNewHierarchyCreation").then(function (result) {
               $scope.values.enableNewHierarchyCreation[instanceName] = result.data.value;
            });
         };

         //==========
         // Populate $scope.lists from settings-en.json file
         $scope.lists = [];

         $scope.removeTask = function (taskIndex) {
            $rootScope.uiPrefs.arcBauSettings.splice(taskIndex, 1);
            $rootScope.uiPrefs.arcBauValues.taskIndex = $rootScope.uiPrefs.arcBauSettings.length - 1;
         }

         $scope.addStep = function () {
            var subTask = {
               "edit": true,
               "title": "",
               "actions": []
            }
            $rootScope.uiPrefs.arcBauSettings[$rootScope.uiPrefs.arcBauValues.taskIndex].content.push(subTask);
         }

         $scope.updateActionType = function (action) {
            if (action.type == 'view') {
               action.type = 'subset'
            } else if (action.type == 'subset') {
               action.type = 'process'
            } else if (action.type == 'process') {
               action.type = 'chore'
            } else if (action.type == 'chore') {
               action.type = 'view'
            }
         }

         $scope.updateIcon = function () {
            if ($rootScope.uiPrefs.arcBauSettings[$rootScope.uiPrefs.arcBauValues.taskIndex].icon == 'fa-server') {
               $rootScope.uiPrefs.arcBauSettings[$rootScope.uiPrefs.arcBauValues.taskIndex].icon = 'fa-sliders'
            } else if ($rootScope.uiPrefs.arcBauSettings[$rootScope.uiPrefs.arcBauValues.taskIndex].icon == 'fa-sliders') {
               $rootScope.uiPrefs.arcBauSettings[$rootScope.uiPrefs.arcBauValues.taskIndex].icon = 'fa-shield'
            } else if ($rootScope.uiPrefs.arcBauSettings[$rootScope.uiPrefs.arcBauValues.taskIndex].icon == 'fa-shield') {
               $rootScope.uiPrefs.arcBauSettings[$rootScope.uiPrefs.arcBauValues.taskIndex].icon = 'fa-star'
            } else if ($rootScope.uiPrefs.arcBauSettings[$rootScope.uiPrefs.arcBauValues.taskIndex].icon == 'fa-star') {
               $rootScope.uiPrefs.arcBauSettings[$rootScope.uiPrefs.arcBauValues.taskIndex].icon = 'fa-sitemap'
            } else if ($rootScope.uiPrefs.arcBauSettings[$rootScope.uiPrefs.arcBauValues.taskIndex].icon == 'fa-sitemap') {
               $rootScope.uiPrefs.arcBauSettings[$rootScope.uiPrefs.arcBauValues.taskIndex].icon = 'fa-cubes'
            } else if ($rootScope.uiPrefs.arcBauSettings[$rootScope.uiPrefs.arcBauValues.taskIndex].icon == 'fa-cubes') {
               $rootScope.uiPrefs.arcBauSettings[$rootScope.uiPrefs.arcBauValues.taskIndex].icon = 'fa-list-ol'
            } else if ($rootScope.uiPrefs.arcBauSettings[$rootScope.uiPrefs.arcBauValues.taskIndex].icon == 'fa-list-ol') {
               $rootScope.uiPrefs.arcBauSettings[$rootScope.uiPrefs.arcBauValues.taskIndex].icon = 'fa-server'
            } else {
               $rootScope.uiPrefs.arcBauSettings[$rootScope.uiPrefs.arcBauValues.taskIndex].icon = 'fa-server'
            }
         }

         $scope.updateCategory = function (action) {
            if (action.category == 'badge-info') {
               action.category = 'badge-secondary'
            } else if (action.category == 'badge-secondary') {
               action.category = 'badge-warning'
            } else if (action.category == 'badge-warning') {
               action.category = 'badge-danger'
            } else if (action.category == 'badge-danger') {
               action.category = 'badge-info'
            }
         }

         $scope.cloneStep = function (index, step) {
            var stepNew = _.cloneDeep(step);
            $rootScope.uiPrefs.arcBauSettings[$rootScope.uiPrefs.arcBauValues.taskIndex].content.splice(index + 1, 0, stepNew);
            $scope.calculatePercentage();
         }

         $scope.removeStep = function (index) {
            $rootScope.uiPrefs.arcBauSettings[$rootScope.uiPrefs.arcBauValues.taskIndex].content.splice(index, 1);
         }

         $scope.moveStep = function (indexOld, indexNew) {
            var step = _.cloneDeep($rootScope.uiPrefs.arcBauSettings[$rootScope.uiPrefs.arcBauValues.taskIndex].content[indexOld]);
            $rootScope.uiPrefs.arcBauSettings[$rootScope.uiPrefs.arcBauValues.taskIndex].content.splice(indexNew, 0, step);
            if (indexOld - indexNew < 0) {
               $scope.removeStep(indexOld);
            } else {
               $scope.removeStep(indexOld + 1);
            }
         }

         $scope.showListInJson = function () {
            $scope.values.showJson = true;
            $scope.options.stringList = JSON.stringify($rootScope.uiPrefs.arcBauSettings[$rootScope.uiPrefs.arcBauValues.taskIndex], null, 2);
         }

         $scope.cancelJson = function () {
            $scope.values.showJson = false;
         }

         $scope.clearJson = function () {
            $scope.options.stringList = "";
         }
         

         $scope.validateJson = function () {
            $scope.values.showJson = false;
            $rootScope.uiPrefs.arcBauSettings[$rootScope.uiPrefs.arcBauValues.taskIndex] = JSON.parse($scope.options.stringList);
         }


         $scope.addAction = function (parentIndex) {
            var action = {
               "edit": true,
               "open": true,
               "execute": true,
               "category": "badge-info",
               "instance": "",
               "name": "",
               "cube": "",
               "view": "",
               "text": "",
               "link": "",
               "type": "Process",
               "dueDate": moment(),
               "setDueDate": false,
               "startTimeIsOpen": false
            }
            $rootScope.uiPrefs.arcBauSettings[$rootScope.uiPrefs.arcBauValues.taskIndex].content[parentIndex].actions.push(action);
         }

         $scope.cloneAction = function (parentIndex, index, action) {
            var actionNew = _.cloneDeep(action);
            $rootScope.uiPrefs.arcBauSettings[$rootScope.uiPrefs.arcBauValues.taskIndex].content[parentIndex].actions.splice(index + 1, 0, actionNew);
            $scope.calculatePercentage();
         }

         $scope.removeAction = function (parentIndex, index) {
            $rootScope.uiPrefs.arcBauSettings[$rootScope.uiPrefs.arcBauValues.taskIndex].content[parentIndex].actions.splice(index, 1);
         }

         $scope.moveAction = function (parentIndex, indexOld, indexNew) {
            var action = _.cloneDeep($rootScope.uiPrefs.arcBauSettings[$rootScope.uiPrefs.arcBauValues.taskIndex].content[parentIndex].actions[indexOld]);
            $rootScope.uiPrefs.arcBauSettings[$rootScope.uiPrefs.arcBauValues.taskIndex].content[parentIndex].actions.splice(indexNew, 0, action);
            if (indexOld - indexNew < 0) {
               $scope.removeAction(parentIndex, indexOld);
            } else {
               $scope.removeAction(parentIndex, indexOld + 1);
            }
         }

         $scope.moveActionToStep = function (stepIndexOld, stepIndexNew, indexAction) {
            var action = _.cloneDeep($rootScope.uiPrefs.arcBauSettings[$rootScope.uiPrefs.arcBauValues.taskIndex].content[stepIndexOld].actions[indexAction]);
            //Add action to new step
            var numberAction = $rootScope.uiPrefs.arcBauSettings[$rootScope.uiPrefs.arcBauValues.taskIndex].content[stepIndexNew].actions.length;
            $rootScope.uiPrefs.arcBauSettings[$rootScope.uiPrefs.arcBauValues.taskIndex].content[stepIndexNew].actions.splice(numberAction, 0, action);
            //Remove Action from old step
            $scope.removeAction(stepIndexOld, indexAction);
         }

         $scope.edit = function (taskIndex) {
            $rootScope.uiPrefs.arcBauSettings[taskIndex].editing = !$rootScope.uiPrefs.arcBauSettings[taskIndex].editing;
         }

         $scope.calculatePercentage = function () {
            var nbActionsOpen = 0;
            var nbActionsTotal = 0;
            _.each($rootScope.uiPrefs.arcBauSettings[$rootScope.uiPrefs.arcBauValues.taskIndex].content, function (step) {
               step.nbActionsOpen = 0;
               step.nbActionsTotal = 0;
               _.each(step.actions, function (action) {
                  nbActionsTotal++;
                  step.nbActionsTotal++;
                  if (action.open == false) {
                     nbActionsOpen++;
                     step.nbActionsOpen++;
                  }
               });
            });
            $rootScope.uiPrefs.arcBauSettings[$rootScope.uiPrefs.arcBauValues.taskIndex].stepPercentage = parseInt(nbActionsOpen / nbActionsTotal * 100);
         };

         $scope.checkDueDate = function () {
            var currentDate = moment();
            _.each($rootScope.uiPrefs.arcBauSettings[$rootScope.uiPrefs.arcBauValues.taskIndex].content, function (step) {
               _.each(step.actions, function (action) {
                  // check duedate
                  action.dueDateBadge = 'badge-default'
                  var deltaDays = moment(action.dueDate).diff(currentDate, 'days');          
                  if(deltaDays < 0){
                     action.dueDateBadge = 'badge-danger'
                  } else if(deltaDays < 7){
                     action.dueDateBadge = 'badge-warning'
                  }
               });
            });
         };
         $scope.checkDueDate();

         $scope.resetPercentage = function () {
            _.each($rootScope.uiPrefs.arcBauSettings[$rootScope.uiPrefs.arcBauValues.taskIndex].content, function (step) {
               _.each(step.actions, function (action) {
                  action.open = true
               });
            });
            $scope.calculatePercentage();
         };

         $scope.resetPercentageOneStep = function (step) {
            _.each(step.actions, function (action) {
               action.open = true
            });
            $scope.calculatePercentage();
         };

         $scope.toggleBackground = function () {
            $rootScope.uiPrefs.arcBauSettings[$rootScope.uiPrefs.arcBauValues.taskIndex].showBackgroundImage = !$rootScope.uiPrefs.arcBauSettings[$rootScope.uiPrefs.arcBauValues.taskIndex].showBackgroundImage;
            if ($rootScope.uiPrefs.arcBauSettings[$rootScope.uiPrefs.arcBauValues.taskIndex].showBackgroundImage) {
               $http.get("__/plugins/to-do-list/" + $scope.values.backgroundImage).then(function (value) {
                  if (value.status == 404) {
                     $scope.values.displayMissingBackground = true;
                     $scope.values.missingBgMessage1 = "The following image is missing /plugins/to-do-list/" + $scope.values.backgroundImage;
                     $scope.values.missingBgMessage2 = "To use a background image, you need first to add a file called " + $scope.values.backgroundImage + " to the following folder <Arc installation folder>/plugins/to-do-list/";
                     $timeout(function () {
                        $scope.values.displayMissingBackground = false;
                     }, 10000);
                  };
               });
            }
         }

         $scope.executeChore = function (action) {
            $tm1.choreExecute(action.instance, action.chore).then(function (result) {
               if (result.success) {
                  action.open = false;
                  $scope.calculatePercentage();
               }
            });
         };

         $scope.executeProcess = function (action) {
            $tm1.processExecute(action.instance, action.process).then(function (result) {
               if (result.success) {
                  action.open = false;
                  $scope.calculatePercentage();
               }
            });
         };

         var getProcessInfo = function (instanceName) {
            //Get all dimensions
            $scope.lists.processes = {};
            $http.get(encodeURIComponent(instanceName) + "/Processes?$select=Name").then(function (result) {
               $scope.lists.processes[instanceName] = result.data.value;
            });
         };

         var getDimensionInfo = function (instanceName) {
            $scope.lists.dimensionsInfo = {};
            $http.get(encodeURIComponent(instanceName) + "/Dimensions?$select=Name").then(function (dimension) {
               $scope.lists.dimensionsInfo[instanceName] = {};
               $scope.lists.dimensionsInfo[instanceName].dimensions = dimension.data.value;
               _.each(dimension.data.value, function (dimension) {
                  $scope.lists.dimensionsInfo[instanceName].dimensions[dimension.Name] = {};
                  $http.get(encodeURIComponent(instanceName) + "/Dimensions('" + dimension.Name + "')/Hierarchies?$select=Name").then(function (hierarchies) {
                     $scope.lists.dimensionsInfo[instanceName].dimensions[dimension.Name].hierarchies = hierarchies.data.value;
                     _.each(hierarchies.data.value, function (hierarchy) {
                        $scope.lists.dimensionsInfo[instanceName].dimensions[dimension.Name].hierarchies[hierarchy.Name] = {};
                        $http.get(encodeURIComponent(instanceName) + "/Dimensions('" + dimension.Name + "')/Hierarchies('" + hierarchy.Name + "')/Subsets?$select=Name").then(function (subsets) {
                           $scope.lists.dimensionsInfo[instanceName].dimensions[dimension.Name].hierarchies[hierarchy.Name].subsets = subsets.data.value;
                        });
                     });
                  });
               });
            })
         };


         var getChoresInfo = function (instanceName) {
            $scope.lists.chores = {};
            $http.get(encodeURIComponent(instanceName) + "/Chores?$select=Name").then(function (result) {
               $scope.lists.chores[instanceName] = result.data.value;
            });
         };

         $scope.lists.cubes = [];
         var getCubeInfo = function (instanceName) {
            $scope.lists.cubes = {};
            $http.get(encodeURIComponent(instanceName) + "/Cubes?$select=Name").then(function (result) {
               $scope.lists.cubes[instanceName] = result.data.value;
               //create views list
               //Cubes('Balance Sheet')/Views?select=Name
               _.each($scope.lists.cubes[instanceName], function (cube) {
                  $scope.lists.cubes[instanceName].views = {};
                  $http.get(encodeURIComponent(instanceName) + "/Cubes('" + cube.Name + "')/Views?$select=Name").then(function (views) {
                     $scope.lists.cubes[instanceName].views[cube.Name] = views.data.value;
                  });
               });
            });
         };

         var getObjectsInfo = function (instanceName) {
            getProcessInfo(instanceName);
            getChoresInfo(instanceName);
            getDimensionInfo(instanceName);
            getEnableNewHierarchyCreationValue(instanceName);
            getCubeInfo(instanceName);
         }

         $scope.getInstancesInfo();

         $scope.copied = false;
         $scope.copyToClipboard = function () {
            $scope.copied = true;
            /* Get the text field */
            var copyText = document.getElementById("myInput");
          
            /* Select the text field */
            copyText.select();
            copyText.setSelectionRange(0, 999999); /*For mobile devices*/
          
            /* Copy the text inside the text field */
            document.execCommand("copy");

            $timeout(function () {
               $scope.copied = false;
            }, 3000)
          
          }

         $scope.$on("login-reload", function (event, args) {
            $tm1.instance(args.instance).then(function (instance) {
               $scope.getInstancesInfo();
            });
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