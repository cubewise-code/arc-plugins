
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
                seeAll: true,
                searchByDimension: true,
                searchBySubset: true
            }

            $scope.lists = {
                dimensions: [],
                hierarchies: [],
                subsets: [],
                cubes: [],
                viewsAndSubsetsUnstructured: [],
                allSubsetsInViews: [],
                allViewsPerSubset: []
            }

            // GET DIMENSION DATA
            $scope.getDimensionsList = function () {
                $http.get(encodeURIComponent($scope.instance) + "/Dimensions").then(function (dimensionsData) {
                    $scope.lists.dimensions = dimensionsData.data.value;
                });
            };
            $scope.getDimensionsList();

            // GET HIERARCHY DATA
            $scope.getHierarchies = function () {
                $http.get(encodeURIComponent($scope.instance) + "/Dimensions('"+$scope.selections.dimension+"')/Hierarchies").then(function (hierarchiesData) {
                    $scope.lists.hierarchies = hierarchiesData.data.value;
                });
            };
            // GET SUBSET DATA
            $scope.getSubsets = function () {
                $http.get(encodeURIComponent($scope.instance) + "/Dimensions('"+$scope.selections.dimension+"')/Hierarchies('"+$scope.selections.subset+"')/Subsets").then(function (subsetsData) {
                    $scope.lists.subsets = subsetsData.data.value;
                });
            };
            // GET ALL VIEWS AND SUBSETS
            $scope.getallViewsPerSubsetAndViews = function () {
                $http.get(encodeURIComponent($scope.instance) + "/Cubes?$select=Name&$expand=Views($select=Name;$expand=tm1.NativeView/Columns/Subset($select=Name;$expand=Hierarchy($select=Name;$expand=Dimension($select=Name))),tm1.NativeView/Rows/Subset($select=Name;$expand=Hierarchy($select=Name;$expand=Dimension($select=Name))))").then(function (viewsData) {
                    console.log(viewsData);
                    $scope.lists.viewsAndSubsetsUnstructured = viewsData.data.value;
                    //Loop through cubes
                    cubes = viewsData.data.value;
                    for (var cube in cubes){
                        cubeName = cubes[cube].Name;
                        //Loop through views
                        views = cubes[cube].Views;
                        for (var view in views){
                            viewName = views[view].Name;
                            subsets = [];
                            //Loop through subsets on columns
                            viewColumns = views[view].Columns;
                            for (var viewColumn in viewColumns){
                                subsetName = viewColumns[viewColumn].Subset.Name;
                                if(subsetName){
                                    hierarchyName = viewColumns[viewColumn].Subset.Hierarchy.Name;
                                    dimensionName = viewColumns[viewColumn].Subset.Hierarchy.Dimension.Name;
                                    subsetInfo = {
                                        cube: cubeName,
                                        view: viewName,
                                        dimension: dimensionName,
                                        hierarchy: hierarchyName,
                                        subset: subsetName
                                    }
                                    $scope.lists.allSubsetsInViews.push(subsetInfo);
                                }
                            }
                            //Loop through subsets on rows
                            viewRows = views[view].Rows;
                            for (var viewRow in viewRows){
                                subsetName = viewRows[viewRow].Subset.Name;
                                //If there is a subset
                                if(subsetName){
                                    hierarchyName = viewRows[viewRow].Subset.Hierarchy.Name;
                                    dimensionName = viewRows[viewRow].Subset.Hierarchy.Dimension.Name;
                                    subsetInfo = {
                                        cube: cubeName,
                                        view: viewName,
                                        dimension: dimensionName,
                                        hierarchy: hierarchyName,
                                        subset: subsetName
                                    }
                                    $scope.lists.allSubsetsInViews.push(subsetInfo);
                                }
                            }
                        }
                    }
                    var subsetKeys = {};
                    for (var item in $scope.lists.allSubsetsInViews){
                        //Create subsetFullName
                        dimensionName = $scope.lists.allSubsetsInViews[item].dimension;
                        hierarchyName = $scope.lists.allSubsetsInViews[item].hierarchy;
                        subsetName = $scope.lists.allSubsetsInViews[item].subset;
                        subsetFullName = dimensionName + ':' + hierarchyName + ':' + subsetName;
                        //Create view name
                        cube = $scope.lists.allSubsetsInViews[item].cube;
                        view = $scope.lists.allSubsetsInViews[item].view;
                        viewFullName = cube + ':' + view;
                        //Check
                        if(!subsetKeys[subsetFullName]){
                            subsetKeys[subsetFullName] = {
                                dimension: dimensionName,
                                views:[]
                            };
                        }
                        subsetKeys[subsetFullName].views.push(viewFullName);
                    }
                    _.forEach(subsetKeys, function(value,key){
                        $scope.lists.allViewsPerSubset.push({
                            name: key,
                            dimension: value.dimension,
                            views: value.views
                        });
                    });
                    console.log($scope.lists.allViewsPerSubset);
                });
            };
            $scope.getallViewsPerSubsetAndViews();

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