/*
 ADOBE CONFIDENTIAL

 Copyright 2017 Adobe Systems Incorporated
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

(function($, ns, window) {
    "use strict";

    var ATTR_DATA_MIME_TYPE = "data-accepts-mimetype";
    ns.multieditor = {};
    ns.multieditor.events = {
        SWITCH_TO_FULLSCREEN_VIEW : "switch-to-fullscreen-view",
        SWITCH_TO_FORM_VIEW: "switch-to-form-view",
        EDITING_STARTED_FOR_MIME_TYPE: "editing-started-for-mime-type",
        ACTIVE_EDITOR_BLUR: "active-editor-blur",
        ACTIVE_EDITOR_FOCUS: "active-editor-focus"
    };
    ns.multieditor.constants = {
        ATTR_DATA_INPUT_FIELD: "data-cfm-multieditor-inputfield",
        ATTR_DATA_RICHTEXT_EDITABLE:  "data-cfm-richtext-editable",
        CONTAINER_ROOT_CLASS: "content-fragment-editor",
        MULTI_EDITOR_CONTAINER_CLASS: "cfm-multieditor",
        ATTR_DATA_MANAGER: "multiEditorManager",
        MARKDOWN_MIME_TYPE: "text/x-markdown",
        PLAINTEXT_MIME_TYPE: "text/plain",
        RICHTEXT_MIME_TYPE: "text/html"
    };

    var constants = ns.multieditor.constants;
    var channel = $(window.document);

    var MultiEditorRegistry = function() {
        //constructor
        this._editors = [];
        this._mimeTypes = [];
    };

    MultiEditorRegistry.prototype.register = function(editor, dom) {
        if (dom.getAttribute(ATTR_DATA_MIME_TYPE) !== editor.getMimeType()) {
            throw new Error("Mime type mismatch between dom and editor.");
        }
        if (this.getEditorForElement(dom)) {
            throw new Error("There is already an editor registered for this dom.");
        }
        this._editors.push({
            "editor" : editor,
            "dom": dom
        });
        if (this._mimeTypes.indexOf(editor.getMimeType()) === -1) {
            this._mimeTypes.push(editor.getMimeType());
        }
    };

    MultiEditorRegistry.prototype.getEditorForElement = function(dom) {
        var editorObj;
        for (var index = 0; index < this._editors.length; index++) {
            editorObj = this._editors[index];
            if (editorObj.dom === dom) {
                return editorObj.editor;
            }
        }
    };

    MultiEditorRegistry.prototype.getAllMimeTypes = function() {
        return this._mimeTypes;
    };

    /**
     * An editor which manages multiple registered editors (of type CFMEditor). Each CFMEditor is linked with a
     * dom element which should be present in the subtree of a root element.
     * @param {HTMLElement} $root - A container dom which is used as the root element for this editor.
     */
    ns.MultiEditor = function($root) {
        // class creator
        this._activeEditor = undefined;
        this._registry = new MultiEditorRegistry();
        this.$root = $root;
        this.$dialog = this.$root.find("coral-dialog");
        this.$dialog[0].focusOnShow = "off";
        this.$formView = this.$root.find("[data-form-view-container=true]");
        this.$textField = this.$root.find("[" + constants.ATTR_DATA_INPUT_FIELD + "=true]");
        this._addInternalEventListeners();
        this._plugins = {};
        this._initializePlugins();
        this._registeredListeners = {};
        this.$_topLabel = this.$root.find(".cfm-multieditor-top-label");
        this.$_embeddedLabel = this.$root.find(".cfm-multieditor-embedded-label");
        this.$multiFieldItem = this.$root.hasClass('js-multiEditor-multiField-id');
        for (var key in ns.multieditor.events) {
            if (ns.multieditor.events.hasOwnProperty(key)) {
                this._registeredListeners[ns.multieditor.events[key]] = [];
            }
        }
        if (this.$multiFieldItem) {
            this.$_embeddedLabel.addClass("hidden");
        }
    };

    ns.MultiEditor.prototype._addInternalEventListeners = function() {
        var self = this, $fullscreenStartBtn = this.$root.find("[data-action='cfm-fullscreen#start']");
        $fullscreenStartBtn.on("mousedown", function(e) {
            // indicate that the editor blur would be due to click on fullscreen toggle button
            self.isBlurFromFullscreenToggle = true;
        });
        $fullscreenStartBtn.on("click", function(e){
            self.switchToFullscreenView.call(self, true);
            e.preventDefault();
            e.stopPropagation();
        });
        this.$dialog.on("click", "[data-action='cfm-fullscreen#end']",function(e){
            self.switchToFormView.call(self, true);
            e.preventDefault();
            e.stopPropagation();
        });
        this.$dialog.on("mousedown", "[data-action='cfm-fullscreen#end']",function(e) {
            // indicate that the editor blur would be due to click on fullscreen toggle button
            self.isBlurFromFullscreenToggle = true;
        });
    };

    ns.MultiEditor.prototype.registerEditor = function(editor, dom) {
        this._registry.register(editor, dom);
    };

    ns.MultiEditor.prototype.registerListener = function(event, func, execContext) {
        this._registeredListeners[event].push({
            "func": func,
            "context": execContext
        });
    };

    ns.MultiEditor.prototype._triggerListeners = function(event) {
        var listeners = this._registeredListeners[event.type], listener;
        for (var index = 0; index < listeners.length; index++) {
            listener = listeners[index];
            listener.func.call(listener.context, event);
        }
    };

    ns.MultiEditor.prototype.start = function(mimeType, view) {
        var editorToStart, $element;
        if (view && view === "fullscreen") {
            $element = this.$dialog.find("[data-embedded-editor=true][" + ATTR_DATA_MIME_TYPE + "='" + mimeType + "']");
        } else {
            $element = this.$root.find("[data-form-view-container=true] [data-embedded-editor=true][" + ATTR_DATA_MIME_TYPE + "='" + mimeType + "']");
        }
        editorToStart = this._registry.getEditorForElement($element[0]);
        editorToStart.start();
        if (!this.$multiFieldItem) {
            if (editorToStart.hasToolbar()) {
                this.$_topLabel.removeClass("hidden");
                this.$_embeddedLabel.addClass("hidden");
            } else {
                this.$_topLabel.addClass("hidden");
                this.$_embeddedLabel.removeClass("hidden");
            }
        }
        this._activeEditor = editorToStart;
        // enable the fullscreen toggle buttons when editor regains focus
        this._activeEditor.addEventListener(function(e) {
            this.$root.find("[data-action='cfm-fullscreen#start']").removeAttr("disabled");
            this.$dialog.find("[data-action='cfm-fullscreen#end']").removeAttr("disabled");
            this._triggerListeners({
                "type": ns.multieditor.events.ACTIVE_EDITOR_FOCUS
            });
        }, "cfm-editor-focus", this);
        // disable the fullscreen toggle buttons on editor blur, if blur is not due to click on fullscreen toggle button
        this._activeEditor.addEventListener(function(e) {
            var self = this;
            if (self.isBlurFromFullscreenToggle) {
                self.isBlurFromFullscreenToggle = false;
                return;
            }
            self.$root.find("[data-action='cfm-fullscreen#start']").attr("disabled", "true");
            self.$dialog.find("[data-action='cfm-fullscreen#end']").attr("disabled", "true");
            this._triggerListeners({
                "type": ns.multieditor.events.ACTIVE_EDITOR_BLUR
            });
        }, "cfm-editor-blur", this);
        this._triggerListeners({
            "type": ns.multieditor.events.EDITING_STARTED_FOR_MIME_TYPE,
            "mimeType": mimeType
        });
        if (this._activeEditor.rte && this._activeEditor.rte.editorKernel) {
            this._activeEditor.rte.editorKernel.addPluginListener("sourceedit", (e) => {
                const enabled = (e && e.enabled) || false;
                this.$root.data("rtePluginSourceeditEnabled", enabled);
                const toggleEvent = new CustomEvent('rte-plugin-sourceedit-toggle', {
                    'bubbles': true,
                    detail: {enabled: enabled}
                });
                this.$root[0].dispatchEvent(toggleEvent);
            }, this, this, false);
        }
    };
    ns.MultiEditor.prototype.switchEditor = function(mimeType) {
        var value = this.getValue();
        var self = this;
        var values = [];
        var multiEditorArray = [];
        var mulFieldItems;
        var currentOpenedItemIndex;
        if (self.$multiFieldItem) {
            var openedEditorItemIndex = self.$root.closest("coral-multifield-item").attr('aria-posinset');
            var $fields = self.$root.closest("coral-multifield");
            $fields.each(function() {
                var $this = $(this);
                if ($this.is("coral-multifield")) {
                    mulFieldItems = this.items.getAll();
                    for (index = 0; index < mulFieldItems.length; index++) {
                        var $content = $(mulFieldItems[index].content);
                        var $valueField = $content.find("[data-cfm-multieditor-inputfield=\"true\"]").first();
                        if ($valueField.length) {
                            var $editorContainer, multiEditorManager, multiEditor;
                            $editorContainer = $valueField.closest("." + constants.CONTAINER_ROOT_CLASS);
                            multiEditorManager = $editorContainer.data("multiEditorManager");
                            multiEditor = multiEditorManager.getEditor($valueField.closest(".cfm-multieditor"));
                            values.push(multiEditor.getValue())
                            multiEditorArray.push(multiEditor);
                        }
                    }
                }
            });
        }


        var loadCallback = function(isSuccess, content) {
            if (isSuccess) {
                //condition to handle multilineTextEditor (Array) type
                if (Array.isArray(content)) {
                    if (content.length !== multiEditorArray.length) {
                        return;
                    }
                    content.forEach(function(eachItemValue, index) {
                        var multiEditor = multiEditorArray[index];
                        multiEditor._activeEditor.end();
                        multiEditor.$textField.val(eachItemValue);
                        multiEditor.$textField.attr("data-content-type", mimeType);
                        if (openedEditorItemIndex && index === openedEditorItemIndex - 1) {
                            multiEditor.start(mimeType, "fullscreen");
                            multiEditor._activeEditor.focus();
                        } else {
                            multiEditor.start(mimeType);
                            multiEditor._activeEditor.focus();
                        }
                    });
                } else {
                    self._activeEditor.end();
                    self.$textField.val(content);
                    self.$textField.attr("data-content-type", mimeType);
                    self.start(mimeType, "fullscreen");
                    // enforce focus on the newly active editor, so the buttons and the
                    // focus state don't get out of sync; makes more sense here than to
                    // disable full screen mode switcher
                    self._activeEditor.focus();
                }
                channel.trigger(ns.constants.EVENT_CONTENT_FRAGMENT_FIELD_MODIFIED);
            }
        };
        var changeContentCallback = function(isSuccess) {
            if (isSuccess) {
                self._loadContent(loadCallback);
            }
        };
        this._changeContentType(changeContentCallback, {
            "content": self.$multiFieldItem ? values : value,
            "targetType": mimeType
        });
    };
    ns.MultiEditor.prototype._initializePlugins = function() {
        var self = this;
        var actionBar = this.$dialog.find("coral-actionbar")[0];
        Coral.commons.ready(actionBar, function() {
            self.plugins = ns.multieditor.plugins.PluginRegistry.createPlugins();
            var restoreButton;
            for (var plgId in self.plugins) {
                if (self.plugins.hasOwnProperty(plgId)) {
                    var rightItem = actionBar.secondary.items.add({});
                    var plugin = self.plugins[plgId];
                    if (!plugin.isEnabled()) {
                        continue;
                    }
                    plugin.setUp({
                        "multiEditor": self,
                        "uiContainer": rightItem
                    });
                    plugin.initializeUI();
                }
            }
            restoreButton = actionBar.secondary.items.add({}).appendChild(new Coral.Button());
            restoreButton.set({
                variant: "quiet",
                icon: "fullScreenExit",
                iconSize: "S",
                title: Granite.I18n.get("Exit full screen mode")
            });
            restoreButton.setAttribute("data-action", "cfm-fullscreen#end");
        });
    };

    ns.MultiEditor.prototype.focusEditor = function() {
        this._activeEditor.focus();
    };

    ns.MultiEditor.prototype.suspend = function() {
        this._activeEditor.suspend();
    };

    ns.MultiEditor.prototype.reactivate = function() {
        this._activeEditor.reactivate();
    };

    ns.MultiEditor.prototype._switchView = function(view, preserveEditingState) {
        var adapter = this._activeEditor.getEditorAdapter(), self = this, contextInfo;
        if (preserveEditingState) {
            adapter.extractContextInfo();
            contextInfo = adapter.getAdaptedContext(this._activeEditor);
        }
        var mimeType = this._activeEditor.getMimeType();
        this._activeEditor.end();
        this.start(mimeType, view);
        if (contextInfo) {
            if (view === "fullscreen") {
                Coral.commons.ready(this.$dialog[0], function(dialog) {
                    self._activeEditor.adaptToContext(contextInfo);
                });
            } else {
                this._activeEditor.adaptToContext(contextInfo);
            }
        }

    };

    /**
     * Switches the editor to fullscreen.
     * @param {Boolean} preserveEditingState - if set to true, the multi editor tries to preserve the editing state
     * (selection, undo state) from form view to fullscreen view, if currently active editor supports it.
     */
    ns.MultiEditor.prototype.switchToFullscreenView = function(preserveEditingState) {
        this.$dialog[0].show();
        this._switchView("fullscreen", preserveEditingState);
        this._triggerListeners({
            "type": ns.multieditor.events.SWITCH_TO_FULLSCREEN_VIEW
        });
    };

    /**
     * Switches the editor to form view.
     * @param {Boolean} preserveEditingState - if set to true, the multi editor tries to preserve the editing state
     * (selection, undo state) from fullscreen view to form view, if currently active editor supports it.
     */
    ns.MultiEditor.prototype.switchToFormView = function(preserveEditingState) {
        this.$dialog[0].hide();
        this._switchView("form", preserveEditingState);
        this._triggerListeners({
            "type": ns.multieditor.events.SWITCH_TO_FORM_VIEW
        });
    };

    /**
     *  Visually hides the Full Screen View of the MultiEditor.
     *  This might be useful in cases when plugins want to take over the whole screen, but a restart of the editor
     *  is not required such as the case with switchToFormView().
     */
    ns.MultiEditor.prototype.hideFullScreenView = function() {
        this.$dialog[0].hide();
    };

    /**
     *  Visually shows the Full Screen View of the MultiEditor.
     *  This might be useful in cases when plugins want to take over the whole screen, but a restart of the editor
     *  is not required such as the case with switchToFullscreenView().
     */
    ns.MultiEditor.prototype.showFullScreenView = function() {
        this.$dialog[0].show();
    };

    ns.MultiEditor.prototype.setValue = function(value) {
        this._activeEditor.setValue(value);
    };

    ns.MultiEditor.prototype.getElement = function() {
        return this.$textField.data("element");
    };

    ns.MultiEditor.prototype.getVariation = function() {
        return this.$textField.data("variation");
    };

    ns.MultiEditor.prototype.getValue = function() {
        return this._activeEditor.getValue();
    };

    ns.MultiEditor.prototype.getMimeType = function() {
        return this._activeEditor ? this._activeEditor.getMimeType() : this.$textField.data("contentType");
    };

    ns.MultiEditor.prototype.getAllMimeTypes = function() {
        return this._registry.getAllMimeTypes();
    };

    ns.MultiEditor.prototype.getPlainText = function() {
        return this._activeEditor.getPlainText();
    };

    ns.MultiEditor.prototype._changeContentType = function(callback, options) {
        var url = ns.EditSession.fragment.urlBase + ".cfm.content.json";
        if (!(options && options.targetType)) {
            throw new Error("Missing target type for content type conversion.");
        }

        var targetType = options.targetType;
        var content = (options && options.content) || this.getValue();
        var contentType = this.getMimeType();
        var data = {
            content: content,
            contentType: contentType,
            ":targetType": targetType,
            "_charset_": "utf-8"
        };

        var elementName = (options && options.element) || this.$textField.data("element");
        if (elementName) {
            data.element = elementName;
        }

        var variationName = (options && options.variation) || this.$textField.data("variation");
        if (variationName) {
            data.variation = variationName;
        }

        // notify modification before making request to change the content type
        ns.editor.Core.notifyModification();

        ns.RequestManager.schedule({
            request: {
                url: url,
                method: "post",
                dataType: "json",
                data: data,
                cache: false
            },
            type: ns.RequestManager.REQ_BLOCKING,
            condition: ns.RequestManager.COND_EDITSESSION,
            ui: ns.RequestManager.UI_MASK_IMMEDIATELY,
            handlers: {
                success: function(response) {
                    var isSuccess = (response.textStatus == "success");
                    if (callback) {
                        callback(isSuccess, false);
                    }
                },
                fail: function() {
                    // TODO error handling
                    if (callback) {
                        callback(false, false);
                    }
                }
            }
        });
    };

    ns.MultiEditor.prototype._loadContent = function (callback, uiType) {
        uiType = uiType || ns.RequestManager.UI_MASK_IMMEDIATELY;
        var url = ns.EditSession.fragment.urlBase + ".cfm.content.json";
        var search = "";

        var elementName = this.$textField.data("element");
        if (elementName) {
            search += "element=" + encodeURIComponent(elementName);
        }
        var variationName = this.$textField.data("variation");
        if (variationName) {
            if (search.length > 0) {
                search += "&";
            }
            search += "variation=" + encodeURIComponent(variationName);
        }
        //adding editorType attribute inorder to identify and add special handling in ContentServlet
        if (this.$multiFieldItem) {
            search += "&editorType=" + encodeURIComponent("multiEditorArray");
        }
        if (search) {
            url += "?" + search;
        }

        ns.RequestManager.schedule({
            request: {
                url: url,
                method: "get",
                dataType: "json",
                cache: false
            },
            type: ns.RequestManager.REQ_BLOCKING,
            condition: ns.RequestManager.COND_NONE,
            ui: uiType,
            handlers: {
                success: function(response) {
                    var isSuccess = (response.textStatus == "success");
                    if (callback) {
                        callback(isSuccess, response.data.content);
                    }
                },
                fail: function() {
                    // TODO error handling
                    if (callback) {
                        callback(false);
                    }
                }
            }
        });
    }

})(Granite.$, window.Dam.CFM, window);
