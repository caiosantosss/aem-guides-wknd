/*************************************************************************
* ADOBE CONFIDENTIAL
* ___________________
*
* Copyright 2015 Adobe
* All Rights Reserved.
*
* NOTICE: All information contained herein is, and remains
* the property of Adobe and its suppliers, if any. The intellectual
* and technical concepts contained herein are proprietary to Adobe
* and its suppliers and are protected by all applicable intellectual
* property laws, including trade secret and copyright laws.
* Dissemination of this information or reproduction of this material
* is strictly forbidden unless prior written permission is obtained
* from Adobe.
**************************************************************************/
(function(window, document, $) {
    "use strict";

    /**
     * Used to track the event performed by user.
     * This function tracks interactions with global navigation
     * OMEGA Implementation
     *
     * @param {HTMLElement} el global navigation element
     * @param {Event} event that needs to be tracked
     * @param {String} trackAction action performed on element
     */
    function trackEvent(el, event, trackAction) {
        var trackElement = $(el).is("coral-shell-header-home") ? "logo" : " close";
        var trackData = {
            element: trackElement,
            feature: "globalnav",
            type: "toggleable",
            action: trackAction,
            widget: {
                name: "globalnav",
                type: "toggleable"
            },
            attributes: {}
        };

        $(window).adaptTo("foundation-tracker").trackEvent(trackData);
    }

    $(document).on("click", ".globalnav-toggle", function(e) {
        e.preventDefault();
        var targetEl = this;

        var menu = document.getElementById("globalnav-overlay");

        if (menu) {
            trackEvent(targetEl, e, "hide");
            menu.hide();
            return;
        }

        trackEvent(targetEl, e, "show");

        var backButton = document.getElementsByClassName("globalnav-navigator-backbutton");
        var currentUrl = window.location.pathname;

        if (backButton && backButton.length && backButton[0].hidden && currentUrl.includes("/aem/start")) {
            // checking if on home page tools section is opened or not
            var globalNavHome = document.getElementById("globalnav-start-home-collection");

            if (globalNavHome) {
                var closestCoralPanel = globalNavHome.closest("coral-panel");

                if (closestCoralPanel && closestCoralPanel.selected) {
                    return; // Not opening overlay in case of homepage
                }
            }
        }

        var ui = $(window).adaptTo("foundation-ui");
        ui.wait();

        var url = this.dataset.globalnavToggleHref;

        $.ajax({
            url: url,
            cache: false,
            success: function(data) {
                var menu = $(data).get(0);
                var $menu = $(menu);

                $("coral-shell").append(menu);
                $("#globalNavHeader").attr("aria-expanded", true);

                $menu.trigger("foundation-contentloaded");

                $menu.on("coral-overlay:close", function(e) {
                    // the close event may come from other sources, we are not interested in those
                    if (e.target === menu) {
                        $menu.remove();
                        $("#globalNavHeader").attr("aria-expanded", false);
                    }
                });

                Coral.commons.ready(menu, function() {
                    ui.clearWait();
                    menu.open = true;

                    var $activeConsole = $menu.find(".globalnav-activeconsole").first();

                    if (!$activeConsole.length) {
                        return;
                    }

                    if ($activeConsole.is(".foundation-collection-navigator.globalnav-homecard")) {
                        $activeConsole.trigger("click");
                    } else if ($activeConsole.is(".globalnav-tools-navigation-item")) {
                        $activeConsole.prop("active", true);
                    }

                    // Use setTimeout as a workaround for defective selection mixin
                    setTimeout(function() {
                        $activeConsole.closest("coral-panel").attr("selected", "");
                    }, 0);
                });
            }
        });
    });

    $(document).on("click", ".globalnav-anchor", function(e) {
        var $el = $(this);
        var href = $el.data("globalnav-anchor-href");

        if (!href) {
            return;
        }

        var target = $el.data("globalnav-anchor-target") || "_self";
        var winMode = $(window).adaptTo("foundation-preference").get("winMode") || "multi";

        if (winMode === "single") {
            target = "_self";
        }
        if (new URL(href, document.baseURI).origin !== "null") {
            window.open(href, target);
        }
    });

    $(document).on("foundation-collection-navigate", ".foundation-collection", function(e) {
        var collection = $(this);

        $(".granite-collection-navigator.globalnav-navigator").each(function() {
            if (!collection.is(this.dataset.graniteCollectionNavigatorTarget)) {
                return;
            }

            var $button = $(this).prev(".globalnav-navigator-backbutton");

            $button[0].label.textContent = this.selectedItem.textContent;

            if ($(this.selectedItem).next("betty-breadcrumbs-item").length) {
                $button.removeAttr("hidden");
            } else {
                $button.attr("hidden", "");
            }
        });
    });

    $(document).on("click", ".globalnav-navigator-backbutton", function(e) {
        var $navigator = $(this).next("betty-breadcrumbs.globalnav-navigator");
        $($navigator.prop("selectedItem")).next("betty-breadcrumbs-item").prop("selected", true);

        var event = document.createEvent("HTMLEvents");
        event.initEvent("change", true, false);
        $navigator[0].dispatchEvent(event);
    });

    $(document).on("coral-columnview:activeitemchange", ".globalnav-tools-navigation", function(e) {
        var item = e.originalEvent.detail.activeItem;

        $(this).find(".foundation-selections-item").removeClass("foundation-selections-item");
        item.classList.add("foundation-selections-item");

        $(this).trigger("foundation-selections-change");
    });

    // For global nav start page and tools, coral-masonry items should not be selectable.
    $(document).on(
        "coral-collection:add",
        "#globalnav-start-home-collection," +
            "#globalnav-home-collection," +
            "#globalnav-start-tools-content-collection," +
            "#globalnav-tools-content-collection",
        function(e) {
            var item = e.originalEvent.detail.item;
            Coral.commons.nextFrame(function() {
                item.removeAttribute("aria-selected");
            });
        });

    // Space key should not select global nav start page and tools items.
    $(document).on(
        "keydown",
        "#globalnav-start-home-collection .foundation-collection-item," +
            "#globalnav-home-collection .foundation-collection-item," +
            "#globalnav-start-tools-content-collection .foundation-collection-item," +
            "#globalnav-tools-content-collection .foundation-collection-item",
        function(e) {
            if (e.keyCode === 32) {
                e.preventDefault();
                var item = e.target;
                item.selected = false;
                Coral.commons.nextFrame(function() {
                    item.removeAttribute("aria-selected");
                    item.tabIndex = -1;
                });
            }
        });

    // Focusing an coral-masonry-item containing a .globalnav-homecard or .globalnav-toolcard
    // should move focus to the .globalnav-homecard or .globalnav-toolcard, and set tabIndex = -1
    // on the parent coral-masonry-item.
    $(document).on("focus", "coral-masonry-item.foundation-collection-item", function(e) {
        var targ = e.target;
        if (!targ.contains(e.relatedTarget)) {
            $(targ).find(".globalnav-homecard, .globalnav-toolcard").focus();
            Coral.commons.nextFrame(function() {
                if (targ !== document.activeElement) {
                    targ.tabIndex = -1;
                }
            });
        }
    });

    // Arrow key navigation of coral-masonry should work with focus on a
    // .globalnav-homecard or .globalnav-toolcard within a coral-masonry-item.
    $(document).on("keydown", ".globalnav-homecard, .globalnav-toolcard", function(e) {
        switch (e.keyCode) {
            case 33: // PageUp
            case 34: // PageDown
            case 35: // End
            case 36: // Home
            case 37: // ArrowLeft
            case 38: // ArrowUp
            case 39: // ArrowRight
            case 40: // ArrowDown
            case 72: // h
            case 74: // j
            case 75: // k
            case 76: // l
                var item = $(e.target).closest("coral-masonry-item.foundation-collection-item");
                var event = document.createEvent("Event");
                event.initEvent("keydown", true, true);
                event.key = e.key;
                event.keyCode = e.keyCode;
                event.which = e.which;
                event.key = e.key;
                event.shiftKey = e.shiftKey,
                event.ctrlKey = e.ctrlKey;
                event.metaKey = e.metaKey;
                item[0].dispatchEvent(event);
                break;
            case 13: // Enter
            case 32: // Space
                e.preventDefault();
                e.target.click();
                break;
        }
    });
})(window, document, Granite.$);

/*************************************************************************
* ADOBE CONFIDENTIAL
* ___________________
*
* Copyright 2019 Adobe
* All Rights Reserved.
*
* NOTICE: All information contained herein is, and remains
* the property of Adobe and its suppliers, if any. The intellectual
* and technical concepts contained herein are proprietary to Adobe
* and its suppliers and are protected by all applicable intellectual
* property laws, including trade secret and copyright laws.
* Dissemination of this information or reproduction of this material
* is strictly forbidden unless prior written permission is obtained
* from Adobe.
**************************************************************************/
(function(window, $) {
    "use strict";

    var countElementMap = new WeakMap();

    var handlers = {
        "default": {
            getCount: function(facet, predicateProperties) {
                var property = findPredicateProperty(predicateProperties, facet.predicate);
                var bucket = facet.buckets.find(function(bucket) {
                    return property.value === bucket.value;
                });
                return {
                    count: bucket ? bucket.count : 0,
                    key: bucket ? ("equals--" + bucket.value) : null
                };
            }
        },
        property: {
            getCount: function(facet, predicateProperties) {
                var valueProperty = findPredicateProperty(predicateProperties, facet.predicate, "value", true);

                var operationProperty = findPredicateProperty(predicateProperties, facet.predicate, "operation");

                if (!operationProperty || operationProperty.value === "equals") {
                    var bucket = facet.buckets.find(function(bucket) {
                        return valueProperty.value === bucket.value;
                    });
                    return {
                        count: bucket ? bucket.count : 0,
                        key: bucket ? ("equals--" + bucket.value) : null
                    };
                }

                if (operationProperty.value === "exists") {
                    if (!valueProperty || valueProperty.value === "true") {
                        var count = facet.buckets.reduce(function(acc, bucket) {
                            return acc + bucket.count;
                        }, 0);
                        return {
                            count: count,
                            key: "exists--true"
                        };
                    }
                    return null; // We don't support the scenario
                }

                return null; // We don't support the scenario
            }
        }
    };

    var predicatePropertyRegEx = /^(.+_)?(.+)$/;

    /**
     * Returns the local name (without index) of the given name.
     * e.g. `1_name` -> `name`, `name` -> `name`.
     */
    function getLocalName(relName) {
        return predicatePropertyRegEx.exec(relName)[2];
    }

    /**
     * Returns the type of the predicate.
     * e.g. `group.1_property` -> `property`.
     */
    function getPredicateType(predicate) {
        return getLocalName(predicate.split(".").pop());
    }

    function findPredicateProperty(predicateProperties, predicate, property, indexed) {
        return predicateProperties.find(function(prop) {
            if (property && indexed) {
                if (!prop.name.startsWith(predicate + ".")) {
                    return false;
                }
                var relName = prop.name.substring((predicate + ".").length);
                return getLocalName(relName) === property;
            }
            var absName = predicate + (property ? "." + property : "");
            return prop.name === absName;
        });
    }

    function getPredicateHandler(predicateType) {
        switch (predicateType) {
            case "property":
            case "boolproperty":
                return handlers.property;
            default:
                return handlers["default"];
        }
    }

    function removeCountElements() {
        var predicates = $(".granite-omnisearch-predicates");
        $(".granite-omnisearch-facet-count", predicates).remove();
        $(".granite-omnisearch-facet-labelcount", predicates).remove();
    }

    function updatePredicateElements(facets, config) {
        var accordionContents = $(".granite-omnisearch-predicates coral-accordion-item-content");

        // For now only scan for checkboxes and radios
        var all = $();
        all = all.add(accordionContents.find("coral-checkbox").not("coral-accordion-item-label *"));
        all = all.add(accordionContents.find("coral-radio").not("coral-accordion-item-label *"));

        var results = $();

        facets.forEach(function(facet) {
            var predicateType = getPredicateType(facet.predicate);
            var handler = getPredicateHandler(predicateType);

            var filtered = all.filter("[name^='" + facet.predicate + "']");
            filtered.each(function(i, el) {
                var $el = $(el);
                var predicateProperties = $el
                    .add($el.closest("coral-accordion-item-content").children("input[name^='" + facet.predicate + "']"))
                    .add($el.siblings("input[name^='" + facet.predicate + "']"))
                    .toArray()
                    .map(function(e) {
                        return {
                            name: e.name,
                            value: e.value
                        };
                    });

                var result = handler.getCount(facet, predicateProperties);
                if (result !== null) {
                    if (result.count > 0 || config.showAggregateCount) {
                        appendCount(el, result.count, "granite-omnisearch-facet-count");
                    }
                    countElementMap.set(el, result);
                }
            });

            results = results.add(filtered);
        });

        return results;
    }

    function appendCount(checkboxOrRadioEl, count, className) {
        $(document.createElement("span"))
            .addClass(className)
            .text(" (" + count + ")")
            .appendTo(checkboxOrRadioEl.label);
    }

    function updateAccordionLabels(predicateElements, config) {
        var predicateElementArray = predicateElements.toArray();

        if (!config.showAggregateCount) {
            $(".granite-omnisearch-predicates coral-accordion-item").each(function() {
                var item = $(this);

                var hasPredicate = predicateElementArray.some(function(el) {
                    var config = countElementMap.get(el);
                    return config && config.count > 0 && item.has(el).length > 0;
                });

                if (hasPredicate) {
                    item.prop("selected", true);
                }
            });
            return;
        }

        $(".granite-omnisearch-predicates coral-accordion-item-label coral-checkbox").each(function(i, checkboxEl) {
            var item = $(checkboxEl).closest("coral-accordion-item");

            var filteredPredicates = predicateElementArray.filter(function(el) {
                return item.has(el).length > 0;
            });

            if (!filteredPredicates.length) {
                return;
            }

            var map = new Map();

            var totalCount = filteredPredicates.reduce(function(acc, el) {
                var config = countElementMap.get(el);

                var count = 0;
                if (config.key !== null && !map.has(config.key)) {
                    map.set(config.key, true);
                    count = config.count;
                }

                return acc + count;
            }, 0);

            appendCount(checkboxEl, totalCount, "granite-omnisearch-facet-labelcount");
        });
    }

    var registry = $(window).adaptTo("foundation-registry");

    registry.register("foundation.adapters", {
        type: "granite-omnisearch-internal-facets", // Internal API
        selector: $(window),
        adapter: function() {
            return {
                /**
                 * Updates the facets counts.
                 *
                 * @param {Object} facets the facets info containing the counts based on the predicates
                 * @param {Object} config the config to customize the operation of the update
                 * @param {Boolean=true} config.showAggregateCount
                 *                          flag if the counts for the aggregated facets need to be shown or not
                 */
                updateCount: function(facets, config) {
                    if (!facets) {
                        // searchResult = null. Clearing count -> empty.
                        removeCountElements();
                        return;
                    }

                    if (config.showAggregateCount === undefined) {
                        config.showAggregateCount = true;
                    }

                    var transposedFacets = Object.keys(facets).reduce(function(acc, predicate) {
                        acc.push({
                            predicate: predicate,
                            buckets: facets[predicate]
                        });
                        return acc;
                    }, []);

                    removeCountElements();
                    var predicateElements = updatePredicateElements(transposedFacets, config);
                    updateAccordionLabels(predicateElements, config);
                }
            };
        }
    });
})(window, Granite.$);

/*************************************************************************
* ADOBE CONFIDENTIAL
* ___________________
*
* Copyright 2021 Adobe
* All Rights Reserved.
*
* NOTICE: All information contained herein is, and remains
* the property of Adobe and its suppliers, if any. The intellectual
* and technical concepts contained herein are proprietary to Adobe
* and its suppliers and are protected by all applicable intellectual
* property laws, including trade secret and copyright laws.
* Dissemination of this information or reproduction of this material
* is strictly forbidden unless prior written permission is obtained
* from Adobe.
**************************************************************************/
(function(document, $) {
    "use strict";

    /**
     * returns the key which is used to specify the fulltext predicate in queryParams
     * @param {Object} queryParams query parameters of omnisearch
     * @returns {String} fulltext predicate key
     */
    function getFulltextPredicateKey(queryParams) {
        // "fulltext" or "2_fulltext"
        return Object.keys(queryParams).find(function(key) {
            var parts = key.split("_");
            return (parts.length === 1 && parts[0] === "fulltext") || (parts.length === 2 && parts[1] === "fulltext");
        });
    }

    /**
     * handle omnisearch fulltext predicate update
     * update predicates value
     */
    $(document).on("granite-omnisearch-predicate-update", function(event) {
        var queryParams = event.detail.queryParameters;

        var key = getFulltextPredicateKey(queryParams);

        var input = document.querySelector(".granite-omnisearch-typeahead .granite-omnisearch-typeahead-input");

        if (key && input) {
            // update input value as per fulltext value
            input.value = queryParams[key];
        }
    });

    /**
     * handles omnisearch fulltext predicate clear
     * clear predicate values
     */
    $(document).on("granite-omnisearch-predicate-clear", function(event) {
        if (event.detail.reset) {
            var form = event.target;
            var input = form.querySelector(".granite-omnisearch-typeahead .granite-omnisearch-typeahead-input");
            input.value = "";
        }
    });
})(document, Granite.$);

