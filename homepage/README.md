# Home plugin

You can use this plugin as a homepage for your development:

<img src="https://s3-ap-southeast-2.amazonaws.com/downloads.cubewise.com/web_assets/arc-pulgins/home.png" />

This plugin is a good way to learn how to get data from the TM1 REST API.

To get the number of cubes we use the following code in the **plugin.js**:
```
$scope.getCubesCount = function () {
    $http.get(encodeURIComponent($scope.instance) + "/ModelCubes()?$select=Name").then(function (cubesList) {
        $scope.tm1Objects[0].value = cubesList.data.value.length;
    });
};
``` 

## Add this plugin to your environment
1. Download the folder
2. Paste the folder insite your plugins folder (Arc\plugins)
3. After clearing the cache you should now see the plugin

## About Plugins
Before going any further we recommend you reading these two Help articles:
* [How plugins work](https://code.cubewise.com/arc-docs/how-plugins-work)
* [How to create your plugins](https://code.cubewise.com/arc-docs/how-to-create-your-plugins)
