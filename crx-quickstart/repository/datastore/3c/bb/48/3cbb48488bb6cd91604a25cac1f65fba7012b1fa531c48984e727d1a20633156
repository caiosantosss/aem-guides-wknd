/*
 * ADOBE CONFIDENTIAL
 *
 * Copyright 2015 Adobe Systems Incorporated
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
;
(function(document, ns) {

    "use strict";

    var workflowServletURL = "/var/workflow/instances";
    var translationProjectWorkflowModel;
    var translationWorkflowModel;

    var projectDetails;
    var selector_create_SelectedLanguages = "coral-select.languages";

    var labelCreateAndTranslateAccordion = ".detail-toolbar.start coral-accordion coral-accordion-item-label";
    var labelUpdateLanguageCopiesAccordion = ".detail-toolbar.update coral-accordion coral-accordion-item-label";

    ns.ready(function() {

        // Listen to the selectall event (checkbox in detail title)
        ns.$root.on(ns.EVENT_SELECTALL, function(evt, options) {
            // collapse active toolbar
            ns.$detailToolbars.find(".detail-toolbar.active coral-accordion-item").attr("selected", false);


            if (ns.$root.data("type") !== "languageCopy")
                return;
            toggleStartToolbar(options.checked);
            ns.$detailToolbars.find(".detail-toolbar.update")
                .toggleClass("active", options.checked)
                .toggleClass("hidden", !options.checked);

            // Adjust form layout
            ns.triggerResize({
                detail: true
            });

            // get the list item that is a self reference to the currently selected page
            var $selfReference = ns.$detailList.find('section[data-path="' + Granite.References.getReferencePath() + '"]');
            // delete contained checkbox input and hide checkbox container
            $selfReference.find("coral-checkbox").remove();
        });

        /**
         * Is called when the list of language copies is loaded. It hides the language options in
         * the "Create & Translate" toolbar, for which there already exists a language copy.
         * Furthermore it marks the list items that are currently in a translation workflow.
         */

        ns.$detail.on("foundation-contentloaded.data-api", function() {

            if (ns.$root.data("type") !== "languageCopy") {
                return;
            }

            var $start = ns.$detailToolbars.find(".detail-toolbar.start");
            var $startForm = $start.find("form");

            var $update = ns.$detailToolbars.find(".detail-toolbar.update");
            var $updateForm = $update.find("form");

            // get translation workflow model using project translation pods
            translationProjectWorkflowModel = $start.data("translationprojectworkflowmodel");

            // get translation workflow model (kept for backward compatibility)
            translationWorkflowModel = $start.data("translationworkflowmodel");

            // get projects detail URL
            projectDetails = Granite.HTTP.externalize($start.data("projectdetails"));

            // iterate over all language copies
            var $languages = ns.$detail.find(selector_create_SelectedLanguages);
            var languages = $languages.get(0);
            Coral.commons.ready(languages, function(languages) {
                var items = languages.items.getAll();
                var languageCopyCount = 0;

                for (var i = 0; i < items.length; i++) {
                    // check if this language copy already exists in a language
                    var languageCode = items[i].value;
                    var $section = ns.$detail.find("[data-language-code='" + languageCode + "']");
                    if ($section.length > 0) {
                    //Increase the count if a particular page has language copy 
                    languageCopyCount = languageCopyCount + 1;
                        // remove option as language copy already exists
                        languages.items.remove(items[i]);
                    }
                }
                //Remove the checkbox if no language copy is present
                if (languageCopyCount == 1) {
                    ns.$detailHeader.find('coral-checkbox input').hide()
                    ns.$detailHeader.find('coral-checkbox span').hide();
                }
            });

            // Hide the toolbar and disable its elements if there is no language to translate to
            toggleStartToolbar();

            var $submit = $startForm.find("button[data-role='submit']");
            if ($submit.length > 0) {
                // remember initial label
                CustomElements.upgradeAll($startForm.get(0));
                $submit.data("defaulttext", $submit.get(0).label.innerHTML);
            }
        });

        var toggleStartToolbar = function(hide) {
            var $start = ns.$detailToolbars.find(".detail-toolbar.start");
            if (hide) {
                $start
                    .toggleClass("active", !hide)
                    .toggleClass("hidden", hide);
            } else {
                var $startForm = $start.find("form");
                var languages = $startForm.find("coral-select[name='languages']").get(0);
                Coral.commons.ready(languages, function(languages) {
                    var languagesCount = languages ? languages.items.length : 0;
                    if (languagesCount == 1) {
                        adjustSelectedLanguages(true);
                    }
                    languagesCount = languages ? languages.items.length : 0;
                    $start
                        .toggleClass("active", languagesCount > 0)
                        .toggleClass("hidden", languagesCount == 0);
                    // Adjust form layout
                     ns.triggerResize({
                     detail: true
                    });
                });
            }
        };

        /**
         * Shows a message in a notification slider.
         */
        var showNotification = function(message, type) {
            $(window).adaptTo("foundation-ui").notify("", message, type);
        };


        // --- CREATE & TRANSLATE

        /**
         * Handler on activation of "Create & Translate" panel
         */
        ns.$detailToolbars.on("coral-accordion:change", ".detail-toolbar.start coral-accordion", function(e) {
            adjustStartFormLayout();
        });

        var languageCopySubmit = function(languageItems, projectFolderPath, masterProjectPath) {
            //hide start translation accordion
            $(labelCreateAndTranslateAccordion).click();
            ns.showSpinner();

            var $start = $(".detail-toolbar.start");

            // gather POST data
            var $form = $start.find("form");
            var projectType = $form.find("[name='projectType']").val();

            // get existing projects
            var projectOption = $form.find("coral-select[name='project']").get(0).selectedItem;
            var projectTitle = $form.find("[name='projectTitle']").val();

            if (projectType === "add_existing") {
                projectFolderPath = projectOption.value;
                projectTitle = projectOption.innerText.trim();
            }



            // submit POST requests sequentially (parallel POST requests cause problems creating the workflows on the server side)
            var projectCreated = [];
            var projectUpdated;
            var projectCreatedCount = 0;
            var languages = [];
            var strModel = $start.data("workflowmodel");
            var isDeep = !!$form.find("input[name='deep']").prop("checked");
            var strPayload = ns.getReferencePath();
            var languageCodeList = "";
            var languageTitleList = "";
            var bMultiLanguageSupport = (projectType === "add_new_multi_lang" || projectType === "add_existing");
            var iLanguagesCount = languageItems.length;
            for (var i = 0; i < languageItems.length; i++) {
                if (languageCodeList.length != 0) {
                    languageCodeList = languageCodeList + ",";
                }
                languageCodeList = languageCodeList + languageItems[i].value;
                if (languageTitleList.length != 0) {
                    languageTitleList = languageTitleList + ",";
                }
                languageTitleList = languageTitleList + languageItems[i].textContent;
            }

            for (var i = 0; i < languageItems.length; i++) {
                if (bMultiLanguageSupport && i > 0) {
                    continue; //we have to do it only once
                }
                var languageCode = languageItems[i].value;
                var languageTitle = languageItems[i].textContent;
                var promise = $.Deferred().resolve();
                if (!bMultiLanguageSupport) {
                    promise.languageCode = languageCode;
                    promise.languageTitle = languageTitle;
                } else {
                    promise.languageCodeList = languageCodeList;
                    promise.languageTitle = languageTitleList;
                }
                promise = promise.then(function() {
                    var data = {
                        "_charset_": "utf-8",
                        ":status": "browser",
                        payloadType: "JCR_PATH",
                        model: strModel,
                        createNonEmptyAncestors: true,
                        deep: isDeep,
                        payload: strPayload,
                        projectFolderPath: projectFolderPath,
                        masterProjectPath: masterProjectPath,
                        projectFolderLanguageRefCount: iLanguagesCount,
                        translationWorkflowModel: translationProjectWorkflowModel
                    };
                    if (bMultiLanguageSupport) {
                        data.languageList = promise.languageCodeList;
                    } else {
                        data.language = promise.languageCode;
                    }
                    data.projectTitle = projectTitle;
                    var workflowTitle;
                    if (projectType === "add_existing" && projectFolderPath) {
                        data.projectType = "add_existing";
                        workflowTitle = Granite.I18n.get("Translation of \"{0}\" using existing project \"{1}\" in \"{2}\"", [
                            data.payload,
                            data.projectFolderPath,
                            bMultiLanguageSupport ? languageTitleList : languageTitle
                        ]);

                        projectUpdated = {
                            title: projectTitle,
                            data: data
                        };
                    } else if (projectType === "add_structure_only") {
                        data.projectType = "add_structure_only";
                        delete data.translationWorkflowModel;
                        workflowTitle = Granite.I18n.get("Copy Structure \"{0}\" ", [
                            data.payload
                        ]);
                    } else {
                        // New project (either clearly selected, or existing project doesn't exist in that language)
                        data.projectType = projectType;

                        projectCreated.push({
                            data: data
                        });

                        workflowTitle = Granite.I18n.get("Translation of \"{0}\" using new project \"{1}\" in \"{2}\"", [
                            data.payload,
                            data.projectTitle,
                            bMultiLanguageSupport ? languageTitleList : languageTitle
                        ]);
                    }
                    data.workflowTitle = workflowTitle;

                    var deferred = $.Deferred();
                    // submit POST request
                    $.post(workflowServletURL, data, function() {

                        $.each(projectCreated, function(iItemCount, projectCreatedObj) {
                            if (projectCreatedObj.data === data) {
                                projectCreatedCount++;
                                if (!bMultiLanguageSupport) {
                                    languages.push(projectCreatedObj.data.language.toUpperCase());
                                }
                                return false;
                            }
                        });

                        if (bMultiLanguageSupport || i === (languageItems.length)) {
                            var notificationMessages = [];
                            if (projectCreatedCount > 0) {
                                if (projectCreatedCount === 1) {
                                    notificationMessages.push(Granite.I18n.get("Translation project created ({0})", [languageCodeList]));
                                } else {
                                    notificationMessages.push(Granite.I18n.get("{0} translation projects created ({1})", [projectCreatedCount, languageCodeList]));
                                }
                            }

                            if (projectUpdated && projectUpdated.data === data) {
                                if (!projectUpdated.data.deep) {
                                    notificationMessages.push(Granite.I18n.get("Selected page has been added to translation project '{0}'", [projectUpdated.title]));
                                } else {
                                    notificationMessages.push(Granite.I18n.get("Selected pages have been added to translation project '{0}'", [projectUpdated.title]));
                                }
                            }

                            if (notificationMessages.length) {
                                if (notificationMessages.length === 1) {
                                    showNotification(notificationMessages[0], "info");
                                } else {
                                    var timeoutCount = 0;
                                    var duration = 3000;

                                    // Display both notifications 3000 ms one after the other
                                    notificationMessages.forEach(function(notificationMessage) {
                                        setTimeout(function() {
                                            showNotification(notificationMessage, "info");
                                        }, timeoutCount);
                                        timeoutCount += duration;
                                    });
                                }
                            }
                        }

                    }).fail(function() {
                        showNotification(Granite.I18n.get("Failed to start the language copy creation workflow for language {0}", [languageCodeList]), "error");
                    }).always(function() {
                        deferred.resolve();
                    });
                    return deferred.promise();
                });
            }

            promise.then(function() {
                // all requests are done (either failed or succeeded)
                // wait a bit (for the language copies to be created by the workflows)
                setTimeout(function() {
                    ns.$detailToolbars.find(".detail-toolbar.active coral-accordion-item").attr("selected", false);
                    ns.refreshDetail();
                }, 400);
            });
        }

        var createProjectFolderAndCallback = function(strFolderName, projectType, languageItems, masterProjectPath, fnCallBack) {
            //we have to create a project folder first
            var projectFolderPath = "";
            var createPostURL = Granite.HTTP.externalize('/content/projects');
            if (projectType === "add_new" && languageItems.length > 1) {
                $.post(createPostURL, {
                    ":operation": "projects:createfolder",
                    "./jcr:title": strFolderName,
                    "parentPath": "/content/projects",
                    "folderthumbnailurl": "/libs/cq/core/content/projects/templates/translation-project/thumbnail.png",
                    "_charset_": "utf-8"
                }).then(function(html) {
                    var $response_link = $(html).find(".cq-projects-admin-createfolder-open");
                    projectFolderPath = $response_link.attr('href');
                    var projectPrefix = Granite.HTTP.externalize('/projects.html') + '/';
                    if (projectFolderPath.indexOf(projectPrefix) == 0) {
                        projectFolderPath = projectFolderPath.substr(projectPrefix.length - 1);
                    }
                    fnCallBack(languageItems, projectFolderPath, masterProjectPath);
                });
            } else if(projectType === "add_new_multi_lang" || (projectType === "add_new" && languageItems.length === 1)){
                fnCallBack(languageItems, projectFolderPath, masterProjectPath);
            } else {
                fnCallBack(languageItems, projectFolderPath, "");
            }
        };
        /**
         * Handler for clicks on the "Create/Add" button in the "Create & Translate" toolbar.
         */
        ns.$detailToolbars.on("click", ".detail-toolbar.start coral-accordion button[data-role='submit']", function(e) {
            if (ns.$root.data("type") !== "languageCopy")
                return;

            var $start = $(".detail-toolbar.start");
            var $form = $start.find("form");
            var languageItems = $start.find("coral-select[name='languages']").get(0).selectedItems;
            var projectType = $form.find("[name='projectType']").val();
            var masterProjectPath = $form.find("[name='masterProject']").val();
            if (languageItems.length > 0) {
                var projectTitle = $form.find("[name='projectTitle']").val();
                createProjectFolderAndCallback(projectTitle, projectType, languageItems, masterProjectPath, languageCopySubmit);
            }
        });

        /**
         * Handler for changes in languages selection.
         */
        ns.$detailToolbars.on("change", selector_create_SelectedLanguages, function (e) {
            adjustSelectedLanguages(false);
            adjustStartFormLayout();
            window.setTimeout(function() {
                ns.$root.trigger(ns.EVENT_RESIZE);
            }, 1);
        });

        /**
         * Handler for changes in project type selection.
         */
        ns.$detailToolbars.on("change", "coral-select.projectType", function(e) {
            var $toolbar = $(e.currentTarget).parents('.detail-toolbar');

            // Show/hide corresponding fields
            $toolbar.find(".projectTitle")
                .attr("hidden", !(this.value === "add_new" || this.value === "add_new_multi_lang"))
                .find("[name='projectTitle']")
                .val("");
            var $project = $toolbar.find("[name='project']");
            $project.closest(".coral-Form-fieldwrapper")
                .attr("hidden", this.value !== "add_existing");
            var $masterProject = $toolbar.find("[name='masterProject']");
            $masterProject.closest(".coral-Form-fieldwrapper")
                .attr("hidden", !(this.value === "add_new" || this.value === "add_new_multi_lang"));
            var project = $project.get(0);
            if (project) {
                project.value = "";
            }

            if ($toolbar.hasClass('update')) {
                adjustUpdateFormLayout(true);
            } else {
                adjustStartFormLayout(true);
            }
        });

        $(document).on("keyup", ".detail-toolbar.start [name='projectTitle']", function(e) {
            adjustStartFormLayout();
        });

        $(document).on("change", ".detail-toolbar [name='project']", function(e) {
            var $toolbar = $(e.currentTarget).parents('.detail-toolbar');
            if ($toolbar.hasClass('update')) {
                adjustUpdateFormLayout(true);
            } else {
                adjustStartFormLayout(true);
            }
        });

        var adjustSelectedLanguages = function (checkAllLanguagesValid) {

            var allLanguageOptions = document.querySelector(selector_create_SelectedLanguages).items;
            if (checkAllLanguagesValid) {
                if (allLanguageOptions.length == 1) {
                    // Check if All Languages is the only option
                    var availableOption = allLanguageOptions.getAll()[0];
                    if (availableOption.value == "select_all_roots") {
                        $(selector_create_SelectedLanguages).find("coral-select-item[value='select_all_roots']").remove();
                    }
                }
            } else {
                var selectedItems = document.querySelector(selector_create_SelectedLanguages).selectedItems;
                var isAllSelected  = false;
                for (var index = 0; index < selectedItems.length; index = index + 1) {
                    var selectItem = selectedItems[index];
                    var itemValue = selectItem.getAttribute("value");
                    if (itemValue == "select_all_roots") {
                        isAllSelected = true;
                        break;
                    }
                }
                if (isAllSelected) {
                    // Set all the language roots as selected
                    $(selector_create_SelectedLanguages).find('coral-select-item').attr("selected", true);
                    $(selector_create_SelectedLanguages).find("coral-select-item[value='select_all_roots']").attr("selected", false);
                    $(selector_create_SelectedLanguages).find("coral-select-item[value='select_all_roots']").attr("disabled", true);
                } else {
                    $(selector_create_SelectedLanguages).find("coral-select-item[value='select_all_roots']").attr("disabled", false);
                    // All items except all language option are selected
                    if (allLanguageOptions.length - selectedItems.length == 1) {
                        $(selector_create_SelectedLanguages).find("coral-select-item[value='select_all_roots']").attr("disabled", true);
                    }
                }
            }

        }


        /**
         * Adjust update form layout based on current input
         */
        var adjustUpdateFormLayout = function() {
            var $form = ns.$detailToolbars.find(".detail-toolbar.update form");

            var languagesCount = $(".detail-list").find("section[data-type=languageCopy] :checkbox:checked").length;
            var projectType = $form.find("[name='projectType']").val();
            var $projectTitle = $form.find(".projectTitle");
            var $project = $form.find("[name='project']");
            var project = $project.get(0);
            if (project) {
                var items = project.items;
                var allItems = items.getAll();
                if (project.selectedItem === null && allItems.length > 0) {
                    project.value = allItems[0].value;
                }
            } else {
                project = {};
            }

            // Tooltip for multiple selection of
            $projectTitle.find(".fieldDescription").hide();
            if(languagesCount > 1){
                $projectTitle.find(".fieldDescription_"+projectType).show();
            }
            

            // Adjust form layout
            ns.triggerResize({
                detail: true
            });

            // Toggle submit disabled state based on that
            var $submit = $form.find("button[data-role='submit']");
            var submit = $submit.get(0);
            if (submit) {
                var formValid = languagesCount > 0 &&
                    (
                        (projectType === "add_new" && $projectTitle.find("[name='projectTitle']").val() !== "") ||
                        (projectType === "add_new_multi_lang" && $projectTitle.find("[name='projectTitle']").val() !== "") ||
                        (projectType === "add_existing" && project.selectedItem !== null) ||
                        (projectType === "add_structure_only")
                    );

                submit.disabled = !formValid;
            }
        };

        /**
         * Adjust start form layout based on current input
         */
        var adjustStartFormLayout = function() {
            var $form = ns.$detailToolbars.find(".detail-toolbar.start form");

            var $project = $form.find("[name='project']");
            var project = $project.get(0);
            if (project) {
                var items = project.items;
                var allItems = items.getAll();
                if (project.selectedItem === null && allItems.length > 0) {
                    project.value = allItems[0].value;
                }
            } else {
                project = {};
            }

            // Adjust form layout
            ns.triggerResize({
                detail: true
            });

            // Fix to enable submit button if at least one language is selected
            var languagesCount = $form.find("coral-select[name='languages']").get(0).selectedItems.length;
            var projectType = $form.find("[name='projectType']").val();
            var $projectTitle = $form.find(".projectTitle");

            // Tooltip for multiple selection of
            $projectTitle.find(".fieldDescription").hide();
            if(languagesCount > 1){
                $projectTitle.find(".fieldDescription_"+projectType).show();
            }

            // Check if form is filled correctly
            var formValid = languagesCount > 0 &&
                (
                    (projectType === "add_new" && $projectTitle.find("[name='projectTitle']").val() !== "") ||
                    (projectType === "add_new_multi_lang" && $projectTitle.find("[name='projectTitle']").val() !== "") ||
                    (projectType === "add_existing" && project.selectedItem !== null) ||
                    (projectType === "add_structure_only")
                );

            // Toggle submit disabled state based on that
            var $submit = $form.find("button[data-role='submit']");
            var submit = $submit.get(0);
            if (submit) {
                submit.disabled = !formValid;
                if (projectType === "add_existing") {
                    submit.label.innerHTML = $submit.data("oppositetext");
                } else {
                    submit.label.innerHTML = $submit.data("defaulttext");
                }
            }
        };


        // --- UPDATE

        /**
         * Get the title to use for the update language copy workflow.
         *
         * @returns {string}
         */
        var getWorkflowLaunchTitle = function(title, strLaunchCount) {
            if (!title || title.length == 0) {
                var selectedItems = $(".cq-siteadmin-admin-childpages.foundation-collection").find(".foundation-selections-item");

                if (selectedItems.length > 0) {
                    title = selectedItems.eq(0).data('item-title');
                }
            }

            var iCount = parseInt(strLaunchCount);

            if (!isNaN(iCount)) {
                iCount++;
                return Granite.I18n.get("Translation review {0} {1}", [title, iCount]);
            }

            return Granite.I18n.get("Translation review {0}", title);
        };


        /**
         * Handler for clicks on the "Start" button in the "Update language copies" toolbar.
         */
        ns.$detailToolbars.on("click", ".detail-toolbar.update coral-accordion button[data-role='submit']", function(e) {
            if (ns.$root.data("type") !== "languageCopy")
                return;

            var $update = $(".detail-toolbar.update");
            var $form = $update.find("form");
            var languageItems = $(".detail-list").find("section[data-type=languageCopy] input:checked")
            var projectType = $form.find("[name='projectType']").val();
            var masterProjectPath = $form.find("[name='masterProject']").val();
            if (languageItems.length > 0) {
                var projectTitle = $form.find("[name='projectTitle']").val();
                createProjectFolderAndCallback(projectTitle, projectType, languageItems, masterProjectPath, languageUpdateCopySubmit);
            }
        });

        var languageUpdateCopySubmit = function (languageItems, strProjectFolderPath, masterProjectPath) {
            //hide start translation accordion
            $(labelUpdateLanguageCopiesAccordion).click();
            ns.showSpinner();

            var $update = $(".detail-toolbar.update");
            var $updateForm = $update.find("form");

            if (ns.$root.data("type") !== "languageCopy")
                return;
            // gather POST data
            var $form = $update.find("form");
            var strProjectType = $form.find("[name='projectType']").val();
            if (strProjectType == null || strProjectType.length == 0) {
                strProjectType = 'update';
            }
            var strProjectTitle = "";
            if (strProjectType === "add_existing") {
                var projectField = $updateForm.find("coral-select[name='project']").get(0);
                strProjectFolderPath = projectField.value;
                strProjectTitle = projectField.selectedItem.innerText.trim();
            } else {
                strProjectTitle = $updateForm.find("[name='projectTitle']").val()
            }

            var languageCheckboxArray = $(".detail-list").find("section[data-type=languageCopy] input:checked");
            var iLanguagesCount = languageCheckboxArray.length;
            var data = {
                "_charset_": "utf-8",
                ":status": "browser",
                payloadType: "JCR_PATH",
                model: $update.data("workflowmodel"),
                projectTitle: strProjectTitle,
                deep: $updateForm.find("input[name='deep']").prop("checked"),
                projectType: strProjectType,
                projectFolderPath: strProjectFolderPath,
                masterProjectPath: masterProjectPath,
                projectFolderLanguageRefCount: iLanguagesCount,
                translationWorkflowModel: translationProjectWorkflowModel
            };

            var sourcePathList = "";
            var languageTitleList = "";
            var languageList = "";
            var bMultiLanguageSupport = (strProjectType === "add_new_multi_lang" || strProjectType === "add_existing");
            for (var i = 0; i < languageCheckboxArray.length; i++) {
                if (sourcePathList.length != 0) {
                    sourcePathList = sourcePathList + ";";
                }
                var $section = $(languageCheckboxArray[i]).closest("section");

                var strCurrentPath = $section.data("path");
                sourcePathList = sourcePathList + strCurrentPath;

                var destinationLanguageTitle = $section.data("language-code-title");
                if (languageTitleList.length != 0) {
                    languageTitleList = languageTitleList + ",";
                }
                languageTitleList = languageTitleList + destinationLanguageTitle;

                var destinationLanguageCode = $section.data("language-code");
                if (languageList.length != 0) {
                    languageList = languageList + ",";
                }
                languageList = languageList + destinationLanguageCode;
            }


            // submit POST requests sequentially (parallel POST requests cause
            // problems creating the workflows on the server side)
            var promise = $.Deferred().resolve();
            var iCurrentLanguageIndex = 0;
            languageCheckboxArray.each(function() {
                if (bMultiLanguageSupport && iCurrentLanguageIndex > 0) {
                    return; //we have to do it only once for multi language project
                }
                iCurrentLanguageIndex++;
                var $section = $(this).closest("section");
                var sourceLanguageCode = $section.data("source-language-code");
                var destinationLanguageCode = $section.data("language-code");
                var destinationLanguageTitle = $section.data("language-code-title");
                var launchCount = $section.data("launch-count");
                promise = promise.then(function() {
                    data.payload = $section.data("path");
                    data.language = sourceLanguageCode;
                    data.projectTitle = strProjectTitle;
                    data.destinationLanguage = destinationLanguageCode;
                    if (bMultiLanguageSupport) {
                        data.sourcePathList = sourcePathList;
                        data.languageList = languageList;
                    }

                    data.workflowLaunchTitle = getWorkflowLaunchTitle(bMultiLanguageSupport ? "%s" : destinationLanguageTitle, launchCount);
                    var deferred = $.Deferred();
                    // submit POST request
                    $.post(workflowServletURL, data).fail(function() {
                        showNotification(Granite.I18n.get("Failed to start the language copy update workflow for language {0}", [bMultiLanguageSupport ? languageList : languageCode]), "error");
                    }).always(function() {
                        deferred.resolve();
                    });
                    return deferred.promise();
                });
            });
            promise.then(function() {
                // all requests are done (either failed or succeeded)
                // collapse toolbar
                setTimeout(function() {
                    // reset header checkbox
                    ns.updateMainCheckbox();
                    // disable multiselect
                    ns.$detailList.data("multiselect", false);
                    ns.$detailToolbars.find(".detail-toolbar.active coral-accordion-item").attr("selected", false);
                    ns.refreshDetail();
                }, 1000);
            });
        };

        /**
         * Handler on activation of "Update language copies" panel
         */
        ns.$detailToolbars.on("coral-accordion:change", ".detail-toolbar.update coral-accordion", function(e) {
            adjustUpdateFormLayout();
        });

        /**
         * Handler for selection on existing language copies
         */
        ns.$detailList.on("click", "section", function() {
            adjustUpdateFormLayout()
        });

        $(document).on("keyup", ".detail-toolbar.update [name='projectTitle']", function(e) {
            adjustUpdateFormLayout();
        });

        /**
         * Handler for clicks on the "Go to Projects" button
         */
        $(document).on("click", ".detail section[data-type=languageCopy] .gotoprojects", function() {
            var $section = $(this).closest("section");
            var projectPath = $section.data('translation-project');
            if (projectPath) {
                window.open(projectDetails + projectPath);
            }
        });

        /**
         * Handler for clicks on the "Open Page" button while looking at a page which is currently being updated, so
         * that the page can be opened in the context of a launch.
         */
        $(document).on("click", ".detail section[data-type=languageCopy] .open-languagecopy-launch-page", function() {
            var $section = $(this).closest("section");
            var launchPath = $section.data('launch-path');
            var path = $section.data('path');
            if (launchPath) {
                var url = Granite.HTTP.externalize("/bin/wcmcommand");
                url += "?cmd=open";
                url += "&path=" + launchPath + path;
                window.open(url);
            }
        });

        /**
         * Handler for clicks on the "Promote" button while looking at a page which is currently being updated, so that
         * the launch can be promoted.
         */
        $(document).on("click", ".detail section[data-type=languageCopy] .promote-languagecopy-launch", function() {
            var $section = $(this).closest("section");
            var launchPath = $section.data('launch-path') + $section.data('path');

            if (launchPath) {
                location.href = Granite.HTTP.externalize("/libs/wcm/core/content/sites/promotelaunchwizard.html" + launchPath);
            }
        });

        /**
         * Handler for clicks on the "Update" button of a language copy list item.
         */
        $(document).on("click", ".detail section[data-type=languageCopy] .update", function(e) {
            var $section = $(this).closest("section");
            // gather POST data
            var data = {
                "_charset_": "utf-8",
                ":status": "browser",
                payloadType: "JCR_PATH",
                model: $(".detail-toolbar.update").data("workflowmodel"),

                deep: false,
                language: $section.data("source-language-code"),
                payload: $section.data("path"),
                projectType: "update",
                workflowLaunchTitle: getWorkflowLaunchTitle("", "")
            };
            var projectPath = $section.data("translation-project");
            if (projectPath) {
                data.projectPath = projectPath;
                data.translationWorkflowModel = translationProjectWorkflowModel;
            } else {
                data.translationWorkflowModel = translationWorkflowModel;
            }

            // submit POST request
            $.post(workflowServletURL, data).done(function() {
                setTimeout(function() {
                    ns.$detailToolbars.find(".detail-toolbar.active coral-accordion-item").attr("selected", false);
                    ns.refreshDetail();
                }, 1000);
            }).fail(function() {
                showNotification(Granite.I18n.get("Failed to start the language copy update workflow for language {0}", [languageCode]), "error");
            });
        });
    });

}(document, Granite.References));