/*************************************************************************
* ADOBE CONFIDENTIAL
* ___________________
*
* Copyright 2021 Adobe
* All Rights Reserved.
*
* NOTICE: All information contained herein is, and remains
* the property of Adobe and its suppliers, if any. The intellectual
* and technical concepts contained herein are proprietary to Adobe
* and its suppliers and are protected by all applicable intellectual
* property laws, including trade secret and copyright laws.
* Dissemination of this information or reproduction of this material
* is strictly forbidden unless prior written permission is obtained
* from Adobe.
**************************************************************************/
(function(document, $) {
    "use strict";

    // Predicate Id used to identify the location
    var LOCATION_PREDICATE_ID = "location";
    // Predicate Id used to identify the location suggestion
    var LOCATION_SUGGESTION_PREDICATE_ID = "location.suggestion";

    /**
     * modifies the current history entry title as per page location
     * @param {String} title updated title value
     */
    function updateHistoryStateTitle(title) {
        var state = History.getState();
        History.replaceState(state.data, title);
    }

    /**
     * modifies the current history state location value
     * @param {String} location current location of omnisearch page
     */
    function updateHistoryStateLocation(location) {
        var state = History.getState();

        state.data.omnisearch = state.data.omnisearch || {};
        state.data.omnisearch.location = location;

        History.replaceState(state.data, state.title);
    }

    /**
     * update page title according to the location
     * @param {String} location current location of omnisearch page
     */
    function updatePageTitle(location) {
        var title;
        if (location) {
            title = Granite.I18n.get("Location: {0} | AEM Search", location);
        } else {
            title = Granite.I18n.get("AEM Search");
        }
        updateHistoryStateTitle(title);
    }

    /**
     * update location input field value.
     * will create location input fieldif not present on page
     * @param {String} value updated location value
     * @private
     */
    function updateOrCreateLocationInput(value) {
        var form = document.querySelector(".granite-omnisearch-form");
        var locationInput = form.querySelector("#granite-omnisearch-field-location");

        if (locationInput === null) {
            // create location input field
            locationInput = document.createElement("input");
            locationInput.id = "granite-omnisearch-field-location";
            locationInput.type = "hidden";
            locationInput.name = LOCATION_PREDICATE_ID;
            // append to form
            form.appendChild(locationInput);
        }
        // update location value
        locationInput.value = value;
    }

    /**
     * update location suggestion input field value.
     * will create location suggestion input field if not present on page
     * @param {String} value updated location suggestion value
     */
    function updateOrCreateLocationSuggestionInput(value) {
        var form = document.querySelector(".granite-omnisearch-form");
        var locationSuggestionInput = form.querySelector("#granite-omnisearch-field-location-suggestion");

        if (locationSuggestionInput === null) {
            // create location input field
            locationSuggestionInput = document.createElement("input");
            locationSuggestionInput.id = "granite-omnisearch-field-location-suggestion";
            locationSuggestionInput.type = "hidden";
            locationSuggestionInput.name = LOCATION_SUGGESTION_PREDICATE_ID;
            // append to form
            form.appendChild(locationSuggestionInput);
        }
        // update location value
        locationSuggestionInput.value = value;
    }

    /**
     * update location tag field on input bar
     * will create location tag field if not present on page
     * @param {String} name updated tagName
     * @param {String} value updated tagValue
     */
    function updateOrCreateLocationTag(name, value) {
        var form = document.querySelector(".granite-omnisearch-form");
        var tagList = form.querySelector(".granite-omnisearch-typeahead-tags");
        var locationTag = tagList.querySelector("#granite-omnisearch-field-locationtag");

        if (locationTag === null) {
            // create  new location tag
            locationTag = new Coral.Tag();
            locationTag.id = "granite-omnisearch-field-locationtag";
            tagList.items.add(locationTag);
        }

        $(locationTag.label)
            .empty() // first empty tag label and then update with new values
            .append($(document.createElement("span"))
                .addClass("u-coral-text-capitalize u-coral-text-italic u-coral-text-secondary")
                .text(name + ": "))
            .append($(document.createElement("span"))
                .text(value));
    }

    /**
     * update or create location predicate inputs or tags based on passed values
     * @param {String} location value
     * @param {String} locationSuggestion value
     * @param {HTMLElement} item element which trigger predicate update
     * @param {Boolean} replaceState true to replace the current state location with updated value
     * @emits 'granite-shell-omnisearch-predicate-location:updated'
     */
    function updateLocationPredicate(location, locationSuggestion, item, replaceState) {
        var form = document.querySelector(".granite-omnisearch-form");
        var locationInput = form.querySelector("#granite-omnisearch-field-location");

        if (locationInput && locationInput.value === location) {
            // if location input exists and value same as changed location
            // do nothing
            return;
        }

        var name = item ? item.dataset.graniteOmnisearchTypeaheadSuggestionTag : Granite.I18n.get("Location");
        var value = item ? item.dataset.graniteOmnisearchTypeaheadSuggestionValue : locationSuggestion;

        updateOrCreateLocationInput(location);
        updateOrCreateLocationSuggestionInput(value);
        updateOrCreateLocationTag(name, value);

        if (replaceState) {
            updateHistoryStateLocation({
                value: location,
                label: locationSuggestion
            });
        }

        // trigger event to load siderail based on location value
        // internal event
        $(document).trigger({
            type: "granite-shell-omnisearch-predicate-location:updated",
            detail: {
                location: location
            }
        });
    }

    /**
     * handle omnisearch location predicate update
     * update predicates value
     */
    $(document).on("granite-omnisearch-predicate-update", function(event) {
        var item = event.detail.item;

        if (item && item.dataset.graniteOmnisearchTypeaheadSuggestionPredicateid !== LOCATION_PREDICATE_ID) {
            return;
        }

        var queryParams = event.detail.queryParameters;

        var location = queryParams[LOCATION_PREDICATE_ID];
        var locationSuggestion = queryParams[LOCATION_SUGGESTION_PREDICATE_ID];

        if (location) {
            // update page title based on location
            updatePageTitle(location);
            // update predicate values
            updateLocationPredicate(location, locationSuggestion, item, true);
        }
    });

    /**
     * handle the scenario when location value is updated from HistoryConfig or location element.
     * value are passed as event.detail
     */
    $(document).on("granite-shell-omnisearch-predicate-location:update", function(event) {
        event.stopImmediatePropagation();

        var location = event.detail.location;
        var locationSuggestion = event.detail.locationSuggestion;

        // update predicate values
        updateLocationPredicate(location, locationSuggestion);
    });

    /**
     * handles omnisearch location predicate clear
     * clear predicate values
     * emits 'granite-shell-omnisearch-predicate-location:cleared'
     */
    $(document).on("granite-omnisearch-predicate-clear", function(event) {
        var form = event.target;
        var item = event.detail.item;

        if (!item || !item.matches("#granite-omnisearch-field-locationtag")) {
            return;
        }

        var locationInput = form.querySelector("#granite-omnisearch-field-location");
        var locationSuggestionInput = form.querySelector("#granite-omnisearch-field-location");

        // remove related fields
        locationInput.remove();
        locationSuggestionInput.remove();
        item.remove();

        // update page title
        updatePageTitle();

        // location is undefined
        // trigger event to unload side rail.
        // internal event
        $(document).trigger("granite-shell-omnisearch-predicate-location:cleared");
    });
})(document, Granite.$);

/*************************************************************************
* ADOBE CONFIDENTIAL
* ___________________
*
* Copyright 2021 Adobe
* All Rights Reserved.
*
* NOTICE: All information contained herein is, and remains
* the property of Adobe and its suppliers, if any. The intellectual
* and technical concepts contained herein are proprietary to Adobe
* and its suppliers and are protected by all applicable intellectual
* property laws, including trade secret and copyright laws.
* Dissemination of this information or reproduction of this material
* is strictly forbidden unless prior written permission is obtained
* from Adobe.
**************************************************************************/
(function(document, Coral, Granite, $, URITemplate) {
    "use strict";

    var registry = $(window).adaptTo("foundation-registry");
    // suggestion item id prefix
    var ITEM_ID_PREFIX = "granite-omnisearch-suggestion-item-";
    // maximum allowed suggestions
    var MAX_SUGGESTIONS = 9;
    // Predicate Id used to identify the location
    var LOCATION_PREDICATE_ID = "location";

    /**
     * fetch navigation suggestions data
     * store the fetched data to avoid subsequent calls
     */
    var getNavigationData = (function() {
        var navigationData;
        return function() {
            if (!navigationData) {
                var omnisearch = document.querySelector(".granite-omnisearch-overlay");
                var navSrc = omnisearch.dataset.graniteOmnisearchOverlayNavsrc;

                return $.get(navSrc).then(function(data) {
                    navigationData = parseNavigationData(data);
                    return navigationData;
                });
            }
            return Promise.resolve(navigationData);
        };
    })();

    /**
     * returns escaped value from input value
     * @param {String} inputValue input value/query
     * @returns {String} escaped value
     */
    function getEscapedValue(inputValue) {
        return inputValue.replace(/[.?*+^$[\]\\(){}|-]/g, "\\$&");
    }

    /**
     * parse the fetched navigation data
     * recursively parsed the data
     * @param {Object} data navigation data
     * @param {String} parent parent navigation string
     * @returns {Array} parsed navigation data
     */
    function parseNavigationData(data, parent) {
        return Object.keys(data).reduce(function(acc, value) {
            var navItem = data[value];
            if (navItem.href && navItem.title) {
                acc.push({
                    title: parent ? parent + " › " + navItem.title : navItem.title,
                    href: navItem.href,
                    icon: navItem.icon
                });
            } else if (typeof navItem === "object") {
                acc = acc.concat(parseNavigationData(navItem, parent ? parent + " › " + navItem.title : navItem.title));
            }
            return acc;
        }, []);
    }

    /**
     * returns a suggestion sorter based on input value
     * @param {String} inputValue input value/query
     * @returns {Function} suggestion sorted function based on current input value.
     */
    function sorter(inputValue) {
        /**
         * The comparator to sort the suggestions.
         * It favors suggestions starting with the input
         * and works where the input is closer to the begining of the suggestions.
         * @param {Object} a First suggestion
         * @param {Object} b Second suggestion
         * @returns {Number} position
         */
        return function(a, b) {
            // Move exact matches to the top
            if (inputValue === a.suggestion) {
                return -1;
            }

            if (inputValue === b.suggestion) {
                return 1;
            }

            var aIndex = a.suggestion.toLowerCase().indexOf(inputValue.toLowerCase());
            var bIndex = b.suggestion.toLowerCase().indexOf(inputValue.toLowerCase());

            // When the position is the same, prefer the shorter suggestions; use the position to order otherwise.
            return aIndex === bIndex ? -(b.suggestion.length - a.suggestion.length) : aIndex - bIndex;
        };
    }

    /**
     * filter out texts which does not contain query
     * @param {[String]} texts array which needs to be filtered
     * @param {String} query on which texts needs be filtered
     * @returns {[String]} matched texts array
     */
    function substringMatcher(texts, query) {
        // Create a regex to match the the query
        // If multiple words are located in the string, it needs to match all of the them
        var substrRegex = new RegExp(query.split(" ").map(function(v) {
            return "(?=.*" + v + ")";
        }).join("") + ".+", "gi");

        return texts.filter(function(v) {
            return substrRegex.test(v.title);
        });
    }

    /**
     * fetch navigation data for specific locations
     * when location specific navigation data is present,
     * graniteUI data will be not be used.
     * @param {String} location current location.
     * @returns {Array} returns location based navigation data
     */
    function getLocationBasedNavigationData(location) {
        var navigation;
        Granite.UI.Foundation.Utils.everyReverse(
            registry.get("foundation.omnisearch.navigation.suggestions"),
            function(c) {
                if (c.name === location) {
                    navigation = c.handler(navigation);
                }
            }
        );
        return navigation || null;
    }

    /**
     * returns matched navigation suggestions
     * @param {Object} data suggestion response from server.
     * @param {[String]} navigationData navigation based suggestions
     * @param {String} inputValue input value/query
     * @param {Number} addedSuggestionsCount already added suggestion count,
     * used to avoid addition of more the <code>MAX_SUGGESTIONS</code> suggestions
     * @returns {[Object]} returns an array of suggestion
     */
    function getNavigationSuggestions(data, navigationData, inputValue, addedSuggestionsCount) {
        var escapedValue = getEscapedValue(inputValue);
        var matches = substringMatcher(navigationData || [], escapedValue);

        var ADAPTED_MAX_SUGGESTIONS = (data.predicateSuggestions && data.predicateSuggestions.length > 0)
            ? MAX_SUGGESTIONS - 1 : MAX_SUGGESTIONS;
        // filter navigation suggestion
        var result = matches.filter(function() {
            // filter until added suggestion count less than adapted max suggestion count
            return !(addedSuggestionsCount++ >= ADAPTED_MAX_SUGGESTIONS);
        });

        return result;
    }

    /**
     * returns navigation suggestions wrapped around <code>SelectList.Item</code>
     * @param {Object} data suggestion response from server.
     * @param {[String]} navigationData navigation based suggestions
     * @param {String} inputValue input value/query
     * @param {Number} addedSuggestionsCount already added suggestion count,
     * used to avoid addition of more the <code>MAX_SUGGESTIONS</code> suggestions
     * @returns {[HTMLElement]} an array of matched navigation suggestion wrapped around <code>SelectList.Item</code>
     */
    function getWrappedNavigationSuggestions(data, navigationData, inputValue, addedSuggestionsCount) {
        var escapedValue = getEscapedValue(inputValue);
        var regex = new RegExp("(" + escapedValue.split(" ").join("|") + ")", "gi");

        var matches = getNavigationSuggestions(data, navigationData, inputValue, addedSuggestionsCount);

        var result = matches.map(function(item, index) {
            // wrap item around <code>SelectList.Item</code>
            var selectListItem = new Coral.SelectList.Item();
            var href = Granite.HTTP.externalize(item.href);
            selectListItem.value = item.value;
            selectListItem.id = ITEM_ID_PREFIX + (addedSuggestionsCount + index);
            selectListItem.content.innerHTML =
                "<coral-icon size='S' icon='" + item.icon + "'></coral-icon>" +
                "<span class='granite-omnisearch-typeahead-suggestions-tip'>" +
                    Granite.I18n.get("Press Enter to navigate") +
                "</span>" +
                Granite.I18n.get("Go to") + " " +
                item.title.replace(regex, "<span class='u-coral-text-secondary'>$1</span>");

            selectListItem.setAttribute("data-granite-omnisearch-typeahead-navigation", "");
            selectListItem.setAttribute("data-granite-omnisearch-typeahead-navigation-href", href);

            return selectListItem;
        });

        return result;
    }

    /**
     * returns matched predicate suggestions
     * @param {Object} data suggestion response from server.
     * @param {String} inputValue input value/query
     * @param {Number} addedSuggestionsCount already added suggestion count,
     * used to avoid addition of more the <code>MAX_SUGGESTIONS</code> suggestions
     * @returns {[Object]} an array of suggestion
     */
    function getPredicateSuggestions(data, inputValue, addedSuggestionsCount) {
        var predicateSuggestions = data && data.predicateSuggestions ? data.predicateSuggestions : [];
        // filter predicate suggestion
        var result = predicateSuggestions.filter(function() {
            // filter until added suggestion count less than max suggestion count
            return !(addedSuggestionsCount++ >= MAX_SUGGESTIONS);
        });

        return result;
    }

    /**
     * returns matched predicate suggestions wrapped around <code>SelectList.Item</code>
     * @param {Object} data suggestion response from server.
     * @param {String} inputValue input value/query
     * @param {Number} addedSuggestionsCount already added suggestion count,
     * used to avoid addition of more the <code>MAX_SUGGESTIONS</code> suggestions
     * @returns {[Object]} an array of matched predicate suggestion wrapped around <code>SelectList.Item</code>
     */
    function getWrappedPredicateSuggestions(data, inputValue, addedSuggestionsCount) {
        var escapedValue = getEscapedValue(inputValue);
        var regex = new RegExp("(" + escapedValue.split(" ").join("|") + ")", "gi");

        var matches = getPredicateSuggestions(data, inputValue, addedSuggestionsCount);

        var result = matches.map(function(item, index) {
            // wrap item around <code>SelectList.Item</code>
            var href = Granite.HTTP.externalize(item.href);
            var selectListItem = new Coral.SelectList.Item();
            selectListItem.value = item.value;
            selectListItem.id = ITEM_ID_PREFIX + (addedSuggestionsCount + index);
            selectListItem.href = href;
            selectListItem.content.innerHTML =
                "<span class='granite-omnisearch-typeahead-suggestions-tip'>" +
                    Granite.I18n.get("Press Tab to add") +
                "</span>" +
                "<coral-tag size='M'>" +
                    "<span class='u-coral-text-capitalize u-coral-text-secondary u-coral-text-italic'>" +
                        item.type + " : " +
                    "</span>" +
                    item.value.replace(regex, "<span class='u-coral-text-secondary'>$1</span>") +
                "</coral-tag>";

            // type and value should come translated from the server
            // @todo: we need to define a predicateId, the location predicate doesn't contain a typePath
            var predicateId = item.typePath ||
                item.queryParameters.location !== "" ? LOCATION_PREDICATE_ID : item.type;
            selectListItem.setAttribute("data-granite-omnisearch-typeahead-suggestion-predicateid", predicateId);
            selectListItem.setAttribute("data-granite-omnisearch-typeahead-suggestion-tag", item.type);
            selectListItem.setAttribute("data-granite-omnisearch-typeahead-suggestion-value", item.value);
            $(selectListItem).data("granite-omnisearch-typeahead-suggestion-queryparameters", item.queryParameters);

            return selectListItem;
        });

        return result;
    }

    /**
     * returns matched text suggestions
     * @param {Object} data suggestion response from server.
     * @param {String} inputValue input value/query
     * @param {Number} addedSuggestionsCount already added suggestion count,
     * used to avoid addition of more the <code>MAX_SUGGESTIONS</code> suggestions
     * @returns {[Object]} an array of text suggestion
     */
    function getTextSuggestions(data, inputValue, addedSuggestionsCount) {
        var textSuggestions = [];
        if (data && data.suggestions) {
            var suggestionSorter = sorter(inputValue);
            textSuggestions = data.suggestions;
            // since they are not sorted in the server we sort and remove duplicates in the client
            textSuggestions = textSuggestions.sort(suggestionSorter).filter(function(item, pos, array) {
                return !pos || item.suggestion !== array[pos - 1].suggestion;
            });
        }

        var result = textSuggestions.filter(function() {
            // filter until added suggestion count less than adapted max suggestion count
            return !(addedSuggestionsCount++ >= MAX_SUGGESTIONS);
        });

        return result;
    }

    /**
     * returns matched text suggestions wrapped around <code>SelectList.Item</code>
     * @param {Object} data suggestion response from server.
     * @param {String} inputValue input value/query
     * @param {Number} addedSuggestionsCount already added suggestion count,
     * used to avoid addition of more the <code>MAX_SUGGESTIONS</code> suggestions
     * @returns {[Object]} an array of matched text suggestion wrapped around <code>SelectList.Item</code>
     */
    function getWrappedTextSuggestions(data, inputValue, addedSuggestionsCount) {
        var escapedValue = getEscapedValue(inputValue);
        var regex = new RegExp("(" + escapedValue.split(" ").join("|") + ")", "gi");

        var matches = getTextSuggestions(data, inputValue, addedSuggestionsCount);

        var result = matches.map(function(item, index) {
            // wrap item around <code>SelectList.Item</code>
            var sanitizedValue = $("<div>").text(item.suggestion).html();
            var selectListItem = new Coral.SelectList.Item();
            selectListItem.value = item.value;
            selectListItem.id = ITEM_ID_PREFIX + (addedSuggestionsCount + index);
            selectListItem.content.innerHTML =
                sanitizedValue.replace(regex, "<span class='u-coral-text-secondary'>$1</span>");

            return selectListItem;
        });
        return result;
    }

    /**
     * fetch the matched suggestions data from server
     * @returns {Promise} resolved when data has been fetched, resolved with data
     */
    function fetchSuggestions() {
        // omnisearch overlay
        var overlay = document.querySelector(".granite-omnisearch-overlay");
        var form = overlay.querySelector(".granite-omnisearch-form");
        var typeahead = form.querySelector(".granite-omnisearch-typeahead");

        var url = URITemplate.expand(typeahead.dataset.graniteOmnisearchTypeaheadSrc);

        if (!url) {
            return Promise.resolve([]);
        }
        // fetch suggestion from url
        return $.ajax({
            url: url,
            method: $(form).attr("method"),
            data: $(form).serialize()
        }).then(function(data) {
            return data;
        });
    }

    /**
     * retrieve all type of matched suggestion wrapped around <code>SelectList.Item</code>
     * @param {String} location current location
     * @param {String} inputValue input value/query
     * @returns {Promise} resolved when all matched suggestion retrieved,
     * resolved with array of wrapped matched suggestion
     */
    function getWrappedSuggestions(location, inputValue) {
        var suggestions = [];

        return Promise.all([ getNavigationData(), fetchSuggestions() ]).then(function(results) {
            var navigationData = getLocationBasedNavigationData(location);
            if (!navigationData) {
                // when no location specific navigation data exists
                // fall back to granite navigation data
                navigationData = results[0];
            }
            // suggestion response
            var data = results[1];

            if (data) {
                suggestions = suggestions.concat(getWrappedNavigationSuggestions(data, navigationData, inputValue, 0));
                suggestions = suggestions.concat(getWrappedPredicateSuggestions(data, inputValue, suggestions.length));
                suggestions = suggestions.concat(getWrappedTextSuggestions(data, inputValue, suggestions.length));
                return suggestions;
            }
            return [];
        }).catch(function() {
            return [];
        });
    }

    /**
     * suggestions api to retrieve suggestions based on location and inputValue
     */
    registry.register("foundation.adapters", {
        type: "granite-shell-omnisearch-suggestions",
        selector: $(window),
        adapter: function() {
            return {
                getSuggestions: function(location, inputValue) {
                    if (!inputValue) {
                        return Promise.resolve([]);
                    }
                    // todo implement a getSuggestions function similar to getWrappedSuggestions
                    return fetchSuggestions(location, inputValue);
                },

                getWrappedSuggestions: function(location, inputValue) {
                    if (!inputValue) {
                        return Promise.resolve([]);
                    }
                    return getWrappedSuggestions(location, inputValue);
                }
            };
        }
    });
})(document, Coral, Granite, Granite.$, Granite.URITemplate);

