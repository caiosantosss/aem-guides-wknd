/*
 *
 * ADOBE CONFIDENTIAL
 * __________________
 *
 * Copyright 2012 Adobe
 * All Rights Reserved.
 *
 * NOTICE: All information contained herein is, and remains
 * the property of Adobe and its suppliers,
 * if any. The intellectual and technical concepts contained
 * herein are proprietary to Adobe and its
 * suppliers and are protected by trade secret or copyright law.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Adobe.
 */
/* eslint camelcase: 0 */
(function(document) {
    "use strict";

    /**
     *  Flush error.
     * @param {String} id - the id of the element
     */
    function flushError(id) {
        var el = document.getElementById(id);
        // Hide the error
        el.hidden = true;
        // clears the text
        el.content.innerHTML = "";
    }

    /**
     * Display error.
     *
     * @param {String} id - the id of the element
     * @param {String} message - Message to display. It accepts HTML.
     */
    function displayError(id, message) {
        // Timeout of 150ms is required for screen reader to notice text changes
        setTimeout(function() {
            var el = document.getElementById(id);
            // Display the error
            el.hidden = false;
            // adds the text inside the coral-Alert-message
            el.content.innerHTML = message;
        }, 150);
    }

    /**
     * Hide error.
     *
     * @param {String} id - the id of the element
     */
    function hideError(id) {
        var el = document.getElementById(id);
        // Hide the error
        el.hidden = true;
        // removes the text inside the coral-Alert-message
        el.content.innerHTML = "";
    }

    /**
     * Clear all password fields.
     */
    function clearPasswords() {
        var elements = document.querySelectorAll("input[type=password]");
        for (var i = 0; i < elements.length; i++) {
            elements[i].value = "";
        }
    }

    /**
     * Show the change password form.
     */
    function showChangeForm() {
        displayError("error", document.getElementById("expired_message").value);

        document.getElementById("sign-in-title").innerHTML = document.getElementById("change_title").value;
        document.getElementById("submit-button").value = document.getElementById("change_submit_text").value;
        clearPasswords();

        document.getElementById("sign-in-title").hidden = false;
        document.getElementById("new_password").hidden = false;
        document.getElementById("confirm_password").hidden = false;
        document.getElementById("back-button").hidden = false;

        // click listener of the "Back" in the change password form; returns to the login form
        document.getElementById("back-button").on("click", function(e) {
            showLoginForm();
            e.preventDefault();
        });

        document.getElementById("password").focus();
    }

    /**
     * Show the login form.
     */
    function showLoginForm() {
        document.getElementById("sign-in-title").innerHTML = document.getElementById("login_title").value;
        document.getElementById("submit-button").value = document.getElementById("login_submit_text").value;
        clearPasswords();

        document.getElementById("new_password").hidden = true;
        document.getElementById("confirm_password").hidden = true;
        document.getElementById("back-button").hidden = true;

        document.getElementById("username").focus();

        flushError("error");
    }

    /**
     * Redirects after successful login or password change.
     */
    function redirect() {
        var u = document.getElementById("resource").value;
        if (window.location.hash && u.indexOf("#") < 0) {
            u = u + window.location.hash;
        }
        document.location = u;
    }

    /**
     * Redirects to IMS handling.
     *
     * @param {String} imsUrl - url for IMS to redirect
     * @param {String} [adobeId] - optional AdobeID for IMS login
     */
    function redirectIMS(imsUrl) {
        if (imsUrl) {
            document.location.replace(imsUrl);
        }
    }

    /**
     * Serialize object to query string
     *
     * @param {Object} obj - Object that will be converted.
     * @returns {String} query string based on the key value data contained in the provided object.
     */
    function toQueryString(obj) {
        var parts = [];
        for (var i in obj) {
            if (obj.hasOwnProperty(i)) {
                parts.push(encodeURIComponent(i) + "=" + encodeURIComponent(obj[i]));
            }
        }
        return parts.join("&");
    }

    // Bind an event listener on login form to make an ajax call
    document.addEventListener("DOMContentLoaded", function(event) {
        // IMS login handler
        var imsSubmitButton = document.getElementById("submit-button-ims");
        if (imsSubmitButton) {
            imsSubmitButton.addEventListener("click", function() {
                var imsMetaTag = document.head.querySelector('meta[name="granite.login.imsLoginUrl"]');
                if (imsMetaTag) {
                    redirectIMS(imsMetaTag.content);
                }
            });
        }

        // Standard login handler
        document.getElementById("login").addEventListener("submit", function(event) {
            hideError("error");
            event.preventDefault();
            var form = this;
            var path = form.action;
            var user = form.j_username.value;
            var pass = form.j_password.value;

            // if no user is given, avoid login request
            //GRANITE-29649 input validation for empty user/password
            if (!user) {
                var messageId = "blank_user";
                if (!pass) {
                    messageId = "blank_user_passwd";
                }
                displayError("error", document.getElementById(messageId).value);
                clearPasswords();
                document.getElementById("username").value = "";
                document.getElementById("username").focus();
                return true;
            }

            var data = {
                _charset_: "utf-8",
                j_username: user,
                j_password: pass,
                j_validate: true
            };

            if (document.getElementById("new_password").hidden === false &&
                document.getElementById("confirm_password").hidden === false) {
                var new_password = document.getElementById("new_password");
                var confirm_password = document.getElementById("confirm_password");
                // change password: check new and confirm passwords
                if (new_password.value.length === 0) {
                    // new password empty: error
                    clearPasswords();
                    new_password.focus();
                    displayError("error", document.getElementById("empty_message").value);
                    return false;
                } else if (new_password.value !== confirm_password.value) {
                    // passwords do not match: error
                    clearPasswords();
                    document.getElementById("password").focus();
                    displayError("error", document.getElementById("not_match_message").value);
                    return false;
                } else {
                    // passwords match: add new password to data
                    data["j_newpassword"] = document.getElementById("new_password").value;
                }
            }

            // Prepare and request the endpoint
            var xhr = new XMLHttpRequest();
            xhr.open("POST", path, false);
            xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8");
            xhr.onload = function() {
                if (xhr.readyState === XMLHttpRequest.DONE) {
                    if (xhr.status === 200) {
                        if (document.getElementById("new_password").hidden &&
                            document.getElementById("confirm_password").hidden) {
                            // login without changing password
                            redirect();
                        } else {
                            // login after changing password: show success dialog
                            var dialog = document.getElementById("success-dialog");

                            dialog.on("coral-overlay:close", function() {
                                redirect();
                            });

                            dialog.show();
                        }
                    } else {
                        var reason = xhr.getResponseHeader("X-Reason-Code");
                        if (reason === "password_expired") {
                            // password expired
                            showChangeForm();
                        } else {
                            // login invalid
                            var messageId = reason === "password_expired_and_new_password_in_history"
                                ? "in_history_message" : "invalid_message";
                            displayError("error", document.getElementById(messageId).value);
                            clearPasswords();
                            document.getElementById("username").focus();
                        }
                    }
                }
            };

            xhr.send(toQueryString(data));

            return true;
        });
    });
    window.onload = function() {
        if (window.location.search.indexOf("j_reason_code=invalid_login") > -1 ||
            window.location.search.indexOf("j_reason=Authentication+Failed&j_reason_code=unknown") > -1) {
            displayError("ims-error", document.getElementById("invalid_ims_message").value);
        }
    };
})(document);

