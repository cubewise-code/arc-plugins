
arc.run(['$rootScope', function ($rootScope) {

    $rootScope.plugin("cubewiseSubset", "Subset", "page", {
        menu: "tools",
        icon: "subset",
        description: "This plugin can be used to search any TM1 objects",
        author: "Cubewise",
        url: "https://github.com/cubewise-code/arc-plugins",
        version: "1.0.0"
    });

}]);

arc.directive("cubewiseSubset", function () {
    return {
        restrict: "EA",
        replace: true,
        scope: {
            instance: "=tm1Instance"
        },
        templateUrl: "__/plugins/subset/template.html",
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

            $scope.subsetsToDelete = [];

            $scope.toggleSubsetsToDelete = function (item) {
                if (_.includes($scope.subsetsToDelete, item)) {
                    _.remove($scope.subsetsToDelete, function (i) {
                        return i.name === item.name;
                    });
                } else {
                    $scope.subsetsToDelete.push(item);
                }
            };

            // GET DIMENSION DATA
            $scope.getAllSubsets = function () {
                $http.get(encodeURIComponent($scope.instance) + "/ModelDimensions()").then(function (dimensionsData) {
                    $scope.lists.dimensions = dimensionsData.data.value;
                    //LOOP THROUGH DIMENSIONS
                    _.forEach($scope.lists.dimensions, function (value, key) {
                        var dimension = value.Name;
                        //console.log(dimension);
                        $http.get(encodeURIComponent($scope.instance) + "/Dimensions('" + dimension + "')/Hierarchies").then(function (hierarchiesData) {
                            $scope.lists.hierarchies = hierarchiesData.data.value;
                            //LOOP THROUGH HIERARCHIES FOR A DIMENSION
                            _.forEach($scope.lists.hierarchies, function (value, key) {
                                var hierarchy = value.Name;
                                //console.log(dimension, hierarchy);                                                                
                                $http.get(encodeURIComponent($scope.instance) + "/Dimensions('" + dimension + "')/Hierarchies('" + hierarchy + "')/Subsets").then(function (subsetsData) {
                                    $scope.lists.subsets = subsetsData;
                                    //LOOP THROUGH SUBSET FOR A HIERARCHY FOR A DIMENSION
                                    _.forEach($scope.lists.subsets, function (value, key) {
                                        var subsets = value.value;
                                        if (subsets) {
                                            _.forEach(subsets, function (value, key) {
                                                var subset = value.Name;
                                                $scope.lists.allSubsets.push({
                                                    name: subset,
                                                    uniqueName: value.UniqueName,
                                                    expression: value.Expression,
                                                    attributes: value.Attributes,
                                                    fqn: dimension + ':' + hierarchy + ':' + subset,
                                                    hierarchy: hierarchy,
                                                    dimension: dimension
                                                });
                                            });
                                        }
                                    });
                                });
                            });
                        });
                    });
                    console.log($scope.lists.allSubsets);
                });
            };
            //$scope.getAllSubsets();
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
                    //Create lists.allSubsetsPerView array
                    _.forEach(viewKeys, function (value, key) {
                        $scope.lists.allSubsetsPerView.push({
                            name: key,
                            cube: value.cube,
                            subsets: value.subsets,
                            subsetsRow: value.subsetsRow,
                            subsetsColumn: value.subsetsColumn,
                            subsetsTitle: value.subsetsTitle
                        });
                    });
                    //console.log($scope.lists.allSubsetsPerView);
                    //Add All Subsets
                    $http.get(encodeURIComponent($scope.instance) + "/ModelDimensions()").then(function (dimensionsData) {
                        $scope.lists.dimensions = dimensionsData.data.value;
                        //LOOP THROUGH DIMENSIONS
                        _.forEach($scope.lists.dimensions, function (value, key) {
                            var dimension = value.Name;
                            //console.log(dimension);
                            $http.get(encodeURIComponent($scope.instance) + "/Dimensions('" + dimension + "')/Hierarchies").then(function (hierarchiesData) {
                                $scope.lists.hierarchies = hierarchiesData.data.value;
                                //LOOP THROUGH HIERARCHIES FOR A DIMENSION
                                _.forEach($scope.lists.hierarchies, function (value, key) {
                                    var hierarchy = value.Name;
                                    //console.log(dimension, hierarchy);                                                                
                                    $http.get(encodeURIComponent($scope.instance) + "/Dimensions('" + dimension + "')/Hierarchies('" + hierarchy + "')/Subsets").then(function (subsetsData) {
                                        $scope.lists.subsets = subsetsData;
                                        //LOOP THROUGH SUBSET FOR A HIERARCHY FOR A DIMENSION
                                        _.forEach($scope.lists.subsets, function (value, key) {
                                            var subsets = value.value;
                                            if (subsets) {
                                                _.forEach(subsets, function (value, key) {
                                                    var subset = value.Name;
                                                    var subsetFullName = dimension + ':' + hierarchy + ':' + subset;
                                                    // Check if Subset has a view(subset exist in $scope.lists.allViewsPerSubset)
                                                    if (_.includes($scope.lists.allViewsPerSubset, subset)) {
                                                        view = true;
                                                    } else {
                                                        view = false;
                                                    }
                                                    //Push subsets
                                                    $scope.lists.allSubsets.push({
                                                        name: subsetFullName,
                                                        uniqueName: value.UniqueName,
                                                        expression: value.Expression,
                                                        attributes: value.Attributes,
                                                        shortName: subset,
                                                        hierarchy: hierarchy,
                                                        dimension: dimension,
                                                        views: view
                                                    });
                                                });
                                            }
                                        });
                                    });
                                });
                            });
                        });
                        console.log($scope.lists.allSubsets);
                    });
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
                if (args.page == "cubewiseSubset" && args.instance == $scope.instance && args.name == null) {
                    // The page matches this one so close it
                    $rootScope.close(args.page, { instance: $scope.instance });
                }
            });

            $scope.$on("$destroy", function (event) {

            });


        }]
    };
});