/*************************************************************************
* ADOBE CONFIDENTIAL
* ___________________
*
* Copyright 2015 Adobe
* All Rights Reserved.
*
* NOTICE: All information contained herein is, and remains
* the property of Adobe and its suppliers, if any. The intellectual
* and technical concepts contained herein are proprietary to Adobe
* and its suppliers and are protected by all applicable intellectual
* property laws, including trade secret and copyright laws.
* Dissemination of this information or reproduction of this material
* is strictly forbidden unless prior written permission is obtained
* from Adobe.
**************************************************************************/
(function(document, Coral, Granite, $, URITemplate) {
    "use strict";

    /**
     * @typedef {Object} HistoryConfig
     * @property {[Object]} formData stores form data.
     * @property {Boolean} referrer determines whether going back is possible or not.
     * @property {Object} collectionInfo stores collectionInfo like limit and scrollTo
     * @property {Object} location stores location info
     * @property {Object} tagsPredicateData stores tags data to avoid server call to retrieve data.
     */

    /**
     * @typedef {Object} Omnisearch
     * @property {Boolean} open determines whether search is open or not.
     * @property {Object} elements stores pointer to search static element.
     * @property {HTMLElement} metadata provides search metadata element on page.
     * @property {Boolean} closable whether search is closable or not.
     * @property {Boolean} showRail whether predicate rail needs to be open or not.
     * @property {String} searchURL search url
     * @property {Omnisearch.Stack} stack stores callback to clean added listener
     * @property {Boolean} restored search is restored from saved HistoryConfig.
     * @property {Boolean} closed whether search is closed or not.
     * @property {HTMLELement} collectionEl search result collection element.
     * @property {Function} init initialise the omnisearch.
     * @property {Function} destroy clean omnisearch saved state.
     */

    /**
     * @typedef {Object} Omnisearch.Stack
     * @property {Array} open --> stores listener callback attached during opening of omnisearch
     * @property {Array} collection --> stores listener callback attached to result collection
     */

    // minimum width of the typeahead input
    var INPUT_MIN_WIDTH = 200;
    // search icon width
    var SEARCH_ICON_WIDTH = 36;
    // delay used to show suggestions after the user interacted with the textfield
    var DELAY = 300;
    // key omnisearch path
    var KEY_OMNISEARCH_PATH = "granite.shell.omnisearch.pathWhenOpeningOmnisearch";
    // Predicate Id used to identify the location
    var LOCATION_PREDICATE_ID = "location";
    // Predicate Id used to identify the location suggestion
    // eslint-disable-next-line no-unused-vars
    var LOCATION_SUGGESTION_PREDICATE_ID = "location.suggestion";
    // timeout used to debounce the user input
    var inputTimeout;
    // will be true when opened via search icon
    // todo better option to retain focus
    var onExitRestoreSearchIconFocus = false;
    // rail loading promise
    // todo better option to define rail loading promise.
    var railLoadingPromise = Promise.resolve();

    // stores omnisearch state
    // avoid naming function since only one object is needed
    var omnisearch = new (function() {
        var elements;
        var open;
        var restored;
        var showRail;
        var closable;
        var vent;
        var closed;
        var collectionEl;
        var omnisearchMinLength;

        // stack holds callback to clear added listener
        var stack;

        // remove all attached listeners
        // clean stored stack callback by executing them
        function clean() {
            // for each stack key
            Object.keys(stack).forEach(function(key) {
                // run the callback stored in stack key value
                Granite.UI.Foundation.Utils.everyReverse(stack[key], function(callback) {
                    if (callback) {
                        callback();
                    }
                    return true;
                });
            });
        }

        // reset the omnisearch values to default one
        // executed during destroying phase
        function reset() {
            elements = {};
            open = restored = showRail = closed = false;
            closable = true;
            vent = null;
            stack = {
                open: [], // store listener callback attached during opening of omnisearch
                collection: [] // store listener callback attached to result collection.
            };
            collectionEl = null; // store result collection element
        }

        // remove all omnisearch elements from DOM.
        // executed during destroying phase
        function remove() {
            Object.keys(elements).forEach(function(key) {
                var element = elements[key];
                element && element.remove();
            });
        }

        // update the elements of omnisearch
        // @param overlay parent overlay element of omnisearch
        // executed during initiating phase
        function update(overlay) {
            elements.overlay = overlay;
            elements.form = overlay.querySelector(".granite-omnisearch-form");
            elements.typeahead = elements.form.querySelector(".granite-omnisearch-typeahead");
            elements.input = elements.typeahead.querySelector(".granite-omnisearch-typeahead-input");
            elements.tagList = elements.typeahead.querySelector(".granite-omnisearch-typeahead-tags");
            elements.tagListHolder = elements.typeahead.querySelector(".granite-omnisearch-typeahead-tags-holder");
            // eslint-disable-next-line max-len
            elements.tagListHolderLabel = elements.typeahead.querySelector(".granite-omnisearch-typeahead-tags-holder-label");
            // eslint-disable-next-line max-len
            elements.tagListHolderPopover = overlay.querySelector(".granite-omnisearch-typeahead-tags-holder-popover");
            // eslint-disable-next-line max-len
            elements.tagListHolderList = elements.tagListHolderPopover.querySelector(".granite-omnisearch-typeahead-tags-holder-list");
            elements.selectList = elements.typeahead.querySelector(".granite-omnisearch-typeahead-suggestions");
            elements.typeaheadOverlay = elements.typeahead.querySelector(".granite-omnisearch-typeahead-overlay");
            elements.close = elements.typeahead.querySelector(".granite-omnisearch-typeahead-close");
            omnisearchMinLength = overlay.getAttribute("omnisearchMinLength");
        }

        reset();

        return {
            get open() {
                return open || false;
            },
            set open(value) {
                open = Boolean(value);
            },
            get elements() {
                return elements || {};
            },
            get metadata() {
                return document.querySelector(".granite-omnisearch-src");
            },
            get vent() {
                return vent;
            },
            get closable() {
                return closable;
            },
            set closable(value) {
                closable = Boolean(value);
            },
            get showRail() {
                return showRail;
            },
            set showRail(value) {
                showRail = Boolean(value);
            },
            get stack() {
                return stack;
            },
            get searchURL() {
                return this.metadata ? this.metadata.dataset.graniteOmnisearchSearchUrl : null;
            },
            get restored() {
                return restored;
            },
            set restored(value) {
                restored = Boolean(value);
            },
            get closed() {
                return closed;
            },
            set closed(value) {
                closed = Boolean(value);
            },
            get collectionEl() {
                return collectionEl;
            },
            get omnisearchMinLength() {
                return omnisearchMinLength;
            },
            set collectionEl(value) {
                collectionEl = value;
            },
            init: function(overlay) {
                // do not reset while initialising.
                // only remove previous added listeners
                clean();
                // update elements
                update(overlay);
                /* global Vent:false */
                vent = new Vent(overlay);
            },
            destroy: function() {
                clean(); // clean stack
                vent && vent.destroy(); // destory vent
                cleanCollection(); // clean collection
                remove(); // remove attached element.
                reset(); // reset stored values
            }
        };
    });

    /**
     * focus the omnisearch input field
     */
    function focusInput() {
        var input = omnisearch.elements.input;
        if (input) {
            window.requestAnimationFrame(function() {
                input.focus();
            });
        }
    }

    /**
     * finds current location based on form queryParameters
     * @returns {String} current location, undefined if none.
     */
    function getLocationValue() {
        var form = omnisearch.elements.form;

        var locationObj = $(form).serializeArray().find(function(item) {
            return item.name === LOCATION_PREDICATE_ID;
        });
        return locationObj ? locationObj["value"] : undefined;
    }

    /**
     * returns the current page title based on location
     * @param {String} location of current omnisearch page.
     * @returns {String} current page title
     */
    function getPageTitle(location) {
        if (location) {
            return Granite.I18n.get("Location: {0} | AEM Search", location);
        } else {
            return Granite.I18n.get("AEM Search");
        }
    }

    /**
     * returns the index to which collection needs to be scrolled
     * @param {HistoryConfig} config stored in browser history
     * @returns {Number} return index of the item, null when no stored info.
     */
    function getScrollToIndex(config) {
        if (config && config.collection) {
            return config.collection.index || null;
        }

        var state = History.getState();

        if (state.data && state.data.omnisearch && state.data.omnisearch.collection) {
            return state.data.omnisearch.collection.index || null;
        }
        return null;
    }

    /**
     * Scrolls to the bottom of the given item in given container.
     * @param {HTMLElement} item to which we need to scroll
     * @param {HTMLElement} container item scrollable ancestor
     */
    function scrollItemIntoView(item, container) {
        // both item and container should be present in DOM
        if (!item || !container || !document.body.contains(item) || !document.body.contains(container)) {
            return;
        }
        var top;
        var position = $(item).position();

        if (position.top + item.offsetHeight >= container.offsetHeight) {
            top = item.offsetTop + item.offsetHeight - container.offsetHeight;
            container.scrollTop = top;
        } else if (position.top < 0) {
            // Scroll to the top of the item in this case
            top = item.offsetTop;
            container.scrollTop = top;
        }
    }

    /**
     * Returns the position of the cursor of the given input.
     * @returns {Number} position
     */
    function getCursorPosition() {
        var input = omnisearch.elements.input;
        if (!input) {
            // no input field return -1.
            return -1;
        } else if ("selectionStart" in input) {
            return input.selectionStart;
        } else if (document.selection) {
            // IE needs the item to be in focus
            if (document.activeElement !== input) {
                return -1;
            }
            var selection = document.selection.createRange();
            var selectionLength = selection.text.length;
            selection.moveStart("character", -input.value.length);
            return selection.text.length - selectionLength;
        }
    }

    /**
     * adjust input's size to accommodate the tagList.
     */
    function adjustInputSize() {
        Coral.commons.nextFrame(function() {
            var input = omnisearch.elements.input;
            var tagList = omnisearch.elements.tagList;
            var tagListHolder = omnisearch.elements.tagListHolder;
            var tagListHolderList = omnisearch.elements.tagListHolderList;
            var tagListHolderLabel = omnisearch.elements.tagListHolderLabel;
            var tagListHolderPopover = omnisearch.elements.tagListHolderPopover;

            if (!input || !tagList) {
                return;
            }

            if (input.clientWidth - tagList.offsetWidth <= INPUT_MIN_WIDTH) {
                // Hide the last added visible tag
                // eslint-disable-next-line max-len
                var tag = tagList.querySelector("coral-tag:not([name='" + LOCATION_PREDICATE_ID + "']):not([hidden])");

                if (tag) {
                    // Increment the counter
                    tagListHolderLabel.textContent = Number(tagListHolderLabel.textContent) + 1;

                    // Add an item that copies the tag label to the holder popover list
                    var item = tagListHolderList.items.add({
                        type: "button",
                        content: {
                            innerHTML: tag.label.innerHTML +
                                // eslint-disable-next-line max-len
                                "<coral-icon class='granite-omnisearch-typeahead-tags-holder-list-remove' icon='closeCircle' size='XS'></coral-icon>"
                        }
                    });

                    // Store the tag as reference
                    $(item).data("graniteOmnisearchTagsHolderItemTag", {
                        tag: tag,
                        width: tag.getBoundingClientRect().width
                    });

                    // Show the holder and hide the tag
                    tagListHolder.closable = false;
                    tagListHolder.hidden = false;
                    tag.hidden = true;
                }
            } else {
                var lastItem = tagListHolderList.items.last();
                if (lastItem) {
                    var data = $(lastItem).data("graniteOmnisearchTagsHolderItemTag");

                    // If there's enough space, show the last hidden tag if any
                    if (data && data.tag.hidden) {
                        if (input.clientWidth - tagList.offsetWidth - data.width > INPUT_MIN_WIDTH) {
                            data.tag.hidden = false;
                            tagListHolderList.items.remove(lastItem);

                            if (!tagListHolderList.items.length) {
                                tagListHolderPopover.open = false;
                                tagListHolder.hidden = true;
                                tagListHolderLabel.textContent = "";
                            } else {
                                tagListHolderLabel.textContent = Number(tagListHolderLabel.textContent) - 1;
                            }
                        }
                    }
                }

                $(input).css("padding-left", tagList.offsetWidth + SEARCH_ICON_WIDTH);
            }
        });
    }

    /**
     * used to set the visibility of shell-header based on value passed
     * shell header should be hidden when omnisearch is open and shown when closed.
     * @param {Boolean} hidden true to hide the header
     */
    function showHideShellHeader(hidden) {
        var header = document.querySelector(".granite-shell-header");
        if (header) {
            if (hidden) {
                header.style.visibility = "hidden";
            } else {
                header.style.visibility = "";
            }
        }
    }

    /**
     * update accessiblity state based on new suggestions.
     * @param {HTMLElement} focusedItem current focused item in suggestion list
     */
    function setAccessibilityState(focusedItem) {
        var input = omnisearch.elements.input;
        var selectList = omnisearch.elements.selectList;

        input.setAttribute("aria-expanded", true);
        input.setAttribute("aria-controls", selectList.id);
        input.setAttribute("aria-activedescendant", focusedItem.id); // update focused element id.
        focusedItem.setAttribute("aria-live", "polite");
        // update label with current input text
        selectList.setAttribute("aria-label", Granite.I18n.get("AEM Search") + ": " + input.value);
    }

    /**
     * reset input accessibility state
     * used when suggestion are hidden
     */
    function resetAccessibilityState() {
        var input = omnisearch.elements.input;
        var selectList = omnisearch.elements.selectList;

        input.setAttribute("aria-expanded", false);
        input.removeAttribute("aria-controls");
        input.removeAttribute("aria-activedescendant"); // remove focused
        // reset label to default one
        selectList.setAttribute("aria-label", Granite.I18n.get("AEM Search"));
    }

    /**
     * create predicate tag at input tagList
     * @param {HTMLElement} item tag will be created based this item data.
     */
    function createPredicateTag(item) {
        var predicateId = item.dataset.graniteOmnisearchTypeaheadSuggestionPredicateid;
        var keepInput = item.dataset.graniteOmnisearchTypeaheadSuggestionKeepinput;

        if (!predicateId) {
            return; // do nothing if predicate id not present
        }

        if (!keepInput) {
            omnisearch.elements.input.value = ""; // we need to clear the input since it now became a tag
        }

        var queryParams = $(item).data("granite-omnisearch-typeahead-suggestion-queryparameters");
        // update predicate based on item queryparams
        updatePredicate(item, queryParams);
    }

    /**
     * update the omnisearch predicate based on passed parameters
     * @param {HTMLElement} item which resulted in predicate update
     * @param {Object} queryParams query parameters values on which predicate would be updated
     * @param {Object} tagsPredicateData stored tag data so while updating predicate no need for server calls
     * @triggers 'granite-omnisearch-predicate-update'
     */
    function updatePredicate(item, queryParams, tagsPredicateData) {
        var form = omnisearch.elements.form;
        var tagList = omnisearch.elements.tagList;

        $(form).trigger({
            type: "granite-omnisearch-predicate-update",
            detail: {
                item: item,
                tagList: tagList,
                queryParameters: queryParams,
                tagsPredicateData: tagsPredicateData || {}
            }
        });
    }

    /**
     * clear the omnisearch predicate values
     * @param {HTMLElement} item which caused the predicate value reset
     * @triggers 'granite-omnisearch-predicate-clear'
     */
    function clearPredicate(item) {
        var form = omnisearch.elements.form;
        var tagList = omnisearch.elements.tagList;
        $(form).trigger({
            type: "granite-omnisearch-predicate-clear",
            detail: {
                item: item,
                tagList: tagList
            }
        });
    }

    /**
     * Update the complete form state in browser history
     * @param {HTMLFormElement} form - The omnisearch form element.
     */
    function updateHistoryStateForm(form) {
        var state = History.getState();

        state.data.omnisearch = state.data.omnisearch || {};

        state.data.omnisearch.formData = $(form).serializeArray();
        state.data.omnisearch.tagsPredicateData = getTagsPredicateData();

        History.replaceState(state.data, state.title);
    }

    /**
     * use to obtain tag information saved in dataset graniteOmnisearchTagPredicateData
     * @returns {Object} tags predicate data object
     */
    function getTagsPredicateData() {
        var tagsPredicateData = {};
        var tagList = omnisearch.elements.tagList;
        var tags = tagList.querySelectorAll("coral-tag");
        // for each tag store the data in an object
        // key tag name and value tag data
        Array.prototype.forEach.call(tags, function(tag) {
            var tagData = $(tag).data("graniteOmnisearchTagPredicateData");
            if (tagData) {
                var name = tagData.name;
                tagsPredicateData[name] = tagData;
            }
        });
        return tagsPredicateData;
    }

    /**
     * Restores the search state based on the given history configuration.
     *
     * @param {HistoryConfig} config stored config in history state
     */
    function restoreSearch(config) {
        var formData = config.formData;
        // tagsPredicateData is used to retrieve tag predicate value without fetching from server
        var tagsPredicateData = config.tagsPredicateData;

        // use to set the form limit to index value.
        // this will ensure that fetch items count are atleast index
        // fetch item count >= index
        // will be used to scroll down to item at index position
        var setFormLimitToIndex = function(index) {
            var form = omnisearch.elements.form;
            // save form action
            var action = form.action;

            var resetFormLimit = function() {
                form.action = action;
            };

            if (index) {
                var limit = parseInt(History.getState().data.omnisearch.collection.limit, 10) || 100;
                // update form action limit
                form.action = action.substr(0, action.lastIndexOf(".")) + // action before url extension
                ".0." + (Math.ceil(index / limit) * limit) + // add 0 as offset and closest limit
                action.substr(action.lastIndexOf("."), action.length); // add extension.
            }

            return resetFormLimit;
        };

        // set restored to true
        omnisearch.restored = true;

        // in case omnisearch is restored after viewing search item
        // update limit to index to load last viewed item as well.
        var resetFormLimit = setFormLimitToIndex(getScrollToIndex(config));

        var queryParams = formData.reduce(function(memo, v) {
            memo[v.name] = v.value;
            return memo;
        }, {});

        // update predicate based on stored params
        updatePredicate(undefined, queryParams, tagsPredicateData);

        // load the search results
        loadSearchResults();
        // reset form action limit
        resetFormLimit();
    }

    /**
     * load search result by submitting search form
     */
    function loadSearchResults() {
        var form = omnisearch.elements.form;
        // Close the suggestion to make the results visible
        hideSuggestions();
        // submit form.
        $(form).submit();
    }

    /**
     * hide suggestion list
     */
    function hideSuggestions() {
        var typeaheadOverlay = omnisearch.elements.typeaheadOverlay;

        // clear input timeout
        clearTimeout(inputTimeout);
        // resett accessiblity state
        resetAccessibilityState();
        // hide suggestion overlay
        typeaheadOverlay.hide();
    }

    /**
     * show suggestions based on user input
     * @returns {Promise} resolve when suggestion shown
     */
    function showSuggestions() {
        var typeahead = omnisearch.elements.typeahead;
        var input = omnisearch.elements.input;
        var form = omnisearch.elements.form;
        var inputValue = input.value;

        if (!typeahead) {
            return;
        }

        // reset accessibility state
        // will be set with new suggestions
        resetAccessibilityState();

        // do nothing when inputtext length is less than three
        if (inputValue.length < omnisearch.omnisearchMinLength) {
            hideSuggestions();
            return;
        }

        var url = URITemplate.expand(typeahead.dataset.graniteOmnisearchTypeaheadSrc, {
            query: $(form).serialize()
        });

        if (!url) {
            return;
        }

        // load suggestions
        return $(window).adaptTo("granite-shell-omnisearch-suggestions")
            .getWrappedSuggestions(getLocationValue(), inputValue)
            .then(function(wrappedSuggestions) {
                var selectList = omnisearch.elements.selectList;
                var typeaheadOverlay = omnisearch.elements.typeaheadOverlay;

                // do nothing if omnisearch is not open
                // or it has been closed
                if (!omnisearch.open || omnisearch.closed) {
                    return;
                }

                // clear existing suggestions
                selectList.items.clear();

                wrappedSuggestions.forEach(function(wrappedSuggestion) {
                    // add new suggestions in selectlist.
                    selectList.items.add(wrappedSuggestion);
                });

                // reset heigt value
                selectList.style.height = "";

                // measures actual height of the selectList
                var style = window.getComputedStyle(selectList);
                var height = parseInt(style.height, 10);
                var maxHeight = parseInt(style.maxHeight, 10);

                if (height < maxHeight) {
                    // makes it scrollable
                    selectList.style.height = height + "px";
                }

                if (selectList.items.length > 0) {
                    var firstItem = selectList.items.getAll()[0];
                    // set accessiblity based on first element
                    setAccessibilityState(firstItem);
                    // set suggestion overlay as open
                    typeaheadOverlay.open = true;
                }
            });
    }

    /**
     * load the predicate panel side rail based on location
     * @param {String} location current omnisearch location
     * @returns {Promise} resolve when side rail has been loaded
     */
    function loadSideRail(location) {
        var overlay = omnisearch.elements.overlay;
        var rail = overlay.querySelector("#granite-omnisearch-result-rail");

        // load side rail when location is specified and omnisearch is open
        if (location && omnisearch.open) {
            var src = overlay.dataset.graniteOmnisearchOverlayPredicatesrc;
            if (!src) {
                return Promise.reject();
            }

            var url = URITemplate.expand(src, {
                location: location
            });

            return $.ajax({
                url: url,
                cache: false
            }).then(function(data) {
                return $(window).adaptTo("foundation-util-htmlparser").parse(data).then(function(fragment) {
                    var newRail = fragment.querySelector("#granite-omnisearch-result-rail");

                    // replace new rail with previous rail.
                    rail.replaceWith(newRail);

                    $(newRail).trigger("foundation-contentloaded");

                    if (omnisearch.showRail) {
                        var railToggle = overlay.querySelector("#granite-omnisearch-result-rail-toggle");

                        if (railToggle) {
                            // If the toggle element already exists then select the item.
                            // Otherwise, it means that form response comes later.
                            // Show the rail at the form response handler then.
                            railToggle.items.getAll()[1].selected = true;

                            omnisearch.showRail = false; // Reset to initial value as the job is done
                        }
                    }
                });
            });
        }
        // return resolved promise
        return Promise.resolve();
    }

    /**
     * unload the loaded predicate panel side rail.
     * empties the side rail
     */
    function unloadSideRail() {
        var overlay = omnisearch.elements.overlay;
        var rail = overlay.querySelector("#granite-omnisearch-result-rail");
        var $rail = $(rail);

        var toggleableAPI = $rail.adaptTo("foundation-toggleable");

        // remove rail toggle
        var railToggle = overlay.querySelector("#granite-omnisearch-result-rail-toggle");
        railToggle && railToggle.remove();

        // hide rail and set its content to empty
        toggleableAPI.hide();
        $rail.empty();

        // clear all tags
        omnisearch.elements.tagList.items.clear();
    }

    /**
     * handles the user inputs logic
     * @returns {Function} callback function which removes the added event handler
     */
    function handleUserInput() {
        var vent = omnisearch.vent;
        // use a new instance of Coral.Keys to avoid blocking `esc` keydown event propagation
        // var keys = new Coral.Keys(document.documentElement);

        // whenever user enter a text in omnisearch input field
        var onInput = function(event) {
            // Debounce user input before showing suggestions
            window.clearTimeout(inputTimeout);
            inputTimeout = window.setTimeout(showSuggestions, DELAY);
        };

        // global escape key, added during capture phase
        // so that the overlay and count state have correct values
        // use to close suggestion, remove selection or close omnisearch
        var onEscape = function(event) {
            if (event.key === "Escape") {
                var overlay = omnisearch.elements.overlay;
                var typeaheadOverlay = omnisearch.elements.typeaheadOverlay;

                // do nothing when omnisearch is not open or
                // omnisearch in closing phase
                if (!omnisearch.open || omnisearch.closed) {
                    return;
                }

                // hide suggestion overlay when suggestion is showing
                // suggestion overlay should be topmost to receive event.
                if (typeaheadOverlay && typeaheadOverlay.open && typeaheadOverlay._isTopOverlay()) {
                    event.preventDefault();
                    hideSuggestions();
                    // do not process further
                    return;
                }

                // do nothing when omnisearch the topmost overlay
                if (!overlay._isTopOverlay()) {
                    return;
                }

                var collectionEl = overlay.querySelector("#granite-omnisearch-result");
                var selectedCount = $(collectionEl).adaptTo("foundation-selections").count();

                // no omnisearch item is selected close omisearch.
                // in case of selection, item selection will handle event.
                // do not close oomnisearch in that case.
                if (selectedCount === 0) {
                    event.preventDefault();
                    closeOmnisearch();
                }
            }
        };

        // user presses a key
        var onKeyDown = function(event) {
            var preventDefault = true;
            var input = omnisearch.elements.input;
            var selectList = omnisearch.elements.selectList;
            var typeaheadOverlay = omnisearch.elements.typeaheadOverlay;
            var tagList = omnisearch.elements.tagList;

            // backspace: Delete tag or clear input
            function onBackspace(event) {
                // Allow the cursor to delete as normal
                if (getCursorPosition(input) === 0 && window.getSelection().toString() === "") {
                    // Remove the last item since it is the closest to the cursor
                    var last = tagList.items.last();
                    last && last.remove();

                    // update suggestion based on new tags,
                    // do not trigger search query
                    showSuggestions();
                }
                // remove the entire string if it is enclosed by quotes
                if (input.value.match("^\"(.+)\"$")) {
                    input.value = "";
                }
            }

            // tab: Create a new predicate without triggering search
            function onTab(event) {
                if (typeaheadOverlay.open) {
                    var target = selectList.querySelector("coral-selectlist-item.is-highlighted");

                    if (target && target.dataset.graniteOmnisearchTypeaheadSuggestionPredicateid) {
                        // As a productivity boost, allow the users to select the tag without refreshing the results
                        createPredicateTag(target);
                        showSuggestions();
                        return;
                    }
                }
            }

            // enter: Select the item and perform the search
            function onEnter(event) {
                // suggestion overlay is open.
                if (typeaheadOverlay.open) {
                    var target = selectList.querySelector("coral-selectlist-item.is-highlighted");
                    if (target) {
                        // This click will create the tag and trigger the search
                        // load result based on current focused suggestion.
                        target.click();
                        return;
                    }
                }
                // load search result
                loadSearchResults();
            }

            // up arrow: Move through suggestions.
            function onUpArrow(event) {
                // when suugestion are open.
                // move focus to previous suggestion
                if (typeaheadOverlay.open) {
                    var item;
                    var target = selectList.querySelector("coral-selectlist-item.is-highlighted");
                    var items = selectList.items.getAll();
                    var index = items.indexOf(target);
                    // remove highlighted from current focused suggestion
                    target && target.classList.remove("is-highlighted");

                    if (items.length === 0) {
                        return;
                    }

                    if (index > 0) {
                        // previous suggestion
                        item = items[index - 1];
                    } else {
                        // current suggestion is first suggestion
                        // last suggestion
                        item = items[items.length - 1];
                    }
                    // highlight previous suggestion
                    item.classList.add("is-highlighted");
                    input.setAttribute("aria-activedescendant", item.getAttribute("id"));

                    scrollItemIntoView(item, typeaheadOverlay);
                }
            }

            // down arrow: Move through suggestions or show suggestions if not.
            function onDownArrow(event) {
                // when suugestion are open.
                // move focus to next suggestion
                if (typeaheadOverlay.open) {
                    var item;
                    var target = selectList.querySelector("coral-selectlist-item.is-highlighted");
                    var items = selectList.items.getAll();
                    var index = items.indexOf(target);
                    // remove highlighted from current focused suggestion
                    target && target.classList.remove("is-highlighted");

                    if (items.length === 0) {
                        return;
                    }

                    if (index < items.length - 1) {
                        // next suggestion
                        item = items[index + 1];
                    } else {
                        // current suggestion is last suggestion
                        // first suggestion
                        item = items[0];
                    }
                    // highlight next suggestion
                    item.classList.add("is-highlighted");
                    input.setAttribute("aria-activedescendant", item.getAttribute("id"));

                    scrollItemIntoView(item, typeaheadOverlay);
                } else {
                    // Show the suggestions and do not focus on the first item
                    showSuggestions();
                }
            }

            switch (event.keyCode) {
                // backspace key
                case 8:
                    preventDefault = false;
                    onBackspace(event);
                    break;
                // tab key
                case 9:
                    preventDefault = typeaheadOverlay.open ? preventDefault : false;
                    onTab(event);
                    break;
                // enter key
                case 13:
                    onEnter(event);
                    break;
                // up arrow
                case 38:
                    if (typeaheadOverlay.open) {
                        // Allow the cursor to move as expected
                        preventDefault = false;
                    }
                    // execute up arrow press logic
                    onUpArrow(event);
                    break;
                // down arrow
                case 40:
                    if (typeaheadOverlay.open) {
                        // Allow the cursor to move as expected
                        preventDefault = false;
                    }
                    // execute down arrow press logic
                    onDownArrow(event);
                    break;
                default:
                    preventDefault = false;
            }

            if (preventDefault) {
                event.preventDefault();
            }
        };

        vent.on("input", ".granite-omnisearch-typeahead-input", onInput);
        vent.on("keydown", ".granite-omnisearch-typeahead-input", onKeyDown);

        // handle global escape
        vent.on("keydown", onEscape, true);

        return function() {
            vent.off("input", ".granite-omnisearch-typeahead-input", onInput);
            vent.off("keydown", ".granite-omnisearch-typeahead-input", onKeyDown);
            vent.off("keydown", onEscape, true);
        };
    }

    /**
     * handles the tagList modification logic.
     * used to handle tag addition, removal or changed logic
     * @returns {Function} callback function which removes the added event handler
     */
    function handleTagList() {
        var vent = omnisearch.vent;

        // when tag are added in tagList
        var onTagListAddItem = function(event) {
            // Make sure tags aren't multiline
            event.detail.item.multiline = false;
            // we need to adjust input size based on new tags
            adjustInputSize();
        };

        // when tags are removed from tagList
        var onTagListRemoveItem = function(event) {
            // we need to adjust input size based on remaining tags
            adjustInputSize();
            // clear predicate related to tag
            clearPredicate(event.detail.item);
        };

        // tagList changed
        var onTagListChange = function(event) {
            // show suggestion based on new tags
            showSuggestions();
        };

        vent.on("coral-collection:add", ".granite-omnisearch-typeahead-tags", onTagListAddItem);
        vent.on("coral-collection:remove", ".granite-omnisearch-typeahead-tags", onTagListRemoveItem);
        vent.on("change", ".granite-omnisearch-typeahead-tags", onTagListChange);

        return function() {
            vent.off("coral-collection:add", ".granite-omnisearch-typeahead-tags", onTagListAddItem);
            vent.off("coral-collection:remove", ".granite-omnisearch-typeahead-tags", onTagListRemoveItem);
            vent.off("change", ".granite-omnisearch-typeahead-tags", onTagListChange);
        };
    }

    /**
     * handles the user interaction with suggestions
     * @returns {Function} callback function which removes the added event handler
     */
    function handleSuggestions() {
        var vent = omnisearch.vent;

        // handles suggestion click
        // load result based on suggestion or
        // navigate to href when clicked suggestion is navigationSuggestion.
        var onSuggestionClick = function(event) {
            var target = event.matchedTarget.selectedItem;
            var input = omnisearch.elements.input;

            if (!target) {
                // do nothing when target not present.
                return;
            }

            if (typeof target.dataset.graniteOmnisearchTypeaheadNavigation !== "undefined") {
                // clicked suggestion is navigation one
                window.location = target.dataset.graniteOmnisearchTypeaheadNavigationHref;
                return;
            } else if (target.dataset.graniteOmnisearchTypeaheadSuggestionPredicateid) {
                // If the item is annotated, create a tag with it
                createPredicateTag(target);
            } else {
                // Otherwise, set the text as the entry
                input.value = target.value || target.content.textContent;
            }
            loadSearchResults();
        };

        // handles the scenario when mouse pointer enters a suggestion region
        // update current active suggestion item.
        var onSuggestionMouseEnter = function(event) {
            var item = event.target;
            var input = omnisearch.elements.input;
            input.setAttribute("aria-activedescendant", item.getAttribute("id"));
        };

        // handles global click
        // close suggestion when click outside suggestion overlay.
        var onClick = function(event) {
            var eventTarget = event.target;
            var input = omnisearch.elements.input;
            var typeaheadOverlay = omnisearch.elements.typeaheadOverlay;

            var eventIsWithinTarget = input ? input.contains(eventTarget) : false;

            if (!eventIsWithinTarget && typeaheadOverlay !== null &&
                typeaheadOverlay.open && !typeaheadOverlay.contains(eventTarget)) {
                hideSuggestions();
            }
        };

        vent.on("coral-selectlist:change", ".granite-omnisearch-typeahead-overlay coral-selectlist",
            onSuggestionClick);

        $(document).on("mouseenter", ".granite-omnisearch-typeahead-overlay coral-selectlist coral-selectlist-item",
            onSuggestionMouseEnter);

        // handles clicking outside the suggestions overlay
        document.addEventListener("click", onClick);

        return function() {
            vent.off("coral-selectlist:change", ".granite-omnisearch-typeahead-overlay coral-selectlist",
                onSuggestionClick);
            // eslint-disable-next-line max-len
            $(document).on("mouseenter", ".granite-omnisearch-typeahead-overlay coral-selectlist coral-selectlist-item",
                onSuggestionMouseEnter);
            document.removeEventListener("click", onClick);
        };
    }

    /**
     * handles the user interaction with tagListHolder
     * @returns {Function} callback function which removes the added event handler
     */
    function handleTagListHolder() {
        var vent = omnisearch.vent;

        // handles the scenario when tagListerHolder item is removed
        var onTagListHolderRemoveItem = function() {
            var item = event.matchedTarget;
            var tagList = omnisearch.elements.tagList;
            var tagListHolderLabel = omnisearch.elements.tagListHolderLabel;
            var tagListHolderList = omnisearch.elements.tagListHolderList;

            // tagListHolder contains only one items
            // last item is being removed.
            if (tagListHolderList.items.length === 1) {
                var tagListHolder = omnisearch.elements.tagListHolder;
                var tagListHolderPopover = omnisearch.elements.tagListHolderPopover;

                // The last item is going to be removed so the holder can be hidden again
                tagListHolderPopover.open = false;
                tagListHolder.hidden = true;
                tagListHolderLabel.textContent = "";
            } else {
                tagListHolderLabel.textContent = Number(tagListHolderLabel.textContent) - 1;
            }
            // remove item from tagListHolderList
            tagListHolderList.items.remove(item);
            // Remove the related tag
            tagList.items.remove($(item).data("graniteOmnisearchTagsHolderItemTag").tag);
        };

        vent.on("click", ".granite-omnisearch-typeahead-tags-holder-list [coral-list-item]", onTagListHolderRemoveItem);

        return function() {
            vent.off("click", ".granite-omnisearch-typeahead-tags-holder-list [coral-list-item]",
                onTagListHolderRemoveItem);
        };
    }

    /**
     * handles omnisearch form interaction
     * update state when form is submitted.
     * @returns {Function} callback function which removes the added event handler
     */
    function handleForm() {
        var form = omnisearch.elements.form;

        // update history state when form is submitted
        var onFormSubmit = function(event) {
            var target = event.target;
            updateHistoryStateForm(target);
        };

        $(form).on("submit", onFormSubmit);

        return function() {
            $(form).off("submit", onFormSubmit);
        };
    }

    /**
     * handles the window resizing
     * @returns {Function} callback function which removes the added event handler
     */
    function handleResize() {
        var tagList = omnisearch.elements.tagList;

        // This is required to detect when tags label are modified (e.g. the path predicate)
        // need to adjsut the input bar size when window is resized
        Coral.commons.addResizeListener(tagList, adjustInputSize);
        window.addEventListener("resize", adjustInputSize);

        return function() {
            window.removeEventListener("resize", adjustInputSize);
        };
    }

    /**
     * handles the user interaction with collection
     * @returns {Function} callback function which removes the added event handler
     */
    function handleCollection() {
        var collectionEl = omnisearch.collectionEl;
        // store the item index, on item click
        // the stored index will be used to scroll back to this item.
        var onItemClick = function(event) {
            var target = event.target;
            var state = History.getState();
            var el = target.closest(".foundation-collection-item:not(.is-lazyLoaded)");
            var pagination = $(collectionEl).adaptTo("foundation-collection").getPagination();

            if (el && pagination) {
                var index = el.dataset.datasourceIndex;

                state.data.omnisearch = state.data.omnisearch || {};

                state.data.omnisearch.collection = {
                    index: index,
                    limit: pagination.limit
                };

                History.replaceState(state.data, state.title);
            }
        };

        collectionEl.addEventListener("click", onItemClick, true);
        return function() {
            collectionEl.removeEventListener("click", onItemClick, true);
        };
    }

    /**
     * clean omnisearch collection
     * remove/clear listener attached to omnisearch collection
     * avoid potential leak
     */
    function cleanCollection() {
        var collectionEl = omnisearch.collectionEl;
        // clean when there exists a previous collection
        // clean collection listener stored in collection stack
        Granite.UI.Foundation.Utils.everyReverse(omnisearch.stack.collection, function(callback) {
            callback && callback();
            return true;
        });
        // reset attached listener array for collection
        omnisearch.stack.collection = [];

        // clean omnisearch collection layout
        collectionEl && Granite.UI.Foundation.Layouts.cleanAll(this);
        // wait for certain time
        // remove items in background.
        window.setTimeout(function(collectionEl) {
            collectionEl && $(collectionEl).adaptTo("foundation-collection").clear();
        }, 1000, collectionEl);
        // remove child items
    }

    /**
     * handles the omnisearch opening
     * @param {HistoryConfig} config The history config.
     * When it is passed, the search state is restored based on it.
     * Otherwise, a new history state is pushed.
     * @returns {Promise} resolved when omnisearch is opened.
     * @emits 'granite-shell-omnisearch-predicate-location:update' when location is defined
     */

    function toggleVisibility(param) {
        var classname = "non-visible";
        if (param === true) {
            $("coral-shell").addClass(classname);
            $(".granite-skipNavigationLinks").addClass(classname);
        } else {
            $("coral-shell").removeClass(classname);
            $(".granite-skipNavigationLinks").removeClass(classname);
        }
    }

    function openOmnisearch(config) {
        var location;
        var locationSuggestion;
        var metadata = omnisearch.metadata;

        if (omnisearch.open) {
            // do nothing if omnisearch already open
            adjustInputSize();
            focusInput();
            return Promise.resolve();
        }

        if (!metadata || !metadata.dataset.graniteOmnisearchSrc) {
            return Promise.reject();
        }

        // set open to true;
        omnisearch.open = true;

        var url = metadata.dataset.graniteOmnisearchSrc;

        // hide shell-header, since search-typehead will cover it's display
        showHideShellHeader(true);
        toggleVisibility(true);

        if (config && config.location) {
            location = config.location.value;
            locationSuggestion = config.location.label;
        } else {
            var locationEl = document.head.querySelector(".granite-omnisearch-location");
            if (locationEl) {
                location = locationEl.dataset.graniteOmnisearchLocationValue;
                locationSuggestion = locationEl.dataset.graniteOmnisearchLocationLabel;
            }
        }

        url = URITemplate.expand(url, {
            location: location
        });

        return $.get(url).then(function(data) {
            return $(window).adaptTo("foundation-util-htmlparser").parse(data);
        }).then(function(fragment) {
            var overlay = fragment.querySelector(".granite-omnisearch-overlay");

            if (!overlay) {
                return;
            }

            // Make sure it is the topmost layer
            $(overlay).css("zIndex", document.querySelector("coral-shell-header").style.zIndex + 10);

            // init omnisearch elements, only once
            omnisearch.init(overlay);

            // handle user interaction
            // push callbacks into stack['open'] array
            omnisearch.stack.open.push(handleUserInput());
            omnisearch.stack.open.push(handleTagList());
            omnisearch.stack.open.push(handleSuggestions());
            omnisearch.stack.open.push(handleTagListHolder());
            omnisearch.stack.open.push(handleForm());
            omnisearch.stack.open.push(handleResize());

            // hide close button when omnisearch not closable
            if (!omnisearch.closable) {
                omnisearch.elements.close.hidden = true;
            }

            // append the omnisearch to document body
            document.body.appendChild(overlay);
            $(overlay).trigger("foundation-contentloaded");

            // adjust input field size
            adjustInputSize();
            // focus input field
            focusInput();

            if (location && locationSuggestion) {
                // update location predicate
                // this will trigger side rail loading
                $(document).trigger({
                    type: "granite-shell-omnisearch-predicate-location:update",
                    detail: {
                        location: location,
                        locationSuggestion: locationSuggestion
                    }
                });
            }

            return railLoadingPromise;
        }).then(function() {
            // after side rail has been loaded
            if (config) {
                // restore search if formdata exists
                config.formData && restoreSearch(config);
            } else {
                if (!window.location.pathname.startsWith(omnisearch.searchURL)) {
                    window.sessionStorage.setItem(KEY_OMNISEARCH_PATH, window.location.pathname);
                }

                var title = getPageTitle(location);
                // save the new loaded state in history
                History.pushState({
                    "omnisearch": {
                        "referrer": true,
                        "location": {
                            value: location,
                            label: locationSuggestion
                        }
                    }
                }, title, omnisearch.searchURL);
            }
        });
    }

    /**
     * handles the omnisearch closing
     * used tp remove the omnisearch elements from DOM
     * used to reset state, or listener
     */
    function exitOmnisearch() {
        // clean omnisearch object.
        omnisearch.destroy();

        // change selection to content only
        var collectionpageRailToggle = document.getElementById("shell-collectionpage-rail-toggle");
        if (collectionpageRailToggle) {
            collectionpageRailToggle.items.getAll()[0].selected = true;
        }

        // restore search icon focus
        var searchIcon = document.getElementById("granite-omnisearch-trigger");
        if (onExitRestoreSearchIconFocus && searchIcon) {
            onExitRestoreSearchIconFocus = false;
            window.setTimeout(function() {
                var searchButton = searchIcon.querySelector("button");
                searchIcon.open = false;
                searchButton.focus();
                searchButton.classList.add("focus-ring");
            }, 100);
        }

        // show shell header when exiting omnisearch
        showHideShellHeader(false);
        toggleVisibility(false);

        // reset values
        railLoadingPromise = Promise.resolve();
    }

    /**
     * initiate the omnisearch closing.
     * when omnisearch is restored, move to last known page state
     * else move to back page.
     * actual closing happens in <code>exitOmnisearch</code>
     */
    function closeOmnisearch() {
        if (omnisearch.closable && !omnisearch.closed) {
            // set omnisearch state to closed
            // do not set open to false, it will be set in exitOmnisearch
            omnisearch.closed = true;

            resetAccessibilityState();

            if (omnisearch.restored) {
                // We restore the original path before omnisearch is opened
                // This is needed cause the navigation is not linear. E.g. when navigating from
                // a search result to the details, then press cancel, a new state is created with search/html as
                // path. Navigating then back when closing is wrong, cause then we navigate back to the details and
                // not to the original state before opening omnisearch
                var originalPathBeforeOpeningOmnisearch = window.sessionStorage.getItem(KEY_OMNISEARCH_PATH);
                History.pushState({}, null, originalPathBeforeOpeningOmnisearch);
            } else {
                // move back to last visited page
                History.back();
            }
        }
    }

    function addOmniSearchFilterQueryParam() {
        var form = omnisearch.elements.form;

        var input = form.querySelector("#granite-omnisearch-is-opened-filter");

        if (input === null) {
            input = document.createElement("input");
            input.id = "granite-omnisearch-is-opened-filter";
            input.type = "hidden";
            input.name = "opened-through-filter";
            input.value = true;
            form.appendChild(input);
        }
    }

    function closeOmniSearchFilterQueryParam() {
        var form = omnisearch.elements.form;

        var input = form.querySelector("#granite-omnisearch-is-opened-filter");

        if (input !== null) {
            input.remove();
        }
    }

    /**
     * Handles the search result response
     * used to replace/append result content
     * used to scroll to last viewed item in case omnisearch restored.
     */
    $(window).adaptTo("foundation-registry").register("foundation.form.response.ui.success", {
        name: "granite.omnisearch.result",
        handler: function(form, config, data, textStatus, xhr, parsedResponse) {
            $(window).adaptTo("foundation-util-htmlparser").parse(parsedResponse).then(function(fragment) {
                var overlay = omnisearch.elements.overlay;
                var content = overlay.querySelector(".granite-omnisearch-content");

                // clear omnisearch filter query param every time
                closeOmniSearchFilterQueryParam();

                // replace oldActionBar with newActionBar
                var oldActionBar = content.querySelector("#granite-omnisearch-result-actionbar");
                var newActionbar = fragment.querySelector("#granite-omnisearch-result-actionbar");
                if (oldActionBar) {
                    // oldActionBar exists
                    var oldRailToggle = oldActionBar.querySelector("#granite-omnisearch-result-rail-toggle");
                    if (oldRailToggle) {
                        // when oldActionBar and oldRailToggle both exists
                        // replace only secondary bar
                        oldActionBar.querySelector("betty-titlebar-secondary")
                            .replaceWith(newActionbar.querySelector("betty-titlebar-secondary"));
                    } else if (newActionbar) {
                        // when oldActionBar and newActionBar both exits
                        // replace old with new one
                        oldActionBar.replaceWith(newActionbar);
                    } else {
                        // when only oldActionBar is present remove it
                        oldActionBar.remove();
                    }
                } else if (newActionbar) {
                    // append newActionbar when oldActionBar does not exists
                    content.querySelector("#granite-omnisearch-result-header").appendChild(newActionbar);
                }

                // replace old selectionbar with new selectionbar
                var oldSelectionBar = content.querySelector("#granite-shell-search-result-selectionbar");
                var newSelectionBar = fragment.querySelector("#granite-shell-search-result-selectionbar");
                if (oldSelectionBar && newSelectionBar) {
                    // when both oldSelectionBar and newSelectionBar are present
                    // replace old with new one
                    oldSelectionBar.replaceWith(newSelectionBar);
                } else if (oldSelectionBar) {
                    // when only oldSelectionBar is present remove it
                    oldSelectionBar.remove();
                } else if (newSelectionBar) {
                    // append newSelectionBar when oldSelectionBar does not exists
                    content.appendChild(newSelectionBar);
                }

                // update facets count
                var facet = fragment.querySelector("#granite-omnisearch-facet");
                var facetsAPI = $(window).adaptTo("granite-omnisearch-internal-facets");
                if (facet) {
                    var config = JSON.parse(facet.dataset.graniteOmnisearchFacetConfig);
                    var facets = JSON.parse(facet.dataset.graniteOmnisearchFacetFacets);
                    facetsAPI.updateCount(facets, config);
                } else {
                    facetsAPI.updateCount(null); // searchResult = null, clear predicate count
                }

                // replace oldResultContent with newResultContent
                var oldResultContent = content.querySelector("#granite-omnisearch-result-content");
                var newResultContent = fragment.querySelector("#granite-omnisearch-result-content");
                // clean previous omnisearch layouts
                // clear added listener in omnisearch
                // avoid potential memory leak
                cleanCollection();
                // now replace after cleaning is done
                oldResultContent.replaceWith(newResultContent);

                // omnisearch new collection,
                // would be null during multiresult
                var collectionEl = newResultContent.querySelector(".granite-omnisearch-result.foundation-collection");
                var $collection = $(collectionEl);
                // store collection pointer
                omnisearch.collectionEl = collectionEl;

                // when we need to scroll to last viewed item,
                // the limit is updated to item index.
                // restore the collection limit to default value.
                var scrollToIndex = getScrollToIndex();
                if (scrollToIndex) {
                    var cfg = JSON.parse(collectionEl.dataset.foundationLayout);
                    var limit = History.getState().data.omnisearch.collection.limit;
                    if (limit) {
                        cfg.limit = limit;
                    }
                    collectionEl.dataset.foundationLayout = JSON.stringify(cfg);
                    // update jquery data
                    $collection.removeData("foundation-layout");
                    $collection.data("foundation-layout", cfg);
                }

                // handles collection interaction
                // only when collectionEl present
                if (collectionEl) {
                    // push callbacks into stack['collection'] array
                    omnisearch.stack.collection.push(handleCollection());
                }

                // when sorting is supported update sortMode.
                if (collectionEl && newResultContent.dataset.supportSorting === "true") {
                    var layoutCfg = JSON.parse(collectionEl.dataset.foundationLayout);
                    // useful for table layout
                    layoutCfg.sortMode = "remote";
                    collectionEl.dataset.foundationLayout = JSON.stringify(layoutCfg);
                    // update jquery data
                    $collection.removeData("foundation-layout");
                    $collection.data("foundation-layout", layoutCfg);
                }

                // make content visible
                content.hidden = false;

                // trigger contentloaded event
                $(content).trigger("foundation-contentloaded");

                // clear selections of all collection,
                // any background selection should not affect omnisearch collection
                var collections = document.querySelectorAll(".foundation-collection");
                Array.prototype.forEach.call(collections, function(collection) {
                    var selectionAPI = $(collection).adaptTo("foundation-selections");
                    selectionAPI && selectionAPI.clear();
                });

                // when search is restored and last viewed item index exists
                // scroll the collection to that item position.
                // remove the stored collection information from history state
                if (scrollToIndex) {
                    // wait for some time to scroll
                    // ensure view has been layouted once.
                    window.requestAnimationFrame(function() {
                        var item = collectionEl.querySelector("[data-datasource-index='" + scrollToIndex + "']");
                        if (item) {
                            // scroll to the specified item top
                            $(collectionEl.scrollContainer).animate({
                                scrollTop: item.getClientRects()[0].top -
                                    collectionEl.scrollContainer.getClientRects()[0].top
                            }, 0);
                        }
                    });

                    // delete stored scrollTo info along with limit info.
                    var state = History.getState();
                    delete state.data.omnisearch.collection;
                    // push the replaced state.
                    History.replaceState(state.data, state.title);
                }

                // toggle the predicate panel side rail only when side rail needs to be shown.
                var railToggle = content.querySelector("#granite-omnisearch-result-rail-toggle");
                if (railToggle && omnisearch.showRail) {
                    var secondItem = railToggle.items.getAll()[1];
                    var target = secondItem.dataset.graniteToggleableControlTarget;
                    if (target) {
                        // If target element already exists then select the item.
                        // Otherwise, it means that rail response comes later.
                        // Show the rail at the rail response handler then.
                        secondItem.selected = true;
                        omnisearch.showRail = false; // Reset to initial value as the job is done
                    }
                }
            });
        }
    });

    /**
     * handles the logic when omnisearch is refreshed
     * or navigated directly via url
     */
    $(function() {
        var metadata = omnisearch.metadata;

        if (metadata) {
            var searchURL = omnisearch.searchURL;
            if (window.location.pathname.startsWith(searchURL)) {
                // restore previously stored state
                var config = History.getState().data.omnisearch;

                // set closbale to false if no referred present
                // omnisearch does not know about its calling page.
                omnisearch.closable = config && config.referrer;

                // When the config is not there, pass empty one to prevent pushing a new state,
                // since the page URL is already the search URL.
                openOmnisearch(config || {});
            }
        }
    });

    /**
     * Handles the history state change
     * Used to show omnisearch when navigated back to omnisearch.
     * reloading the background content in case omnisearch is standalone page
     */
    $(window).on("statechange", function() {
        var state = History.getState();
        var config = state.data.omnisearch;

        // current page has omnisearch config
        // omnisearch needs to be restored.
        if (config) {
            // only open omnisearch, if not already opened
            if (!omnisearch.open) {
                openOmnisearch(config);
            }
            return;
        }

        // state changed when omnisearch is closed
        // we can't use omnisearch.open check.
        if (omnisearch.open || omnisearch.closed) {
            // When /aem/search.html is a standalone page (e.g. due to a browser reload at some point),
            // it has `meta[name='granite.omnisearch.searchpage']`.
            // In that case, when navigating back from /aem/search.html (i.e. this code block),
            // the previous content needs to be reloaded as it is empty otherwise.
            var meta = document.head.querySelector("meta[name='granite.omnisearch.searchpage']");
            if (meta && meta.content === "true") {
                window.location.reload();
            } else {
                // simply exit the omnisearch.
                exitOmnisearch();
            }
        }
    });

    /**
     * avoid showing quickactions when showing multiresults
     */
    $(document).on("coral-overlay:beforeopen", ".granite-omnisearch-multiresult-row coral-quickactions", function(e) {
        e.preventDefault();
    });

    /**
     * handles the viewall logic when viewing multiresult page.
     */
    $(document).on("click", ".granite-omnisearch-viewall-button", function(event) {
        event.preventDefault();

        var button = event.currentTarget;
        var predicateId = button.dataset.graniteOmnisearchTypeaheadSuggestionPredicateid;
        var queryParams = JSON.parse(button.dataset.graniteOmnisearchTypeaheadSuggestionQueryparameters);

        if (predicateId) {
            updatePredicate(button, queryParams);
            loadSearchResults();
        }
    });

    /**
     * change the visibility of input bar in omnisearch depending upon current mode.
     * In selection mode inputbar should be hidden since actionbar goes above it.
     */
    $(document).on("foundation-mode-change", function(e, mode, group) {
        var omnisearchTypeHead = document.querySelector(".granite-omnisearch-typeahead");
        if (omnisearchTypeHead) {
            if (mode === "selection") {
                omnisearchTypeHead.style.visibility = "hidden";
            } else {
                omnisearchTypeHead.style.visibility = "";
            }
        }
    });

    /**
     * update the new layout when views are switched
     * remove listener to avoid potential leak
     * update sortMode for table layout
     */
    $(document).on("coral-cyclebutton:change",
        ".granite-collection-switcher[data-granite-collection-switcher-target='#granite-omnisearch-result']",
        function(event) {
            var timeout;

            // clean previous collection
            cleanCollection();

            // when views are switched.
            var onViewSwitched = function(event) {
                var newCollectionEl = event.target;
                var $collection = $(newCollectionEl);
                var layoutCfg = JSON.parse(newCollectionEl.dataset.foundationLayout);
                var resultContent = newCollectionEl.closest("#granite-omnisearch-result-content");

                // when current view is different than stored one
                if (omnisearch.collectionEl.nodeName !== newCollectionEl.nodeName) {
                    // update current collection pointer
                    omnisearch.collectionEl = newCollectionEl;
                    // add listeners to new collection
                    omnisearch.stack.collection.push(handleCollection());

                    // update sortMode when sorting is supported.
                    if (resultContent && resultContent.dataset.supportSorting === "true" &&
                        layoutCfg.sortMode !== "remote") {
                        // useful for table layout
                        layoutCfg.sortMode = "remote";
                        newCollectionEl.dataset.foundationLayout = JSON.stringify(layoutCfg);
                        // update jquery data
                        $collection.removeData("foundation-layout");
                        $collection.data("foundation-layout", layoutCfg);
                    }

                    // remove attached listener
                    $(document).off("foundation-contentloaded", "#granite-omnisearch-result", onViewSwitched);
                    // clear timeout
                    window.clearTimeout(timeout);
                }
            };

            // timeout to clear added listener
            // in case not removed in 5sec
            timeout = window.setTimeout(function() {
                $(document).off("foundation-contentloaded", "#granite-omnisearch-result", onViewSwitched);
            }, 5000);

            $(document).on("foundation-contentloaded", "#granite-omnisearch-result", onViewSwitched);
        });

    /**
     * update the current view value in cookie
     */
    $(document).on("foundation-layout-perform", "#granite-omnisearch-result", function(e) {
        var collectionEl = e.target;
        var config = JSON.parse(collectionEl.dataset.foundationLayout);
        $.cookie("shell.omnisearch.results.layoutId", config.layoutId, { path: "/" });
    });

    /**
     * load the predicate panel side rail based on the new location.
     * load whenever location is changed.
     * internal event
     */
    $(document).on("granite-shell-omnisearch-predicate-location:updated", function(event) {
        event.stopImmediatePropagation();

        var location = event.detail.location;
        // todo find a better way to store promise and use in openOmnisearch function
        railLoadingPromise = loadSideRail(location);
    });

    /**
     * unload the loaded predicate panel side rail when location is undefined
     * internal event
     */
    $(document).on("granite-shell-omnisearch-predicate-location:cleared", function(event) {
        event.stopImmediatePropagation();
        // unload loaded side rail
        unloadSideRail();
    });

    /**
     * handles the removing of tagList items
     * when predicates are reset, location tag
     * is kept as is.
     */
    $(document).on("granite-omnisearch-predicate-clear", function(event) {
        var tagList = event.detail.tagList;
        // in case of reset clear all tags except location one.
        if (event.detail.reset) {
            tagList.items.getAll().forEach(function(tag) {
                if (!tag.matches("#granite-omnisearch-field-locationtag")) {
                    tag.remove();
                }
            });
        }
    });

    /**
     * open omnisearch via shortcut key '/'.
     * It work only work when user has enabled shortcut preference.
     */
    $(function() {
        if ($(window).adaptTo("foundation-preference").getBoolean("shortcutsEnabled", true)) {
            // Register the KB shortcut for search
            Coral.keys.on("/", function(event) {
                var typeahead = omnisearch.elements.typeahead;

                // If "/" is pressed on the predicate ui field abort
                if ((typeahead && typeahead.contains(document.activeElement)) || omnisearch.open) {
                    return;
                }

                // If selectionbar is visible we don't open omnisearch
                if ($(".granite-collection-selectionbar > .foundation-mode-switcher-item-active").length) {
                    return;
                }

                event.preventDefault();

                openOmnisearch();
            });
        }
    });

    /**
     * open omnisearch when clicked on search icon on shell menubar
     */
    $(document).on("click", "#granite-omnisearch-trigger", function(event) {
        event.preventDefault();
        onExitRestoreSearchIconFocus = true;
        openOmnisearch();
    });

    /**
     * open omnisearch and trigger a search when filters cyclebutton is clicked.
     * when opening, add path predicate based on the current path of the collection.
     */
    $(document).on("coral-cyclebutton:change", "#granite-shell-actionbar .granite-toggleable-control", function(event) {
        var selectedEl = event.originalEvent.detail.selection;
        var collectionSelector = selectedEl.dataset.graniteOmnisearchFilter;

        if (!collectionSelector) {
            return;
        }
        var currentCollection = document.querySelector(collectionSelector);
        var currentPath = currentCollection.dataset.foundationCollectionId;

        // rail should be open whiling opening from filter cyclebutton
        omnisearch.showRail = true;

        openOmnisearch().then(function() {
            updatePredicate(undefined, {
                "_path": currentPath
            });

            // adding additional param for detecting whether omnisearch opened from filter or not
            addOmniSearchFilterQueryParam();

            loadSearchResults();
        });
    });

    /**
     * opens omnisearch from an external event.
     */
    $(document).on("granite-omnisearch-external-search", function(event) {
        var queryParams = event.detail.queryParams;
        openOmnisearch().then(function() {
            updatePredicate(undefined, queryParams);
            loadSearchResults();
        });
    });

    /**
     * close omnisearch when cross button is clicked
     */
    $(document).on("click", ".granite-omnisearch-typeahead-close", function(event) {
        event.preventDefault();
        closeOmnisearch();
    });
})(document, Coral, Granite, Granite.$, Granite.URITemplate);

