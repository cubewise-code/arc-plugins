
arc.run(['$rootScope', function ($rootScope) {

   $rootScope.plugin("cubewiseSubsetAndView", "Native Views and Subsets", "page", {
      menu: "tools",
      icon: "fa-eraser",
      description: "This plugin can be used to search any TM1 objects",
      author: "Cubewise",
      url: "https://github.com/cubewise-code/arc-plugins",
      version: "1.0.0"
   });

}]);

arc.directive("cubewiseSubsetAndView", function () {
   return {
      restrict: "EA",
      replace: true,
      scope: {
         instance: "=tm1Instance"
      },
      templateUrl: "__/plugins/subset-view/template.html",
      link: function ($scope, element, attrs) {

      },
      controller: ["$scope", "$rootScope", "$http", "$tm1", "$translate", "$timeout", "ngDialog", "$helper", function ($scope, $rootScope, $http, $tm1, $translate, $timeout, ngDialog, $helper) {

         // Store the active tab index
         $scope.selections = {
            dimension: '',
            hierarchy: '',
            subset: ''
         };

         $scope.options = {
            seeSubsetsPerView: false,
            seeViewsPerSubset: false,
            seeAllSubsets: false,
            searchBySubset: true
         }

         $scope.lists = {
            dimensions: [],
            hierarchies: [],
            subsets: [],
            cubes: [],
            viewsAndSubsetsUnstructured: [],
            viewsAndSubsetsStructured: [],
            allSubsetsPerView: [],
            allViewsPerSubset: [],
            allSubsets: []
         }
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
         //Reset the lists and refresh the subsets
         $scope.refresh = function () {
            $scope.subsetsToDelete = [];
            $scope.subsetsViewsToDelete = [];
            $scope.subsetsToDelete = [];
            $scope.viewsToDelete = [];
            $scope.viewsDeleted = [];
            $scope.getallViewsPerSubset();
         }
         // TOGGLE DELETE SUBSETS
         $scope.subsetsToDelete = [];
         $scope.subsetsViewsToDelete = [];
         $scope.toggleDeleteSubset = function (item) {
            if (_.includes($scope.subsetsToDelete, item)) {
               //REMOVE SUBSET
               _.remove($scope.subsetsToDelete, function (i) {
                  return i.name === item.name;
               });
               //REMOVE VIEWS
               for (var v in item.views) {
                  viewObject = {
                     subset: item.name,
                     view: item.views[v]
                  }
                  if (_.some($scope.subsetsViewsToDelete, viewObject)) {
                     _.remove($scope.subsetsViewsToDelete, function (i) {
                        return i.subset === viewObject.subset && i.view === viewObject.view;
                     });
                  }
               }
            } else {
               $scope.subsetsToDelete.push(item);
               //ADD ALL THE VIEWS TO BE DELETED
               for (var v in item.views) {
                  viewObject = {
                     subset: item.name,
                     view: item.views[v]
                  }
                  if (!_.some($scope.subsetsViewsToDelete, viewObject)) {
                     $scope.subsetsViewsToDelete.push(viewObject);
                  }
               }
            }
         };
         //OPEN MODAL WITH VIEWS TO BE DELETED
         $scope.openModalSubset = function () {
            var dialog = ngDialog.open({
               className: "ngdialog-theme-default large",
               template: "__/plugins/subset-view/m-delete-subset.html",
               name: "Instances",
               scope: $scope,
               controller: ['$rootScope', '$scope', function ($rootScope, $scope) {
                  $scope.subsets = $scope.ngDialogData.subsets;
                  $scope.views = $scope.ngDialogData.views;
                  //DELETE VIEWS AND THEN SUBSETS
                  $scope.deleteViewsAndSubsets = function () {
                     //Delete views
                     $scope.viewsDeleted = [];
                     console.log("Start deleting views", $scope.subsetsViewsToDelete);
                     var completedRequests = 0;
                     for (var v in $scope.subsetsViewsToDelete) {
                        var viewFullName = $scope.subsetsViewsToDelete[v].view;
                        console.log(viewFullName + " view will be deleted");
                        var semiColumn = viewFullName.indexOf(":");
                        var cubeName = viewFullName.substr(0, semiColumn);
                        var viewName = viewFullName.substr(semiColumn + 1, viewFullName.length - semiColumn + 1);
                        $http.delete(encodeURIComponent($scope.instance) + "/Cubes('" + cubeName + "')/Views('" + viewName + "')").then(function (result) {
                           if (result.status == 204) {
                              console.log(cubeName + " " + viewName + " view has been deleted")
                              $scope.selections.queryStatus = 'success';
                              // Add view to viewsDeleted list
                              $scope.viewsDeleted.push(viewFullName);
                              //Remove view from view list
                              _.remove($scope.subsetsViewsToDelete, function (i) {
                                 return i.view === viewFullName;
                              });
                           } else {
                              $scope.selections.queryStatus = 'failed';
                           }
                           if (completedRequests == $scope.subsetsViewsToDelete.length) {
                              $scope.deleteSubsets();
                           }
                           completedRequests++;
                        });
                     }
                  };
                  $scope.deleteSubsets = function () {
                     // Delete subsets
                     //Debugger;
                     $scope.subsetsDeleted = [];
                     console.log("Start deleting subsets", $scope.subsetsToDelete);
                     for (var s in $scope.subsetsToDelete) {
                        var subsetFullName = $scope.subsetsToDelete[s].name;
                        console.log(subsetFullName + " subset is going to be deleted");
                        var semiColumn = subsetFullName.indexOf(":");
                        var dimension = subsetFullName.substr(0, semiColumn);
                        var hierarchyAndSubset = subsetFullName.substr(semiColumn + 1, subsetFullName.length - semiColumn + 1);
                        var semiColumn2 = hierarchyAndSubset.indexOf(":");
                        var hierarchy = hierarchyAndSubset.substr(0, semiColumn2);
                        var subset = hierarchyAndSubset.substr(semiColumn2 + 1, hierarchyAndSubset.length - semiColumn2 + 1);
                        $http.delete(encodeURIComponent($scope.instance) + "/Dimensions('" + dimension + "')/Hierarchies('" + hierarchy + "')/Subsets('" + subset + "')").then(function (result) {
                           if (result.status == 204) {
                              console.log(dimension + ":" + ":" + hierarchy + ":" + subset + " subset has been deleted")
                              $scope.selections.queryStatus = 'success';
                              // Add subsets to subsetsDeleted list
                              $scope.subsetsDeleted.push(subsetFullName);
                              //Remove subset from subset to delete list
                              _.remove($scope.subsetsToDelete, function (i) {
                                 return i.name === subsetFullName;
                              });
                           } else {
                              $scope.selections.queryStatus = 'failed';
                           }
                        });
                     }
                  }
               }],
               data: {
                  subsets: $scope.subsetsToDelete,
                  subsetsDeleted: $scope.subsetsDeleted,
                  views: $scope.subsetsViewsToDelete,
                  viewsDeleted: $scope.viewsDeleted
               }
            });
         };
         // TOGGLE DELETE VIEWS
         $scope.viewsToDelete = [];
         $scope.toggleDeleteView = function (item) {
            //console.log(item);
            if (_.includes($scope.viewsToDelete, item)) {
               _.remove($scope.viewsToDelete, function (i) {
                  return i.name === item.name;
               });
            } else {
               $scope.viewsToDelete.push(item);
            }
         };
         //OPEN MODAL WITH VIEWS TO BE DELETED
         $scope.openModalView = function () {
            var dialog = ngDialog.open({
               className: "ngdialog-theme-default medium",
               template: "__/plugins/subset-view/m-delete-view.html",
               name: "Instances",
               scope: $scope,
               controller: ['$rootScope', '$scope', function ($rootScope, $scope) {
                  $scope.viewsToDelete = $scope.ngDialogData.viewsToDelete;
                  //DELETE ALL VIEWS
                  $scope.viewsDeleted = [];
                  $scope.deleteViews = function () {
                     console.log("Start Delete views", $scope.viewsToDelete);
                     for (var view in $scope.viewsToDelete) {
                        var viewFullName = $scope.viewsToDelete[view].name;
                        var semiColumn = viewFullName.indexOf(":");
                        var cubeName = viewFullName.substr(0, semiColumn);
                        var viewName = viewFullName.substr(semiColumn + 1, viewFullName.length - semiColumn + 1);
                        $http.delete(encodeURIComponent($scope.instance) + "/Cubes('" + cubeName + "')/Views('" + viewName + "')").then(function (result) {
                           if (result.status == 204) {
                              console.log(cubeName + ":" + viewName + " has been deleted")
                              $scope.selections.queryStatus = 'success';
                              $scope.viewsDeleted.push(viewFullName);
                           } else {
                              $scope.selections.queryStatus = 'failed';
                           }
                        });
                     }
                  };
               }],
               data: {
                  viewsToDelete: $scope.viewsToDelete,
                  viewsDeleted: $scope.viewsDeleted
               }
            });
         };
         // GET DIMENSION DATA
         $scope.getDimensionsList = function () {
            $scope.dimensions = [];
            $http.get(encodeURIComponent($scope.instance) + "/ModelDimensions()?$select=Name").then(function (dimensionsData) {
               $scope.dimensions = dimensionsData.data.value;
            });
         };
         // GET HIERARCHY DATA
         $scope.getHierarchies = function () {
            $http.get(encodeURIComponent($scope.instance) + "/Dimensions('" + $scope.selections.dimension + "')/Hierarchies").then(function (hierarchiesData) {
               $scope.lists.hierarchies = hierarchiesData.data.value;
               //If only one hierarchy
               $scope.nbHierarchies = hierarchiesData.data.value.length;
               if ($scope.nbHierarchies == 1) {
                  $scope.selections.hierarchy = hierarchiesData.data.value[0].Name;
                  $scope.getSubsets();
               }
            });
         };
         // GET SUBSET DATA
         $scope.getSubsets = function () {
            $http.get(encodeURIComponent($scope.instance) + "/Dimensions('" + $scope.selections.dimension + "')/Hierarchies('" + $scope.selections.hierarchy + "')/Subsets").then(function (subsetsData) {
               $scope.lists.subsets = subsetsData.data.value;
            });
         };
         //OPEN MODAL REPLACE SUBSET
         //OPEN MODAL WITH VIEWS TO BE DELETED
         $scope.openModalReplaceSubset = function (view, subsetFullName) {
            var semiColumn = subsetFullName.indexOf(":");
            $scope.selections.dimension = subsetFullName.substr(0, semiColumn);
            var hierarchyAndSubset = subsetFullName.substr(semiColumn + 1, subsetFullName.length - semiColumn + 1);
            var semiColumn2 = hierarchyAndSubset.indexOf(":");
            var hierarchy = hierarchyAndSubset.substr(0, semiColumn2);
            var subset = hierarchyAndSubset.substr(semiColumn2 + 1, hierarchyAndSubset.length - semiColumn2 + 1);
            $scope.subsetToBeReplaced = subsetFullName;
            if(view.length>0){
               //Multiple views
               $scope.targetViews = view;
               $scope.replaceMultipleViews = true;
            }else{
               //If one view
               $scope.replaceMultipleViews = false;
               $scope.targetView = view.viewName;
               $scope.targetCube = view.cube;
            };
            var dialog = ngDialog.open({
               className: "ngdialog-theme-default medium",
               template: "__/plugins/subset-view/m-replace-subset.html",
               name: "Instances",
               scope: $scope,
               controller: ['$rootScope', '$scope', function ($rootScope, $scope) {
                  $scope.getDimensionsList();
                  $scope.getHierarchies();
                  $scope.getSubsets();
                  //REPLACE A SUBSET IN A VIEW
                  $scope.replaceSubset = function (cube,view) {
                     body = {
                        Process: {
                           PrologProcedure: "ViewSubsetAssign('"+cube+"', '"+view+"', '"+$scope.selections.dimension+"', '"+$scope.selections.subset+"');"
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
                  //REPLACE A SUBSET IN MULTIPLE VIEWS
                  $scope.replaceSubsets = function(){
                     if($scope.replaceMultipleViews){
                        for(var v in $scope.targetViews){
                           var viewFullName = $scope.targetViews[v];
                           var semiColumn = viewFullName.indexOf(":");
                           var cubeName = viewFullName.substr(0, semiColumn);
                           var viewName = viewFullName.substr(semiColumn + 1, viewFullName.length - semiColumn + 1);
                           $scope.replaceSubset(cubeName, viewName);
                        }
                     }else{
                        $scope.replaceSubset($scope.targetCube, $scope.targetView);
                     }
                  };
               }],
               data: {
                  subsetToBeReplaced: $scope.subsetToBeReplaced,
                  targetCube: $scope.targetCube,
                  targetViews: $scope.targetViews,
                  targetView: $scope.targetView,
                  dimensions: $scope.dimensions,
                  replaceMultipleViews: $scope.replaceMultipleViews
               }
            });
         };
         // GET ALL VIEWS AND SUBSETS
         $scope.getallViewsPerSubset = function () {
            $scope.lists.viewsAndSubsetsStructured = [];
            var query = "";
            var queryAll = "/Cubes?$select=Name&$expand=Views($select=Name;$expand=tm1.NativeView/Columns/Subset($select=Name;$expand=Hierarchy($select=Name;$expand=Dimension($select=Name))),tm1.NativeView/Rows/Subset($select=Name;$expand=Hierarchy($select=Name;$expand=Dimension($select=Name))),tm1.NativeView/Titles/Subset($select=Name;$expand=Hierarchy($select=Name;$expand=Dimension($select=Name))))";
            var queryWithoutControlObjects = "/Cubes?$filter=indexof(Name,'}') eq -1&$select=Name&$expand=Views($select=Name;$expand=tm1.NativeView/Columns/Subset($select=Name;$expand=Hierarchy($select=Name;$expand=Dimension($select=Name))),tm1.NativeView/Rows/Subset($select=Name;$expand=Hierarchy($select=Name;$expand=Dimension($select=Name))),tm1.NativeView/Titles/Subset($select=Name;$expand=Hierarchy($select=Name;$expand=Dimension($select=Name))))";
            if ($rootScope.uiPrefs.controlObjects) {
               query = queryAll;
            } else {
               query = queryWithoutControlObjects;
            }
            $http.get(encodeURIComponent($scope.instance) + query).then(function (viewsData) {
               //console.log(viewsData);
               $scope.lists.viewsAndSubsetsUnstructured = viewsData.data.value;
               //Loop through cubes
               var cubes = viewsData.data.value;
               for (var cube in cubes) {
                  var cubeName = cubes[cube].Name;
                  //Loop through views
                  allViews = cubes[cube].Views;
                  for (var view in allViews) {
                     var viewName = allViews[view].Name;
                     subsets = [];
                     //Loop through subsets on columns
                     viewColumns = allViews[view].Columns;
                     for (var currentView in viewColumns) {
                        subsetName = viewColumns[currentView].Subset.Name;
                        if (subsetName) {
                           hierarchyName = viewColumns[currentView].Subset.Hierarchy.Name;
                           dimensionName = viewColumns[currentView].Subset.Hierarchy.Dimension.Name;
                           subsetInfo = {
                              cube: cubeName,
                              view: viewName,
                              dimension: dimensionName,
                              hierarchy: hierarchyName,
                              subset: subsetName,
                              subsetColumn: subsetName
                           }
                           $scope.lists.viewsAndSubsetsStructured.push(subsetInfo);
                        }
                     }
                     //Loop through subsets on rows
                     viewRows = allViews[view].Rows;
                     for (var currentView in viewRows) {
                        subsetName = viewRows[currentView].Subset.Name;
                        //If there is a subset
                        if (subsetName) {
                           hierarchyName = viewRows[currentView].Subset.Hierarchy.Name;
                           dimensionName = viewRows[currentView].Subset.Hierarchy.Dimension.Name;
                           subsetInfo = {
                              cube: cubeName,
                              view: viewName,
                              dimension: dimensionName,
                              hierarchy: hierarchyName,
                              subset: subsetName,
                              subsetRow: subsetName
                           }
                           $scope.lists.viewsAndSubsetsStructured.push(subsetInfo);
                        }
                     }
                     //Loop through subsets on Titles
                     viewsTitles = allViews[view].Titles;
                     for (var currentView in viewsTitles) {
                        subsetName = viewsTitles[currentView].Subset.Name;
                        //If there is a subset
                        if (subsetName) {
                           hierarchyName = viewsTitles[currentView].Subset.Hierarchy.Name;
                           dimensionName = viewsTitles[currentView].Subset.Hierarchy.Dimension.Name;
                           subsetInfo = {
                              cube: cubeName,
                              view: viewName,
                              dimension: dimensionName,
                              hierarchy: hierarchyName,
                              subset: subsetName,
                              subsetTitle: subsetName
                           }
                           $scope.lists.viewsAndSubsetsStructured.push(subsetInfo);
                        }
                     }
                  }
               }
               // LOOP THROUGH lists.viewsAndSubsetsStructured TO CREATE lists.allSubsetsPerView AND lists.allViewsPerSubset
               var subsetKeys = {};
               var viewKeys = {};
               for (var item in $scope.lists.viewsAndSubsetsStructured) {
                  //Create subsetFullName
                  dimensionName = $scope.lists.viewsAndSubsetsStructured[item].dimension;
                  hierarchyName = $scope.lists.viewsAndSubsetsStructured[item].hierarchy;
                  subsetName = $scope.lists.viewsAndSubsetsStructured[item].subset;
                  subsetFullName = dimensionName + ':' + hierarchyName + ':' + subsetName;
                  //Create view name
                  cube = $scope.lists.viewsAndSubsetsStructured[item].cube;
                  view = $scope.lists.viewsAndSubsetsStructured[item].view;
                  viewFullName = cube + ':' + view;
                  //Create subsetKeys array
                  if (!subsetKeys[subsetFullName]) {
                     subsetKeys[subsetFullName] = {
                        dimension: dimensionName,
                        subsetName: subsetName,
                        views: []
                     };
                  }
                  subsetKeys[subsetFullName].views.push(viewFullName);
                  //Create viewKeys array
                  if (!viewKeys[viewFullName]) {
                     viewKeys[viewFullName] = {
                        cube: cube,
                        viewName: view,
                        subsets: [],
                        subsetsRow: [],
                        subsetsColumn: [],
                        subsetsTitle: [],
                     };
                  }
                  viewKeys[viewFullName].subsets.push(subsetFullName);
                  //Create subsetFullNameColumn
                  subsetNameColumn = $scope.lists.viewsAndSubsetsStructured[item].subsetColumn;
                  if (subsetNameColumn) {
                     subsetFullNameColumn = dimensionName + ':' + hierarchyName + ':' + subsetNameColumn;
                     viewKeys[viewFullName].subsetsColumn.push(subsetFullNameColumn);
                  }
                  //Create subsetFullNameRow
                  subsetNameRow = $scope.lists.viewsAndSubsetsStructured[item].subsetRow;
                  if (subsetNameRow) {
                     subsetFullNameRow = dimensionName + ':' + hierarchyName + ':' + subsetNameRow;
                     viewKeys[viewFullName].subsetsRow.push(subsetFullNameRow);
                  }
                  //Create subsetFullNameTitle
                  subsetNameTitle = $scope.lists.viewsAndSubsetsStructured[item].subsetTitle;
                  if (subsetNameTitle) {
                     subsetFullNameTitle = dimensionName + ':' + hierarchyName + ':' + subsetNameTitle;
                     viewKeys[viewFullName].subsetsTitle.push(subsetFullNameTitle);
                  }
               }
               //Create lists.allViewsPerSubset array
               $scope.lists.allViewsPerSubset = [];
               _.forEach(subsetKeys, function (value, key) {
                  $scope.lists.allViewsPerSubset.push({
                     name: key,
                     dimension: value.dimension,
                     subsetName: subsetName,
                     views: value.views
                  });
               });
               console.log($scope.lists.allViewsPerSubset);
               //Create lists.allSubsetsPerView array
               $scope.lists.allSubsetsPerView = [];
               _.forEach(viewKeys, function (value, key) {
                  $scope.lists.allSubsetsPerView.push({
                     name: key,
                     cube: value.cube,
                     viewName: value.viewName,
                     subsets: value.subsets,
                     subsetsRow: value.subsetsRow,
                     subsetsColumn: value.subsetsColumn,
                     subsetsTitle: value.subsetsTitle
                  });
               });
               //console.log($scope.lists.allSubsetsPerView);
            });
         };

         $scope.getallViewsPerSubset();

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
            if (args.page == "cubewiseSubsetAndView" && args.instance == $scope.instance && args.name == null) {
               // The page matches this one so close it
               $rootScope.close(args.page, { instance: $scope.instance });
            }
         });

         $scope.$on("$destroy", function (event) {

         });


      }]
   };
});