angular
	.module("App")
	.config(function($stateProvider, $urlRouterProvider) {
		var homeState = {
			name: 'Home',
			url: '/',
			templateUrl: "app/templates/home.html",
			resolve: {
				json: function($http) {
					return $http({method: 'GET', url: 'app.json'});
				},
			},

			controller: "HomeController"
		}

		$stateProvider.state(homeState);

		$urlRouterProvider.otherwise('/');
	});