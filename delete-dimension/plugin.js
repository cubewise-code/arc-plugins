
arc.run(['$rootScope', function ($rootScope) {

   $rootScope.plugin("cubewiseDeleteChore", "Delete", "menu/dimension", {
      icon: "fa-trash",
      description: "This plugin clones a cube using Bedrock.Cube.Clone, you have the option to include rules and data.",
      author: "Cubewise",
      url: "https://github.com/cubewise-code/arc-plugins",
      version: "1.0.0"
   });

}]);

arc.service('cubewiseDeleteChore', ['$rootScope', '$tm1', 'ngDialog', '$dialogs', '$http', function ($rootScope, $tm1, ngDialog, $dialogs, $http) {

   // The interface you must implement
   this.execute = function (instance, name) {

      // Create a callback function for the dialog
      var deleteObject = function (options) {
         console.log(name);
         var config = {
            method: "DELETE",
            url: encodeURIComponent(instance) + "/Dimensions('" + name + "')"
            //,headers: {Accept:'application/json;odata.metadata=none'}
         };
         $http(config).then(function (result) {
            console.log(result);
            if (result.status == 200 || result.status == 201 || result.status == 204) {
               resultQuery = result.data;
               $rootScope.reloadInstance(instance);
            } else {
               resultQuery = result.data.error;
            }
         });
         //Close Dialog
         dialog.close();
      };

      // Use ngDialog (https://github.com/likeastore/ngDialog) for custom dialog boxes
      // Pass a template URL to use an external file, path should start with __/plugins/{{your-plugin-name}}
      // Use the data option to pass through data (or functions to the template), the data is then used in
      //  the template with ngDialogData
      var dialog = ngDialog.open({
         template: "__/plugins/delete-dimension/template.html",
         data: {
            target: "",
            includeRules: true,
            includeData: true,
            deleteObject: deleteObject, // pass through the function declared above
            objectName: name
         }
      });

   };

}]);