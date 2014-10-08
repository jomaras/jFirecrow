(function()
{
    /*************************************************************************************/
    var ValueTypeHelper = Firecrow.ValueTypeHelper;
    var GlobalObject;

    Firecrow.N_Interpreter.GlobalObject = GlobalObject = function(browser)
    {
        this.initObject(this);

        this._expandToFcValue();
        ValueTypeHelper.expand(this, Firecrow.N_Interpreter.EventListenerMixin);

        Firecrow.N_Interpreter.VariableObject.liftToVariableObject(this);

        this.internalExecutor = new Firecrow.N_Interpreter.InternalExecutor(this);

        this._setExecutionEnvironment(browser);
        this._detectExecutionEnvironmentProperties();

        this._createInternalPrototypes();
        this._createInternalObjects();
        this._createInternalVariables();
        this._createInternalFunctions();

        this._createSlicingVariables();

        this._createHandlerMaps();

        this._createEvaluationPositionProperties();

        this._EXECUTION_COMMAND_COUNTER = 0;
        this.TIMEOUT_ID_COUNTER = 0;
        this.DYNAMIC_NODE_COUNTER = 0;

        this.isGlobalObject = true;
        this.shouldTrackIdentifiers = GlobalObject.shouldTrackIdentifiers;
    };

    GlobalObject.notifyError = function(message) { debugger; alert("GlobalObject - " + message); }
    GlobalObject.CONST =
    {
        INTERNAL_PROPERTIES:
        {
            METHODS :
            [
                "decodeURI", "decodeURIComponent", "encodeURI",
                "encodeURIComponent", "eval", "isFinite", "isNaN",
                "parseFloat", "parseInt", "addEventListener", "removeEventListener",
                "setTimeout", "clearTimeout", "setInterval", "clearInterval",
                "getComputedStyle", "unescape", "escape", "alert",
                //Testing methods
                "assert", "assertEquals", "assertMatch", "assertNull", "assertNotNull", "assertEqual", "assertNotEquals"
            ],
            EVENT_PROPERTIES:
            [
                "onabort", "onbeforeunload", "onblur", "onchange", "onclick", "onclose",
                "oncontextmenu", "ondevicemotion", "ondeviceorientation", "ondragdrop",
                "onerror", "onfocus", "onhaschange", "onkeydown", "onkeypress", "onkeyup",
                "onload", "onmousedown", "onmousemove", "onmouseout", "onmouseover", "onmouseup",
                "onmozbeforepaint", "onpaint", "onpopstate", "onreset", "onresize", "onscroll",
                "onselect", "onsubmit", "onunload", "onpageshow", "onpagehide", "onmousewheel "
            ],
            SIZE_PROPERTIES: ["screenX", "screenY", "innerWidth", "innerHeight"]
        },
        isSizeProperty: function(propertyName) { return this.INTERNAL_PROPERTIES.SIZE_PROPERTIES.indexOf(propertyName) != -1; },
        isMethod: function(methodName) { return this.INTERNAL_PROPERTIES.METHODS.indexOf(methodName) != -1; },
        isEventProperty: function(propertyName) { return this.INTERNAL_PROPERTIES.EVENT_PROPERTIES.indexOf(propertyName) != -1; }
    };

    GlobalObject.prototype = new Firecrow.N_Interpreter.Object();

    GlobalObject.prototype.getJsPropertyValue = function(propertyName, codeConstruct)
    {
        var propertyValue = this.getPropertyValue(propertyName, codeConstruct);

        if(propertyValue === undefined) { this.browser.logAccessingUndefinedProperty(propertyName, codeConstruct); }
        if(GlobalObject.CONST.isSizeProperty(propertyName)) { this.browser.logAccessingSizeProperty(propertyName, codeConstruct); }

        return propertyValue;
    };

    GlobalObject.prototype.addJsProperty = function(propertyName, value, codeConstruct)
    {
        this.addProperty(propertyName, value, codeConstruct);

        if(GlobalObject.CONST.isEventProperty(propertyName))
        {
            this.eventHandlerPropertiesMap[propertyName] = codeConstruct;

            if(propertyName == "onresize")
            {
                this._registerResizeHandler(value, codeConstruct);
            }
        }
    };


    GlobalObject.prototype._registerResizeHandler = function(value, codeConstruct)
    {
        this.browser.executionInfo.logEventRegistered
        (
            "window",
            "window",
            "onresize",
            codeConstruct,
            value.codeConstruct,
            this.browser.loadingEventsExecuted
        );

        this.resizeHandlers.push
        ({
            handler: value,
            registrationPoint:
            {
                codeConstruct: codeConstruct,
                evaluationPositionId: this.getPreciseEvaluationPositionId()
            },
            registrationConstruct: codeConstruct,
            handlerConstruct: value.codeConstruct,
            thisObject: this,
            eventType: "onresize",
            thisObjectDescriptor: "window",
            thisObjectModel: "window"
        });
    };

    GlobalObject.prototype.registerTimeout = function(timeoutId, handler, timePeriod, callArguments, registrationPoint)
    {
        this.timeoutHandlers.push
        ({
            timeoutId: timeoutId,
            handler: handler,
            timePeriod: timePeriod,
            callArguments: callArguments,
            registrationPoint: registrationPoint,
            registrationConstruct: registrationPoint.codeConstruct,
            handlerConstruct: handler.codeConstruct,
            thisObject: this.globalObject,
            eventType: "timeout",
            thisObjectDescriptor: "window",
            thisObjectModel: "window"
        });

        this.browser.executionInfo.logEventRegistered
        (
            "window",
            "window",
            "timeout",
            registrationPoint.codeConstruct,
            handler.codeConstruct,
            this.browser.loadingEventsExecuted,
            timeoutId,
            timePeriod
        );
    };

    GlobalObject.prototype.unregisterTimeout = function(timeoutId, codeConstruct)
    {
        if(timeoutId == null) { return; }

        for(var i = 0; i < this.timeoutHandlers.length; i++)
        {
            if(this.timeoutHandlers[i].timeoutId == timeoutId)
            {
                this.dependencyCreator.createDataDependency
                (
                    this.timeoutHandlers[i].registrationPoint.codeConstruct,
                    codeConstruct,
                    this.timeoutHandlers[i].registrationPoint.evaluationPositionId,
                    this.getPreciseEvaluationPositionId()
                );

                ValueTypeHelper.removeFromArrayByIndex(this.timeoutHandlers, i);
                return;
            }
        }
    };

    GlobalObject.prototype.preRegisterAjaxEvent = function(baseObject, registrationPoint)
    {
        this.ajaxPreregistrations.push
        ({
            baseObject: baseObject,
            registrationPoint: registrationPoint
        });
    };

    GlobalObject.prototype.registerPreRegisteredAjaxEvents = function()
    {
        for(var i = 0; i < this.ajaxPreregistrations.length; i++)
        {
            var ajaxPreregistration = this.ajaxPreregistrations[i];

            this.registerAjaxEvent
            (
                ajaxPreregistration.baseObject,
                ajaxPreregistration.baseObject.getPropertyValue("onreadystatechange"),
                ajaxPreregistration.registrationPoint
            );
        }

        this.ajaxPreregistrations = [];
    };

    GlobalObject.prototype.registerAjaxEvent = function(baseObject, handler, registrationPoint)
    {
        //the onreadystatechange property does not have to be set before the
        this.ajaxHandlers.push
        ({
            thisObject: baseObject,
            ajaxObject: baseObject,
            handler: handler,
            registrationPoint: registrationPoint,
            registrationConstruct: registrationPoint.codeConstruct,
            handlerConstruct: handler.codeConstruct,
            eventType: "onreadystatechange",
            thisObjectDescriptor: "ajax",
            thisObjectModel: "ajax"
        });

        this.browser.executionInfo.logEventRegistered
        (
            "ajax",
            "ajax",
            "onreadystatechange",
            registrationPoint.codeConstruct,
            handler.codeConstruct,
            this.browser.loadingEventsExecuted
        );
    };

    GlobalObject.prototype.registerInterval = function(intervalId, handler, timePeriod, callArguments, registrationPoint)
    {
        this.intervalHandlers.push
        ({
            intervalId: intervalId,
            handler: handler,
            timePeriod: timePeriod,
            callArguments: callArguments,
            registrationPoint: registrationPoint,
            registrationConstruct: registrationPoint.codeConstruct,
            handlerConstruct: handler.codeConstruct,
            thisObject: this.globalObject,
            eventType: "interval",
            thisObjectDescriptor: "window",
            thisObjectModel: "window"
        });

        this.browser.executionInfo.logEventRegistered
        (
            "window",
            "window",
            "interval",
            registrationPoint.codeConstruct,
            handler.codeConstruct,
            this.browser.loadingEventsExecuted,
            intervalId,
            timePeriod
        );
    };

    GlobalObject.prototype.unregisterInterval = function(intervalId, codeConstruct)
    {
        if(intervalId == null) { return; }

        for(var i = 0; i < this.intervalHandlers.length; i++)
        {
            if(this.intervalHandlers[i].intervalId == intervalId)
            {
                var dependencyCreationInfo = this.getPreciseEvaluationPositionId();
                dependencyCreationInfo.shouldAlwaysBeFollowed = true;

                this.dependencyCreator.createDataDependency
                (
                    this.intervalHandlers[i].registrationPoint.codeConstruct,
                    codeConstruct,
                    dependencyCreationInfo,
                    this.getPreciseEvaluationPositionId()
                );

                ValueTypeHelper.removeFromArrayByIndex(this.intervalHandlers, i);

                return;
            }
        }

        this.browser.executionInfo.logEventDeRegistered(null, "interval", codeConstruct, intervalId);
    };

    GlobalObject._EVENT_HANDLER_REGISTRATION_POINT_LAST_ID = 0;
    GlobalObject.prototype.registerHtmlElementEventHandler = function(fcHtmlElement, eventType, handler, evaluationPosition)
    {
        var eventDescriptor =
        {
            fcHtmlElement: fcHtmlElement,
            eventType: eventType,
            handler: handler,
            registrationPoint: evaluationPosition,
            registrationConstruct: evaluationPosition.codeConstruct,
            handlerConstruct: handler.codeConstruct,
            thisObject: fcHtmlElement,
            id: GlobalObject._EVENT_HANDLER_REGISTRATION_POINT_LAST_ID++,
            thisObjectModel: this._getEventObjectModel(fcHtmlElement),
            thisObjectDescriptor: this._getEventObjectDescriptor(fcHtmlElement),
            thisObjectCssSelector: this._getEventObjectCssSelector(fcHtmlElement)
        };

        this.htmlElementEventHandlingRegistrations.push(eventDescriptor);

        this.browser.executionInfo.logEventRegistered
        (
            eventDescriptor.thisObjectDescriptor,
            eventDescriptor.thisObjectModel,
            eventType,
            evaluationPosition.codeConstruct,
            handler.codeConstruct,
            this.browser.loadingEventsExecuted,
            null,
            null,
            eventDescriptor.thisObjectCssSelector
        );
    };


    GlobalObject.prototype._getEventObjectDescriptor = function(eventObject)
    {
        if(eventObject.globalObject.document == eventObject) { return "document"; }
        if(eventObject.htmlElement != null) { return Firecrow.htmlHelper.getElementXPath(eventObject.htmlElement); }
        if(eventObject.globalObject == eventObject) { return "window"; }

        debugger;

        return "unknown base object in event";
    };

    GlobalObject.prototype._getEventObjectCssSelector = function(eventObject)
    {
        if(eventObject.globalObject.document == eventObject) { return "document"; }
        if(eventObject.globalObject == eventObject) { return "window"; }
        if(eventObject.htmlElement != null)
        {
            if(eventObject.htmlElement.nodeName == null) { debugger; }
            var type = eventObject.htmlElement.nodeName.toLowerCase();
            var id = eventObject.htmlElement.id;
            var classes = eventObject.htmlElement.className.replace(/(\s)+/g, ".")

            return type + (id != null && id != "" ? ("#" + id) : "")
                + (classes != null && classes != "" ? ("." + classes) : "");
        }

        debugger;

        return "unknown base object in event";
    };

    GlobalObject.prototype._getEventObjectModel = function(eventObject)
    {
        if(eventObject.htmlElement != null) { return eventObject.htmlElement.modelElement; }
        if(eventObject.globalObject.document == eventObject) { return "document"; }
        if(eventObject.globalObject == eventObject) { return "window"; }

        debugger;

        return null;
    };


    GlobalObject.prototype.isPrimitive = function() { return false; }

    GlobalObject.prototype.getSimplifiedUserSetGlobalProperties = function()
    {
        return this.convertToSimplifiedUserSetProperties(this.getUserSetGlobalProperties());

    };

    GlobalObject.prototype.convertToSimplifiedUserSetProperties = function(properties)
    {
        var simplifiedProperties = [];

        for(var i = 0; i < properties.length; i++)
        {
            var property = properties[i];
            simplifiedProperties.push
            ({
                name: property.name,
                declarationConstructId: property.declarationPosition.codeConstruct != null
                    ? property.declarationPosition.codeConstruct.nodeId
                    : -1,
                isEventProperty: GlobalObject.CONST.isEventProperty(property.name)
            });
        }

        return simplifiedProperties;
    };

    GlobalObject.prototype.getUserSetGlobalProperties = function()
    {
        var userSetGlobalProperties = [];

        for(var i = 0; i < this.properties.length; i++)
        {
            var property = this.properties[i];

            if(property.declarationPosition == null) { continue; }

            userSetGlobalProperties.push(property);
        }

        return userSetGlobalProperties;
    };

    GlobalObject.prototype.getSimplifiedEventHandlerPropertiesMap = function()
    {
        var simplifiedEventHandlerPropertiesMap = {};

        for(var handlerName in this.eventHandlerPropertiesMap)
        {
            simplifiedEventHandlerPropertiesMap[handlerName] = this.eventHandlerPropertiesMap[handlerName].nodeId;
        }

        return simplifiedEventHandlerPropertiesMap;
    }

    GlobalObject.prototype.getSimplifiedUserSetDocumentProperties = function()
    {
        return this.convertToSimplifiedUserSetProperties(this.document.getUserDefinedProperties());
    };

    GlobalObject.prototype.getUserSetDocumentProperties = function()
    {
        return this.document.getUserDefinedProperties();
    };

    GlobalObject.prototype.logCallbackExecution = function(callbackConstruct, callCallbackConstruct)
    {
        if(callbackConstruct == null) { return; }

        this.browser.callCallbackCalledCallbacks(callbackConstruct, callCallbackConstruct, this.getPreciseEvaluationPositionId());
    };

    GlobalObject.prototype.logResourceSetting = function(codeConstruct, resourcePath)
    {
        this.browser.logResourceSetting(codeConstruct, resourcePath);
    };

    GlobalObject.prototype.logForInIteration = function(codeConstruct, objectPrototype)
    {
        this.browser.logForInIteration(codeConstruct, objectPrototype);
    };

    GlobalObject.prototype.getLoadedHandlers = function()
    {
        return this.getDOMContentLoadedHandlers().concat(this.getOnLoadFunctions());
    };

    GlobalObject.prototype.simpleDependencyEstablished = function(fromConstruct, toConstruct)
    {
        this.browser.simpleDependencyEstablished(fromConstruct, toConstruct);
    };

    GlobalObject.prototype.getDOMContentLoadedHandlers = function()
    {
        if(this.document == null || this.document.getEventListeners == null) { return this.getEventListeners("DOMContentLoaded"); }

        return this.document.getEventListeners("DOMContentLoaded").concat(this.getEventListeners("DOMContentLoaded"));
    };

    GlobalObject.prototype.getOnLoadFunctions = function()
    {
        var onLoadFunctions =  this.getEventListeners("load");
        var onLoadFunction = this.getPropertyValue("onload");

        if(onLoadFunction != null && onLoadFunction.jsValue != null)
        {
            var registrationPoint = this.getProperty("onload").lastModificationPosition;
            onLoadFunctions.push
            ({
                handler: onLoadFunction,
                registrationPoint: registrationPoint,
                eventType: "onload",
                thisObject: this,
                registrationConstruct: registrationPoint.codeConstruct,
                handlerConstruct: onLoadFunction.codeConstruct,
                thisObjectDescriptor: "window",
                thisObjectModel: "window"
            });
        }
        else //if window.onload is not set check the body element onload attribute
        {

        }

        return onLoadFunctions;
    };

    GlobalObject.prototype.destruct = function()
    {
        this._retractFromFcValue();
        this._removeExecutionEnvironment();

        this._deleteInternalPrototypes();
        this._deleteInternalFunctions();
        this._deleteHandlerMaps();
        this._deleteInternalObjects();
        this._deleteInternalPrototypes();

        this.deconstructObject();
    };

    GlobalObject.prototype.getJsValues = function(internalValues)
    {
        var jsValues = [];

        for(var i = 0; i < internalValues.length; i++)
        {
            jsValues.push(internalValues[i].jsValue);
        }

        return jsValues;
    };

    GlobalObject.prototype.getPreciseEvaluationPositionId = function()
    {
        return {
            groupId : this.evaluationPositionId,
            currentCommandId : (this.currentCommand != null ? this.currentCommand.executionId : "0")
        };
    };

    GlobalObject.prototype.getPrecisePreviousEvaluationPositionId = function()
    {
        return {
            groupId : this.evaluationPositionId,
            currentCommandId : (this.currentCommand != null ? this.currentCommand.executionId-1 : "0")
        };
    };

    GlobalObject.prototype.getReturnExpressionPreciseEvaluationPositionId = function()
    {
        var evaluationPositionId = this.getPreciseEvaluationPositionId();
        evaluationPositionId.isReturnDependency = true;

        var offset = null;
        evaluationPositionId.groupId.replace(/-[0-9]+f/g, function(match)
        {
            offset = arguments[arguments.length - 2];
        });

        if(offset)
        {
            evaluationPositionId.groupId = evaluationPositionId.groupId.substring(0, offset);
        }

        return evaluationPositionId;
    };

    GlobalObject.prototype.setCurrentCommand = function(command)
    {
        if(command == null) { GlobalObject.notifyError("Command can not be null!");}

        this.currentCommand = command;
        this.currentCommand.executionId = this._EXECUTION_COMMAND_COUNTER++;
    };

    GlobalObject.prototype._createEvaluationPositionProperties = function()
    {
        this.evaluationPositionId = "root";
        this.currentCommand = null;
    };


    GlobalObject.prototype.registerSlicingCriteria = function(slicingCriteria)
    {
        if(slicingCriteria == null) { return; }

        this.identifierSlicingCriteria = [];
        this.domModificationSlicingCriteria = [];

        for(var i = 0; i < slicingCriteria.length; i++)
        {
            var criterion = slicingCriteria[i];

            if(criterion.type == "READ_IDENTIFIER")
            {
                this.shouldTrackIdentifiers = true;
                this.identifierSlicingCriteria.push(criterion);
            }
            else if (criterion.type == "DOM_MODIFICATION")
            {
                if(criterion.cssSelector === "all") { this.includeAllDomModifications = true; }
                this.domModificationSlicingCriteria.push(criterion);
            }
        }
    };

    GlobalObject.prototype.satisfiesDomSlicingCriteria = function(htmlElement)
    {
        if(htmlElement == null || htmlElement instanceof Text) { return false; }
        if(this.domModificationSlicingCriteria.length == 0) { return false; }

        if(this.includeAllDomModifications) { return true; }

        for(var i = 0; i < this.domModificationSlicingCriteria.length; i++)
        {
            var element = htmlElement;

            while(element != null)
            {
                if(this.browser.matchesSelector(element, this.domModificationSlicingCriteria[i].cssSelector))
                {
                    return true;
                }

                element = element.parentElement;
            }
        }

        return false;
    };

    GlobalObject.prototype.satisfiesIdentifierSlicingCriteria = function(codeConstruct)
    {
        if(codeConstruct == null || this.identifierSlicingCriteria.length == 0) { return false; }

        for(var i = 0; i < this.identifierSlicingCriteria.length; i++)
        {
            var slicingCriterion = this.identifierSlicingCriteria[i];

            //if(slicingCriterion.fileName != codeConstruct.loc.source) { continue; }
            //TODO - uncomment this!
            //if(slicingCriterion.lineNumber != codeConstruct.loc.start.line) { continue; }
            if(slicingCriterion.identifierName != codeConstruct.name) { continue; }

            return true;
        }

        return false;
    };

    GlobalObject.prototype._createSlicingVariables = function()
    {
        this.identifierSlicingCriteria = [];
        this.domModificationSlicingCriteria = [];
        this.includeAllDomModifications = false;
    };

    GlobalObject.prototype._expandToFcValue = function()
    {
        this.iValue = this;
        this.jsValue = this;
        this.codeConstruct = null;

        this.isFunction = function() { return false; };
        this.isPrimitive = function() { return false; };
        this.isSymbolic = function() { return false; }
        this.isNotSymbolic = function() { return true; }
    };

    GlobalObject.prototype._retractFromFcValue = function()
    {
        delete this.iValue;
        delete this.jsValue;
        delete this.codeConstruct;

        delete this.isFunction;
        delete this.isPrimitive;
        delete this.isSymbolic;
        delete this.isNotSymbolic;
    };

    GlobalObject.prototype._setExecutionEnvironment = function(browser)
    {
        this.browser = browser;

        this.origWindow = Firecrow.getWindow();
        this.origDocument = Firecrow.getDocument();

        this.origWindow.assert = function assert(){};
        this.origWindow.assertEquals = function assertEquals(){};
        this.origWindow.assertEqual = function assertEqual(){};
        this.origWindow.assertMatch = function assertMatch(){};
        this.origWindow.assertNull = function assertNull(){};
        this.origWindow.assertNotNull = function assertNotNull(){};
        this.origWindow.assertNotEquals = function assertNotEquals(){};
    };

    GlobalObject.prototype._detectExecutionEnvironmentProperties = function()
    {
        this.throwsExceptionOnPushWithNodeList = (function()
        {
            try
            {
                Array.prototype.push.apply([], this.origDocument.childNodes);
                return false;
            }
            catch(e)
            {
                return true;
            }
        }).call(this);
    };

    GlobalObject.prototype._removeExecutionEnvironment = function()
    {
        delete this.browser;

        delete this.origWindow;
        delete this.origDocument;
    };

    GlobalObject.prototype._createInternalPrototypes = function ()
    {
        this.objectPrototype = new Firecrow.N_Interpreter.ObjectPrototype(this);
        this.fcObjectPrototype = new Firecrow.N_Interpreter.fcValue(Object.prototype, this.objectPrototype, null);

        this.functionPrototype = new Firecrow.N_Interpreter.FunctionPrototype(this);
        this.fcFunctionPrototype = new Firecrow.N_Interpreter.fcValue(Function.prototype, this.functionPrototype, null);
        this.functionPrototype.initFunctionPrototype();

        this.objectPrototype.initMethods();

        this.booleanPrototype = new Firecrow.N_Interpreter.BooleanPrototype(this);
        this.fcBooleanPrototype = new Firecrow.N_Interpreter.fcValue(Boolean.prototype, this.booleanPrototype, null);

        this.arrayPrototype = new Firecrow.N_Interpreter.ArrayPrototype(this);
        this.fcArrayPrototype = new Firecrow.N_Interpreter.fcValue(Array.prototype, this.arrayPrototype, null);

        this.regExPrototype = new Firecrow.N_Interpreter.RegExPrototype(this);
        this.fcRegExPrototype = new Firecrow.N_Interpreter.fcValue(RegExp.prototype, this.regExPrototype, null);

        this.xmlHttpRequestPrototype = new Firecrow.N_Interpreter.XMLHttpRequestPrototype(this);
        this.fcXMLHttpRequestPrototype = new Firecrow.N_Interpreter.fcValue(XMLHttpRequest.prototype, this.xmlHttpRequestPrototype, null);

        this.stringPrototype = new Firecrow.N_Interpreter.StringPrototype(this);
        this.fcStringPrototype = new Firecrow.N_Interpreter.fcValue(String.prototype, this.stringPrototype, null);

        this.numberPrototype = new Firecrow.N_Interpreter.NumberPrototype(this);
        this.fcNumberPrototype = new Firecrow.N_Interpreter.fcValue(Number.prototype, this.numberPrototype, null);

        this.datePrototype = new Firecrow.N_Interpreter.DatePrototype(this);
        this.fcDatePrototype = new Firecrow.N_Interpreter.fcValue(Date.prototype, this.datePrototype, null);

        this.errorPrototype = new Firecrow.N_Interpreter.ErrorPrototype(this);
        this.fcErrorPrototype = new Firecrow.N_Interpreter.fcValue(Error.prototype, this.errorPrototype, null);

        this.eventPrototype = new Firecrow.N_Interpreter.EventPrototype(this);
        this.fcEventPrototype = new Firecrow.N_Interpreter.fcValue(Event.prototype, this.eventPrototype, null);

        this.htmlImageElementPrototype = new Firecrow.N_Interpreter.HTMLImageElementPrototype(this);
        this.fcHtmlImagePrototype = new Firecrow.N_Interpreter.fcValue(HTMLImageElement.prototype, this.htmlImageElementPrototype, null);

        this.canvasPrototype = new Firecrow.N_Interpreter.CanvasPrototype(this);
        this.fcCanvasPrototype = new Firecrow.N_Interpreter.fcValue(HTMLCanvasElement.prototype, this.canvasPrototype, null);

        this.canvasContextPrototype = new Firecrow.N_Interpreter.CanvasContextPrototype(this);
        this.fcCanvasContextPrototype = new Firecrow.N_Interpreter.fcValue(CanvasRenderingContext2D.prototype, this.canvasContextPrototype, null);

        this.elementPrototype = new Firecrow.N_Interpreter.ElementPrototype(this);
        this.fcElementPrototype = new Firecrow.N_Interpreter.fcValue(Element.prototype, this.elementPrototype, null);

        this.htmlElementPrototype = new Firecrow.N_Interpreter.HTMLElementPrototype(this);
        this.fcHtmlElementPrototype = new Firecrow.N_Interpreter.fcValue(HTMLElement.prototype, this.htmlElementPrototype, null);

        if(typeof Window !== "undefined")
        {
            this.windowPrototype = new Firecrow.N_Interpreter.WindowPrototype(this);
            this.fcWindowPrototype = new Firecrow.N_Interpreter.fcValue(Window.prototype, this.windowPrototype, null);
        }

        this.documentPrototype = new Firecrow.N_Interpreter.DocumentPrototype(this);
        this.fcDocumentPrototype = new Firecrow.N_Interpreter.fcValue(Document.prototype, this.documentPrototype, null);

        this.internalPrototypes =
        [
            this.objectPrototype, this.functionPrototype, this.booleanPrototype,
            this.arrayPrototype, this.regExPrototype, this.stringPrototype,
            this.numberPrototype, this.datePrototype, this.htmlImageElementPrototype,
            this.canvasPrototype, this.xmlHttpRequestPrototype,
            this.eventPrototype, this.errorPrototype, this.elementPrototype
        ];
    };

    GlobalObject.prototype._deleteInternalPrototypes = function ()
    {
        delete this.objectPrototype;
        delete this.fcObjectPrototype;

        delete this.functionPrototype;
        delete this.fcFunctionPrototype;

        delete this.objectPrototype;

        delete this.booleanPrototype;
        delete this.fcBooleanPrototype;

        delete this.arrayPrototype;
        delete this.fcArrayPrototype;

        delete this.regExPrototype;
        delete this.fcRegExPrototype;

        delete this.xmlHttpRequestPrototype;
        delete this.fcXMLHttpRequestPrototype;

        delete this.stringPrototype;
        delete this.fcStringPrototype;

        delete this.numberPrototype;
        delete this.fcNumberPrototype;

        delete this.datePrototype;
        delete this.fcDatePrototype;

        delete this.errorPrototype;
        delete this.fcErrorPrototype;

        delete this.eventPrototype;
        delete this.fcEventPrototype;

        delete this.htmlImageElementPrototype;
        delete this.fcHtmlImagePrototype;

        delete this.canvasPrototype;
        delete this.fcCanvasPrototype;

        delete this.canvasContextPrototype;
        delete this.fcCanvasContextPrototype;

        delete this.elementPrototype;
        delete this.fcElementPrototype;

        delete this.windowPrototype;
        delete this.fcWindowPrototype;

        delete this.documentPrototype;
        delete this.fcDocumentPrototype;

        delete this.internalPrototypes;
    };

    GlobalObject.prototype._createInternalFunctions = function()
    {
        this.objectFunction = new Firecrow.N_Interpreter.ObjectFunction(this);
        this.fcObjectFunction = new Firecrow.N_Interpreter.fcValue(Object, this.objectFunction);
        this.addProperty("Object", this.fcObjectFunction, null);
        this.objectPrototype.addProperty("constructor", this.fcObjectFunction, null, false);

        this.arrayFunction = new Firecrow.N_Interpreter.ArrayFunction(this);
        this.fcArrayFunction = new Firecrow.N_Interpreter.fcValue(Array, this.arrayFunction, null);
        this.addProperty("Array", this.fcArrayFunction, null);

        this.booleanFunction = new Firecrow.N_Interpreter.BooleanFunction(this);
        this.addProperty("Boolean", new Firecrow.N_Interpreter.fcValue(Boolean, this.booleanFunction, null), null);

        this.stringFunction = new Firecrow.N_Interpreter.StringFunction(this);
        this.fcStringFunction = new Firecrow.N_Interpreter.fcValue(String, this.stringFunction, null);
        this.addProperty("String", this.fcStringFunction, null);

        this.imageFunction = new Firecrow.N_Interpreter.ImageFunction(this);
        this.addProperty("Image", new Firecrow.N_Interpreter.fcValue(Image, this.imageFunction, null), null);

        this.regExFunction = new Firecrow.N_Interpreter.RegExFunction(this);
        this.addProperty("RegExp", new Firecrow.N_Interpreter.fcValue(RegExp, this.regExFunction, null), null);

        this.numberFunction = new Firecrow.N_Interpreter.NumberFunction(this);
        this.addProperty("Number", new Firecrow.N_Interpreter.fcValue(Number, this.numberFunction, null), null);

        this.dateFunction = new Firecrow.N_Interpreter.DateFunction(this);
        this.addProperty("Date", new Firecrow.N_Interpreter.fcValue(Date, this.dateFunction, null), null);

        this.errorFunction = new Firecrow.N_Interpreter.ErrorFunction(this);
        this.addProperty("Error", new Firecrow.N_Interpreter.fcValue(Error, this.errorFunction, null), null);

        this.eventFunction = new Firecrow.N_Interpreter.EventFunction(this);
        this.addProperty("Event", new Firecrow.N_Interpreter.fcValue(Event, this.eventFunction, null), null),

            this.functionFunction = new Firecrow.N_Interpreter.FunctionFunction(this);
        this.addProperty("Function", new Firecrow.N_Interpreter.fcValue(Function, this.functionFunction), null);

        this.xmlHttpRequestFunction = new Firecrow.N_Interpreter.XMLHttpRequestFunction(this);
        this.addProperty("XMLHttpRequest", new Firecrow.N_Interpreter.fcValue(XMLHttpRequest, this.xmlHttpRequestFunction, null), null);

        this.windowFunction = new Firecrow.N_Interpreter.WindowFunction(this);

        if(typeof Window !== "undefined")
        {
            this.addProperty("Window", new Firecrow.N_Interpreter.fcValue(Window, this.windowFunction, null), null);
        }

        this.documentFunction = new Firecrow.N_Interpreter.DocumentFunction(this);
        this.addProperty("Document", new Firecrow.N_Interpreter.fcValue(Document, this.documentFunction, null), null);

        GlobalObject.CONST.INTERNAL_PROPERTIES.METHODS.forEach(function(methodName)
        {
            this.addProperty
            (
                methodName,
                new Firecrow.N_Interpreter.fcValue
                (
                    this.origWindow[methodName] || eval(methodName),
                    Firecrow.N_Interpreter.Function.createInternalNamedFunction(this, methodName, this),
                    null
                ),
                null,
                false
            );
        }, this);

        this.internalFunctions =
        [
            this.objectFunction, this.arrayFunction, this.booleanFunction,
            this.stringFunction, this.imageFunction, this.regExFunction,
            this.numberFunction, this.dateFunction, this.functionFunction,
            this.xmlHttpRequestFunction, this.eventFunction, this.errorFunction
        ];
    };

    GlobalObject.prototype._deleteInternalFunctions = function()
    {
        delete this.objectFunction;
        delete this.fcObjectFunction;

        delete this.arrayFunction;
        delete this.fcArrayFunction;

        delete this.booleanFunction;

        delete this.stringFunction;
        delete this.fcStringFunction;

        delete this.imageFunction;
        delete this.regExFunction;

        delete this.numberFunction;

        delete this.dateFunction;

        delete this.errorFunction;

        delete this.eventFunction;

        delete this.functionFunction;

        delete this.xmlHttpRequestFunction;

        delete this.windowFunction;

        delete this.documentFunction;

        delete this.internalFunctions;
    };

    GlobalObject.prototype._createInternalObjects = function()
    {
        this.document = new Firecrow.N_Interpreter.Document(this.origDocument, this);
        this.jsFcDocument = new Firecrow.N_Interpreter.fcValue(this.origDocument, this.document, null);
        this.addProperty("document", this.jsFcDocument, null);

        this.math = new Firecrow.N_Interpreter.Math(this);
        this.fcMath = new Firecrow.N_Interpreter.fcValue(Math, this.math, null);
        this.addProperty("Math", this.fcMath, null);

        this.addProperty("window", this, null);

        this.addProperty("location", this.internalExecutor.createLocationObject());
        this.addProperty("navigator", this.internalExecutor.createNavigatorObject());
        this.addProperty("screen", this.internalExecutor.createScreenObject());

        this.fcHTMLImageElement = new Firecrow.N_Interpreter.HTMLImageElement(this);
        this.htmlImageElement = new Firecrow.N_Interpreter.fcValue(HTMLImageElement, this.fcHTMLImageElement, null);
        this.addProperty("HTMLImageElement", this.htmlImageElement, null);

        this.fcElement = new Firecrow.N_Interpreter.Element(this);
        this.element = new Firecrow.N_Interpreter.fcValue(Element, this.fcElement, null);
        this.addProperty("Element", this.element, null);

        this.fcHtmlElement = new Firecrow.N_Interpreter.HTMLElement(this);
        this.htmlElement = new Firecrow.N_Interpreter.fcValue(HTMLElement, this.fcHtmlElement, null);
        this.addProperty("HTMLElement", this.htmlElement, null);
    };

    GlobalObject.prototype._deleteInternalObjects = function()
    {
        delete this.document;
        delete this.jsFcDocument;

        delete this.math;
        delete this.fcMath;

        delete this.fcHTMLImageElement;
        delete this.htmlImageElement;

        delete this.fcElement;
        delete this.element;

        delete this.fcEvent;
        delete this.event;
    };

    GlobalObject.prototype.isInternalPrototype = function(object)
    {
        for(var i = 0; i < this.internalPrototypes.length; i++)
        {
            if(this.internalPrototypes[i] == object) { return true;}
        }

        return false;
    };

    GlobalObject.prototype._createInternalVariables = function()
    {
        this.addProperty("undefined", this.internalExecutor.createInternalPrimitiveObject(null, undefined));
        this.addProperty("Infinity", this.internalExecutor.createInternalPrimitiveObject(null, Infinity));
        this.addProperty("NaN", this.internalExecutor.createInternalPrimitiveObject(null, NaN));
        this.addProperty("mozInnerScreenX", this.internalExecutor.createInternalPrimitiveObject(null, window.mozInnerScreenX));
        this.addProperty("mozInnerScreenY", this.internalExecutor.createInternalPrimitiveObject(null, window.mozInnerScreenY));
        this.addProperty("screenX", this.internalExecutor.createInternalPrimitiveObject(null, window.screenX));
        this.addProperty("screenY", this.internalExecutor.createInternalPrimitiveObject(null, window.screenY));
        this.addProperty("innerWidth", this.internalExecutor.createInternalPrimitiveObject(null, window.innerWidth));
        this.addProperty("innerHeight", this.internalExecutor.createInternalPrimitiveObject(null, window.innerHeight));

        var eventHandlerNames = ("onafterprint, onbeforeprint, onbeforeunload, onhashchange, onmessage, onoffline, ononline, onpopstate"
            + "onpagehide, onpageshow, onresize, onunload, ondevicemotion, ondeviceorientation, ondeviceproximity"
            + "onuserproximity, ondevicelight, onabort, onblur, oncanplay, oncanplaythrough, onchange, onclick"
            + "oncontextmenu, ondblclick, ondrag, ondragend, ondragenter, ondragleave, ondragover, ondragstart"
            + "ondrop, ondurationchange, onemptied, onended, onerror, onfocus, oninput, oninvalid, onkeydown, onkeypress"
            + "onkeyup, onload, onloadeddata, onloadedmetadata, onloadstart, onmousedown, onmousemove, onmouseout, onmouseover"
            + "onmouseup, onmozfullscreenchange, onmozfullscreenerror, onmozpointerlockchange, onmozpointerlockerror, onpause"
            + "onplay, onplaying, onprogress, onratechange, onreset, onscroll, onseeked, onseeking, onselect, onshow, onstalled"
            + "onsubmit, onsuspend, ontimeupdate, onvolumechange, onwaiting, oncopy, oncut, onpaste, onbeforescriptexecute, onafterscriptexecute").split(",");

        for(var i = 0 ; i < eventHandlerNames.length; i++)
        {
            var eventHandlerName = eventHandlerNames[i].trim();

            this.addProperty(eventHandlerName, this.internalExecutor.createInternalPrimitiveObject(null, null));
        }
    };

    GlobalObject.prototype._createHandlerMaps = function()
    {
        this.eventHandlerPropertiesMap = {};
        this.htmlElementEventHandlingRegistrations = [];
        this.ajaxPreregistrations = [];
        this.ajaxHandlers = [];

        this.timeoutHandlers = [];
        this.intervalHandlers = [];
        this.resizeHandlers = [];
    };
    GlobalObject.prototype._deleteHandlerMaps = function()
    {
        delete this.eventHandlerPropertiesMap;
        delete this.htmlElementEventHandlingRegistrations;
        delete this.ajaxHandlers;
        delete this.ajaxPreregistrations;

        delete this.timeoutHandlers;
        delete this.intervalHandlers;
        delete this.resizeHandlers;
    };

    GlobalObject.prototype.setBrowserVersion = function(browserVersion)
    {
        if(browserVersion == null || browserVersion == "") { return; }

        if(browserVersion.indexOf("IE") == 0)
        {
            this.addProperty("ActiveXObject", new Firecrow.N_Interpreter.fcValue(XMLHttpRequest, this.xmlHttpRequestFunction, null), null);
        }
    };

    Firecrow.N_Interpreter.WindowFunction = function(globalObject)
    {
        this.initObject(globalObject);

        this.name = "Window";

        this.addProperty("prototype", globalObject.fcWindowPrototype);
        this.proto = globalObject.fcFunctionPrototype;
    };

    Firecrow.N_Interpreter.WindowFunction.prototype = new Firecrow.N_Interpreter.Object();

    Firecrow.N_Interpreter.WindowPrototype = function(globalObject)
    {
        this.initObject(globalObject);
        this.constructor = Firecrow.N_Interpreter.WindowPrototype;
    };

    Firecrow.N_Interpreter.WindowPrototype.prototype = new Firecrow.N_Interpreter.Object();
    /*************************************************************************************/
})();