/*
 *
 * ADOBE CONFIDENTIAL
 * __________________
 *
 * Copyright 2012 Adobe
 * All Rights Reserved.
 *
 * NOTICE: All information contained herein is, and remains
 * the property of Adobe and its suppliers,
 * if any. The intellectual and technical concepts contained
 * herein are proprietary to Adobe and its
 * suppliers and are protected by trade secret or copyright law.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Adobe.
 */
jQuery(function($) {
    "use strict";

    /*
     * Methods for changing the background based on a tenant string.
     *
     * AdobePatentID="3254US01"
     *
     * How it works:
     * when the user types the username, a key-up listener validates the input and as soon as the first 'dot' after the
     * 'at' is typed, the tenant string is guessed. After sanitizing the tenant name, it is verified if there is already
     * the background loaded and if not, then a new style sheet based on the tenant's name is loaded. If successful, the
     * style sheet is initialized and a new DIV element with the id <code>"bg_" + tenant</code> is added to the DOM.
     * If the background was already loaded it is ensured that its DIV is at the end of the list.
     *
     * Note: This solution provides an easy way to extend the styling of the background also in respect to media
     * queries. however, due to the nature of how the background is loaded, we don't know when the respective image is
     * loaded and thus it's not possible to provide a fancy transition between the backgrounds.
     *
     * Note: The default background is already included in the style sheet of the clientlib and initialized accordingly.
     */

    // current background object; initialize with default background
    var currentBg = {
        name: "default",
        $el: $("#bg_default")
    };

    // map of all already loaded background
    var backgrounds = {
        "default": currentBg
    };

    // init key listener on username field + input/blur(ie) listener for autocomplete
    $("#username").on("keyup input blur", function(e) {
        var val = $(this).val();
        var i0 = val.indexOf("@");
        if (i0 < 0) {
            setBackground("default");
            return;
        }
        var i1 = val.indexOf(".", i0);
        if (i1 < 0) {
            setBackground("default");
            return;
        }
        var tenant = val.substring(i0 + 1, i1);
        setBackground(tenant);
    });


    /**
     * Switches the background for the given tenant.
     *
     * @param {String} tenant - Name of the tenant used to check for a custom background.
     */
    function setBackground(tenant) {
        // sanitize tenant
        tenant = tenant.replace(/[^a-zA-Z0-9-_]/g, "");

        if (currentBg && currentBg.name === tenant) {
            return;
        }

        // check if already loaded
        var bg = backgrounds[tenant];
        if (!bg) {
            // create new bg object
            bg = backgrounds[tenant] = { name: tenant };

            // try to load bg
            $.ajax({
                url: "login/clientlib/resources/bg/" + tenant + "/bg.css",
                dataType: "text",
                statusCode: {
                    // Prevent Granite 403 response handling
                    403: function() {}
                },
                success: function(data) {
                    // load new style data
                    $("head").append("<style>" + data + "</style>");

                    // create new background element
                    var id = "bg_" + tenant;
                    $("#backgrounds").append("<div class=\"background\" id=\"" + id + "\"></div>");
                    bg.$el = $("#" + id);
                    currentBg = bg;
                },
                error: function() {
                    // console.log("failed to load bg for " + tenant);

                }
            });
        } else {
            if (!bg.$el) {
                // console.log("background for " + tenant + " already loaded but not valid.");
                return;
            }
            // ensure bg is at the end of it's list
            bg.$el.detach();
            $("#backgrounds").append(bg.$el);
            currentBg = bg;
        }
    }

    /**
     * Internally switches to the new background.
     *
     * @param {Object} bg - New background object
     * @private
     */
    // function _switchBackground(bg) {
    //        if (currentBg) {
    //            currentBg.$el.hide();
    //        }
    //        bg.$el.show();
    // currentBg = bg;
    // }
});