/*************************************************************************
* ADOBE CONFIDENTIAL
* ___________________
*
* Copyright 2016 Adobe
* All Rights Reserved.
*
* NOTICE: All information contained herein is, and remains
* the property of Adobe and its suppliers, if any. The intellectual
* and technical concepts contained herein are proprietary to Adobe
* and its suppliers and are protected by all applicable intellectual
* property laws, including trade secret and copyright laws.
* Dissemination of this information or reproduction of this material
* is strictly forbidden unless prior written permission is obtained
* from Adobe.
**************************************************************************/
(function(window, $) {
    "use strict";

    var registry = $(window).adaptTo("foundation-registry");

    registry.register("foundation.adapters", {
        type: "foundation-collection-item-action",
        selector: "#granite-omnisearch-result-content .foundation-collection",
        adapter: function(el) {
            return {
                execute: function(itemEl) {
                    var href;
                    var target;
                    var navigatorEl;

                    if (itemEl.classList.contains("foundation-collection-navigator")) {
                        navigatorEl = itemEl;
                    } else {
                        navigatorEl = itemEl.querySelector(".foundation-collection-navigator");
                    }

                    if (navigatorEl) {
                        href = navigatorEl.dataset.foundationCollectionNavigatorHref;
                        target = navigatorEl.dataset.foundationCollectionNavigatorTarget;
                    }

                    if (!href) {
                        href = $(itemEl).find("link[rel=properties]").attr("href");
                    }

                    if (!href) {
                        return;
                    }

                    window.open(href, target || "_self");
                }
            };
        }
    });
})(window, Granite.$);