(function() {
    /*************************************************************************************/
    var ValueTypeHelper = Firecrow.ValueTypeHelper;
    var ASTHelper = Firecrow.ASTHelper;

    Firecrow.N_Interpreter.GlobalObjectExecutor =
    {
        executeInternalFunction: function(fcFunction, args, callExpression, globalObject)
        {
                 if (fcFunction.jsValue.name == "eval") { return this._handleEval(fcFunction, args, callExpression, globalObject); }
            else if (fcFunction.jsValue.name == "addEventListener") { return globalObject.addEventListener(args, callExpression, globalObject); }
            else if (fcFunction.jsValue.name == "removeEventListener") { return globalObject.removeEventListener(args, callExpression, globalObject); }
            else if (fcFunction.jsValue.name == "setTimeout" || fcFunction.jsValue.name == "setInterval") { return this._setTimingEvents(fcFunction.jsValue.name, args[0], args[1] != null ? args[1].jsValue : 0, args.slice(2), globalObject, callExpression); }
            else if (fcFunction.jsValue.name == "clearTimeout" || fcFunction.jsValue.name == "clearInterval") { return this._clearTimingEvents(fcFunction.jsValue.name, args[0] != null ? args[0].jsValue : 0, globalObject, callExpression); }
            else if (fcFunction.jsValue.name == "getComputedStyle") { return this._getComputedStyle(args[0], globalObject.getJsValues(args), globalObject, callExpression) }
            else if (fcFunction.jsValue.name == "alert") { return null; }
            else if (fcFunction.jsValue.name.indexOf("assert") != -1)
            {
                globalObject.browser.callImportantConstructReachedCallbacks(callExpression);
            }
            else if (GlobalObject.CONST.INTERNAL_PROPERTIES.METHODS.indexOf(fcFunction.jsValue.name) != -1)
            {
                return globalObject.internalExecutor.createInternalPrimitiveObject
                (
                    callExpression,
                    (globalObject.origWindow[fcFunction.jsValue.name] || eval(fcFunction.jsValue.name)).apply(globalObject.origWindow, globalObject.getJsValues(args))
                );
            }
            else if (globalObject.internalExecutor.isInternalConstructor(fcFunction))
            {
                return globalObject.internalExecutor.executeInternalConstructor(callExpression, fcFunction, args);
            }
            else
            {
                GlobalObject.notifyError("Unhandled internal function: " + e);
            }
        },

        _getComputedStyle: function(jsHtmlElement, args, globalObject, callExpression)
        {
            if(!ValueTypeHelper.isHtmlElement(jsHtmlElement.jsValue)) { this.notifyError("Wrong argument when getting computed style"); return; }

            var htmlElement = jsHtmlElement.jsValue;
            var computedStyle = globalObject.origWindow.getComputedStyle.apply(globalObject.origWindow, args);

            return Firecrow.N_Interpreter.CSSStyleDeclaration.createStyleDeclaration(htmlElement, computedStyle, globalObject, callExpression);
        },

        _setTimingEvents: function(functionName, handler, timePeriod, sentArguments, globalObject, callExpression)
        {
            var timeoutId = globalObject.TIMEOUT_ID_COUNTER++;

            var timingEventArguments = [timeoutId, handler, timePeriod, sentArguments, { codeConstruct:callExpression, evaluationPositionId: globalObject.getPreciseEvaluationPositionId()}];

            if(functionName == "setTimeout") { globalObject.registerTimeout.apply(globalObject, timingEventArguments); }
            else if(functionName == "setInterval") { globalObject.registerInterval.apply(globalObject, timingEventArguments); }

            return globalObject.internalExecutor.createInternalPrimitiveObject(callExpression, timeoutId);
        },

        _clearTimingEvents: function(functionName, timerId, globalObject, callExpression)
        {
            if(functionName == "clearTimeout") { globalObject.unregisterTimeout(arguments[0] != null ? timerId : null, callExpression); }
            else { globalObject.unregisterInterval(arguments[0] != null ? timerId : null, callExpression); }

            return globalObject.internalExecutor.createInternalPrimitiveObject(callExpression, undefined);
        },

        _handleEval: function(fcFunction, args, callExpression, globalObject)
        {
            var firstArgument = args[0];

            if(firstArgument == null) { return globalObject.internalExecutor.createInternalPrimitiveObject(callExpression, undefined); }

            var code = firstArgument.jsValue

            if(!ValueTypeHelper.isString(code)) { return firstArgument; }


            var programAST = esprima.parse(code);

            ASTHelper.setNodeIdsAndParentChildRelationshipForEvaldCode(callExpression, programAST);
            ASTHelper.setParentsChildRelationships(programAST);

            globalObject.browser.generateEvalCommands(callExpression, programAST);
        },

        executesFunction: function(globalObject, functionName)
        {
            try
            {
                return (globalObject.origWindow[functionName] != null || eval(functionName))
                    && ValueTypeHelper.isFunction(globalObject.origWindow[functionName] || eval(functionName));
            }
            catch(e)
            {
                debugger;
                return false;
            }
        }
    };
    /*************************************************************************************/
})();