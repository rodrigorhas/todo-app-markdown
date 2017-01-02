angular
  .module('App')
  .filter('trust', [
    '$sce',
    function($sce) {
      return function(value, type) {
        // Defaults to treating trusted text as `html`
        return $sce.trustAs(type || 'html', value);
      }
    }
  ])
;