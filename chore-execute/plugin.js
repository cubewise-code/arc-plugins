
arc.run(['$rootScope', function($rootScope) {

    $rootScope.plugin("cubewiseExecuteChore", "EXECUTE", "menu/chore", {
        icon: "fa-bolt",
        description: "This plugin executes a chore.",
        author: "Cubewise",
        url: "https://github.com/cubewise-code/arc-plugins",
        version: "1.0.0"
    });

}]);

arc.service('cubewiseExecuteChore', ['$rootScope', '$tm1', '$dialogs', function($rootScope, $tm1, $dialogs) {

    // The interface you must implement
    this.execute = function(instance, name) {

        // Execute the chore
        $tm1.choreExecute(instance, name);
       
    };

}]);