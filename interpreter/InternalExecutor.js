(function() {
/*************************************************************************************/
    var ValueTypeHelper = Firecrow.ValueTypeHelper;
    var ASTHelper = Firecrow.ASTHelper;
    var fcInterpreter = Firecrow.N_Interpreter;

    var InternalExecutor = fcInterpreter.InternalExecutor = function(globalObject)
    {
        this.globalObject = globalObject;
        this.dependencyCreator = new fcInterpreter.DependencyCreator(this.globalObject);
    };

    InternalExecutor.notifyError = function(message) { debugger; alert("InternalExecutor - " + message);}

    InternalExecutor.prototype =
    {
        createObject: function(constructorFunction, creationCodeConstruct, argumentValues)
        {
            if(this._isNonConstructorObjectCreation(constructorFunction, creationCodeConstruct)) { return this.createNonConstructorObject(creationCodeConstruct); }
            else if(this._isUserConstructorObjectCreation(constructorFunction)) { return this._createObjectFromUserFunction(constructorFunction, creationCodeConstruct, argumentValues); }
            else if (this.isInternalConstructor(constructorFunction)) { return this.executeInternalConstructor(creationCodeConstruct, constructorFunction, argumentValues); }
            else { console.log(Firecrow.CodeTextSerializer.generateJsCode(creationCodeConstruct)); this.notifyError("Unknown state when creating object"); return null; }
        },

        createInternalPrimitiveObject: function(codeConstruct, value, symbolicValue)
        {
            var result = null;

            if(typeof value == "string") { result = new fcInterpreter.String(value, this.globalObject, codeConstruct, true); }
            else if(typeof value == "number") { result = new fcInterpreter.Number(value, this.globalObject, codeConstruct, true); }
            else if(typeof value == "boolean") { result = new fcInterpreter.Boolean(value, this.globalObject, codeConstruct, true); }
            else if(value == null) { }
            else { this.notifyError("Unknown primitive object: " + value); }

            return new fcInterpreter.fcValue(value, result, codeConstruct, symbolicValue);
        },

        createNonConstructorObject: function(creationCodeConstruct, baseObject)
        {
            baseObject = baseObject || {};

            return new fcInterpreter.fcValue
            (
                baseObject,
                fcInterpreter.Object.createObjectWithInit(this.globalObject, creationCodeConstruct, baseObject, this.globalObject.fcObjectPrototype),
                creationCodeConstruct
            );
        },

        createFunction: function(scopeChain, functionConstruct)
        {
            var newFunction = functionConstruct.id != null ? eval("(function " + functionConstruct.id.name + "(){})")
                                                           : function(){};

            var fcFunction = new fcInterpreter.Function(this.globalObject, scopeChain, functionConstruct, newFunction);
            var fcValue = new fcInterpreter.fcValue(newFunction, fcFunction,functionConstruct);

            fcFunction.getPropertyValue("prototype").iValue.addProperty("constructor", fcValue, functionConstruct, false);

            if(functionConstruct.id != null)
            {
                fcFunction.addProperty("name", this.globalObject.internalExecutor.createInternalPrimitiveObject(functionConstruct, functionConstruct.id.name));
            }

            return fcValue;
        },

        createInternalFunction: function(functionObject, functionName, parentObject, dontExpandCallApply)
        {
            return new fcInterpreter.fcValue
            (
                functionObject,
                fcInterpreter.Function.createInternalNamedFunction(this.globalObject, functionName, parentObject),
                null
            );
        },

        createArray: function(creationConstruct, existingArray)
        {
            var array = existingArray || [];

            return new fcInterpreter.fcValue(array, new fcInterpreter.Array(array, this.globalObject, creationConstruct), creationConstruct);
        },

        createRegEx: function(creationConstruct, regEx)
        {
            return new fcInterpreter.fcValue(regEx, new fcInterpreter.RegEx(regEx, this.globalObject, creationConstruct), creationConstruct);
        },


        createString: function(creationConstruct, string)
        {
            return new fcInterpreter.fcValue(string, new fcInterpreter.String(string, this.globalObject, creationConstruct, false), creationConstruct);
        },

        createHtmlElement: function(creationConstruct, tagName)
        {
            try
            {
                var jsElement = this.globalObject.origDocument.createElement(tagName);
            }
            catch(e)
            {
                this.globalObject.executionContextStack.callExceptionCallbacks
                ({
                    exceptionGeneratingConstruct: creationConstruct,
                    isDomStringException: true
                });

                return;
            }

            jsElement.modelElement = { type: "DummyCodeElement", domElement: jsElement, nodeId: "D" + this.globalObject.DYNAMIC_NODE_COUNTER++ };
            this.globalObject.browser.callNodeCreatedCallbacks(jsElement.modelElement, "html", true);

            jsElement.creationPoint =
            {
                codeConstruct: creationConstruct,
                evaluationPositionId: this.globalObject.getPreciseEvaluationPositionId()
            };

            var fcHtmlElement = new fcInterpreter.HtmlElement(jsElement, this.globalObject, creationConstruct);

            if(ValueTypeHelper.isImageElement(jsElement))
            {
                fcHtmlElement.addProperty("__proto__", this.globalObject.fcHtmlImagePrototype);
            }

            this.globalObject.dependencyCreator.createDataDependency(creationConstruct, jsElement.modelElement, this.globalObject.getPreciseEvaluationPositionId());

            return new fcInterpreter.fcValue(jsElement, fcHtmlElement, creationConstruct);
        },

        createTextNode: function(creationConstruct, textContent)
        {
            var jsTextNode = this.globalObject.origDocument.createTextNode(textContent);

            return new fcInterpreter.fcValue(jsTextNode, new fcInterpreter.TextNode(jsTextNode, this.globalObject, creationConstruct), creationConstruct);
        },

        createDocumentFragment: function(creationConstruct, tagName)
        {
            var jsElement = this.globalObject.origDocument.createDocumentFragment();

            jsElement.creationPoint =
            {
                codeConstruct: creationConstruct,
                evaluationPositionId: this.globalObject.getPreciseEvaluationPositionId()
            };

            jsElement.modelElement = { type: "DummyCodeElement", domElement: jsElement, nodeId: "D" + this.globalObject.DYNAMIC_NODE_COUNTER++ };

            this.globalObject.browser.callNodeCreatedCallbacks(jsElement.modelElement, "html", false);

            return new fcInterpreter.fcValue(jsElement, new fcInterpreter.HtmlElement(jsElement, this.globalObject, creationConstruct), creationConstruct);
        },

        createLocationObject: function()
        {
            var fcLocation = fcInterpreter.Object.createObjectWithInit(this.globalObject, null, location);

            this._createProperty(fcLocation, "hash", this.globalObject.origWindow.location.hash);
            this._createProperty(fcLocation, "host", this.globalObject.origWindow.location.host);
            this._createProperty(fcLocation, "hostname", this.globalObject.origWindow.location.hostname);
            this._createProperty(fcLocation, "href", this.globalObject.origWindow.location.href);
            this._createProperty(fcLocation, "pathname", this.globalObject.origWindow.location.pathname);
            this._createProperty(fcLocation, "port", this.globalObject.origWindow.location.port);
            this._createProperty(fcLocation, "protocol", this.globalObject.origWindow.location.protocol);
            this._createProperty(fcLocation, "search", this.globalObject.origWindow.location.search);

            return new fcInterpreter.fcValue(location, fcLocation, null);
        },

        createScreenObject: function()
        {
            var fcScreen = fcInterpreter.Object.createObjectWithInit(this.globalObject, null, this.globalObject.origWindow.screen);

            this._createProperty(fcScreen, "availTop", this.globalObject.origWindow.screen.availTop);
            this._createProperty(fcScreen, "availLeft", this.globalObject.origWindow.screen.availLeft);
            this._createProperty(fcScreen, "availHeight", this.globalObject.origWindow.screen.availHeight);
            this._createProperty(fcScreen, "availWidth", this.globalObject.origWindow.screen.availWidth);
            this._createProperty(fcScreen, "colorDepth", this.globalObject.origWindow.screen.colorDepth);
            this._createProperty(fcScreen, "height", this.globalObject.origWindow.screen.height);
            this._createProperty(fcScreen, "left", this.globalObject.origWindow.screen.left);
            this._createProperty(fcScreen, "pixelDepth", this.globalObject.origWindow.screen.pixelDepth);
            this._createProperty(fcScreen, "top", this.globalObject.origWindow.screen.top);
            this._createProperty(fcScreen, "width", this.globalObject.origWindow.screen.width);

            return new fcInterpreter.fcValue(this.globalObject.origWindow.screen, fcScreen, null);
        },

        createNavigatorObject: function()
        {
            var fcNavigator = fcInterpreter.Object.createObjectWithInit(this.globalObject, null, navigator);

            this._createProperty(fcNavigator, "appCodeName", this.globalObject.origWindow.navigator.appCodeName);
            this._createProperty(fcNavigator, "appName", this.globalObject.origWindow.navigator.appName);
            this._createProperty(fcNavigator, "appVersion", this.globalObject.origWindow.navigator.appVersion);
            this._createProperty(fcNavigator, "buildID", this.globalObject.origWindow.navigator.buildID);
            this._createProperty(fcNavigator, "cookieEnabled", this.globalObject.origWindow.navigator.cookieEnabled);
            this._createProperty(fcNavigator, "doNotTrack", this.globalObject.origWindow.navigator.doNotTrack);
            this._createProperty(fcNavigator, "language", this.globalObject.origWindow.navigator.language);
            this._createProperty(fcNavigator, "oscpu", this.globalObject.origWindow.navigator.oscpu);
            this._createProperty(fcNavigator, "platform", this.globalObject.origWindow.navigator.platform);
            this._createProperty(fcNavigator, "product", this.globalObject.origWindow.navigator.product);
            this._createProperty(fcNavigator, "productSub", this.globalObject.origWindow.navigator.productSub);
            this._createProperty(fcNavigator, "userAgent", this.globalObject.origWindow.navigator.userAgent);
            this._createProperty(fcNavigator, "taintEnabled", true);//TODO HACK
            this._createProperty(fcNavigator, "plugins", this._createPluginsArray(), this.globalObject.origWindow.navigator.plugins);

            return new fcInterpreter.fcValue(navigator, fcNavigator);
        },

        _createPluginsArray: function()
        {
            var pluginsArrayObject = fcInterpreter.Object.createObjectWithInit(this.globalObject, null, this.globalObject.origWindow.navigator.plugins);

            for(var propName in navigator.plugins)
            {
                if(navigator.plugins[propName] instanceof Plugin)
                {
                    this._createProperty(pluginsArrayObject, propName, this._createPluginInfo(navigator.plugins[propName]));
                }
            }

            var flashPlugin = navigator.plugins["Shockwave Flash"];
            if(flashPlugin == null)
            {
                flashPlugin = { description: "0 r0", filename: "Flash", name:"Flash", version: 0};
            }

            this._createProperty(pluginsArrayObject, 'Shockwave Flash', this._createPluginInfo(flashPlugin), flashPlugin);
            this._createProperty(pluginsArrayObject, "length", navigator.plugins.length);

            return pluginsArrayObject;
        },

        _createPluginInfo: function(plugin)
        {
            plugin = plugin || {};
            var pluginValue = fcInterpreter.Object.createObjectWithInit(this.globalObject, null, plugin);

            this._createProperty(pluginValue, "description", plugin.description);
            this._createProperty(pluginValue, "filename", plugin.filename);
            this._createProperty(pluginValue, "name", plugin.name);
            this._createProperty(pluginValue, "version", plugin.version);
            return pluginValue;
        },

        _createProperty: function(baseObject, propertyName, propertyValue, jsValue)
        {
            if(ValueTypeHelper.isPrimitive(propertyValue))
            {
                baseObject.addProperty(propertyName, this.globalObject.internalExecutor.createInternalPrimitiveObject(null, propertyValue));
            }
            else
            {
                baseObject.addProperty(propertyName, new fcInterpreter.fcValue(jsValue, propertyValue));
            }
        },

        executeFunction: function(thisObject, functionObject, args, callExpression, callCommand)
        {

            if(thisObject == null) { this.notifyError("This object can not be null when executing function!"); return; }

            if (callCommand.isCall || callCommand.isApply) { return this._executeCallApplyFunction(thisObject, functionObject, args, callExpression, callCommand); }
            else if (thisObject == this.globalObject.fcMath || functionObject.isMathFunction) { return fcInterpreter.MathExecutor.executeInternalMethod(thisObject, functionObject, args, callExpression); }
            else if (thisObject.iValue != null && thisObject.iValue.constructor == fcInterpreter.Array) { return fcInterpreter.ArrayExecutor.executeInternalArrayMethod(thisObject, functionObject, args, callExpression, callCommand); }
            else if (thisObject == this.globalObject.fcObjectFunction) { return fcInterpreter.ObjectExecutor.executeInternalObjectFunctionMethod(thisObject, functionObject, args, callExpression, callCommand); }
            else if (ValueTypeHelper.isString(thisObject.jsValue)) { return fcInterpreter.StringExecutor.executeInternalStringMethod(thisObject, functionObject, args, callExpression, callCommand); }
            else if (thisObject.iValue != null && thisObject.iValue.constructor == fcInterpreter.RegEx) { return fcInterpreter.RegExExecutor.executeInternalRegExMethod(thisObject, functionObject, args, callExpression); }
            else if (thisObject.iValue != null && thisObject.iValue.constructor == fcInterpreter.XMLHttpRequest) { return fcInterpreter.XMLHttpRequestExecutor.executeInternalXmlHttpRequestMethod(thisObject, functionObject, args, callExpression); }
            else if (thisObject == this.globalObject.jsFcDocument){ return fcInterpreter.DocumentExecutor.executeInternalMethod(thisObject, functionObject, args, callExpression);}
            else if (ValueTypeHelper.isHtmlElement(thisObject.jsValue) || ValueTypeHelper.isDocumentFragment(thisObject.jsValue) || ValueTypeHelper.isTextNode(thisObject.jsValue)) { return fcInterpreter.HtmlElementExecutor.executeInternalMethod(thisObject, functionObject, args, callExpression); }
            else if (thisObject.iValue.constructor == fcInterpreter.CSSStyleDeclaration) { return fcInterpreter.CSSStyleDeclarationExecutor.executeInternalMethod(thisObject, functionObject, args, callExpression); }
            else if (thisObject.iValue != null && thisObject.iValue.constructor == fcInterpreter.Date) { return fcInterpreter.DateExecutor.executeInternalDateMethod(thisObject, functionObject, args, callExpression); }
            else if (thisObject.jsValue == this.globalObject.dateFunction) { return fcInterpreter.DateExecutor.executeFunctionMethod(thisObject, functionObject, args, callExpression, this.globalObject); }
            else if (thisObject.iValue != null && thisObject.iValue.constructor == fcInterpreter.Event){ return fcInterpreter.EventExecutor.executeInternalMethod(thisObject, functionObject, args, callExpression); }
            else if (thisObject.iValue != null && thisObject.iValue.constructor == fcInterpreter.CanvasContext){ return fcInterpreter.CanvasContextExecutor.executeInternalMethod(thisObject, functionObject, args, callExpression); }
            else if (thisObject.iValue != null && thisObject.iValue.constructor == fcInterpreter.LinearGradient){ return fcInterpreter.LinearGradientExecutor.executeInternalMethod(thisObject, functionObject, args, callExpression); }
            else if (thisObject.iValue != null && thisObject.iValue.constructor == fcInterpreter.CanvasGradient){ return fcInterpreter.CanvasGradientExecutor.executeInternalMethod(thisObject, functionObject, args, callExpression); }
            else if (thisObject == this.globalObject.fcArrayFunction) { return fcInterpreter.ArrayExecutor.executeInternalArrayMethod(args[0], functionObject, args.slice(1, args.length), callExpression, callCommand); }
            else if (thisObject == this.globalObject.fcStringFunction) { return fcInterpreter.StringExecutor.executeInternalStringFunctionMethod(thisObject, functionObject, args, callExpression, callCommand); }
            else if (functionObject.isInternalFunction) { return this._executeInternalFunction(thisObject, functionObject, args, callExpression, callCommand); }
            else
            {
                this.notifyError("Unsupported internal function!");
            }
        },

        _isNonConstructorObjectCreation: function(constructorFunction, creationCodeConstruct)
        {
            return constructorFunction == null && (ASTHelper.isObjectExpression(creationCodeConstruct) || creationCodeConstruct == null);
        },

        _isUserConstructorObjectCreation: function(constructorFunction)
        {
            return ValueTypeHelper.isFunction(constructorFunction.jsValue) && !constructorFunction.isInternalFunction;
        },

        isInternalConstructor: function(constructorFunction)
        {
            return constructorFunction != null && constructorFunction.isInternalFunction;
        },

        _createObjectFromUserFunction: function(constructorFunction, creationCodeConstruct, argumentValues)
        {
            var newObject = new constructorFunction.jsValue();

            this.dependencyCreator.createDependencyToConstructorPrototype(creationCodeConstruct, constructorFunction);

            return new fcInterpreter.fcValue
            (
                newObject,
                fcInterpreter.Object.createObjectWithInit
                (
                    this.globalObject,
                    creationCodeConstruct,
                    newObject,
                    constructorFunction.iValue.getPropertyValue("prototype")
                ),
                creationCodeConstruct
            );
        },

        executeInternalConstructor: function(constructorConstruct, internalConstructor, args)
        {
            if(internalConstructor == null) { this.notifyError("InternalConstructor can not be null!"); return; }

            var jsArgs = this.globalObject.getJsValues(args);

            if(internalConstructor.iValue == this.globalObject.arrayFunction) { return this.createArray(constructorConstruct, Array.apply(null, args.length <= 1 ? jsArgs : args));}
            else if (internalConstructor.iValue == this.globalObject.regExFunction) { return this.createRegEx(constructorConstruct, RegExp.apply(null, jsArgs));}
            else if (internalConstructor.iValue == this.globalObject.stringFunction) { return this.createString(constructorConstruct, String.apply(null, jsArgs));}
            else if (internalConstructor.iValue == this.globalObject.booleanFunction) { return new fcInterpreter.fcValue(Boolean.apply(null, jsArgs), Boolean.apply(null, jsArgs), constructorConstruct); }
            else if (internalConstructor.iValue == this.globalObject.numberFunction) { return new fcInterpreter.fcValue(Number.apply(null, jsArgs), Number.apply(null, jsArgs), constructorConstruct); }
            else if (internalConstructor.iValue == this.globalObject.objectFunction) { return fcInterpreter.ObjectExecutor.executeInternalConstructor(constructorConstruct, args, this.globalObject);}
            else if (internalConstructor.iValue == this.globalObject.dateFunction) { return fcInterpreter.DateExecutor.executeInternalConstructor(constructorConstruct, args, this.globalObject); }
            else if (internalConstructor.iValue == this.globalObject.imageFunction) { return this._createImageObject(constructorConstruct); }
            else if (internalConstructor.iValue == this.globalObject.xmlHttpRequestFunction) { return this._createXMLHttpRequestObject(constructorConstruct, new XMLHttpRequest()); }
            else if (internalConstructor.iValue == this.globalObject.errorFunction) { return this._createErrorObject(constructorConstruct, Error.apply(null, jsArgs), this.globalObject); }
            else
            {
                this.notifyError("Unhandled internal constructor" + constructorConstruct.loc.start.line);
                return;
            }
        },

        _createImageObject: function(constructorConstruct)
        {
            return this.createHtmlElement(constructorConstruct, "IMG");
        },

        _createErrorObject: function(constructorConstruct, errorObject, globalObject)
        {
            return new fcInterpreter.fcValue(errorObject, new fcInterpreter.Error(errorObject, globalObject, constructorConstruct), constructorConstruct, null);
        },

        _createXMLHttpRequestObject: function(creationConstruct, xmlHttpRequest)
        {
            return new fcInterpreter.fcValue(xmlHttpRequest, new fcInterpreter.XMLHttpRequest(xmlHttpRequest, this.globalObject, creationConstruct), creationConstruct);
        },

        createEmptyObject: function(constructorConstruct)
        {
            var obj = {};
            return new fcInterpreter.fcValue(obj, fcInterpreter.Object.createObjectWithInit(this.globalObject, constructorConstruct, obj), constructorConstruct);
        },

        _executeCallApplyFunction: function(thisObject, functionObject, args, callExpression, callCommand)
        {
            var ownerObject = functionObject.iValue.ownerObject;

            if (ownerObject == this.globalObject.arrayPrototype) { return fcInterpreter.ArrayExecutor.executeInternalArrayMethod(thisObject, functionObject, args, callExpression, callCommand); }
            else if (ownerObject == this.globalObject.regExPrototype) { return fcInterpreter.RegExExecutor.executeInternalRegExMethod(thisObject, functionObject, args, callExpression); }
            else if (ownerObject == this.globalObject.math) { return fcInterpreter.MathExecutor.executeInternalMethod(thisObject, functionObject, args, callExpression); }
            else if (ownerObject == this.globalObject.objectPrototype) { return fcInterpreter.ObjectExecutor.executeInternalMethod(thisObject, functionObject, args, callExpression, callCommand); }
            else if (ownerObject == this.globalObject.stringPrototype) { return fcInterpreter.StringExecutor.executeInternalStringMethod(thisObject, functionObject, args, callExpression, callCommand); }
            else if (ownerObject == this.globalObject.functionPrototype && functionObject.iValue.name == "bind") { return this._executeBindFunction(thisObject, args[0], args, callExpression); }
            else if (ownerObject.constructor == fcInterpreter.HtmlElement) { return fcInterpreter.HtmlElementExecutor.executeInternalMethod(thisObject, functionObject, args, callExpression); }
            else if (ownerObject.name == "CanvasContextPrototype")
            {
                return fcInterpreter.CanvasExecutor.executeCanvasMethod(thisObject, functionObject, args, callExpression)
            }
            else
            {
                this.notifyError("Unhandled call applied internal method: " + callExpression.loc.source);
            }
        },

        _executeInternalFunction: function(thisObject, functionObject, args, callExpression, callCommand)
        {
            if (functionObject.jsValue == this.globalObject.arrayFunction) { return this.createArray(callExpression, Array.apply(null, args)); }
            else if (functionObject.jsValue == this.globalObject.regExFunction) { return this.createRegEx(callExpression, Array.apply(null, this.globalObject.getJsValues(args))); }
            else if (functionObject.jsValue == toString) { return fcInterpreter.ObjectExecutor.executeInternalMethod(thisObject, functionObject, args, callExpression, callCommand); }
            else if (functionObject.jsValue != null && functionObject.jsValue.name == "hasOwnProperty") { return fcInterpreter.ObjectExecutor.executeInternalMethod(thisObject, functionObject, args, callExpression); }
            else if (fcInterpreter.ArrayExecutor.isInternalArrayMethod(functionObject.jsValue))  { return fcInterpreter.ArrayExecutor.executeInternalArrayMethod(thisObject, functionObject, args, callExpression, callCommand); }
            else if (fcInterpreter.StringExecutor.isInternalStringFunctionMethod(functionObject.jsValue))  { return this._executeInternalStringFunctionMethod(thisObject, functionObject, args, callExpression, callCommand); }
            else if (fcInterpreter.ObjectExecutor.isInternalObjectMethod(functionObject.jsValue)) { return this._executeInternalObjectFunctionMethod(thisObject, functionObject, args, callExpression, callCommand); }
            else if (fcInterpreter.MathExecutor.isInternalMathMethod(functionObject.jsValue)) { return this._executeInternalMathMethod(thisObject, functionObject, args, callExpression, callCommand); }
            else if (functionObject.jsValue.name == "bind") { return this._executeBindFunction(thisObject, functionObject, args, callExpression); }
            else if (fcInterpreter.GlobalObjectExecutor.executesFunction(this.globalObject, functionObject.jsValue.name)) { return fcInterpreter.GlobalObjectExecutor.executeInternalFunction(functionObject, args, callExpression, this.globalObject); }
            else
            {
                debugger;
                this.notifyError("Unknown internal function!");
            }
        },

        _executeInternalStringFunctionMethod: function(thisObject, functionObject, args, callExpression, callCommand)
        {
            //This is a hack when an internal callback function gets another internal function as an argument
            if(args.length == 0 && callCommand.parentCallExpressionCommand != null && callCommand.parentCallExpressionCommand.arguments != null)
            {
                args = callCommand.parentCallExpressionCommand.arguments || [];
                var returnValue = fcInterpreter.StringExecutor.executeInternalStringMethod(args[0], functionObject, args, callExpression, callCommand);
                fcInterpreter.ArrayCallbackEvaluator.evaluateCallbackReturn(callCommand.parentCallExpressionCommand, returnValue, null);
                return returnValue;
            }

            return fcInterpreter.StringExecutor.executeInternalStringMethod(thisObject, functionObject, args, callExpression, callCommand);
        },

        _executeInternalMathMethod: function(thisObject, functionObject, args, callExpression, callCommand)
        {
            return fcInterpreter.MathExecutor.executeInternalMethod(thisObject, functionObject, args, callExpression);
        },

        _executeInternalObjectFunctionMethod: function(thisObject, functionObject, args, callExpression, callCommand)
        {
            return fcInterpreter.ObjectExecutor.executeInternalObjectFunctionMethod(thisObject, functionObject, args, callExpression, callCommand);
        },

        _executeBindFunction: function(thisObject, functionObject, args, callExpression)
        {
            var functionCopy = this.createFunction(thisObject.iValue.scopeChain, thisObject.codeConstruct);

            functionCopy.iValue.bind(args, callExpression);

            return functionCopy;
        },

        notifyError: function(message) { debugger; InternalExecutor.notifyError(message);}
    }
})();