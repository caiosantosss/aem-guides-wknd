/*
  ADOBE CONFIDENTIAL

  Copyright 2018 Adobe Systems Incorporated
  All Rights Reserved.

  NOTICE:  All information contained herein is, and remains
  the property of Adobe Systems Incorporated and its suppliers,
  if any.  The intellectual and technical concepts contained
  herein are proprietary to Adobe Systems Incorporated and its
  suppliers and may be covered by U.S. and Foreign Patents,
  patents in process, and are protected by trade secret or copyright law.
  Dissemination of this information or reproduction of this material
  is strictly forbidden unless prior written permission is obtained
  from Adobe Systems Incorporated.
*/

/* eslint no-console: ["error", { allow: ["error", "warn"] }] */
(function(window, _satellite) {
    "use strict";

    function logError(error) {
        if (window.console) {
            window.console.error(error);
        }
    }

    function isObject(o) {
        return (typeof o === "object") && (o !== null);
    }

    function doNormalize(k) {
        var exceptions = [ "version", "assetId", "url", "referringUrl", "start", "end", "term" ];
        return !exceptions.includes(k);
    }

    function traverse(obj, fn) {
        for (var key in obj) {
            fn.apply(this, [ obj, key, obj[key] ]);
            if (isObject(obj[key])) {
                traverse(obj[key], fn);
            }
        }
    }

    function normalize(obj) {
        traverse(obj, function(o, key, val) {
            if (isObject(o)) {
                o[key] = doNormalize(key) ? normalizeString(val) : val;
            }
        });
    }

    /**
     * Normalize values of type 'string'.
     */
    function normalizeString(value) {
        if (typeof value !== "string" ||
                value === "") {
            return value;
        }

        var normalized = value;
        // no punctuation except [,:]
        normalized = normalized.replace(/['"!#$%&\\()*+\-./;<=>?@[\]^_`{|}~]/g, " ");
        // collapse spaces
        normalized = normalized.replace(/\s{2,}/g, " ");
        // no trailing spaces
        normalized = normalized.replace(/^\s+|\s+$/g, "");
        // all lower case
        normalized = normalized.toLowerCase();

        return normalized;
    }

    function isSatelliteLoaded() {
        return (window.hasOwnProperty("_satellite") &&
                    typeof window._satellite.track === "function");
    }

    function waitForSatellite(callback) {
        if (isSatelliteLoaded()) {
            callback();
        } else {
            setTimeout(waitForSatellite, 100, callback);
        }
    }

    window.Granite = window.Granite || {};
    window.Granite.Tracking = window.Granite.Tracking || {};

    window.Granite.Tracking.Tracker = {
        trackPage: function(data) {
            try {
                var page = window.digitalData.page;

                normalize(data);

                Object.keys(data).forEach(function(key) {
                    page[key] = data[key];
                });

                waitForSatellite(function() {
                    window._satellite.track("page");
                });
            } catch (error) {
                logError(error);
            }
        },

        trackEvent: function(data) {
            try {
                if (window.digitalData.event instanceof Array === false) {
                    window.digitalData.event = [];
                }

                normalize(data);

                window.digitalData.event.push(data);

                waitForSatellite(function() {
                    window._satellite.track("event");
                });
            } catch (error) {
                logError(error);
            }
        }
    };
})(window, window._satellite);
