/*
 * ADOBE CONFIDENTIAL
 *
 * Copyright 2020 Adobe Systems Incorporated
 * All Rights Reserved.
 *
 * NOTICE:  All information contained herein is, and remains
 * the property of Adobe Systems Incorporated and its suppliers,
 * if any.  The intellectual and technical concepts contained
 * herein are proprietary to Adobe Systems Incorporated and its
 * suppliers and may be covered by U.S. and Foreign Patents,
 * patents in process, and are protected by trade secret or copyright law.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Adobe Systems Incorporated.
 */
(function(window, $, Granite) {
    "use strict";

    var ui = $(window).adaptTo("foundation-ui");

    window.Granite = window.Granite || {};
    Granite.AsyncUtil = Granite.AsyncUtil || {};

    // To display popup notifications on completion of async jobs
    Granite.AsyncUtil.displayPopupNotifications = function(data, oldData) {
        var index = oldData ? (parseInt(data.total) - parseInt(oldData.total)) : data.data.length;
        while (--index >= 0) {
            var notification = data.data[index];
            if (notification.showPopupNotification) {
                var dialogType = "default";
                if (notification.jobStatus === "success") {
                    dialogType = "success";
                } else if (notification.jobStatus === "failure") {
                    dialogType = "error";
                } else if (notification.jobStatus === "cancelled") {
                    dialogType = "notice";
                }
                ui.prompt(notification.title, notification.description, dialogType, [{
                    text: Granite.I18n.get("Cancel")
                }, {
                    text: Granite.I18n.get("Go to Job Details"),
                    primary: true,
                    handler: function() {
                        window.location.href = notification.detailsUrl;
                    }
                }]);
            }
        }
    }
})(window, Granite.$, Granite);
