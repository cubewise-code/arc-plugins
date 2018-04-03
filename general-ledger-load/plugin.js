
arc.run(['$rootScope', function($rootScope) {

    $rootScope.plugin("cubewiseGeneralLedgerLoad", "LOAD", "menu/cube", {
        icon: "fa-download",
        instanceName: "CANVAS SAMPLE",
        objectName: "General Ledger",
        description: "This plugin is an example of using instanceName and objectName to show menu for a particular object.",
        author: "Cubewise",
        url: "https://github.com/cubewise-code/arc-plugins",
        version: "1.0.0"
    });

}]);

arc.service('cubewiseGeneralLedgerLoad', ['$rootScope', '$tm1', '$dialogs', function($rootScope, $tm1, $dialogs) {

    // The interface you must implement
    this.execute = function(instance, name) {

        // Execute the process
        $tm1.processExecute(instance, "Cube.GeneralLedger.LoadFromFile", [
            {
                Name: "pVersion",
                Value: "ACTUAL"
            }
        ]);
       
    };

}]);