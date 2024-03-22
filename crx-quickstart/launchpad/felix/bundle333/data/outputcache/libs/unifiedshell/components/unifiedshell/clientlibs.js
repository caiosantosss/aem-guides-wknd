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
window.UNIFIED_SHELL = window.UNIFIED_SHELL || {};
window.UNIFIED_SHELL_CONTEXT = window.UNIFIED_SHELL_CONTEXT || {};
window.UNIFIED_SHELL_CONTEXT.excludePatterns = window.UNIFIED_SHELL_CONTEXT.excludePatterns || [];
window.UNIFIED_SHELL_CONTEXT.repositoryId = window.UNIFIED_SHELL_CONTEXT.repositoryId || document.location.host.replace(/:[0-9]+/, '');

// handle ?debugUnifiedShellEnabled and localStorage key DEBUG_UNIFIED_SHELL_ENABLED
//   after init of window.UNIFIED_SHELL_CONTEXT and
//   before any other usage of window.UNIFIED_SHELL_ENABLED
// then handle temporary disabling of unified shell via localStorage key unifiedShellOfflineUntil
if (window.localStorage) {
	// evaluation of this query param to update localStorage must occur immediately after init of window.UNIFIED_SHELL_CONTEXT
	if (window.location.search.indexOf('debugUnifiedShellEnabled') >= 0) {
		const url = new URL(window.location.href);
		window.localStorage.setItem("DEBUG_UNIFIED_SHELL_ENABLED", url.searchParams.get('debugUnifiedShellEnabled'));
	}
	// evaluation of this localStorage setting must occur after eval of query param, and before any other usage of window.UNIFIED_SHELL_ENABLED.
	if (window.localStorage.getItem("DEBUG_UNIFIED_SHELL_ENABLED") === 'true') {
		console.log(`[unified-shell-init.js] overriding window.UNIFIED_SHELL_ENABLED=${window.UNIFIED_SHELL_ENABLED} to true, according to browser preference.`);
		console.log(`[unified-shell-init.js] navigate to this page with ?debugUnifiedShellEnabled=false to unset your browser override preference.`);
		window.UNIFIED_SHELL_ENABLED = true;
	}
	// this setting is used by Unified Shell to temporarily disable unified shell in this browser for a period of time
	// after detecting a degraded experience.
	const untilValue = window.localStorage.getItem("unifiedShellOfflineUntil");
	if (untilValue !== null) {
		const untilEpoch = !Number.isNaN(untilValue) ? parseInt(untilValue, 10) : 0;
		if (untilEpoch > Date.now()) {
			console.log(`[unified-shell-init.js] overriding window.UNIFIED_SHELL_ENABLED=${window.UNIFIED_SHELL_ENABLED} to false, due to unifiedShellOfflineUntil=${untilValue} (${new Date(untilEpoch).toString()}).`);
			window.UNIFIED_SHELL_ENABLED = false;
		}
	}
}

//store unified shell flag
window.UNIFIED_SHELL.ENABLED = window.UNIFIED_SHELL_ENABLED;
if (!window.UNIFIED_SHELL_IMPERSONATED && window.localStorage) {
	//enable shell for IMS user - only originator can set this
	// -or-
	//disable shell for non-IMS user - only originator can set this
	window.localStorage.setItem("ORIGINATOR_UNIFIED_SHELL_ENABLED",
		(!!window.UNIFIED_SHELL_ENABLED && !!window.UNIFIED_SHELL_IMS) ? 'true' : 'false');
}

//session originator loaded in unified shell?
const isOriginatorUnifiedShellEnabled = window.localStorage
	&& window.localStorage.getItem("ORIGINATOR_UNIFIED_SHELL_ENABLED") === 'true';

window.UNIFIED_SHELL.isUserSupported = function() {
	return window.UNIFIED_SHELL_ENABLED
		&& (window.UNIFIED_SHELL_IMS && !window.UNIFIED_SHELL_IMPERSONATED || isOriginatorUnifiedShellEnabled);
};

window.UNIFIED_SHELL.isUnderUnifiedShell = function() {
	// if we are in an iframe AND /ui for unified shell - 2nd condition for test loading inside another iframe
	return self !== top && top.location.pathname.indexOf('/ui') === 0;
};