/*************************************************************************
* ADOBE CONFIDENTIAL
* ___________________
*
* Copyright 2015 Adobe
* All Rights Reserved.
*
* NOTICE: All information contained herein is, and remains
* the property of Adobe and its suppliers, if any. The intellectual
* and technical concepts contained herein are proprietary to Adobe
* and its suppliers and are protected by all applicable intellectual
* property laws, including trade secret and copyright laws.
* Dissemination of this information or reproduction of this material
* is strictly forbidden unless prior written permission is obtained
* from Adobe.
**************************************************************************/
(function(window, document, $, URITemplate, Granite, Coral) {
    "use strict";

    var REFRESH_INTERVAL = 60000;
    var KEY_DATA = "granite.shell.badge.data";
    var KEY_TIMESTAMP = "granite.shell.badge.timestamp";
    var KEY_USER = "granite.shell.badge.user";

    var stateMap = new WeakMap();
    var xhrMap = new WeakMap();

    /**
     * @typedef {Object} BadgeState
     * @property {HTMLElement} badgeEl
     * @property {HTMLElement} badgeMenu
     * @property {Boolean} dirty
     * @property {String} intervalId
     * @property {String} user
     * @property {String} src
     */

    /**
     * @typedef {Object} BadgeData
     * @property {String} total
     * @property {[BadgeItemData]} [data]
     */

    /**
     * @typedef {Object} BadgeItemData
     * @property {String} detailsUrl
     * @property {String} title
     * @property {String} description
     * @property {String} backgroundImageUrl
     */

    /**
     * Create BadgeState based on the passed values
     *
     * @param {Object} values initial values for any property else fall back to default values
     * @returns {BadgeState} initial badgeState
     */
    function createBadgeState(values) {
        return {
            badgeEl: values.badgeEl || undefined,
            badgeMenu: values.badgeMenu || undefined,
            dirty: values.dirty || false,
            intervalId: values.intervalId || undefined,
            user: values.user || undefined,
            src: values.src || undefined
        };
    }

    /**
     * @param {Object} input that will be html parsed
     * @returns {String} html parsed input
     */
    function htmlDecode(input) {
        var doc = new DOMParser().parseFromString(input, "text/html");
        return doc.documentElement.textContent;
    }

    /**
     * Continuously update the badge count in intervals
     *
     * @param {BadgeState} badgeState badge element state.
     * @param {Boolean} immediate if true will update at now, else
     */
    function updateBadgeInIntervals(badgeState, immediate) {
        immediate && updateBadge(badgeState);
        // eslint-disable-next-line no-undef
        var uShellEnabled = window.UNIFIED_SHELL && UNIFIED_SHELL.ENABLED;
        if (!uShellEnabled) {
            badgeState.intervalId = setInterval(function() {
                if (badgeState.badgeEl) {
                    // if badge icon is not present remove it and stop the update
                    if (!document.contains(badgeState.badgeEl)) {
                        badgeState.badgeMenu && badgeState.badgeMenu.remove();
                        stateMap.delete(badgeState.badgeEl);
                        clearInterval(badgeState.intervalId);
                    } else {
                        updateBadge(badgeState, true).fail(function(jqXHR, textStatus) {
                            // avoid further calls in case src not found
                            // this would prevent console logs to flood from 404 error
                            if (jqXHR && jqXHR.status === 404) {
                                clearInterval(badgeState.intervalId);
                            }
                        });
                    }
                }
            }, 2000);
        }
    }

    /**
     * Update the badge count
     *
     * @param {BadgeState} badgeState badge element state.
     * @param {Boolean} resolveWhenNewData if true will only update if new data available
     * @returns {Deferred} deferred object that will get resolved with badge data
     */
    function updateBadge(badgeState, resolveWhenNewData) {
        var el = badgeState.badgeEl;
        return getUserBadgeData(badgeState, resolveWhenNewData).then(function(data) {
            var count = data.total;
            var label = el.dataset.graniteShellBadgeLabelTemplate;

            el.setAttribute("badge", count);
            label && el.setAttribute("aria-label", label.replace("{{count}}", count));
        });
    }

    /**
     * Get the related user badge data
     *
     * @param {BadgeState} badgeState badge element state.
     * @param {Boolean} resolveWhenNewData if true will only update if new data available
     * @returns {Deferred} deferred object that will get resolved with badge data
     */
    function getUserBadgeData(badgeState, resolveWhenNewData) {
        var el = badgeState.badgeEl;
        var user = badgeState.user;
        var src = badgeState.src;

        var lastXhr = xhrMap.get(el);

        var cachedUser = window.sessionStorage.getItem(KEY_USER);
        var timestamp = parseInt(window.sessionStorage.getItem(KEY_TIMESTAMP), 10);
        var stale = cachedUser !== user || isNaN(timestamp) || timestamp + REFRESH_INTERVAL <= Date.now();

        if (!stale || (cachedUser === user && lastXhr && lastXhr.state() === "pending")) {
            if (resolveWhenNewData) {
                return $.Deferred().reject().promise();
            } else {
                var cachedData = window.sessionStorage.getItem(KEY_DATA);
                if (cachedData) {
                    return $.Deferred().resolve(JSON.parse(cachedData)).promise();
                }
            }
        }

        lastXhr = $.ajax({
            url: src,
            cache: false,
            timeout: REFRESH_INTERVAL
        });

        xhrMap.set(el, lastXhr);
        return lastXhr.then(function(data) {
            try {
                if (resolveWhenNewData) {
                    var oldData = JSON.parse(window.sessionStorage.getItem(KEY_DATA));
                    Granite.AsyncUtil.displayPopupNotifications(data, oldData);
                }
                badgeState.dirty = true;
                window.sessionStorage.setItem(KEY_USER, user);
                window.sessionStorage.setItem(KEY_TIMESTAMP, Date.now());
                window.sessionStorage.setItem(KEY_DATA, JSON.stringify(data));
            } catch (e) {
                // eslint-disable-next-line no-console
                console.warn("Notification data could not be stored.", e);
            }

            return data;
        });
    }

    /**
     * Create badge menu based on badge data
     *
     * @param {BadgeData} badgeData all badge information
     * @returns {HTMLElement} shellmenu created menu based on badge information
     */
    function createBadgeMenu(badgeData) {
        var shellmenu = new Coral.Shell.Menu();
        var data = badgeData.data;
        var count = badgeData.total;

        shellmenu.placement = Coral.Overlay.placement.RIGHT;

        shellmenu.classList.add("foundation-toggleable",
            "foundation-layout-util-maxheight80vh",
            "foundation-layout-util-width300",
            "foundation-layout-util-breakword"
        );

        shellmenu.setAttribute("aria-live", "off");
        shellmenu.setAttribute("aria-labelledby", "granite-shell-badge-trigger");

        data && data.forEach(function(badgeItemData) {
            var uniqueId = Coral.commons.getUID();
            var item = $(document.createElement("div"))
                .addClass("granite-shell-badge-item");
            var a = $(document.createElement("a"))
                .addClass("granite-shell-badge-item-link")
                .attr("href", badgeItemData.detailsUrl);

            item.context.style.backgroundImage = "url(" + badgeItemData.backgroundImageUrl + ")";
            item.context.style.backgroundSize = "36px 36px";
            item.context.style.backgroundRepeat = "no-repeat";
            item.context.style.backgroundPosition = "0px 4px";

            if (badgeItemData.title) {
                var titleSpan = $(document.createElement("span"))
                    .attr("id", "title_" + uniqueId)
                    .addClass("granite-shell-badge-item-title")
                    .html(badgeItemData.title); // badgeItemData.title is already XSS checked in the server
                titleSpan.appendTo(item);
                a.attr("aria-labelledby", "title_" + uniqueId);
            }

            if (badgeItemData.description) {
                var descriptionSpan = $(document.createElement("span"))
                    .attr("id", "description_" + uniqueId)
                    .addClass("granite-shell-badge-item-description")
                    .text(htmlDecode(badgeItemData.description));
                descriptionSpan.appendTo(item);
                a.attr("aria-describedby", "description_" + uniqueId);
            }

            a.appendTo(item);
            item.appendTo(shellmenu);
        });

        $(document.createElement("div"))
            .addClass("granite-shell-badge-item-inbox")
            .appendTo(shellmenu)
            .append($(document.createElement("a"))
                .text(Granite.I18n.get("View All ({0} New)", count, "link to notification inbox"))
                .addClass("granite-shell-badge-console granite-shell-badge-item-link"))
            .attr("aria-label", Granite.I18n.get("View All ({0} New)", count, "link to notification inbox"));

        return shellmenu;
    }

    /*
     *  handles the click logic when bell icon is clicked
     */
    $(document).on("click", ".granite-shell-badge", function(event) {
        event.preventDefault();

        var badgeState = stateMap.get(this);
        var el = badgeState.badgeEl;
        var src = badgeState.src;
        var user = badgeState.user;

        if (!src || !user) {
            return;
        }

        var consoleURL = URITemplate.expand(el.dataset.graniteShellBadgeConsole, {
            ref: window.location.href
        });

        getUserBadgeData(badgeState).then(function(badgeData) {
            var badgeMenu = badgeState.badgeMenu;
            var $badgeMenu;

            if (badgeData.total === "0") {
                window.location = consoleURL;
                return;
            }

            if (!badgeMenu) {
                badgeMenu = createBadgeMenu(badgeData);
                $badgeMenu = $(badgeMenu);
                $badgeMenu.find(".granite-shell-badge-console").attr("href", consoleURL);
                $badgeMenu.appendTo(document.body);
                $badgeMenu.on("foundation-toggleable-hide", function() {
                    $badgeMenu.detach();
                });

                badgeState.dirty = false;

                requestAnimationFrame(function() {
                    $badgeMenu.adaptTo("foundation-toggleable").show(el);
                });
                badgeState.badgeMenu = badgeMenu;
                return;
            }

            $badgeMenu = $(badgeMenu);

            var toggleableAPI = $badgeMenu.adaptTo("foundation-toggleable");

            if (toggleableAPI.isOpen()) {
                toggleableAPI.hide();
            } else {
                badgeMenu = !badgeState.dirty ? badgeState.badgeMenu
                    : badgeState.badgeMenu = createBadgeMenu(badgeData);
                $badgeMenu = $(badgeMenu);
                badgeState.dirty = false;

                $badgeMenu.find(".granite-shell-badge-console").attr("href", consoleURL);
                $badgeMenu.appendTo(document.body);

                requestAnimationFrame(function() {
                    $badgeMenu.adaptTo("foundation-toggleable").show(el);
                });
            }
        }, function() {
            window.location = consoleURL;
        });
    });

    /*
     * Attach a function to repeatedly update badge count
     */
    $(document).on("foundation-contentloaded", function(event) {
        var target = event.target;
        target.querySelectorAll(".granite-shell-badge").forEach(function(el) {
            var src = el.dataset.graniteShellBadgeSrc;

            if (!src || stateMap.has(el)) {
                return;
            }
            var badgeState = createBadgeState({
                badgeEl: el,
                src: src,
                user: el.dataset.graniteShellBadgeUser
            });
            stateMap.set(el, badgeState);
            updateBadgeInIntervals(badgeState, true);
        });
    });
})(window, document, Granite.$, Granite.URITemplate, Granite, Coral);

