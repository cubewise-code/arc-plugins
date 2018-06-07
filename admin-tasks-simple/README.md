# Admin tasks simple plugin
This plugin can be used to create a list of tasks that you have to do regularly such as:
* Maintaining a cube view
* Maintaining a subset
* Running a process
* Running a chore

<img src="https://s3-ap-southeast-2.amazonaws.com/downloads.cubewise.com/web_assets/arc-pulgins/admin-task-simple-1.png" />

## Add this plugin to your environment
1. Download the folder
2. Paste the folder insite your plugins folder (Arc\plugins)
3. After clearing the cache you should now see the plugin

## How does it work
This plugin is one HTML table ```<table>```, one task is defined per row (```<tr>```). Each step has 4 columns (```<td>```):
* Step number
* An icon which represent the TM1 object
* Some information about the step
* The action

```html
    <tr>
        <td class="text-center">
            Step 1
        </td>
        <td class="text-center">
            <i class="fa fa-fw cubes"></i>
        </td>
        <td>
            Update System Settings
        </td>
        <td class="text-center">
            <a href="#/cube/view/Canvas%20Sample/System%20Info/Default" ng-click="user_clicks_branch(row.branch)" ng-class="[row.branch.item_class]">
                System Info
            </a>
        </td>
    </tr>
```
## Define a new step
To define a new step you just need to add a new row ```tr``` to the table and update the different column information

## Action to open a cubeview
To open a cube view from a plugin you just need to create a link using ```href```, the URL will look like this:
* #/cube/view/**instanceName**/**cubeName**/**viewName**
Example to open the **Default** view of the **System Info** cube:
```html
    <a href="#/cube/view/Canvas%20Sample/System%20Info/Default" ng-click="user_clicks_branch(row.branch)" ng-class="[row.branch.item_class]">
        System Info
    </a>
```

## Action to open a subset
To open a subset from a plugin you just need to create a link using ```href```, the URL will look like this:
* #/dimension/**instanceName**/**dimensionName**/**hierarchyName**/**subsetName**
Example to open the **Expense** subset of the **Account** hierarchy of the **Account** dimension:
```html
    <a href="#/dimension/Canvas%20Sample/Account/Account/Expense" ng-click="user_clicks_branch(row.branch)" ng-class="[row.branch.item_class]">
        Expense subset
    </a>
```

## Action to run a process
To run a process you just need to call a function defined in the **plugin.js** file which uses the **processExecute** function of the **$tm1** service ```$tm1.processExecute```:
```js
    $scope.executeProcess = function (name) {
        $tm1.processExecute($scope.instance, name);
    };
```
Example below create a button which run ```ng-click="executeProcess('Cube.GeneralLedger.LoadFromFile')"```
```html
    <button class="btn btn-warning" title="Cube.GeneralLedger.LoadFromFile" ng-click="executeProcess('Cube.GeneralLedger.LoadFromFile')">
        <i class="fa fa-fw fa-bolt"></i>
    </button>
```

## Action to run a chore
To run a chore you just need to call a function defined in the **plugin.js** file which uses the **choreExecute** function of the **$tm1** service ```$tm1.choreExecute```:
```js
    $scope.executechore = function (name) {
        $tm1.choreExecute($scope.instance, name);
    };
```
Example below create a button which run ```ng-click="executeChore('CXTM1SaveDataAll')"```
```html
    <button class="btn btn-warning" title="CXTM1SaveDataAll" ng-click="executeChore('CXTM1SaveDataAll')">
        <i class="fa fa-fw fa-bolt"></i>
    </button>
```


## About Plugins
Before going any further we recommend you reading these two Help articles:
* [How plugins work](https://code.cubewise.com/arc-docs/how-plugins-work)
* [How to create your plugins](https://code.cubewise.com/arc-docs/how-to-create-your-plugins)