window.UNIFIED_SHELL.isChildOfUnifiedShell = function() {
	// if we are in an iframe AND /ui for unified shell - 2nd condition for test loading inside another iframe
	return top === parent && window.UNIFIED_SHELL.isUnderUnifiedShell();
};

window.UNIFIED_SHELL.isExcludedPath = function(path) {
	return window.UNIFIED_SHELL_CONTEXT.excludePatterns.some(pattern => path.indexOf(pattern) >= 0);
};

window.UNIFIED_SHELL.isExcludedLocation = function() {
	return window.UNIFIED_SHELL.isExcludedPath(window.location.pathname);
};

window.UNIFIED_SHELL.isIncludedLocation = function() {
	return !window.UNIFIED_SHELL.isExcludedLocation();
};

/**
 * Utility function to convert AEM path into Unified Shell URL depending on feature flag and config
 * @param {string} path AEM path
 * @returns {string} unified shell URL if feature flag and config are enabled; otherwise, the original path is returned.
 * Note that this is not for local dev
 */
window.UNIFIED_SHELL.getUnifiedShellURL = function(path) {
	if (window.UNIFIED_SHELL.isUserSupported() && !window.UNIFIED_SHELL.isExcludedPath(path)) {
		if (/^http(s)*\:\/\//.test(path)) {
			const url = new URL(path);
			return '/ui#/aem' + path.replace(url.origin, '');
		}
		return '/ui#/aem' + (path.indexOf('/') === 0 ? '' : '/') + path;
	}
	return path;
};

//******************
// PERFORM REDIRECTS
//******************

// redirect to escape unified shell if user is not supported
if (window.UNIFIED_SHELL.isChildOfUnifiedShell()
	&& !window.UNIFIED_SHELL.isUserSupported()) {
	// if we are in the unified shell and the user has disabled unified shell and user is not impersonated,
	// fallback to touch-ui
	const newUrl = new URL(window.self.location.href);
	newUrl.searchParams.delete('_mr');
	newUrl.searchParams.delete('shell_domain');
	console.log(`[unified-shell-init.js] redirecting parent window from ${parent.location} to ${newUrl}`);
	window.parent.location.assign(newUrl);
}

// when not under unified shell, but maybe should be
if (!window.UNIFIED_SHELL.isUnderUnifiedShell()
	&& !window.top.opener // if top.opener (or self.opener) is a window, don't navigate
	&& window.UNIFIED_SHELL.isUserSupported()
	&& window.UNIFIED_SHELL.isIncludedLocation()) {
	//For old bookmarked urls, we want to redirect to unifiedshell except shell setting page or link share page
	const unifiedShellPath = window.UNIFIED_SHELL.getUnifiedShellURL(window.location.href);
	console.log(`[unified-shell-init.js] redirecting self window from ${window.location} to ${unifiedShellPath}`);
	window.location.assign(unifiedShellPath);
}

//********************
// INITIALIZE DOCUMENT
//********************

if (!window.UNIFIED_SHELL.isUnderUnifiedShell()) {
	//have to wait until everything is loaded first to fix CSS - this is for shell disable inside AEM
	$(document).one('foundation-contentloaded', function () {
		//For non-unified-shell, we want to show the original shell.
		$('coral-shell').css('top', '0px');
	});
}