/*************************************************************************
* ADOBE CONFIDENTIAL
* ___________________
*
* Copyright 2015 Adobe
* All Rights Reserved.
*
* NOTICE: All information contained herein is, and remains
* the property of Adobe and its suppliers, if any. The intellectual
* and technical concepts contained herein are proprietary to Adobe
* and its suppliers and are protected by all applicable intellectual
* property laws, including trade secret and copyright laws.
* Dissemination of this information or reproduction of this material
* is strictly forbidden unless prior written permission is obtained
* from Adobe.
**************************************************************************/
(function(window, document, $, Coral) {
    "use strict";

    // This is code to adapt Coral.Shell component to foundation-toggleable
    // i.e. `$(coralEl).adaptTo("foundation-toggleable")`

    var registry = $(window).adaptTo("foundation-registry");

    registry.register("foundation.adapters", {
        type: "foundation-toggleable",
        selector: "coral-shell-menu.foundation-toggleable",
        adapter: function(el) {
            var menu = $(el);

            // We have to prevent the OOTB menu target click handling to avoid a clash with our own target click
            // handling
            menu.data("foundation-toggleable.internal.preventTargetClickHandling", true);

            menu.on("coral-overlay:open", function(e) {
                if (e.target !== el) {
                    return;
                }
                var targetElement = Coral.Overlay._getTarget(el);

                if (targetElement) {
                    targetElement.open = true;
                }

                menu.trigger("foundation-toggleable-show");
            });

            menu.on("coral-overlay:close", function(e) {
                if (e.target !== el) {
                    return;
                }
                var targetElement = Coral.Overlay._getTarget(el);

                if (targetElement) {
                    targetElement.open = false;
                }
                menu.trigger("foundation-toggleable-hide");
            });

            return {
                isOpen: function() {
                    return el.open;
                },

                show: function(anchor) {
                    if (!(anchor instanceof Element)) {
                        return;
                    }

                    el.target = anchor;
                    el.show();
                },

                hide: function() {
                    el.hide();
                }
            };
        }
    });

    var originalHandleGlobalClick = Coral.Shell.Menu.prototype._handleGlobalClick;

    Coral.Shell.Menu.prototype._handleGlobalClick = function(e) {
        if ($(this).data("foundation-toggleable.internal.preventTargetClickHandling")) {
            var targetEl = this.target;

            if (targetEl && (targetEl === e.target || targetEl.contains(e.target))) {
                return;
            }
        }

        return originalHandleGlobalClick.apply(this, arguments);
    };
})(window, document, Granite.$, window.Coral);

