/*************************************************************************
 * ADOBE CONFIDENTIAL
 * ___________________
 *
 * Copyright 2020 Adobe
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

//have to wait until everything is loaded first
$(document).one('foundation-contentloaded', function () {
    $(document).on('unified-shell-impersonate', function() {
        document.querySelector('#unified-shell-impersonation').show();
    });
    $(document).on('unified-shell-revert-impersonate', function() {
        $('#unified-shell-impersonation').find('[type="submit"]').click()
    });
    $(document).on("submit", "#unified-shell-impersonation", function(e) {
        e.preventDefault();
        const form = $(this);
        $.ajax({
            url: form.attr("action"),
            type: form.attr("method") || "post",
            data: form.serializeArray(),
            async: false,
            error: function() {
                document.getElementById("invalid-impersonation-error").removeAttribute("hidden");
                return;
            },
            success: function() {
                document.getElementById("invalid-impersonation-error").setAttribute("hidden", "true");
                window.location.reload();
            }
        });
    });
});