//only initialize shell for first level
if (window.UNIFIED_SHELL.isChildOfUnifiedShell()) {
	//have to wait until everything is loaded first
	$(document).one('foundation-contentloaded', function () {
		//register mode change for selection bar
		$(document).on("foundation-mode-change", function (e, mode, group) {
			if (mode === 'selection') {
				$('coral-shell').css('top', '0px');
			} else {
				$('coral-shell').css('top', '-48px');
			}
		});

		(function (doc, win) {
			// Ensure that the page is loaded within an iframe.
			if (win.location === win.parent.location) {
				throw new Error('Module Runtime: Needs to be within an iframe!');
			}

			/**
			 * Get the runtime script from the query param or fallback to
			 * session storage based on window property.
			 * @param {Window} win The global window.
			 * @returns Promise<string> Runtime script.
			 */
			function getRuntimeScript(win) {
				// Find the _mr script in the query string.
				var url = new URL(win.location.href);
				var runtime = url.searchParams.get('_mr');
				if (runtime || !win.EXC_US_HMR) {
					return Promise.resolve(runtime);
				}
				// Find the _mr script in local storage.
				runtime = win.sessionStorage.getItem('unifiedShellMRScript');
				if (runtime) {
					return Promise.resolve(runtime);
				}

				return new Promise(function (resolve) {
					function onMessage(event) {
						if (event.origin !== window.location.origin) {
							return;
						}

						var data = event.data || {};
						if (data.unifiedShell !== 1 || data.type !== 'RUNTIME_RESP') {
							return;
						}

						window.removeEventListener('message', onMessage, false);
						resolve(data.value);
					}
					window.addEventListener('message', onMessage, false);

					// request via post message
					window.parent.postMessage({
						type: 'RUNTIME_REQ',
						unifiedShell: 1
					}, window.location.origin);
				});
			}

			getRuntimeScript(win).then(function (runtime) {
				if (!runtime) {
					throw new Error('Module Runtime: Missing script!');
				}

				runtime = new URL(decodeURIComponent(runtime));

				// Ensure https
				if (runtime.protocol !== 'https:') {
					throw new Error('Module Runtime: Must be HTTPS!');
				}

				// Ensure that the hostname of the _mr script is within the experience(-qa|stage)?\.com domains
				if (!/^(exc-unifiedcontent\.)?experience(-qa|-stage|-cdn|-cdn-stage)?\.adobe\.(com|net)$/.test(runtime.hostname)
					&& !/localhost\.corp\.adobe\.com$/.test(runtime.hostname)) {
					throw new Error('Module Runtime: Invalid domain!');
				}

				// Ensure the runtime URL is a JavaScript file.
				if (!/\.js$/.test(runtime.pathname)) {
					throw new Error('Module Runtime: Must be a JavaScript file!');
				}

				// If HMR is being used, set the runtime URL in session storage.
				win.sessionStorage.setItem('unifiedShellMRScript', runtime.toString());

				// Load the module runtime script on the page.
				var script = doc.createElement('script');
				script.async = 1;
				script.src = runtime.toString();
				script.onload = script.onreadystatechange = function () {
					if (!script.readyState || /loaded|complete/.test(script.readyState)) {
						script.onload = script.onreadystatechange = null;
						script = undefined;
						'EXC_MR_READY' in win && win.EXC_MR_READY();
					}
				};
				doc.head.appendChild(script);
			});
		})(document, window);

		//To override the popup for preference click in Betty bar
		$('head').append('<link rel="stylesheet" type="text/css" href="' + Granite.HTTP.externalize('/libs/unifiedshell/components/unifiedshell/override.css') + '"/>');
	});
}

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