/*************************************************************************
* ADOBE CONFIDENTIAL
* ___________________
*
* Copyright 2015 Adobe
* All Rights Reserved.
*
* NOTICE: All information contained herein is, and remains
* the property of Adobe and its suppliers, if any. The intellectual
* and technical concepts contained herein are proprietary to Adobe
* and its suppliers and are protected by all applicable intellectual
* property laws, including trade secret and copyright laws.
* Dissemination of this information or reproduction of this material
* is strictly forbidden unless prior written permission is obtained
* from Adobe.
**************************************************************************/
(function(window, document, $) {
    "use strict";

    function handleActionBar(result) {
        var center = result.filter("#granite-shell-search-result-actionbar-center");
        var right = result.filter("#granite-shell-search-result-actionbar-right");

        var actionBar = $("#granite-shell-actionbar");
        var prevCenter = actionBar.children("betty-titlebar-title");
        var prevRight = actionBar.children("betty-titlebar-secondary");

        if (center.length) {
            prevCenter.prop("hidden", true).after(center);
            prevRight.prop("hidden", true).after(right);
        }

        actionBar.trigger("foundation-contentloaded");

        return {
            clean: function() {
                prevCenter.prop("hidden", false);
                center.remove();

                prevRight.prop("hidden", false);
                right.remove();
            },
            replace: function(result) {
                center = result.filter("#granite-shell-search-result-actionbar-center").replaceAll(center);
                right = result.filter("#granite-shell-search-result-actionbar-right").replaceAll(right);
                actionBar.trigger("foundation-contentloaded");
            }
        };
    }

    function handleSelectionBar(result) {
        var bar = result.filter("#granite-shell-search-result-selectionbar");

        bar
            .appendTo(document.body)
            .trigger("foundation-contentloaded");

        return {
            clean: function() {
                bar.remove();
            },
            replace: function(result) {
                bar = result.filter("#granite-shell-search-result-selectionbar")
                    .replaceAll(bar)
                    .trigger("foundation-contentloaded");
            }
        };
    }

    function handleContent(result) {
        var content = result.filter("#granite-shell-search-result-content");

        var prevContent = $("#granite-shell-content .foundation-layout-panel-content").prop("hidden", true);

        content
            .insertAfter(prevContent)
            .trigger("foundation-contentloaded");

        return {
            clean: function() {
                content.remove();
                prevContent.prop("hidden", false);
            },
            replace: function(result) {
                content = result.filter("#granite-shell-search-result-content")
                    .replaceAll(content)
                    .trigger("foundation-contentloaded");
            }
        };
    }

    function close() {
        var $document = $(document);

        var stack = $document.data("granite-shell-search.internal.stack");
        if (stack) {
            Granite.UI.Foundation.Utils.everyReverse(stack, function(v) {
                v.clean();
                return true;
            });
        }

        $document.removeData("granite-shell-search.internal.stack");
    }

    $(window).adaptTo("foundation-registry").register("foundation.form.response.ui.success", {
        name: "granite.shell.search.result",
        handler: function(form, config, data, textStatus, xhr, parsedResponse) {
            var parser = $(window).adaptTo("foundation-util-htmlparser");

            parser.parse(parsedResponse).then(function(fragment) {
                var el = $(fragment).children();

                var $document = $(document);

                var stack = $document.data("granite-shell-search.internal.stack");

                if (stack) {
                    stack.forEach(function(v) {
                        v.replace(el);
                    });
                } else {
                    stack = [];
                    stack.push(handleActionBar(el));
                    stack.push(handleSelectionBar(el));
                    stack.push(handleContent(el));

                    $document.data("granite-shell-search.internal.stack", stack);
                }
            });
        }
    });

    $(document).on("click", ".granite-shell-search-result-close", function(e) {
        e.preventDefault();
        close();
    });

    $(document).on("foundation-toggleable-hide", ".foundation-layout-panel-rail-panel", function(e) {
        if ($(this).has(".granite-shell-search-form").length === 0) {
            return;
        }

        close();
    });
})(window, document, Granite.$);

/*************************************************************************
* ADOBE CONFIDENTIAL
* ___________________
*
* Copyright 2016 Adobe
* All Rights Reserved.
*
* NOTICE: All information contained herein is, and remains
* the property of Adobe and its suppliers, if any. The intellectual
* and technical concepts contained herein are proprietary to Adobe
* and its suppliers and are protected by all applicable intellectual
* property laws, including trade secret and copyright laws.
* Dissemination of this information or reproduction of this material
* is strictly forbidden unless prior written permission is obtained
* from Adobe.
**************************************************************************/
(function(document, Coral, $) {
    "use strict";

    var overlay;
    var wizardview;
    var highlight;
    var $highlight;
    var popover;
    var $popover;
    var timeoutInt;
    var hasCoachMark = !!Coral.CoachMark;
    var returnFocusToElement;

    var BLACKLIST = [ "template", "script", "style", "meta", "link" ];

    function isHideable(el) {
        return el.nodeType === 1 && BLACKLIST.indexOf(el.tagName.toLowerCase()) === -1;
    }

    function siblings(container, element, callback) {
        [].forEach.call(container.children, function(node) {
            if (element !== node && isHideable(node)) {
                callback(node);
            }
        });
    }

    function setAriaHidden(showingModal, node) {
        if (!node) {
            return;
        }

        var attribute = "aria-hidden";

        if (showingModal) {
            if (node.dataset.cachedAriaHidden === undefined) {
                node.dataset.cachedAriaHidden = node.getAttribute(attribute) || "";
            }
            node.setAttribute(attribute, "true");
        } else {
            var cachedAriaHidden = node.dataset.cachedAriaHidden;
            delete node.dataset.cachedAriaHidden;
            if (cachedAriaHidden === "" || cachedAriaHidden === undefined) {
                node.removeAttribute(attribute);
            } else {
                node.setAttribute(attribute, cachedAriaHidden);
            }
        }
    }

    function hideSiblings(container, element) {
        siblings(
            container,
            element,
            function(node) {
                setAriaHidden(true, node);
            }
        );
    }

    function showSiblings(container, element) {
        siblings(
            container,
            element,
            function(node) {
                setAriaHidden(false, node);
            }
        );
    }

    /**
     * Set aria-hidden on every immediate child except the one passed, which should not be hidden.
     * @param {Element} element - Element to behave as modal.
     */
    function hideSiblingsRecursively(element) {
        var container = element.parentNode;
        while (element !== document.body && !!container) {
            hideSiblings(container, element);
            element = container;
            container = element.parentNode;
        }
    }

    /**
     * Show or restore the aria-hidden state of every child of body.
     * @param {Element} element - Element to no longer behave as modal.
     */
    function showSiblingsRecursively(element) {
        var container = element.parentNode;
        while (element !== document.body && !!container) {
            showSiblings(container, element);
            element = container;
            container = element.parentNode;
        }
    }

    var findStepTarget = function() {
        var panelStacks = wizardview.panelStacks.getAll();
        var stepLists = wizardview.stepLists.getAll();
        var step = panelStacks[0].selectedItem;
        var targetEl = document.querySelector(step.dataset.graniteShellOnboardingStepTarget);
        var stepItem = stepLists[0].selectedItem;
        if (popover) {
            // make dialog labelledby by the panel title
            var panelTitle = step.querySelector(".granite-shell-onboarding-panel-title");
            if (panelTitle) {
                popover.setAttribute("aria-labelledby", panelTitle.id);
            } else {
                popover.removeAttribute("aria-labelledby");
            }
            // make dialog described by the panel description
            var panelDesc = step.querySelector(".granite-shell-onboarding-panel-desc");
            if (panelDesc) {
                popover.setAttribute("aria-describedby", panelDesc.id);
            } else {
                popover.removeAttribute("aria-describedby");
            }

            stepLists[0].items.getAll().forEach(function(item) {
                var link = item.querySelector("[handle=\"link\"]");
                var a11yLabel = item.querySelector("[handle=\"accessibilityLabel\"]");
                var marker = item.querySelector("[handle=\"stepMarkerContainer\"]");

                // if the item is labelled
                if (item.hasAttribute("labelled") || item.hasAttribute("labelledby")) {
                    // Make sure that step link is labelled by its accessibility label,
                    // and the marker which will have an aria-label
                    a11yLabel.id = a11yLabel.id || item.id + "-accessibilityLabel";
                    marker.id = marker.id || item.id + "-stepMarkerContainer";

                    // Setting aria-labelledby on the link forces a screen reader to announce the link as one entity,
                    // rather than splitting the link text into separate announcement of the accessibility state label,
                    // and the Step marker img label.
                    link.setAttribute("aria-labelledby", [ a11yLabel.id, marker.id ].join(" "));

                    // The list item itself need not be labelled,
                    // removing these attributes helps prevent redundant announcement.
                    item.removeAttribute("aria-label");
                    item.removeAttribute("aria-labelledby");
                }

                // links other than the selected step should have aria-live="off",
                // and should not include aria-describedby.
                link.removeAttribute("aria-describedby");
                link.setAttribute("aria-live", "off");
                link.setAttribute("aria-atomic", "true");
                link.setAttribute("aria-relevant", "additions");


                // move any title attribute from the step list item to the link
                if (item.hasAttribute("title")) {
                    link.setAttribute("title", item.getAttribute("title"));
                    item.removeAttribute("title");
                }

                // remove any aria-describedby attribute from the step list item
                if (item.hasAttribute("describedby")) {
                    item.removeAttribute("aria-describedby");
                }
            });

            // for the current step,
            if (stepItem) {
                if (timeoutInt) {
                    window.clearTimeout(timeoutInt);
                }

                // Wait a frame to force focus on step list item link
                Coral.commons.nextFrame(function() {
                    var link = stepItem.querySelector("[handle=\"link\"]");
                    if (link !== document.activeElement && popover !== document.activeElement) {
                        link.setAttribute("aria-live", "off");
                        if (panelDesc) {
                            link.setAttribute("aria-describedby", panelDesc.id);
                        }
                        link.focus();
                    } else {
                        // Wait 20ms to before setting aria-live="assertive" and aria-describedby attribute,
                        // which should force announcement of the panel description content for the current panel.
                        timeoutInt = window.setTimeout(function() {
                            link.setAttribute("aria-live", "assertive");
                            if (panelDesc) {
                                link.setAttribute("aria-describedby", panelDesc.id);
                            }
                        }, 20);
                    }
                });
            }
        }

        if (targetEl) {
            if (hasCoachMark) {
                highlight.hidden = false;
                highlight.target = targetEl;
            } else {
                // we need to remove the border
                var dim = $(targetEl).outerWidth() - 2;

                // we match the width of the target to cover it completely
                $highlight
                    .width(dim)
                    .removeClass("is-hidden");

                // we need to wait for the width to be committed
                setTimeout(function() {
                    $highlight.position({
                        my: "left top",
                        at: "left top",
                        of: targetEl,
                        collision: "none"
                    });
                }, 100);
            }

            $popover.position({
                my: "left top",
                at: "right+15 top",
                of: targetEl,
                collision: "flipfit"
            });
        } else {
            // in case a valid target was not specified, we need to center the wizard and hide the highlight
            if (hasCoachMark) {
                highlight.hidden = true;
            } else {
                $highlight.addClass("is-hidden");
            }

            $popover.position({
                my: "center",
                at: "center",
                of: window,
                collision: "none"
            });
        }
    };

    var saveOpenAgainState = function(openAgain) {
        var prefName = overlay.dataset.graniteShellOnboardingPrefname;

        var prefAPI = $(window).adaptTo("foundation-preference");
        prefAPI.set(prefName, openAgain);
    };

    var closeOnBoarding = function(forceDismiss) {
        // if the user set the preference, we indicate that it should never be loaded again
        if (forceDismiss || overlay.querySelector(".granite-shell-onboarding-checkbox").hasAttribute("checked")) {
            saveOpenAgainState(false);
        }

        if (overlay) {
            overlay.removeAttribute("open");
            overlay.off("coral-wizardview:change", findStepTarget);

            // remove or restore aria-hidden from siblings of the overlay.
            showSiblingsRecursively(overlay);
        }

        if (highlight) {
            $highlight.remove();
        }

        if (popover) {
            popover.removeAttribute("aria-describedby");
            popover.removeAttribute("aria-labelledby");
        }

        if (returnFocusToElement) {
            returnFocusToElement.focus();
        }

        $(window).off("resize", findStepTarget);

        overlay = highlight = wizardview = $highlight = popover = $popover = returnFocusToElement = null;
    };

    var closeIfOverlay = function(event) {
        if (event.target === overlay) {
            closeOnBoarding();
        }
    };

    var openOnBoarding = function() {
        var triggerElement = document.querySelector(".granite-shell-onboarding-src");

        if (!triggerElement) {
            return;
        }

        var url = triggerElement.dataset.graniteShellOnboardingSrc;
        if (!url) {
            return;
        }

        $.ajax({
            url: url,
            cache: false
        }).then(function(html) {
            var parser = $(window).adaptTo("foundation-util-htmlparser");

            parser.parse(html).then(function(fragment) {
                var $el = $(fragment).children();
                var checkBoxShowNotAgain;

                $("body")
                    .append($el)
                    .trigger("foundation-contentloaded");

                overlay = $el[0];
                overlay.setAttribute("trapFocus", "on");
                overlay.setAttribute("open", "");

                // TODO: This is a workaround for a jQuery-CoralUI Bug in Chrome only.
                // Set here the selected attribute per default back
                overlay
                    .querySelector(".granite-shell-onboarding-panelstack > coral-panel:first-child")
                    .setAttribute("selected", "");

                wizardview = overlay.querySelector("coral-wizardview");

                checkBoxShowNotAgain = overlay.querySelector(".granite-shell-onboarding-checkbox");
                $(checkBoxShowNotAgain).on("change", function() {
                    saveOpenAgainState(!this.checked);
                });

                popover = overlay.querySelector(".granite-shell-onboarding-popover");
                $popover = $(popover);

                if (hasCoachMark) {
                    highlight = document.createElement("coral-coachmark");
                    highlight.setAttribute("variant", "light");
                } else {
                    highlight = document.createElement("div");
                    highlight.className = "granite-shell-onboarding-highlight";
                }
                $highlight = $(highlight);

                // the highlight need to be in the body to be able position itself correctly
                document.body.appendChild(highlight);

                // force popover to behave as a modal, by hiding siblings using aria-hidden.
                hideSiblingsRecursively(overlay);

                // when the component is ready, we need to set the initial state
                Coral.commons.ready(overlay, function() {
                    // makes sure the highlight is positioned correctly when the page is resized
                    $(window).on("resize", findStepTarget);

                    var zIndex = hasCoachMark ? $(overlay).css("zIndex") + 1 : $(overlay).css("zIndex") - 1;
                    $highlight.css("zIndex", zIndex);

                    overlay.on("coral-wizardview:change", findStepTarget);
                    overlay.on("click", ".granite-shell-onboarding-done", function() {
                        closeOnBoarding(true);
                    });
                    overlay.on("click", "[coral-close]", function(event) {
                        closeOnBoarding();
                    });
                    overlay.on("click", closeIfOverlay);
                    overlay.on("coral-overlay:close", closeIfOverlay);

                    findStepTarget();
                    // to force focus on to the popover instead of checkbox
                    Coral.commons.nextFrame(function() {
                        if (popover) {
                            popover.focus();
                        }
                    });
                });
            });
        });
    };

    $(function() {
        var prefAPI = $(window).adaptTo("foundation-preference");
        if (prefAPI.getBoolean("granite.shell.showonboarding620", true)) {
            openOnBoarding();
        }
    });

    // Open the help dialogs immediately from the coral-shell-help menu
    $(document).on("click", ".granite-shell-onboarding-trigger", function(event) {
        event.preventDefault();
        openOnBoarding();
        var parentToggleable = event.target.closest(".foundation-toggleable");
        if (parentToggleable) {
            returnFocusToElement = parentToggleable.elementToFocusWhenHidden || parentToggleable.returnFocusToElement;
        }
    });
})(document, Coral, Granite.$);

