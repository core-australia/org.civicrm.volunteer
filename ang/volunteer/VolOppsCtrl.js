(function (angular, $, _) {

  angular.module('volunteer').config(function ($routeProvider) {
    $routeProvider.when('/volunteer/opportunities', {
      controller: 'VolOppsCtrl',
      // update the search params in the URL without reloading the route
      reloadOnSearch: false,
      templateUrl: '~/volunteer/VolOppsCtrl.html',
      resolve: {
        countries: function(crmApi) {
          return crmApi('VolunteerUtil', 'getcountries', {}).then(function(result) {
            return result.values;
          });
        },
        // This looks strange but is meant to allow us to drop in a setting
        // to allow an admin to manage cart-related settings. The stub
        // function below will likely be replaced with an API call.
        settings: function (crmApi) {
          return {
            volunteer_floating_cart_enabled: true,
            volunteer_show_cart_contents: false
          };
        },
        supporting_data: function(crmApi) {
          return crmApi('VolunteerUtil', 'getsupportingdata', {
            controller: 'VolOppsCtrl'
          });
        }
      }
    });
  });

  angular.module('volunteer').controller('VolOppsCtrl', function ($route, $scope, $location, $window, $timeout, crmStatus, crmUiHelp, volOppSearch, countries, settings, supporting_data, volDetailBubble) {
    // The ts() and hs() functions help load strings for this module.
    var ts = $scope.ts = CRM.ts('org.civicrm.volunteer');
    var hs = $scope.hs = crmUiHelp({file: 'ang/VolOppsCtrl'}); // See: templates/ang/VolOppsCtrl.hlp

    var volOppsInCart = {};
    $scope.shoppingCart = volOppsInCart;
    $scope.showCartContents = settings.volunteer_show_cart_contents;

    /** Matches volunteer.css @media (max-width: 1000px); used when viewport crosses that breakpoint. */
    function volOppUseBottomCommitmentsLayout() {
      return $($window).width() <= 1000;
    }

    /** Matches volunteer.css @media (max-width: 768px) stacked opportunity / cart cards. */
    function volOppUseMobileRowTap() {
      return $($window).width() <= 768;
    }

    // on page load, search based on the URL params
    volOppSearch.search();

    //VOL-190: Allow hiding of search pane based on url param
    $scope.hideSearch = false;
    $scope.allowShowSearch = false;
    if ($route.current.params.hasOwnProperty('hideSearch')) {
      if ($route.current.params.hideSearch === "always") {
        $scope.hideSearch = true;
        $scope.allowShowSearch = false;
      }
      if ($route.current.params.hideSearch === "1") {
        $scope.hideSearch = true;
        $scope.allowShowSearch = true;
      }
    }


    $scope.countries = countries;
    $scope.roles = supporting_data.values.roles;
    $scope.searchParams = volOppSearch.params;
    $scope.volOppData = volOppSearch.results;

    $scope.checkout = function () {
      if ($route.current.params.hasOwnProperty('dest') && $route.current.params.dest) {
        var dest = $route.current.params.dest;
      } else {
        var dest = 'list';
      }

      var query = {
        reset: 1,
        needs: _.keys(volOppsInCart),
        dest: dest
      };

      // WordPress frontend: CRM.url() from /civicrm/vol/ can resolve to /?civiwp=...
      // at the site root (outside the CiviCRM base-page rewrite rules). Derive signup
      // from the current pathname instead (e.g. /civicrm/vol/ -> /civicrm/volunteer/signup/).
      var signupPath = $window.location.pathname.replace(/\/vol\/?$/, '/volunteer/signup/');
      if (signupPath === $window.location.pathname) {
        $window.location.href = CRM.url('civicrm/volunteer/signup', query);
      } else {
        $window.location.href = signupPath + '?' + CRM.$.param(query);
      }
    };

    /**
     * Provides help text for the "shopping cart."
     *
     * @returns {String}
     */
    $scope.helpText = function () {
      var help = '';

      if (!$scope.hideSearch) {
        help += ts("Use this search form to find the volunteer opportunity near you that best matches with your personal skill set, interests, and time availability.");
      }

      help += ' ' + ts('Click the checkbox for each volunteer opportunity you wish to add to your schedule, then click the "Sign Up!" button to supply your contact information and complete your registration.');

      return help;
    };

    /**
     * Returns true if a proximity search has been started; else false.
     * This function ignores units because they shouldn't be used to calculate
     * if a proximity search is started. Because otherwise units is marked as required
     * and there is no way to stop seraching by proximity
     *
     * @returns {Boolean}
     */
    var checkIsProximitySearch = function() {
      //Reduce the entire set of proximity params down to a single boolean.
      return _.reduce($scope.searchParams.proximity, function(previous, value, key) {
        //ignore "unit" by returning the previous value
        if ( key === "unit") {
          return previous;
        } else {
          return (previous || !!value);
        }
        //Initial Value
      }, false);
    };

    //Make Proximity Search status available to scope
    $scope.isProximitySearch = checkIsProximitySearch();

    //Watch the proximity search params only and update the
    //isProximitySearch flag when the params change.
    //Using a watcher here rather than passing a function
    //to scope keeps the number of iterations to a minimum
    $scope.$watch('searchParams.proximity', function(){
      $scope.isProximitySearch = checkIsProximitySearch();
    }, true);

    $scope.showSearch = function() {
      $scope.hideSearch = false;
      $scope.allowShowSearch = false;
    };

    $scope.search = function () {
      if (!$scope.isProximitySearch) {
        //Set the proximity object to empty because if we
        //pass an object with empty keys to search() the backend
        //returns an error that distance, units and postal code
        //are all required, even though the user is not attempting
        //to do a proximity search.
        $scope.searchParams.proximity = {};
      }
      return crmStatus(
        {start: ts('Searching...'), success: ts('Search complete')},
        volOppSearch.search()
      );
    };

    $scope.goMyShifts = function ($event) {
      if ($event) {
        $event.preventDefault();
        $event.stopPropagation();
      }
      $location.path('/volunteer/my-shifts');
    };

    $scope.hasTextContent = volDetailBubble.hasTextContent;
    $scope.hasNeedNotes = volDetailBubble.hasNeedNotes;

    $scope.hasProjectDescription = function (project) {
      return project && $scope.hasTextContent(project.description);
    };

    $scope.hasRoleDescription = function (need) {
      return need && $scope.hasTextContent(need.role_description);
    };

    $scope.showProjectDescription = function (project) {
      var description = project.description;
      var addressBlock = '';
      var campaignBlock = '';

      if (project.hasOwnProperty('campaign_title') && !_.isEmpty(project.campaign_title)) {
        campaignBlock = '<p><strong>' + ts('Campaign:') + '</strong><br />' + project.campaign_title + '</p>';
      }

      if (project.hasOwnProperty('location')) {
        if (!_.isEmpty(project.location.street_address)) {
          addressBlock += project.location.street_address + '<br />';
        }
        if (!_.isEmpty(project.location.city)) {
          addressBlock += project.location.city + '<br />';
        }
        if (!_.isEmpty(project.location.postal_code)) {
          addressBlock += project.location.postal_code;
        }
      }
      if (!_.isEmpty(addressBlock)) {
        addressBlock = '<p><strong>Location:</strong><br />' + addressBlock + '</p>';
      }
      volDetailBubble.show(project.title, description + campaignBlock + addressBlock);
    };

    $scope.showRoleDescription = function (need) {
      volDetailBubble.show(need.role_label, volDetailBubble.appendNeedNotes(need.role_description, need));
    };

    $scope.slotsRemaining = function (need) {
      return Math.max(0, (need.quantity || 0) - (need.quantity_assigned || 0));
    };

    $scope.toggleSelection = function (need) {
      need.inCart = !need.hasOwnProperty('inCart') ? true : !need.inCart;
      if (need.inCart) {
        volOppsInCart[need.id] = need;
      } else {
        delete volOppsInCart[need.id];
      }
    };

    /** Click/tap the opportunity row to toggle signup, except checkbox/links. */
    $scope.volOppOpportunityRowClick = function ($event, need) {
      if (need.is_full) {
        return;
      }
      if ($($event.target).closest('span.icon, i.crm-vol-detail-icon, input, a, button, label').length) {
        return;
      }
      $scope.toggleSelection(need);
    };

    /** Mobile: tap anywhere on a selected commitment row to remove, except icons/trash control. */
    $scope.volOppCartRowClick = function ($event, need) {
      if (!volOppUseMobileRowTap()) {
        return;
      }
      if ($($event.target).closest('span.icon, i.crm-vol-detail-icon, a, button, label').length) {
        return;
      }
      $scope.toggleSelection(need);
    };

    $scope.toggleCartList = function () {
      $scope.showCartContents = !$scope.showCartContents;
    };

    $scope.$watch('shoppingCart', function(oldValue, newValue) {
      $scope.itemCountInCart = _.size($scope.shoppingCart);
    }, true);

    $scope.proximityUnits = [
      {value: 'km', label: ts('km')},
      {value: 'miles', label: ts('miles')}
    ];

    // Logic for managing Cart Floating - TODO: refactor as a directive
    $scope.cartIsFloating = false;

    if (settings.volunteer_floating_cart_enabled) {
      /** Y-position (document) where the cart sits in-flow; used to decide when to float. */
      var cartTop = 0;
      var lastVolOppNarrowLayout = volOppUseBottomCommitmentsLayout();

      /**
       * Re-read the cart's in-flow position. Must not run while `.floating_cart` is active:
       * `position:fixed` makes `.offset().top` useless and breaks scroll behavior.
       */
      function refreshCartScrollAnchor() {
        if ($scope.cartIsFloating) {
          return;
        }
        var $cart = $("div.crm-vol-opp-cart");
        if (!$cart.length) {
          return;
        }
        var o = $cart.offset();
        if (o) {
          cartTop = o.top;
        }
      }

      function onVolOppCartScroll() {
        var cartShouldFloat = !volOppUseBottomCommitmentsLayout() && ($(window).scrollTop() > cartTop);
        if ($scope.cartIsFloating !== cartShouldFloat) {
          $timeout(function () {
            $scope.cartIsFloating = cartShouldFloat;
            if (!cartShouldFloat) {
              $timeout(refreshCartScrollAnchor, 0);
            }
          });
        }
      }

      function onVolOppCartResize() {
        var narrowNow = volOppUseBottomCommitmentsLayout();
        if (narrowNow !== lastVolOppNarrowLayout) {
          lastVolOppNarrowLayout = narrowNow;
          $timeout(function () {
            $scope.cartIsFloating = false;
            refreshCartScrollAnchor();
          });
          return;
        }
        refreshCartScrollAnchor();
      }

      refreshCartScrollAnchor();
      $timeout(refreshCartScrollAnchor, 0);

      $scope.$watch(function () {
        return _.size($scope.volOppData());
      }, function () {
        $timeout(refreshCartScrollAnchor, 0);
      });

      $(window).on("scroll", onVolOppCartScroll);
      $(window).on("resize", onVolOppCartResize);
      $scope.$on("$destroy", function () {
        $(window).off("scroll", onVolOppCartScroll);
        $(window).off("resize", onVolOppCartResize);
      });
    }
  });

})(angular, CRM.$, CRM._);
