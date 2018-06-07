# Admin tasks
This plugin can be used to create a list of tasks that you have to do regularly such as:
* Maintaining a cube view
* Maintaining a subset
* Running a process
* Running a chore

<img src="https://s3-ap-southeast-2.amazonaws.com/downloads.cubewise.com/web_assets/arc-pulgins/admin-tasks.gif" />

## Add this plugin to your environment
1. Download the folder
2. Paste the folder insite your plugins folder (Arc\plugins)
3. After clearing the cache you should now see the plugin

## How does it work
The list of tasks is defined in the plugins.js by ```$scope.tabs```. This array is a list of tabs, each tabs contains steps and steps contains actions:
```js
$scope.tabs = [
            { title:'Monthly', stepPercentage:0, content:[
                {
                    title: 'Update System Info Parameters',
                    open: true,
                    actions: [{
                        name: 'Open System Info cube',
                        cube: 'System Info',
                        view: 'Default'
                    },{
                        name: 'Check Region Subset',
                        dimension: 'Region',
                        hierarchy: 'Region',
                        subset: 'All Countries'
                    },{
                        name: 'Run Time subsets update',
                        process: ' Dim.Date.LoadFromODBC'
                    }]
                }
```
## Add an action to open a cubeview
```js
{
    name: 'Open System Info cube',
    cube: 'System Info',
    view: 'Default'
}
```
## Add an action to open a subset
```js
{
    name: 'Check Region Subset',
    dimension: 'Region',
    hierarchy: 'Region',
    subset: 'All Countries'
}
```
## Add an action to run a process
```js
{
    name: 'Run Time subsets update',
    process: ' Dim.Date.LoadFromODBC'
}
```
## Add an action to run a chore
```js
{
    name: 'Run Time subsets update',
    chore: 'Migrate Daily'
}
```

## About Plugins
Before going any further we recommend you reading these two Help articles:
* [How plugins work](https://code.cubewise.com/arc-docs/how-plugins-work)
* [How to create your plugins](https://code.cubewise.com/arc-docs/how-to-create-your-plugins)
