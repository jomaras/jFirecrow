(function() {
    /*************************************************************************************/
    var ValueTypeHelper = Firecrow.ValueTypeHelper;
    var ASTHelper = Firecrow.ASTHelper;

    var Browser = Firecrow.Browser = function(pageModel)
    {
        this.pageModel = pageModel;

        this.hostDocument = Firecrow.getDocument();
        this._clearHostDocument();

        this.globalObject = new Firecrow.N_Interpreter.GlobalObject(this, this.hostDocument);
        this.dependencyGraph = new Firecrow.N_DependencyGraph.Graph();

        this.cssRules = [];

        this.loadingEventsExecuted = false;

        this._matchesSelector = Element.prototype.matchesSelector || Element.prototype.mozMatchesSelector || Element.prototype.webkitMatchesSelector;
    };

    Browser.notifyError = function(message) { debugger; alert("Browser - " + message); };

    Browser.prototype =
    {
        _clearHostDocument: function()
        {
            this.hostDocument.head.innerHTML = "";
            this.hostDocument.body.innerHTML = "";
        },

        evaluatePage: function()
        {
            this._buildSubtree(this.pageModel.htmlElement, null);
            this._handleEvents();
        },

        executeLoadingEvents: function()
        {
            var loadedHandlers = this.globalObject.getLoadedHandlers();

            for(var i = 0; i < loadedHandlers.length; i++)
            {
                this.executeEvent(loadedHandlers[i]);
            }

            this.setLoadingEventsExecuted();
        },

        executeAjaxEvents: function()
        {
            var ajaxEvents = this.globalObject.ajaxHandlers;

            for(var i = 0; i < ajaxEvents.length; i++)
            {
                var ajaxEvent = ajaxEvents[i];
                if(!ajaxEvent.hasBeenHandled)
                {
                    this.executeEvent(ajaxEvent);
                    ajaxEvent.hasBeenHandled = true;
                }
            }
        },

        noOfTimingEventsExe: 0,
        executeTimingEvents: function()
        {
            var events = this._getTimingEventsSortedByRegistrationPoint();

            while(events.length != 0 && this.noOfTimingEventsExe < 3)
            {
                var event = events[0];
                console.log("Executing event");
                this._interpretJsCode
                (
                    event.handlerConstruct.body,
                    {
                        functionHandler: event.handler,
                        thisObject: this.globalObject,
                        argumentValues: event.callArguments,
                        registrationPoint: event.registrationPoint
                    }
                );

                if(event.eventType == "timeout")
                {
                    var eventIndex = this.globalObject.timeoutHandlers.indexOf(event);

                    if(eventIndex != -1)
                    {
                        ValueTypeHelper.removeFromArrayByIndex(this.globalObject.timeoutHandlers, event);
                    }
                }

                events = this._getTimingEventsSortedByRegistrationPoint();
                this.noOfTimingEventsExe++;
            }
        },

        _getTimingEventsSortedByRegistrationPoint: function()
        {
            var events = this.globalObject.timeoutHandlers.concat(this.globalObject.intervalHandlers);

            events.sort(function(event1, event2)
            {
                return event1.registrationPoint.evaluationPositionId.currentCommandId - event2.registrationPoint.evaluationPositionId.currentCommandId;
            });

            return events;
        },

        clear: function(){},

        getEventRegistrations: function()
        {
            return this.globalObject.timeoutHandlers.concat(this.globalObject.intervalHandlers)
                       .concat(this.globalObject.htmlElementEventHandlingRegistrations)
                       .concat(this.globalObject.ajaxHandlers);
        },

        setLoadingEventsExecuted: function()
        {
            this.loadingEventsExecuted = true;
        },

        executeEvent: function(eventInfo, argumentValues)
        {
            if(eventInfo == null) { return; }

            var handlerConstruct = eventInfo.handler.codeConstruct;

            this._interpretJsCode
            (
                handlerConstruct.body,
                {
                    functionHandler: eventInfo.handler,
                    thisObject: eventInfo.thisObject,
                    argumentValues: argumentValues || [],
                    registrationPoint: eventInfo.registrationPoint
                }
            );

            if(eventInfo.eventType == "onreadystatechange")
            {
                eventInfo.thisObject.updateToNext();
            }
        },

        _buildSubtree: function(htmlModelElement, parentDomElement)
        {
            var htmlDomElement = this._createStaticHtmlNode(htmlModelElement);
            if(htmlDomElement == null) { return; }
            htmlModelElement.hasBeenExecuted = true;

            this._setAttributes(htmlDomElement, htmlModelElement);
            this._insertIntoDom(htmlDomElement, parentDomElement);

            if(this.globalObject.satisfiesDomSlicingCriteria(htmlDomElement))
            {
                Firecrow.includeNode(htmlModelElement);
                htmlModelElement.isUiControlElement = true;
            }

            if(this._isScriptNode(htmlModelElement) || this._isCssInclusionNode(htmlModelElement))
            {
                if(this._isScriptNode(htmlModelElement)) { this._handleScriptNode(htmlModelElement); }
                else if(this._isCssInclusionNode(htmlModelElement)) { this._buildCssNodes(htmlModelElement); }

                if(htmlModelElement.textContent)
                {
                    htmlDomElement.textContent = htmlModelElement.textContent;
                }
            }

            this.createDependenciesBetweenHtmlNodeAndCssNodes(htmlModelElement);
            this._processChildren(htmlDomElement, htmlModelElement);
        },

        _handleScriptNode: function(htmlModelElement)
        {
            this._buildJavaScriptNodes(htmlModelElement);
            this._interpretJsCode(htmlModelElement.pathAndModel.model, null);
        },

        _isScriptNode: function(htmlModelElement)
        {
            return  htmlModelElement.type == "script";
        },

        _isCssInclusionNode: function(htmlModelElement)
        {
            return htmlModelElement.type == "style" || this._isExternalStyleLink(htmlModelElement);
        },

        _setAttributes: function(htmlDomElement, htmlModelElement)
        {
            var attributes = htmlModelElement.attributes;

            if(attributes == null || htmlModelElement.type == "textNode") { return; }

            for(var i = 0, length = attributes.length; i < length; i++)
            {
                var attribute = attributes[i];

                htmlDomElement[attribute.name] = attribute.value;
                htmlDomElement.setAttribute(attribute.name, attribute.value);
            }
        },

        _processChildren: function(htmlDomElement, htmlModelElement)
        {
            var childNodes = htmlModelElement.childNodes;

            if(childNodes == null) { return; }

            for(var i = 0, length = childNodes.length; i < length; i++)
            {
                this._buildSubtree(childNodes[i], htmlDomElement);
            }
        },

        _createStaticHtmlNode: function(htmlModelNode)
        {
            var htmlDomElement = null;

            switch(htmlModelNode.type)
            {
                case "html":
                    htmlDomElement = this.hostDocument.documentElement;
                    break;
                case "head":
                case "body":
                    htmlDomElement = this.hostDocument[htmlModelNode.type];
                    break;
                case "textNode":
                    htmlDomElement = this.hostDocument.createTextNode(htmlModelNode.textContent);
                    break;
                default:
                    htmlDomElement = this._isExternalStyleLink(htmlModelNode) ? this.hostDocument.createElement("style")
                                                                              : this.hostDocument.createElement(htmlModelNode.type);
            }

            htmlDomElement.modelElement = htmlModelNode;

            this.dependencyGraph.createHtmlNode(htmlModelNode);

            return htmlDomElement;
        },

        _isExternalStyleLink: function(htmlModelElement)
        {
            if(htmlModelElement == null || htmlModelElement.type != "link" || htmlModelElement.attributes == null || htmlModelElement.attributes.length == 0) { return false; }

            for(var i = 0; i < htmlModelElement.attributes.length; i++)
            {
                var attribute = htmlModelElement.attributes[i];

                if(attribute.name == "type" && attribute.value == "text/css") { return true; }
                else if (attribute.name == "rel" && attribute.value == "stylesheet") { return true; }
            }

            return false;
        },

        generateEvalCommands: function(callExpression, codeModel)
        {
            var that = this;

            ASTHelper.traverseAst(codeModel, function(currentNode, nodeName, parentNode)
            {
                that.dependencyGraph.createDynamicJsNode(currentNode);
                that.dependencyGraph.insertNode(currentNode, ASTHelper.isProgram(parentNode) ? callExpression : parentNode);
            });

            this.interpreter.generateEvalCommands(callExpression, codeModel);

            if(callExpression.arguments != null && callExpression.arguments[0] != null)
            {
                this.globalObject.dependencyCreator.createDataDependency(callExpression.arguments[0], callExpression, this.globalObject.getPreciseEvaluationPositionId());
            }
        },

        _interpretJsCode: function(codeModel, handlerInfo)
        {
            this.interpreter = new Firecrow.N_Interpreter.Interpreter(codeModel, this.globalObject, handlerInfo);

            this.globalObject.dependencyCreator = new Firecrow.N_Interpreter.DependencyCreator(this.globalObject, this.interpreter.executionContextStack);

            this.interpreter.runSync();

            this.interpreter.destruct();
            delete this.interpreter;
            this.interpreter = null;

            this.globalObject.registerPreRegisteredAjaxEvents();
        },

        _insertIntoDom: function(htmlDomElement, parentDomElement)
        {
            if (htmlDomElement.tagName != null
             &&(htmlDomElement.tagName.toLowerCase() == "html"
             || htmlDomElement.tagName.toLowerCase() == "head"
             || htmlDomElement.tagName.toLowerCase() == "body"))
            {
                return;
            }

            if(htmlDomElement.tagName != null && htmlDomElement.tagName.toLowerCase() == "script")
            {
                //This is necessary in order to disable the automatic in-browser interpretation of script code
                htmlDomElement.type="DONT_PROCESS_SCRIPT";
            }

            parentDomElement == null ? this.hostDocument.appendChild(htmlDomElement)
                                     : parentDomElement.appendChild(htmlDomElement);

            this.dependencyGraph.insertNode(htmlDomElement.modelElement, parentDomElement != null ? parentDomElement.modelElement : null);
        },

        _buildCssNodes: function(cssHtmlElementModelNode)
        {
            cssHtmlElementModelNode.cssRules = cssHtmlElementModelNode.pathAndModel.model.rules;

            var cssText = "";

            for(var i = 0; i < cssHtmlElementModelNode.cssRules.length; i++)
            {
                var cssRule = cssHtmlElementModelNode.cssRules[i];
                cssRule.hasBeenExecuted = true;

                cssText += cssRule.cssText;
                this.cssRules.push(cssRule);

                this.dependencyGraph.createCssNode(cssRule);
                this.dependencyGraph.insertNode(cssRule, cssHtmlElementModelNode);
            }

            if(this._isExternalStyleLink(cssHtmlElementModelNode))
            {
                if(cssHtmlElementModelNode.domElement != null)
                {
                    cssHtmlElementModelNode.domElement.textContent = cssText;
                }
            }
        },

        createDependenciesBetweenHtmlNodeAndCssNodes: function(htmlModelNode)
        {
            if(htmlModelNode == null || htmlModelNode.type == "textNode") { return; }

            var cssRules = this.cssRules;

            for(var i = 0, length = cssRules.length; i < length; i++)
            {
                var cssRule = cssRules[i];

                if(this.matchesSelector(htmlModelNode.domElement, cssRule.selector))
                {
                    this.dependencyGraph.createDependency(htmlModelNode, cssRule, this.globalObject.getPreciseEvaluationPositionId(), null, null, true);
                }
            }
        },

        matchesSelector: function(htmlElement, selector)
        {
            if(htmlElement == null || this._matchesSelector == null || selector == null
            || ValueTypeHelper.isDocumentFragment(htmlElement) || ValueTypeHelper.isTextNode(htmlElement)
            || ValueTypeHelper.isDocument(htmlElement)) { return false; }

            if(selector.indexOf(":hover") != -1 || selector.indexOf(":active") != -1)
            {
                selector = selector.replace(/:hover|:active/gi, "");
            }

            try
            {
                return this._matchesSelector.call(htmlElement, selector);
            }
            catch(e)
            {
                //debugger;
                return false;
            }
        },

        _buildJavaScriptNodes: function(scriptHtmlElementModelNode)
        {
            var that = this;

            ASTHelper.traverseAst(scriptHtmlElementModelNode.pathAndModel.model, function(currentNode, nodeName, parentNode)
            {
                that.dependencyGraph.createJsNode(currentNode);
                that.dependencyGraph.insertNode(currentNode, ASTHelper.isProgram(parentNode) ? scriptHtmlElementModelNode : parentNode);
            });
        },

        _isExecutionWithinHandler: function(eventTrace, handlerConstruct)
        {
            if(eventTrace == null || handlerConstruct == null) { return false; }

            //TODO FF15 removed source: handlerConstruct.loc.source.replace("///", "/") == eventFile add this also when compensate
            return eventTrace.line >= handlerConstruct.loc.start.line && eventTrace.line <= handlerConstruct.loc.end.line;
        },

        _isBrowserGeneratedEvent: function(eventTrace)
        {
            if (eventTrace == null || eventTrace.args == null) { return false; }

            return eventTrace.args.type === "" || eventTrace.args.type == "load"
                || eventTrace.args.type == "DOMContentLoaded";
        },

        _isElementEvent: function(eventTrace, eventType)
        {
            if (eventTrace == null || eventTrace.args == null) { return false; }

            return eventTrace.args.type == eventType || "on" + eventTrace.args.type == eventType
                || eventTrace.args.type == "elementEvent";
        },

        _handleEvents: function()
        {
            if(this.pageModel.eventTraces == null) { return; }

            this.globalObject.document.addProperty("readyState", new Firecrow.N_Interpreter.fcValue("complete", null, null));

            var eventTraces = this.pageModel.eventTraces;

            var domContentReadyMethods = this.globalObject.getDOMContentLoadedHandlers();
            var onLoadFunctions = this.globalObject.getOnLoadFunctions();

            var htmlElementEvents = this.globalObject.htmlElementEventHandlingRegistrations;
            var timeoutEvents = this.globalObject.timeoutHandlers;
            var intervalEvents = this.globalObject.intervalHandlers;

            for(var i = 0, length = eventTraces.length; i < length; i++)
            {
                var eventTrace = eventTraces[i];

                this._adjustCurrentInputStates(eventTrace.args.currentInputStates);

                this.globalObject.currentEventTime = eventTrace.currentTime;

                if(eventTrace.args.type == "focus") continue;
                if(eventTrace.args.type == "unload" && i == 0) continue;

                if(this._isBrowserGeneratedEvent(eventTrace))
                {
                    if(this._handleDomContentReadyMethods(domContentReadyMethods, eventTrace)) { continue; }
                    if(this._handleOnLoadMethod(onLoadFunctions, eventTrace)) { continue; }
                    if(this._handleTimingEvents(intervalEvents, timeoutEvents, eventTrace)) { continue; }
                }
                else
                {
                    this._handleHtmlEvents(htmlElementEvents, eventTrace);
                }

                if(!eventTrace.hasBeenHandled)
                {
                    console.log(eventTrace.args.type + "@" + eventTrace.line + " not handled!");
                }
                else
                {
                    console.log(eventTrace.args.type + "@" + eventTrace.line + " handled!");
                }
            }

            console.log("Events handled");
        },

        _handleDomContentReadyMethods: function(domContentReadyMethods, eventTrace)
        {
            var domContentReadyInfo = domContentReadyMethods[0];

            if(domContentReadyInfo != null)
            {
                var handlerConstruct = domContentReadyInfo.handler.codeConstruct;

                if(this._isExecutionWithinHandler(eventTrace, handlerConstruct))
                {
                    this._interpretJsCode
                    (
                        handlerConstruct.body,
                        {
                            functionHandler: domContentReadyInfo.handler,
                            thisObject: domContentReadyInfo.thisObject,
                            argumentValues: [],
                            registrationPoint: domContentReadyInfo.registrationPoint
                        }
                    );

                    eventTrace.hasBeenHandled = true;

                    domContentReadyMethods.shift();
                    return true;
                }
            }

            return false;
        },

        _handleOnLoadMethod: function(onLoadFunctions, eventTrace)
        {
            for(var i = 0; i < onLoadFunctions.length; i++)
            {
                var onLoadInfo = onLoadFunctions[i];

                var handlerConstruct = onLoadInfo.handler.codeConstruct;

                if(this._isExecutionWithinHandler(eventTrace, handlerConstruct))
                {
                    this._interpretJsCode
                    (
                        handlerConstruct.body,
                        {
                            functionHandler: onLoadInfo.handler,
                            thisObject: this.globalObject,
                            argumentValues: this._getArguments(eventTrace.args, this.globalObject),
                            registrationPoint: onLoadInfo.registrationPoint
                        }
                    );

                    eventTrace.hasBeenHandled = true;

                    ValueTypeHelper.removeFromArrayByIndex(onLoadFunctions, i);
                    return true;
                }
            }

            return false;
        },

        _handleTimingEvents: function(intervalEvents, timeoutEvents, eventTrace)
        {
            for(var j = 0, intervalLength = intervalEvents.length; j < intervalLength; j++)
            {
                var event = intervalEvents[j];

                var handlerConstruct = event.handler.codeConstruct;

                if(this._isExecutionWithinHandler(eventTrace, handlerConstruct))
                {
                    this._interpretJsCode
                    (
                        handlerConstruct.body,
                        {
                            functionHandler: event.handler,
                            thisObject: this.globalObject,
                            argumentValues: event.callArguments,
                            registrationPoint: event.registrationPoint
                        }
                    );

                    eventTrace.hasBeenHandled = true;

                    break;
                }
            }

            for(var j = 0, timeoutLength = timeoutEvents.length; j < timeoutLength; j++)
            {
                var event = timeoutEvents[j];

                var handlerConstruct = event.handler.codeConstruct;

                if(this._isExecutionWithinHandler(eventTrace, handlerConstruct))
                {
                    this._interpretJsCode
                    (
                        handlerConstruct.body,
                        {
                            functionHandler: event.handler,
                            thisObject: this.globalObject,
                            argumentValues: event.callArguments,
                            registrationPoint: event.registrationPoint
                        }
                    );

                    eventTrace.hasBeenHandled = true;

                    if(j < timeoutEvents.length)
                    {
                        ValueTypeHelper.removeFromArrayByIndex(timeoutEvents, j);
                    }

                    break;
                }
            }
        },

        _handleHtmlEvents: function(htmlElementEvents, eventTrace)
        {
            var targetElement = this._getElementByXPath(eventTrace.args.targetXPath);
            var thisElement = this._getElementByXPath(eventTrace.thisValue.xPath);

            if(eventTrace.args != null && eventTrace.args.type == "readystatechange")
            {
                targetElement = this.globalObject.document.implementationObject;
                thisElement = this.globalObject.document.implementationObject;
            }

            var event = this._getMatchingEventTrace(htmlElementEvents, eventTrace, targetElement, thisElement);

            if(event == null)
            {
                event = this._getMatchingEventTrace(htmlElementEvents, eventTrace, targetElement, thisElement, true);
            }

            if(event != null)
            {
                var eventThisObject = new Firecrow.N_Interpreter.fcValue(event.fcHtmlElement.htmlElement, event.fcHtmlElement, null);
                var handlerConstruct = event.handler.codeConstruct;

                this._interpretJsCode
                (
                    handlerConstruct.body,
                    {
                        functionHandler: event.handler,
                        thisObject: eventThisObject,
                        argumentValues: this._getArguments(eventTrace.args, eventThisObject),
                        registrationPoint: event.registrationPoint
                    }
                );

                eventTrace.hasBeenHandled = true;
            }
        },

        _getMatchingEventTrace: function(htmlElementEvents, eventTrace, targetElement, thisElement, allowAncestors)
        {
            for(var i = 0, htmlEventsLength = htmlElementEvents.length; i < htmlEventsLength; i++)
            {
                var event = htmlElementEvents[i];
                var fcHtmlElement = event.fcHtmlElement;

                if(!fcHtmlElement.isGlobalObject)
                {
                    //if the xPath matches or if the event raising element is within the event handling element
                    if(allowAncestors)
                    {
                        if(!this._isElementOrAncestor(fcHtmlElement.htmlElement, targetElement)
                        && !this._isElementOrAncestor(fcHtmlElement.htmlElement, thisElement)) { continue; }
                    }
                    else
                    {
                        if(fcHtmlElement.htmlElement != targetElement
                        && fcHtmlElement.htmlElement != thisElement) { continue; }
                    }
                }

                if(this._isElementEvent(eventTrace, event.eventType))
                {
                    var handlerConstruct = event.handler.codeConstruct;

                    if(this._isExecutionWithinHandler(eventTrace, handlerConstruct))
                    {
                        return event;
                    }
                }
            }
        },

        _adjustCurrentInputStates: function(currentInputStates)
        {
            if(currentInputStates == null || currentInputStates.length == 0) { return; }

            for(var i = 0, length = currentInputStates.length; i < length; i++)
            {
                var inputState = currentInputStates[i];

                var wrappedElement = this.globalObject.document.getElementByXPath(inputState.elementXPath)

                if(wrappedElement != null && wrappedElement.value != null)
                {
                    var element = wrappedElement.value;
                    element.checked = inputState.checked;
                    element.value = inputState.value;
                }

                if(wrappedElement != null && wrappedElement.jsValue != null)
                {
                    var element = wrappedElement.jsValue;
                    element.checked = inputState.checked;
                    element.value = inputState.value;
                }
            }
        },

        createDependency: function(sourceNode, targetNode, dependencyCreationInfo, destinationNodeDependencyInfo, shouldNotFollowDependencies, isValueDependency)
        {
            if(sourceNode == null || targetNode == null) { return; }

            this.dependencyGraph.createDependency
            (
                sourceNode, targetNode, dependencyCreationInfo,
                destinationNodeDependencyInfo, shouldNotFollowDependencies, isValueDependency
            );
        },

        logImportantConstructEvaluated: function(node)
        {
            this.dependencyGraph.logImportantConstructEvaluated(node);
        },

        registerSlicingCriteria: function(slicingCriteria)
        {
            this.globalObject.registerSlicingCriteria(slicingCriteria);
        },

        _isElementOrAncestor: function(potentialAncestor, element)
        {
            if(element == null || potentialAncestor == null) { return false;}
            if(element == potentialAncestor) { return true; }
            if(element.parentElement == null) { return false; }

            if(potentialAncestor.nodeType == 9) { return true; } //document is ancestor to all!

            element = element.parentElement;

            while(element != null)
            {
                if(element == potentialAncestor) { return true; }

                element = element.parentElement;
            }

            return false;
        },

        _getElementByXPath: function(xPath)
        {
            if(xPath == "window" || xPath == "") { return this.globalObject; }
            if(xPath == "document") { return this.globalObject.document.implementationObject; }

            return this.globalObject.document.implementationObject.evaluate
            (
                xPath,
                this.globalObject.document.implementationObject,
                null, XPathResult.FIRST_ORDERED_NODE_TYPE,
                null
            ).singleNodeValue;
        },

        _getElementXPath: function(element)
        {
            var paths = [];

            for (; element && element.nodeType == 1; element = element.parentNode)
            {
                var index = 0;
                for (var sibling = element.previousSibling; sibling; sibling = sibling.previousSibling)
                {
                    if (sibling.localName == element.localName)
                    {
                        ++index;
                    }
                }

                var tagName = element.localName.toLowerCase();
                var pathIndex = (index ? "[" + (index+1) + "]" : "");
                paths.splice(0, 0, tagName + pathIndex);
            }

            return paths.length ? "/" + paths.join("/") : "";
        },

        _getArguments: function(eventTraceArgs, thisValue)
        {
            var arguments = [];

            var eventInfo = {};
            var eventInfoJsObject = new Firecrow.N_Interpreter.Event(eventInfo, this.globalObject, thisValue);

            for(var propName in eventTraceArgs)
            {
                if(propName == "currentInputStates") { continue; }

                if(propName.indexOf("XPath") != -1)
                {
                    var element =  this.globalObject.document.getElementByXPath(eventTraceArgs[propName]);
                    propName = propName.replace("XPath", "");
                    eventInfoJsObject.addProperty(propName, element);
                    eventInfo[propName] = element;
                }
                else
                {
                    var value = this.globalObject.internalExecutor.createInternalPrimitiveObject(null, eventTraceArgs[propName]);
                    eventInfoJsObject.addProperty(propName, value);
                    eventInfo[propName] = value;
                }
            }

            arguments.push(new Firecrow.N_Interpreter.fcValue(eventInfo, eventInfoJsObject, null));

            return arguments;
        },

        destruct: function()
        {
            Browser.LAST_USED_ID = 0;

            delete this.pageModel;

            this.hostDocument = null;
            delete this.hostDocument;

            this.globalObject.destruct();
            delete this.globalObject;

            delete this.cssRules;
        },

        notifyError: function(message) { Browser.notifyError(message); }
    };
})();