/*************************************************************************
* ADOBE CONFIDENTIAL
* ___________________
*
* Copyright 2017 Adobe
* All Rights Reserved.
*
* NOTICE: All information contained herein is, and remains
* the property of Adobe and its suppliers, if any. The intellectual
* and technical concepts contained herein are proprietary to Adobe
* and its suppliers and are protected by all applicable intellectual
* property laws, including trade secret and copyright laws.
* Dissemination of this information or reproduction of this material
* is strictly forbidden unless prior written permission is obtained
* from Adobe.
**************************************************************************/
(function(document, $) {
    "use strict";

    $(document).on("foundation-mode-change", function(e, mode, group) {
        var header = document.querySelector(".granite-shell-header");

        if (header) {
            var headerGroup = header.dataset.graniteShellHeaderModeGroup;
            if (headerGroup === group) {
                if (mode === "selection") {
                    header.style.visibility = "hidden";
                } else {
                    header.style.visibility = "";
                }
            }
        }
    });
    var viewSettingsToggleButton = $("#granite-collection-switcher-toggle-button");
    $(document).ready(function() {
        if (localStorage.getItem("focus-to-view-settings") === "true") {
            viewSettingsToggleButton.focus();
            localStorage.removeItem("focus-to-view-settings");
        }
    });
})(document, Granite.$);

/*************************************************************************
* ADOBE CONFIDENTIAL
* ___________________
*
* Copyright 2016 Adobe
* All Rights Reserved.
*
* NOTICE: All information contained herein is, and remains
* the property of Adobe and its suppliers, if any. The intellectual
* and technical concepts contained herein are proprietary to Adobe
* and its suppliers and are protected by all applicable intellectual
* property laws, including trade secret and copyright laws.
* Dissemination of this information or reproduction of this material
* is strictly forbidden unless prior written permission is obtained
* from Adobe.
**************************************************************************/
(function(document, $, URITemplate) {
    "use strict";

    var KEY_XHR = "granite-shell-help.internal.lastXhr";

    var decodeEntities = function(str) {
        var div = document.createElement("div");
        div.innerHTML = str;
        return div.textContent;
    };

    $(document).on("coral-shell-help:search", ".granite-shell-help", function(event) {
        var help = this;
        var $help = $(this);

        // Get the search term from the original event detail
        var searchTerm = event.originalEvent.detail.value;

        var lastXhr = $help.data(KEY_XHR);

        if (lastXhr && lastXhr.readyState !== 4) {
            lastXhr.abort();
        }

        var helpEndpointURL = URITemplate.expand(help.dataset.graniteShellHelpEndpoint, {
            q: searchTerm
        });

        var xhr = $.ajax(helpEndpointURL, {
            dataType: "jsonp",
            timeout: 10000
        });

        $help.data(KEY_XHR, xhr);

        xhr.then(
            function(response) {
                var results = response.results;
                // Populate results
                var resultItems = results.map(function(result) {
                    return {
                        tags: decodeEntities(result.t0).split(/,\s*/),
                        title: decodeEntities(result.title),
                        href: result.href,
                        target: "_blank"
                    };
                });

                // Show total
                var total = parseInt(response.resultcount.total, 10);

                var helpSiteURL = URITemplate.expand(help.dataset.graniteShellHelpSite, {
                    q: searchTerm
                });

                help.showResults(resultItems, total, helpSiteURL);
            },
            function(jqXHR, textStatus) {
                help.showError();
            }
        );
    });

    var shortcutsDialogMap = new WeakMap();

    $(document).on("change", ".granite-shortcuts-dialog-enable-switch", function(e) {
        var dialogSwitch = this;
        var dialog = $(dialogSwitch).closest(".granite-shortcuts-dialog");
        var pref = $(window).adaptTo("foundation-preference");
        pref.set("shortcutsEnabled", dialogSwitch.checked);
        dialog.find(".granite-shortcuts-dialog-enable-alert").prop("hidden", dialogSwitch.checked);

        if (!shortcutsDialogMap.has(dialogSwitch)) {
            // Save dialogSwitch with initial state
            shortcutsDialogMap.set(dialogSwitch, !dialogSwitch.checked);

            // When shortcuts dialog is closed and there is a change to the initial state,
            // we have to reload to have all in sync
            dialog.on("coral-overlay:close", function() {
                if (shortcutsDialogMap.get(dialogSwitch) !== dialogSwitch.hasAttribute("checked")) {
                    window.location.reload();
                }
            });
        }
    });
})(document, Granite.$, Granite.URITemplate);

/*************************************************************************
* ADOBE CONFIDENTIAL
* ___________________
*
* Copyright 2015 Adobe
* All Rights Reserved.
*
* NOTICE: All information contained herein is, and remains
* the property of Adobe and its suppliers, if any. The intellectual
* and technical concepts contained herein are proprietary to Adobe
* and its suppliers and are protected by all applicable intellectual
* property laws, including trade secret and copyright laws.
* Dissemination of this information or reproduction of this material
* is strictly forbidden unless prior written permission is obtained
* from Adobe.
**************************************************************************/
(function(document, $) {
    "use strict";

    /**
     * Used to track the event performed by user.
     * This function tracks interactions with collectionpage tree
     * OMEGA Implementation
     *
     * @param {HTMLElement} el element which has been interacted
     * @param {Event} event that needs to be tracked
     * @param {String} trackAction action performed on element
     */
    function trackEvent(el, event, trackAction) {
        var trackData = {
            element: event.detail && event.detail._id || "No element defined",
            type: "tree-item",
            action: trackAction,
            widget: {
                name: "content tree",
                type: "tree"
            },
            feature: "aem:collectionpage",
            attributes: {}
        };

        $(window).adaptTo("foundation-tracker").trackEvent(trackData);
    }

    function updateTreeChildren(treeEl, collectionId) {
        var rootId = treeEl.getAttribute("root-id");

        if (collectionId.startsWith(rootId)) {
            var childPath = collectionId.replace(rootId, "");
            var childPaths = childPath.split("/");
            var filteredPaths = childPaths.filter(function(path) {
                return path;
            });

            var childrens = [];
            var tempRootId = rootId;
            filteredPaths.forEach(function(path) {
                var currentPath = tempRootId + "/" + path;
                childrens.push({
                    "id": currentPath
                });
                tempRootId = currentPath;
            });

            if (childrens.length === 0) {
                childrens.push({
                    "id": rootId
                });
            }

            treeEl.setAttribute("children", JSON.stringify(childrens));
        }
    }

    $(document).on("foundation-toggleable-show",
        ".shell-collectionpage-rail-panel[data-shell-collectionpage-rail-panel='content-tree']", function(e) {
            var tree = this.querySelector(".shell-collectionpage-tree");
            if (tree.classList.contains("is-lazyLoaded")) {
                tree.classList.remove("is-lazyLoaded");
                tree.init && tree.init();
            }
        });

    $(function() {
        var tree = $(".shell-collectionpage-tree").first();
        var treeEl = tree[0];

        if (!treeEl) {
            return;
        }

        $(document).on("change", "betty-breadcrumbs.granite-collection-navigator", function(e) {
            var collectionId = this.selectedItem.dataset.graniteCollectionNavigatorCollectionid;
            if (collectionId) {
                var treeItemEl = treeEl.findItemById(collectionId);
                if (treeItemEl) {
                    treeItemEl.selected = true;
                } else if (treeEl.classList.contains("is-lazyLoaded")) {
                    updateTreeChildren(treeEl, collectionId);
                }
            }
        });

        $(document).on("foundation-collection-reload", ".foundation-collection", function(e) {
            var target = treeEl.dataset.shellCollectionpageTreeTarget;

            if ($(e.target).is(target)) {
                if (treeEl.classList.contains("is-lazyLoaded")) {
                    updateTreeChildren(treeEl, e.target.dataset.foundationCollectionId);
                } else {
                    treeEl.reload(e.target.dataset.foundationCollectionId);
                }
            }
        });

        $(document).on("foundation-selections-change", ".foundation-collection", function(e) {
            var target = treeEl.dataset.shellCollectionpageTreeTarget;

            if (!$(e.target).is(target)) {
                return;
            }

            var currentId = e.target.dataset.foundationCollectionId;
            // We assume that the change is the current selected branch

            if (treeEl.classList.contains("is-lazyLoaded")) {
                updateTreeChildren(treeEl, currentId);
            } else {
                var treeItemEl = treeEl.findItemById(currentId);
                if (treeItemEl) {
                    tree.one("expand", function(evt) {
                        treeEl._scrollToElement(evt.detail);
                    });
                    if (treeItemEl.selectable) {
                        treeItemEl.selected = true;
                    }
                }
            }
        });

        tree.on("change", function(e) {
            var item = e.detail.selectedItem;
            var collection = $(treeEl.dataset.shellCollectionpageTreeTarget);
            var collectionAPI = collection.adaptTo("foundation-collection");
            if (collectionAPI && item && item.id !== collection[0].dataset.foundationCollectionId) {
                collectionAPI.load(item.id);
            }
        });

        tree.on("expand", function(e) {
            if ($(this).is(":visible")) {
                trackEvent(this, e, "expand");
            }
        });

        tree.on("collapse", function(e) {
            if ($(this).is(":visible")) {
                trackEvent(this, e, "collapse");
            }
        });
    });
})(document, Granite.$);

/*************************************************************************
* ADOBE CONFIDENTIAL
* ___________________
*
* Copyright 2016 Adobe
* All Rights Reserved.
*
* NOTICE: All information contained herein is, and remains
* the property of Adobe and its suppliers, if any. The intellectual
* and technical concepts contained herein are proprietary to Adobe
* and its suppliers and are protected by all applicable intellectual
* property laws, including trade secret and copyright laws.
* Dissemination of this information or reproduction of this material
* is strictly forbidden unless prior written permission is obtained
* from Adobe.
**************************************************************************/
(function(document, $) {
    "use strict";

    var switcherMap = new WeakMap();

    function toggleSettingsAction(show) {
        var switcher = $("#granite-collection-switcher-toggle.granite-collection-switcher");

        if (show) {
            if (switcherMap.has(switcher[0])) {
                switcher.append(switcherMap.get(switcher[0]));
            }
        } else {
            var settingsAction = switcher.find(".granite-collection-switcher-settings");
            if (settingsAction.length) {
                settingsAction.detach();
                switcherMap.set(switcher[0], settingsAction[0]);
            }
        }
    }

    $(function() {
        var view = $(".shell-collectionpage-view").first();

        var cookieConfig = view.data("shellCollectionpageViewCookie");
        var target = view.attr("data-shell-collectionpage-view-target");

        if (!cookieConfig || !target) {
            return;
        }

        var availableSettings = view.data("shellCollectionpageViewSettings") || [];
        var layoutId = view.attr("data-shell-collectionpage-view-layoutId");

        var show = availableSettings.indexOf(layoutId) >= 0;
        toggleSettingsAction(show);

        $(document).on("foundation-layout-perform", function(e) {
            var layout = $(e.target);

            if (!layout.is(target)) {
                return;
            }

            var config = layout.data("foundationLayout");

            view.attr("data-shell-collectionpage-view-layoutId", config.layoutId);

            var show = availableSettings.indexOf(config.layoutId) >= 0;
            toggleSettingsAction(show);

            $.cookie(cookieConfig.name, config.layoutId, cookieConfig);
        });
    });

    $(document).on("foundation-toggleable-beforeshow", function(e) {
        if (!$(e.target).is(".shell-collectionpage-viewsettings")) {
            return;
        }

        var view = $(".shell-collectionpage-view").first();
        var layoutId = view.attr("data-shell-collectionpage-view-layoutId");
        var viewSettingsToggleButton = $("#granite-collection-switcher-toggle-button");
        $(".coral_close").click(function() {
            viewSettingsToggleButton.focus();
        });
        var tablistEl = e.target.querySelector(".shell-collectionpage-viewsettings-tablist");
        tablistEl.items.getAll().find(function(tab) {
            var name = tab.getAttribute("data-shell-collectionpage-viewsettings-name");
            if (name === layoutId) {
                tab.selected = true;
            }
        });
        $(document).on("keyup", function(event) {
            if (event.key === "Escape" && $("#shell-collectionpage-viewsettings-form").length > 0) {
                viewSettingsToggleButton.focus();
            }
        });
        $(document).click(function(event) {
            var $target = $(event.target);
            if ($(!$target.closest("#shell-collectionpage-viewsettings-form").length &&
            ".shell-collectionpage-viewsettings").is(":visible")) {
                viewSettingsToggleButton.focus();
            }
        });
    });
})(document, Granite.$);

/*************************************************************************
 * ADOBE CONFIDENTIAL
 * ___________________
 *
 * Copyright 2021 Adobe
 * All Rights Reserved.
 *
 * NOTICE: All information contained herein is, and remains
 *
 * the property of Adobe and its suppliers, if any. The intellectual
 * and technical concepts contained herein are proprietary to Adobe
 * and its suppliers and are protected by all applicable intellectual
 * property laws, including trade secret and copyright laws.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Adobe.
 **************************************************************************/
(function(window, $, Granite) {
    "use strict";

    $(window).adaptTo("foundation-registry").register("foundation.form.response.ui.success", {
        name: "granite.view-settings.result",
        handler: function(form, config, data, textStatus, xhr) {
            // whenever we saving view settings in user preference(view settings dialog), we reset all
            // cookie same as user preference and reload whole page, we could clear up all cookie directly
            // since the page loading will reload the cookie from user preference
            clearViewSettingsCookie();

            var messenger = $(window).adaptTo("foundation-util-messenger");
            messenger.put(
                null,
                config.message || Granite.I18n.get("The form has been submitted successfully"),
                "success"
            );
            localStorage.setItem("focus-to-view-settings", "true");
            window.location.reload();
        }
    });

    function clearViewSettingsCookie() {
        if (!$(".shell-collectionpage-view") || !$(".shell-collectionpage-view").first()) {
            return;
        }
        var view = $(".shell-collectionpage-view").first();
        if (!view.data("shellCollectionpageViewCookie") || !view.data("shellCollectionpageViewCookie").name) {
            return;
        }
        var consoleId = view.data("shellCollectionpageViewCookie").name;
        var sortBykey = consoleId + "-sortName";
        $.removeCookie(consoleId, { path: "/" });
        $.removeCookie(sortBykey, { path: "/" });
    }
})(window, Granite.$, Granite);

