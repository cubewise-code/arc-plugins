
arc.run(['$rootScope', function ($rootScope) {

   $rootScope.plugin("lsCopyCubeName", "Copy Name to clipboard", "menu/cube", {
      icon: "fa-copy",
      description: "This plugin copies the selected name into the clipboard.",
      author: "LS",
      url: "https://github.com/cubewise-code/arc-plugins",
      version: "1.0.0"
   });

}]);
arc.run(['$rootScope', function ($rootScope) {

   $rootScope.plugin("lsCopyCubeName", "Copy Name to clipboard", "menu/process", {
      icon: "fa-copy",
      description: "This plugin copies the selected name into the clipboard.",
      author: "LS",
      url: "https://github.com/cubewise-code/arc-plugins",
      version: "1.0.0"
   });

}]);
arc.run(['$rootScope', function ($rootScope) {

   $rootScope.plugin("lsCopyCubeName", "Copy Name to clipboard", "menu/dimension", {
      icon: "fa-copy",
      description: "This plugin copies the selected name into the clipboard.",
      author: "LS",
      url: "https://github.com/cubewise-code/arc-plugins",
      version: "1.0.0"
   });

}]);
arc.run(['$rootScope', function ($rootScope) {

   $rootScope.plugin("lsCopyCubeName", "Copy Name to clipboard", "menu/chore", {
      icon: "fa-copy",
      description: "This plugin copies the selected name into the clipboard.",
      author: "LS",
      url: "https://github.com/cubewise-code/arc-plugins",
      version: "1.0.0"
   });

}]);
arc.run(['$rootScope', function ($rootScope) {

   $rootScope.plugin("lsCopyCubeName", "Copy Name to clipboard", "menu/subsets", {
      icon: "fa-copy",
      description: "This plugin copies the selected name into the clipboard.",
      author: "LS",
      url: "https://github.com/cubewise-code/arc-plugins",
      version: "1.0.0"
   });

}]);
arc.run(['$rootScope', function ($rootScope) {

   $rootScope.plugin("lsCopyCubeName", "Copy Name to clipboard", "menu/views", {
      icon: "fa-copy",
      description: "This plugin copies the selected name into the clipboard.",
      author: "LS",
      url: "https://github.com/cubewise-code/arc-plugins",
      version: "1.0.0"
   });

}]);

arc.service('lsCopyCubeName', ['$rootScope', '$tm1', 'ngDialog', '$dialogs', '$http', function ($rootScope, $tm1, ngDialog, $dialogs, $http) {

	// The interface you must implement
	this.execute = function (instance, name) {

		// Create temporary element
		var el = document.createElement('textarea');

		// Assign the string to copy to the temp element
		el.value = name;

		// Set element to read only and move out of screen
		el.setAttribute('readonly', '');
		el.style = { position: 'absolute', left: '-9999px' };

		// Add element to DOM
		document.body.appendChild(el);

		// Select text in element
		el.select();

		// Add selected text to clipboard
		document.execCommand('copy');

		// Remove temporary element
		document.body.removeChild(el);

   };

}]);