
arc.run(['$rootScope', function ($rootScope) {

    $rootScope.plugin("cubewiseSubsetManager", "Subset Manager", "page", {
        menu: "tools",
        icon: "subset",
        description: "This plugin can be used to search any TM1 objects",
        author: "Cubewise",
        url: "https://github.com/cubewise-code/arc-plugins",
        version: "1.0.0"
    });

}]);

arc.directive("cubewiseSubsetManager", function () {
    return {
        restrict: "EA",
        replace: true,
        scope: {
            instance: "=tm1Instance"
        },
        templateUrl: "__/plugins/subset-manager/template.html",
        link: function ($scope, element, attrs) {

        },
        controller: ["$scope", "$rootScope", "$http", "$tm1", "$translate", "$timeout", function ($scope, $rootScope, $http, $tm1, $translate, $timeout) {

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

            // GET DIMENSION DATA
            $scope.getDimensionsList = function () {
                $http.get(encodeURIComponent($scope.instance) + "/ModelDimensions()?$select=Name").then(function (dimensionsData) {
                    $scope.lists.dimensions = dimensionsData.data.value;
                });
            };
            $scope.getDimensionsList();

            // GET HIERARCHY DATA
            $scope.getHierarchies = function () {
                $http.get(encodeURIComponent($scope.instance) + "/Dimensions('" + $scope.selections.dimension + "')/Hierarchies").then(function (hierarchiesData) {
                    $scope.lists.hierarchies = hierarchiesData.data.value;
                });
            };
            // GET SUBSET DATA
            $scope.getSubsets = function () {
                $http.get(encodeURIComponent($scope.instance) + "/Dimensions('" + $scope.selections.dimension + "')/Hierarchies('" + $scope.selections.hierarchy + "')/Subsets").then(function (subsetsData) {
                    $scope.lists.subsets = subsetsData.data.value;
                    console.log($scope.selections.dimension);
                });
            };
            // GET SUBSET DATA
            $scope.getSubsetName = function () {
                $scope.selections.subsetName = $scope.selections.dimension + ":" + $scope.selections.hierarchy + ":" + $scope.selections.subset;
            };

            $scope.viewsToDelete = [];
            $scope.toggleViewsToDelete = function (item) {
                console.log(item);
                if (_.includes($scope.viewsToDelete, item)) {
                    _.remove($scope.viewsToDelete, function (i) {
                        return i.name === item.name;
                    });
                } else {
                    $scope.viewsToDelete.push(item);
                }
            };
            // GET ALL VIEWS AND SUBSETS
            $scope.getallViewsPerSubset = function () {
                $http.get(encodeURIComponent($scope.instance) + "/Cubes?$select=Name&$expand=Views($select=Name;$expand=tm1.NativeView/Columns/Subset($select=Name;$expand=Hierarchy($select=Name;$expand=Dimension($select=Name))),tm1.NativeView/Rows/Subset($select=Name;$expand=Hierarchy($select=Name;$expand=Dimension($select=Name))),tm1.NativeView/Titles/Subset($select=Name;$expand=Hierarchy($select=Name;$expand=Dimension($select=Name))))").then(function (viewsData) {
                    //console.log(viewsData);
                    $scope.lists.viewsAndSubsetsUnstructured = viewsData.data.value;
                    //Loop through cubes
                    cubes = viewsData.data.value;
                    for (var cube in cubes) {
                        cubeName = cubes[cube].Name;
                        //Loop through views
                        allViews = cubes[cube].Views;
                        for (var view in allViews) {
                            viewName = allViews[view].Name;
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
                    // LOOP THROUGH lists.viewsAndSubsetsStructured TO CREATE lists.allViewsPerSubset
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
                                views: []
                            };
                        }
                        subsetKeys[subsetFullName].views.push(viewFullName);
                        //Create viewKeys array
                        if (!viewKeys[viewFullName]) {
                            viewKeys[viewFullName] = {
                                cube: cube,
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
                    _.forEach(subsetKeys, function (value, key) {
                        $scope.lists.allViewsPerSubset.push({
                            name: key,
                            dimension: value.dimension,
                            views: value.views
                        });
                    });
                    console.log($scope.lists.allViewsPerSubset);
                    //console.log($scope.lists.allSubsetsPerView);
                    //Add All Subsets
                });
            };
            $scope.getallViewsPerSubset();

            $scope.$on("login-reload", function (event, args) {

            });

            $scope.$on("close-tab", function (event, args) {
                // Event to capture when a user has clicked close on the tab
                if (args.page == "cubewiseSubsetManager" && args.instance == $scope.instance && args.name == null) {
                    // The page matches this one so close it
                    $rootScope.close(args.page, { instance: $scope.instance });
                }
            });

            $scope.$on("$destroy", function (event) {

            });


        }]
    };
});