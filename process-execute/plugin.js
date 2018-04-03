
arc.run(['$rootScope', function($rootScope) {

    $rootScope.plugin("cubewiseExecuteProcess", "EXECUTE", "menu/process", {
        icon: "fa-bolt",
        description: "This plugin executes a TI process.",
        author: "Cubewise",
        url: "https://github.com/cubewise-code/arc-plugins",
        version: "1.0.0"
    });

}]);

arc.service('cubewiseExecuteProcess', ['$rootScope', '$tm1', '$dialogs', function($rootScope, $tm1, $dialogs) {

    // The interface you must implement
    this.execute = function(instance, name) {

        // Execute the process
        $tm1.processExecute(instance, name);
       
    };

}]);