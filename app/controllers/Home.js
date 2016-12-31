angular
	.module("App")
	.controller("HomeController", function ($scope, json) {
		$scope.data = json.data;
	});