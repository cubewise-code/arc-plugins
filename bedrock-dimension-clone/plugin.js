
arc.run(['$rootScope', function($rootScope) {

    $rootScope.plugin("cubewiseBedrockDimensionClone", "BEDROCKCLONE", "menu/dimension", {
        icon: "fa-clone",
        description: "This plugin clones a dimension using Bedrock.Dim.Clone.",
        author: "Cubewise",
        url: "https://github.com/cubewise-code/arc-plugins",
        version: "1.0.0"
    });

}]);

arc.service('cubewiseBedrockDimensionClone', ['$rootScope', '$tm1', '$dialogs', function($rootScope, $tm1, $dialogs) {

    // The interface you must implement
    this.execute = function(instance, name) {

        // Create a callback function for the dialog
        var clone = function(newName){
            // Call Bedrock.Dim.Clone via the $tm1 service 
            $tm1.processExecute(instance, "Bedrock.Dim.Clone", [
                {
                    Name: "pSourceDim",
                    Value: name
                },{
                    Name: "pTargetDim",
                    Value: newName
                }
            ]).then(function(result){
                if(result.success){
                    // It has finished with success
                    $rootScope.reloadInstance(instance);
                }
            });
        };

        // Open the dialog
        $dialogs.input("CLONE", "NAME", clone);
       
    };

}]);