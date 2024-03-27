
arc.run(['$rootScope', function ($rootScope) {

   $rootScope.plugin("lsCopyObjectName", "Copy Name to Clipboard", "menu/cube", {
     icon: "fa-copy",
     description: "This plugin copies the selected name into the clipboard.",
     author: "LS",
     url: "https://github.com/cubewise-code/arc-plugins",
     version: "1.0.0"
   });
 
 }]);
 arc.run(['$rootScope', function ($rootScope) {
 
   $rootScope.plugin("lsCopyObjectName", "Copy Name to Clipboard", "menu/process", {
     icon: "fa-copy",
     description: "This plugin copies the selected name into the clipboard.",
     author: "LS",
     url: "https://github.com/cubewise-code/arc-plugins",
     version: "1.0.0"
   });
 
 }]);
 arc.run(['$rootScope', function ($rootScope) {
 
   $rootScope.plugin("lsCopyObjectName", "Copy Name to Clipboard", "menu/dimension", {
     icon: "fa-copy",
     description: "This plugin copies the selected name into the clipboard.",
     author: "LS",
     url: "https://github.com/cubewise-code/arc-plugins",
     version: "1.0.0"
   });
 
 }]);
 arc.run(['$rootScope', function ($rootScope) {
 
   $rootScope.plugin("lsCopyObjectName", "Copy Name to Clipboard", "menu/chore", {
     icon: "fa-copy",
     description: "This plugin copies the selected name into the clipboard.",
     author: "LS",
     url: "https://github.com/cubewise-code/arc-plugins",
     version: "1.0.0"
   });
 
 }]);
 arc.run(['$rootScope', function ($rootScope) {
 
   $rootScope.plugin("lsCopyObjectName", "Copy Name to Clipboard", "menu/subsets", {
     icon: "fa-copy",
     description: "This plugin copies the selected name into the clipboard.",
     author: "LS",
     url: "https://github.com/cubewise-code/arc-plugins",
     version: "1.0.0"
   });
 
 }]);
 arc.run(['$rootScope', function ($rootScope) {
 
   $rootScope.plugin("lsCopyObjectName", "Copy Name to Clipboard", "menu/views", {
     icon: "fa-copy",
     description: "This plugin copies the selected name into the clipboard.",
     author: "LS",
     url: "https://github.com/cubewise-code/arc-plugins",
     version: "1.0.0"
   });
 
 }]);
 arc.run(['$rootScope', function ($rootScope) {
 
   $rootScope.plugin("lsCopyObjectName", "Copy Name to Clipboard", "menu/hierarchy", {
     icon: "fa-copy",
     description: "This plugin copies the selected name into the clipboard.",
     author: "LS",
     url: "https://github.com/cubewise-code/arc-plugins",
     version: "1.0.0"
   });
 
 }]);
 
 arc.service('lsCopyObjectName', ['$rootScope', '$tm1', 'ngDialog', '$dialogs', '$http', 'Notification',
   function ($rootScope, $tm1, ngDialog, $dialogs, $http, Notification) {
 
     this.execute = function (instance, name, branch) {
       var clipboard = ClipboardJS.copy(branch.label);
       if (clipboard === branch.label) {
         Notification.success({
           title: "<i class='fa share'></i> <b>Copy</b> ",
           message: "<i class='fa fa-check'></i> Name Copied to Clipboard."
         });
       } else {
         Notification.error({
           title: "<i class='fa fa-exclamation-triangle'></i> Copy</b>",
           message: "Unable to copy name to clipboard."
         });
       }
     };
 
   }]);