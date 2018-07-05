# Plugin to give you an overview of your TM1 and Planning Analytics server

On the left side, you will find the main tm1s.cfg and on the right an overview of your TM1 objects.

<img src="https://s3-ap-southeast-2.amazonaws.com/downloads.cubewise.com/web_assets/arc-pulgins/Overview-list.png" />

The number of TM1 objects depends on the show/hide control objects settings in Arc. To get the number of all objects including the control objects, switch on this setting:

<img src="https://s3-ap-southeast-2.amazonaws.com/downloads.cubewise.com/web_assets/arc-pulgins/instance-overview-hidecontrols.png"/>

This plugin is a good way to learn how to get data from the TM1 REST API. For example to get the number of cubes we use the following code in the **plugin.js**:
```
// GET CUBE COUNT
$scope.getCubesCount = function () {
    $http.get(encodeURIComponent($scope.instance) + "/Cubes/$count").then(function (value) {
        $scope.tm1Objects[1].value = value.data;
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

More plugins help articles and examples can be found [here](https://code.cubewise.com/arc-plugins).