//only initialize shell for first level
if (window.UNIFIED_SHELL.isChildOfUnifiedShell()) {
    const uiShell = parent;
    const aemIFrame = window;
    // declare that the AEM iframe is the Granite top window
    Granite.Util.setIFrameMode(aemIFrame);
    // override the Granite handleLoginRedirect function so that it escapes unified shell completely if the
    // AEM login session expires
    Granite.HTTP.handleLoginRedirect = function() {
        const l = aemIFrame.location;
        uiShell.location.assign(Granite.HTTP.externalize('/') + '?resource=' + encodeURIComponent(l.pathname + l.search + l.hash));
    };
    window.UnifiedShellAEM = {
        onCustomButtonClick: function (btnValue) {
            switch (btnValue.id) {
                case 'preference':
                    this.onUserPreferenceClick();
                    break;
                case 'impersonate':
                    this.onImpersonateClick();
                    break;
                case 'reverttoself':
                    this.onRevertToSelf();
                    break;
                case 'aem_keyboard_shortcut':
                    this.onKeyboardShortcut();
                    break;
                case 'about_aem':
                    this.onAbout();
                    break;
                case 'viewswitcher':
                    this.onViewChange();
                    break;
                default:
                    console.log(btnValue);
            }
        },
        onUserPreferenceClick: function () {
            var userPropertiesSelector = $('coral-shell-menubar')
                .find('coral-shell-menubar-item[data-foundation-toggleable-control-src="/mnt/overlay/granite/ui/content/shell/userproperties.html"]');
            userPropertiesSelector[0].click();
            var userPreferencesSelector = ['coral-shell-user-footer',
                'button[data-foundation-toggleable-control-src="/mnt/overlay/granite/ui/content/shell/userpreferences.html"]'];
            this.waitForEl(userPreferencesSelector, function () {
                $('coral-shell-user-footer')
                    .find('button[data-foundation-toggleable-control-src="/mnt/overlay/granite/ui/content/shell/userpreferences.html"]')[0]
                    .click();
            });
        },
        onImpersonateClick: function () {
            $(document).trigger('unified-shell-impersonate');
        },
        onRevertToSelf: function () {
            $(document).trigger('unified-shell-revert-impersonate');
        },
        onKeyboardShortcut: function () {
            var helpSelector = $('coral-shell-menubar')
                .find('coral-shell-menubar-item[data-foundation-toggleable-control-src="/mnt/overlay/granite/ui/content/shell/help.html"]');
            helpSelector[0].click();
            var keyboardSelector = ['coral-shell-help',
                'a[data-foundation-toggleable-control-src="/mnt/overlay/granite/ui/content/shell/shortcutsdialog.html"]'];
            this.waitForEl(keyboardSelector, function () {
                $('coral-shell-help')
                    .find('a[data-foundation-toggleable-control-src="/mnt/overlay/granite/ui/content/shell/shortcutsdialog.html"]')[0]
                    .click();
            });
        },
        onAbout: function () {
            var helpSelector = $('coral-shell-menubar')
                .find('coral-shell-menubar-item[data-foundation-toggleable-control-src="/mnt/overlay/granite/ui/content/shell/help.html"]');
            helpSelector[0].click();
            var aboutSelector = ['coral-shell-help', 'a[data-foundation-toggleable-control-src="/mnt/overlay/granite/ui/content/shell/about.html"]'];

            this.waitForEl(aboutSelector, function () {
                $('coral-shell-help')
                    .find('a[data-foundation-toggleable-control-src="/mnt/overlay/granite/ui/content/shell/about.html"]')[0]
                    .click();
            });
        },
        onViewChange: function () {
            const SHELL_BASE_LOOK_UP = {
                qa: 'experience-qa.adobe.com',
                stage: 'experience-stage.adobe.com',
                prod: 'experience.adobe.com'
            }
            const assetsEssentialsOrigin = SHELL_BASE_LOOK_UP[UnifiedShellAEM.readyPayload.environment] || SHELL_BASE_LOOK_UP.prod;
            const repoId = window.UNIFIED_SHELL_CONTEXT.repositoryId;
            const path = document.location.pathname.replace(/^\/[^\/]+/,'');
            let route = '/assets/browse'
            if (document.location.pathname.startsWith('/assetdetails.html/')){
                route = `/assets/detail${path}`
            } else if (document.location.pathname.startsWith('/assets.html/')){
                route = `/assets/browse${path}`
            }
            window.top.location.href = `https://${assetsEssentialsOrigin}?repoId=${repoId}#/@${UnifiedShellAEM.readyPayload.tenant}${route}`
        },
        waitForEl: function (selectorIds, callback) {
            var timeoutId;
            var selector = $(selectorIds[0]);
            var i = 0;
            while (selector.length && i < selectorIds.length - 1) {
                selector = selector.find(selectorIds[++i]);
            }
            if (selector.length) {
                clearTimeout(timeoutId);
                callback();
            } else {
                var innerThis = this;
                timeoutId = setTimeout(function () {
                    innerThis.waitForEl(selectorIds, callback);
                }, 100);
            }
        }
    }
}
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
//isOriginatorUnifiedShellEnabled is set in unified-shell-init.js - only valid check for impersonation case only
if (window.UNIFIED_SHELL.isUnderUnifiedShell() && window.UNIFIED_SHELL.isUserSupported()) {
    //have to wait until everything is loaded first
    $(document).one('foundation-contentloaded', function () {
        if (parent !== top) return; //only initialize shell for first level

        const UNIFIED_SHELL_FEATURE_TOGGLE = Granite.Toggles.isEnabled("ft-cq-4297706");
        //For view switcher between Assets Essentials and TouchUI
        const ASSETS_ESSENTIAL_VIEW_TOGGLE = Granite.Toggles.isEnabled("ft-assets-4122");
        //Do not do anything with unified shell disable in FT
        if (!UNIFIED_SHELL_FEATURE_TOGGLE) return;

        window.EXC_US_HMR = true;

        $(document).on('coral-columnview:navigate', function (e) {
            var path = e.currentTarget.location.pathname.split(e.currentTarget.location.host)[1];
            history.pushState({urlPath: path}, null, path);
        });

        /**
         * Externalize path for local
         * @param {String} path - relative path without leading /
         * @return externalized path relative to local
         */
        function externalizeLocalUrl(path) {
            //local URL from externalizer - unifiedshell.jsp
            var externalizedUrl = Granite.HTTP.externalize('/');
            if (externalizedUrl.indexOf('http://localhost:') === 0) {
                externalizedUrl = 'https://localhost.corp.adobe.com:8443/' + path;
            }
            else {
                externalizedUrl += (externalizedUrl.endsWith('/') ? '' : '/') + path;
            }
            return externalizedUrl
        }

        /**
         * Stop Gap Notification TODO to be removed when full pulse notification implemented
         * @param excRuntime UnifiedShell Runtime
         */
        function initNotification(excRuntime) {
            function intervalCheck() {
                const PULSE_URL = window.location.origin +
                    '/mnt/overlay/granite/ui/content/shell/header/actions/pulse.data.json';
                var req;
                if (UnifiedShellAEM && UnifiedShellAEM.readyPayload && UnifiedShellAEM.readyPayload.token) {
                    req = fetch(PULSE_URL + '?configid=ims', {
                        headers: {
                            'Authorization': 'Bearer ' + UnifiedShellAEM.readyPayload.token,
                            'x-api-key': 'aem-touchui'
                        }
                    });
                } else {
                    req = fetch(PULSE_URL);
                }
                req.then(function(rsp){
                    return rsp.json();
                }).then(function(json){
                    const total = json.total;
                    excRuntime.pulse.setCount(parseInt(total));
                    excRuntime.pulse.setButton({label: 'Inbox (' + total + ')', callback: () => window.location.href = '/aem/inbox'});
                });
            }
            intervalCheck();
            setInterval(intervalCheck, 60000);
        }

        /**
         * Helper function for determining whether user is in AEM Assets CS.
         * @return {boolean}
         */
        function isAemAssets(){
            return location.pathname.startsWith('/assets.html/') ||
                location.pathname.startsWith('/assetdetails.html/') ||
                location.pathname.startsWith('/mnt/overlay/dam/gui/content/collections.html/');
        }

        function bootstrap() {
            excRuntime = new window['exc-module-runtime'].default({});
            //Stop-gap TODO to be removed with full pulse notification implemented
            initNotification(excRuntime);

            excRuntime.spinner = false;

            //Register buttons for shell menu - For event router, look at unified-shell-aem.js
            excRuntime.customButtons = [];

            //only add preference link when it's in the page
            if ($('coral-shell-menubar')
                .find('coral-shell-menubar-item[data-foundation-toggleable-control-src="/mnt/overlay/granite/ui/content/shell/userproperties.html"]').length){
                excRuntime.customButtons.push({
                    id: 'preference',
                    label: 'AEM Preferences',
                    scope: 'userProfile'
                });
            }
            //only add help link when there is one in the page
            if ( $('coral-shell-menubar')
                .find('coral-shell-menubar-item[data-foundation-toggleable-control-src="/mnt/overlay/granite/ui/content/shell/help.html"]').length) {
                excRuntime.customButtons.push({
                    id: 'aem_keyboard_shortcut',
                    label: 'Keyboard Shortcuts',
                    scope: 'helpCenterResource'
                });
                excRuntime.customButtons.push({
                    id: 'about_aem',
                    label: 'About Adobe Experience Manager',
                    scope: 'helpCenterResource'
                });
            }

            excRuntime.feedback = {
                buttonLabel: 'Feedback',
                enabled: true,
                type: 'openFeedback'
            };


            if (window.UNIFIED_SHELL_IMPERSONATED) {
                excRuntime.customButtons.push({
                    id: 'reverttoself',
                    label: 'Revert to self',
                    scope: 'userProfile'
                })
                //Use env label to indicate impersonation
                excRuntime.customEnvLabel = (window.parent.AEMRepoEnv ? [window.parent.AEMRepoEnv, 'Impersonation Mode']: 'Impersonation Mode');
            }
            else {
                excRuntime.customButtons.push({
                    id: 'impersonate',
                    label: 'Impersonate',
                    scope: 'userProfile'
                })
                excRuntime.customEnvLabel = (window.parent.AEMRepoEnv ? [window.parent.AEMRepoEnv]: '');
            }

            if (ASSETS_ESSENTIAL_VIEW_TOGGLE && UnifiedShellAEM && isAemAssets()) {
                excRuntime.customButtons.push({
                    id: 'viewswitcher',
                    label: 'Switch view',
                    scope: 'userProfile',
                });
                //TODO:
                //  1: Check whether ui-feedback is true
                //  2: Use on-submit callback to set UI_CONTEXTUAL_FEEDBACK_SUBMISSION true in local storage
                if(window.top.location.hash.includes('ui-redirect=true')) {
                    const submittedFeedback = window.localStorage ? window.localStorage.getItem("UI_CONTEXTUAL_FEEDBACK_SUBMISSION") === 'true' : false;
                    if(!submittedFeedback) {
                        excRuntime.helpCenterApi.open({
                            config: {
                                subject: 'Please tell us why you switched the UI',
                                type: 'CONTEXTUAL_FEEDBACK_SUBMISSION'
                            },
                            selectedTab: 'feedback'
                        });
                    }
                }
            }

            ['ready', 'configuration'].forEach(function(unifiedShellEvent){
                excRuntime.on(unifiedShellEvent, function(payload){
                    UnifiedShellAEM.readyPayload = {
                        tenant: payload.tenant,
                        environment: payload.environment,
                        token: payload.imsToken,
                        theme: payload.theme,
                        locale: payload.locale,
                        imsOrg: payload.imsOrg,
                    };
                    if (unifiedShellEvent === 'ready') {
                        $(document).trigger('aem-unified-shell-ready');
                    }
                });
            });

            // Register jQuery hook for adding Authorization: Bearer header to $.ajax() calls.
            const relAdobePrefix = '/adobe/'; // origin-relative /adobe/
            const extAdobePrefix = Granite.HTTP.externalize(relAdobePrefix); // absolute /adobe/
            $(document).ajaxSend(function(event, request, settings) {
                // only consider sending a token if UnifiedShellAEM has received a token.
                if (UnifiedShellAEM && UnifiedShellAEM.readyPayload && UnifiedShellAEM.readyPayload.token) {
                    // only send if ajax settings explicitly request it, or if the request url is for an origin-relative
                    // /adobe/ API (such as R-API) and an Authorization header isn't already defined in settings.headers.
                    if (settings && (settings.sendBearerImsToken || (settings.url
                        && (settings.url.indexOf(relAdobePrefix) === 0 || settings.url.indexOf(extAdobePrefix) === 0)
                        && !(settings.headers && settings.headers["Authorization"])))) {
                        request.setRequestHeader("Authorization", "Bearer " + UnifiedShellAEM.readyPayload.token);
                        request.setRequestHeader("x-api-key", "aem-touchui");
                    }
                }
            });

            excRuntime.on('configuration', function(payload){
                if (!payload.imsToken) return;
                const DISCOVERY_URL = window.location.origin + '/adobe/discovery/repository'; //federate discovery
                if (DISCOVERY_URL && payload.imsToken && !UnifiedShellAEM.loadedDiscovery && !window.parent.AEMRepoEnv) {
                    //prevent multiple call to discovery once it's called
                    UnifiedShellAEM.loadedDiscovery = true;
                    $.ajax({
                        type: "GET",
                        url: DISCOVERY_URL,
                        dataType: 'json',
                        headers: {
                            "Authorization": "Bearer " + payload.imsToken,
                            "x-api-key": "aem-touchui"
                        },
                        success: function (discoveryJSON) {
                            const repoEnv = discoveryJSON.children[0]._embedded['repo:environment'];
                            window.parent.AEMRepoEnv = repoEnv; //store the environment in shell level
                            excRuntime.customEnvLabel = [ repoEnv ];
                        }
                    });
                }
            });

            excRuntime.on('customButtonClick', ({type, value}) => {
                if (UnifiedShellAEM) {
                    UnifiedShellAEM.onCustomButtonClick(value);
                }
            });


            if ($('#granite-omnisearch-trigger').length) {
                excRuntime.customSearch = {
                    enabled: true,
                    show: false,
                };
                excRuntime.on('customSearch', (value) => {
                    if ( value ) {
                        $('#granite-omnisearch-trigger').click();
                        var typeAheadInterval = setInterval(function(){
                            //No need to set the trial limit for typehead since omnisearch must come with this field
                            if ($('.granite-omnisearch-typeahead-input').length >= 1) {
                                var suggestionListInterval = null;
                                var pollingTrial = 0; //count retry for delay on suggestion list
                                const MAX_TRIAL = 15;
                                $('.granite-omnisearch-typeahead-input').on('keypress', function(e){
                                    if (suggestionListInterval) {
                                        clearInterval(suggestionListInterval);
                                        //Have to reset to null for outer keypress
                                        suggestionListInterval = null;
                                        pollingTrial = 0;
                                    }
                                    suggestionListInterval = setInterval( function() {
                                        pollingTrial++;
                                        if (pollingTrial > MAX_TRIAL) {
                                            clearInterval(suggestionListInterval);
                                            //Have to reset to null for outer keypress
                                            suggestionListInterval = null;
                                            pollingTrial = 0;
                                        }
                                        //checking to make sure that we count link update only when the new node is populated by checking aria-label content
                                        var ariaSuggestion = $('#granite-omnisearch-suggestions-list').length > 0 ?
                                            $('#granite-omnisearch-suggestions-list').attr('aria-label').substring($('#granite-omnisearch-suggestions-list').attr('aria-label').indexOf(':')+1).trim() : '';
                                        var typeAheadString = $('.granite-omnisearch-typeahead-input').val().trim();
                                        if (($('#granite-omnisearch-suggestions-list')
                                                    .find('[data-granite-omnisearch-typeahead-navigation-href="/crx/packmgr"]').length > 0 ||
                                                $('#granite-omnisearch-suggestions-list')
                                                    .find('[data-granite-omnisearch-typeahead-navigation-href="/crxde"]').length > 0 )
                                            && typeAheadString == ariaSuggestion
                                        ) {
                                            //Prevent Package Manager from loading inside Shell from omnisearch suggestion
                                            $('#granite-omnisearch-suggestions-list')
                                                .find('[data-granite-omnisearch-typeahead-navigation-href="/crx/packmgr"]')
                                                .on('click', function (e) {
                                                    e.preventDefault();
                                                    e.stopImmediatePropagation();
                                                    window.top.location = '/crx/packmgr';
                                                });
                                            //Prevent CRXDE from loading inside Shell from omnisearch suggestion
                                            $('#granite-omnisearch-suggestions-list')
                                                .find('[data-granite-omnisearch-typeahead-navigation-href="/crx/de"]')
                                                .on('click', function (e) {
                                                    e.preventDefault();
                                                    e.stopImmediatePropagation();
                                                    window.top.location = '/crx/de'
                                                });
                                            clearInterval(suggestionListInterval);
                                            //Have to reset to null for outer keypress
                                            suggestionListInterval = null;
                                            pollingTrial = 0;
                                        }
                                    }, 100);
                                })
                                clearInterval(typeAheadInterval);
                                return;
                            }
                        }, 100);
                    }
                    else if ($('.granite-omnisearch-typeahead-close').length >= 1) {
                        $('.granite-omnisearch-typeahead-close').click();
                    }
                });
            }
            else {
                //Disable search in the shell when there is no way to trigger omnisearch in the page
                excRuntime.customSearch = {
                    enabled: false,
                    show: false,
                };

            }

            excRuntime.helpCenter = {
                resources: [
                    {
                        href: 'https://docs.adobe.com/content/help/en/experience-manager-cloud-service/release-notes/release-notes/release-notes-current.html',
                        label: 'What\'s New'
                    },
                    {
                        href: 'https://docs.adobe.com/content/help/en/experience-manager-cloud-service/landing/home.html',
                        label: 'Adobe Experience Manager Documentation'
                    },
                    {
                        href: 'https://helpx.adobe.com/contact/enterprise-support.ec.html#experience-manager',
                        label: 'Customer Care'
                    },
                    {
                        href: 'https://experienceleaguecommunities.adobe.com/t5/adobe-experience-manager/ct-p/adobe-experience-manager-community',
                        label: 'Community'
                    },
                    {
                        href: 'https://status.adobe.com/marketing_cloud',
                        label: 'Adobe Experience Cloud Status'
                    },
                ],
            };

            excRuntime.logoutUrl = externalizeLocalUrl('system/sling/logout.html');

            //TODO: change to correct favicon
            excRuntime.favicon = 'https://www.adobe.com/favicon.ico';

            excRuntime.heroClick = function () {
                //for page without menu
                if (!$('coral-shell-header-home.globalnav-toggle').length) {
                    window.location.href = Granite.HTTP.externalize('/aem/start.html');
                }

                let issuedClick = false;
                //This logic to prevent multiple firing of click events
                if (!excRuntime._aemMenu && $('.globalnav-overlay').length === 0) {
                    // if no menu yet and no overlay node, we want to issue the click and set menu to shown-state
                    excRuntime._aemMenu = true;
                    issuedClick = true;
                }
                else if (excRuntime._aemMenu && $('.globalnav-overlay').length > 0) {
                    // if there is a menu and overlay node is there, we want to issue the click and set menu to hidden-state
                    excRuntime._aemMenu = false;
                    issuedClick = true;
                }
                if (issuedClick) {
                    //trigger click in original coral shell top left icon
                    $('coral-shell-header-home.globalnav-toggle').click();
                    //register close in menu to set state to false
                    //wait until the popup menu render
                    setTimeout( function() {
                        $('betty-titlebar-secondary').find('.globalnav-toggle').on('click', function () {
                            excRuntime._aemMenu = false
                        });
                        //Register override for package manager and crxde items
                        $('.globalnav-tools-navigation-item').on('click', function(e){
                            function openTop(e) {
                                e.preventDefault();
                                e.stopPropagation();
                                var $el = $(this);
                                var href = $el.data("globalnav-anchor-href");
                                if (!href) return;
                                var target = $el.data("globalnav-anchor-target") || "_self";
                                var winMode = $(window).adaptTo("foundation-preference").get("winMode") || "multi";

                                if (winMode === "single") {
                                    target = "_top";
                                }
                                window.open(href, target);
                            }
                            setTimeout(function(){
                                var pkgMgrLink = $('coral-card[data-globalnav-anchor-href="/crx/packmgr"]');
                                pkgMgrLink.on("click", openTop);
                                var crxDELink = $('coral-card[data-globalnav-anchor-href="/crx/de"]');
                                crxDELink.on("click", openTop);
                            },100);
                        });
                    }, 1000)
                }
            };

            const sameAddress = (addr1, addr2) => {
                if (addr1.origin !== addr2.origin) {
                    return false;
                }

                if (addr1.hash !== addr2.hash) {
                    return false;
                }

                if (addr1.pathname !== addr2.pathname) {
                    return false;
                }

                const addr1SearchKeys = [...addr1.searchParams.keys()].sort();
                const addr2SearchKeys = [...addr2.searchParams.keys()].sort();

                if (addr1SearchKeys.join("") !== addr2SearchKeys.join("")) {
                    return false;
                }

                const different = addr1SearchKeys.some(
                    key => addr1.searchParams.get(key) !== addr2.searchParams.get(key)
                );

                return !different;
            };


            excRuntime.on('history', arg => {
                const {type, path} = arg;

                if (type !== 'external') {
                    return;
                }

                const currentAddr = new URL(document.location.href);
                let navAddress;

                try {
                    navAddress = new URL(path);
                } catch (e) {
                    navAddress = new URL(
                        path.startsWith('/')
                            ? currentAddr.origin + path
                            : currentAddr.origin + '/' + path
                    );
                }

                if (sameAddress(navAddress, currentAddr)) {
                    return;
                }
                //For column view, we do not refresh the whole page
                if ($('coral-cyclebutton.granite-collection-switcher').find('coral-icon').attr('icon') !== 'viewColumn') {
                    document.location.href = navAddress.href;
                }
            });

            excRuntime.done();
        }

        //we're in an iframe so we need to remove header
        if ('exc-module-runtime' in window) {
            bootstrap();
        } else {
            window.EXC_MR_READY = function () {
                return bootstrap();
            };
        }
    });

    /*
     * For back button after search issue (x is missing and cannot be navigated)
     */
    $(document).on('foundation-contentloaded', function () {
        if ($('.granite-omnisearch-typeahead-close').attr('hidden')) {
            $('.granite-omnisearch-typeahead-close').removeAttr('hidden');
            $('.granite-omnisearch-typeahead-close').on('click', function () {
                window.location.href = Granite.HTTP.externalize('/');
            })
        }
    });
}
