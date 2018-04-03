
arc.run(['$rootScope', function($rootScope) {

    $rootScope.plugin("cubewiseBedrockCubeClone", "BEDROCKCLONE", "menu/cube", {
        icon: "fa-clone",
        description: "This plugin clones a cube using Bedrock.Cube.Clone, you have the option to include rules and data.",
        author: "Cubewise",
        url: "https://github.com/cubewise-code/arc-plugins",
        version: "1.0.0"
    });

}]);

arc.service('cubewiseBedrockCubeClone', ['$rootScope', '$tm1', 'ngDialog', '$dialogs', function($rootScope, $tm1, ngDialog, $dialogs) {

    // The interface you must implement
    this.execute = function(instance, name) {

        // Create a callback function for the dialog
        var clone = function(options){
            dialog.close();
            // Call Bedrock.Dim.Clone via the $tm1 service 
            $tm1.processExecute(instance, "Bedrock.Cube.Clone", [
                {
                    Name: "pSourceCube",
                    Value: name
                },{
                    Name: "pTargetCube",
                    Value: options.target
                },{
                    Name: "pIncludeRules",
                    Value: options.includeRules ? 1 : 0
                },{
                    Name: "pIncludeData",
                    Value: options.includeData ? 1 : 0
                }
            ]).then(function(result){
                if(result.success){
                    // It has finished with success
                    $rootScope.reloadInstance(instance);
                }
            });
        };

        // Use ngDialog (https://github.com/likeastore/ngDialog) for custom dialog boxes
        // Pass a template URL to use an external file, path should start with __/plugins/{{your-plugin-name}}
        // Use the data option to pass through data (or functions to the template), the data is then used in
        //  the template with ngDialogData
        var dialog = ngDialog.open({
            template: "__/plugins/bedrock-cube-clone/template.html",
            data: {
                target: "",
                includeRules: true,
                includeData: true,
                clone: clone // pass through the function declared above
            }
        });
       
    };

}]);