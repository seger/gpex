var MonarchApp = angular.module('MonarchApp', ['graph', 'ui.bootstrap']);


// Whitelist for unsafe links in Chrome.
MonarchApp.config(['$compileProvider', function($compileProvider) {
    $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|local|javascript):/);
}]);


/* Controllers */


MonarchApp.controller('AppCtrl', function($scope, $http) {

    // Legend is shown by default.
    $scope.legendIsOpen = true;

    // Canned queries.
    $scope.queries = {
        "1": "plxnd1",
        "2": "Plxnd1<tm1.1Tmj>/Plxnd1<tm1.1Tmj>; Tg(Tek-cre)1Ywa/0 [involves: 129S/SvEv * 129S4/SvJaeSor * C57BL/6 * SJL]"
    };

    // Initialize history.
    $scope.history = [];

    // Default selection pane content path.
    $scope.selPanePath = "include/default.html";

    // Help modal content path.
    $scope.helpModalPath = null;

    // Retrieve entity data.
    $http.get("json/entity.json")
        .then(function(res) {
            // Put data in scope.
            $scope.entityData = res.data;
            // Make description panel open by default for all entitites.
            $scope.status = {
                itemIsOpen: new Array(res.data.length)
            };
            for (i = 0; i < res.data.length; i++) {
                $scope.status.itemIsOpen[res.data[i].id] = true;
            }

        })

    // Retrieve relationship data and put in scope.
    $http.get("json/relationship.json")
        .then(function(res) {
            $scope.relData = res.data;
        })

    // Retrieve reference data and put in scope.
    $http.get("json/ref.json")
        .then(function(res) {
            $scope.refData = res.data;
        })

    // Retrieve E-R data view and put in scope.
    $http.get("json/entity-rel-view.json")
        .then(function(res) {
            $scope.entityRelData = res.data;
        })

});


/* Directives */


MonarchApp.directive('ngRightClick', function($parse) {

    return function(scope, element, attrs) {
        var fn = $parse(attrs.ngRightClick);
        element.bind('contextmenu', function(event) {
            scope.$apply(function() {
                event.preventDefault();
                fn(scope, {
                    $event: event
                });
            });
        });
    };

});


MonarchApp.directive('tooltip', function() {

    return {
        restrict: 'A',
        link: function(scope, element, attrs) {
            $(element).hover(function() {
                $(element).tooltip('show');
            }, function() {
                $(element).tooltip('hide');
            });
        }
    };

});


/* Filters */


MonarchApp.filter('shorten', function() {

    return function(name) {
        // Max length of text label in selection panel hierarchy.
        var maxLabelLen = 35;
        if (name.length > maxLabelLen) {
            return name.slice(0, maxLabelLen) + "...";
        } else {
            return name;
        }
    }

});


MonarchApp.filter('unique', function() {

    return function(collection, keyName) {
        var output = [],
            keys = []
        found = [];
        if (!keyName) {
            angular.forEach(collection, function(row) {
                var isFound = false;
                angular.forEach(found, function(foundRow) {
                    if (foundRow == row) {
                        isFound = true;
                    }
                });
                if (isFound) {
                    return;
                }
                found.push(row);
                output.push(row);
            });
        } else {
            angular.forEach(collection, function(row) {
                var item = row[keyName];
                if (item === null || item === undefined) return;
                if (keys.indexOf(item) === -1) {
                    keys.push(item);
                    output.push(row);
                }
            });
        }
        return output;
    };

});
