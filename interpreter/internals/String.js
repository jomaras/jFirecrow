(function()
{ 
    var ValueTypeHelper = Firecrow.ValueTypeHelper;

    var fString = Firecrow.N_Interpreter.String = function(value, globalObject, codeConstruct, isLiteral)
    {
        this.initObject(globalObject, codeConstruct);

        this.value = value;
        this.isLiteral = !!isLiteral;

        this.addProperty("__proto__", this.globalObject.fcStringPrototype, codeConstruct, false);
        this.addProperty("length", this.globalObject.internalExecutor.createInternalPrimitiveObject(codeConstruct, value.length), codeConstruct, false);
    };

    fString.notifyError = function(message) { alert("String - " + message); };
    fString.prototype = new Firecrow.N_Interpreter.Object();
    fString.prototype.getJsPropertyValue = function(propertyName, codeConstruct)
    {
        return this.getPropertyValue(propertyName, codeConstruct);
    };

    var StringPrototype = Firecrow.N_Interpreter.StringPrototype = function(globalObject)
    {
        this.initObject(globalObject, null, String.prototype, globalObject.fcObjectPrototype);
        this.constructor = StringPrototype;
        this.name = "StringPrototype";

        //https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array#Methods_2
        StringPrototype.CONST.INTERNAL_PROPERTIES.METHODS.forEach(function(propertyName)
        {
            this.addProperty
            (
                propertyName,
                new Firecrow.N_Interpreter.fcValue
                (
                    String.prototype[propertyName],
                    Firecrow.N_Interpreter.Function.createInternalNamedFunction(globalObject, propertyName, this),
                    null
                ),
                null,
                false
            );
        }, this);
    };

    StringPrototype.CONST =
    {
        INTERNAL_PROPERTIES :
        {
            METHODS:
            [
                "charAt","charCodeAt", "fromCharCode" , "concat","indexOf","lastIndexOf","localeCompare",
                "match","replace","search","slice","split","substr","substring","toLocaleLowerCase",
                "toLocaleUpperCase","toLowerCase","toString","toUpperCase","trim","trimLeft","trimRight","valueOf"
            ]
        }
    };

    StringPrototype.prototype = new Firecrow.N_Interpreter.Object();

    var StringFunction = Firecrow.N_Interpreter.StringFunction = function(globalObject)
    {
        this.initObject(globalObject, null, String, globalObject.fcFunctionPrototype);

        this.addProperty("prototype", globalObject.fcStringPrototype);

        this.isInternalFunction = true;
        this.name = "String";

        StringPrototype.CONST.INTERNAL_PROPERTIES.METHODS.forEach(function(propertyName)
        {
            this.addProperty
            (
                propertyName,
                new Firecrow.N_Interpreter.fcValue
                (
                    Firecrow.INTERNAL_PROTOTYPE_FUNCTIONS.String[propertyName],
                    Firecrow.N_Interpreter.Function.createInternalNamedFunction(globalObject, propertyName, this),
                    null
                ),
                null,
                false
            );
        }, this);
    };

    StringFunction.prototype = new Firecrow.N_Interpreter.Object();

    Firecrow.N_Interpreter.StringExecutor =
    {
        evaluateCallbackReturn: function(callbackCommand, returnValue, returnExpression, globalObject)
        {
            var originatingObject = callbackCommand.originatingObject;

            if(!ValueTypeHelper.isString(originatingObject.jsValue)) { this.notifyError("When evaluating callback return the argument has to be a string!"); return; }

            var callbackFunctionValue = callbackCommand.callerFunction.jsValue;
            var targetObject = callbackCommand.targetObject;
            var targetObjectValue = targetObject.jsValue;
            var callbackArguments = callbackCommand.arguments;

            if(callbackFunctionValue.name == "replace")
            {
                callbackCommand.parentInitCallbackCommand.intermediateResults.push(returnValue);

                if(callbackCommand.isLastCallbackCommand)
                {
                    var index = 0;
                    var resultMapping = callbackCommand.parentInitCallbackCommand.intermediateResults;

                    targetObject.jsValue = targetObjectValue.replace(targetObject.replacedValue, function()
                    {
                        return resultMapping[index++].jsValue;
                    });

                    targetObject.iValue = new String(targetObject.jsValue, globalObject, returnExpression, true);
                }

                globalObject.dependencyCreator.createDataDependency
                (
                    targetObject.codeConstruct,
                    returnExpression.argument,
                    globalObject.getPreciseEvaluationPositionId()
                );

                targetObject.codeConstruct = returnExpression;
            }
            else
            {
                this.notifyError("Unknown string callback function!");
            }
        },

        executeInternalStringMethod : function(thisObject, functionObject, args, callExpression, callCommand)
        {
            if(!functionObject.isInternalFunction) { this.notifyError("The function should be internal when executing string method!"); return; }

            var functionObjectValue = functionObject.jsValue;
            var thisObjectValue = thisObject.jsValue;
            var functionName = functionObjectValue.name;
            var fcThisValue =  thisObject.iValue;
            var globalObject = fcThisValue != null ? fcThisValue.globalObject
                                                   : functionObjectValue.fcValue.iValue.globalObject;

            if(ValueTypeHelper.isNumber(thisObjectValue) || ValueTypeHelper.isBoolean(thisObjectValue))
            {
                thisObjectValue = thisObjectValue.toString();
            }

            var argumentValues = globalObject.getJsValues(args);

            if(functionName == "toString" && ValueTypeHelper.isFunction(thisObject.jsValue)) //toString called on a function
            {
                return globalObject.internalExecutor.createInternalPrimitiveObject(callExpression, Firecrow.CodeTextGenerator.generateJsCode(thisObject.codeConstruct));
            }

            switch(functionName)
            {
                case "charAt":
                case "charCodeAt":
                case "concat":
                case "indexOf":
                case "lastIndexOf":
                case "localeCompare":
                case "substr":
                case "substring":
                case "toLocaleLowerCase":
                case "toLocaleUpperCase":
                case "toLowerCase":
                case "toString":
                case "toUpperCase":
                case "trim":
                case "trimLeft":
                case "trimRight":
                case "valueOf":
                case "search":
                case "slice":
                    var returnValue = thisObjectValue[functionName].apply(thisObjectValue, argumentValues);

                    var codeConstruct = callExpression;

                    if(codeConstruct == null) { codeConstruct = args[0].codeConstruct; }

                    return globalObject.internalExecutor.createInternalPrimitiveObject(codeConstruct, returnValue);
                case "match":
                case "split":
                    var result = thisObjectValue[functionName].apply(thisObjectValue, argumentValues);
                    if(result == null)
                    {
                        return new Firecrow.N_Interpreter.fcValue(null, null, callExpression);
                    }
                    else if (ValueTypeHelper.isArray(result))
                    {
                        var internalPrimitives = [];

                        for(var i = 0; i < result.length; i++)
                        {
                            internalPrimitives.push(globalObject.internalExecutor.createInternalPrimitiveObject(callExpression, result[i]));
                        }

                        var array = fcThisValue.globalObject.internalExecutor.createArray(callExpression, internalPrimitives);

                        if(functionName == "match")
                        {
                            array.iValue.addJsProperty("index", fcThisValue.globalObject.internalExecutor.createInternalPrimitiveObject(callExpression, result.index), callExpression);
                        }

                        return array;
                    }
                    else { this.notifyError("Unknown result type when executing string match or split!"); return null;}
                case "replace":
                    if(ValueTypeHelper.isString(argumentValues[1]) || ValueTypeHelper.isNumber(argumentValues[1]) || argumentValues[1] == String)
                    {
                        var returnValue = thisObjectValue[functionName].apply(thisObjectValue, argumentValues);
                        return globalObject.internalExecutor.createInternalPrimitiveObject(callExpression, returnValue);
                    }
                    else if(ValueTypeHelper.isFunction(argumentValues[1]))
                    {
                        var allCallbackArguments = [];
                        var callbackFunction = args[1];

                        var params = callbackFunction.codeConstruct.params;

                        thisObjectValue.replace(argumentValues[0], function()
                        {
                            var currentArgs = [];

                            for(var i = 0; i < arguments.length; i++)
                            {
                                currentArgs.push(globalObject.internalExecutor.createInternalPrimitiveObject(params[i], arguments[i]));
                            }

                            allCallbackArguments.push(currentArgs);
                        });

                        callCommand.generatesNewCommands = true;
                        callCommand.generatesCallbacks = true;
                        callCommand.setCallbackFunction(callbackFunction);
                        callCommand.callbackArgumentGroups = allCallbackArguments;
                        callCommand.thisObject = globalObject;
                        callCommand.originatingObject = thisObject;
                        callCommand.callerFunction = functionObject;
                        callCommand.targetObject = globalObject.internalExecutor.createInternalPrimitiveObject(callExpression, thisObjectValue);
                        callCommand.targetObject.replacedValue = argumentValues[0];

                        return callCommand.targetObject;
                    }
                    else
                    {
                        this.notifyError("Unknown replacement type in string, can be either a function or a string");
                    }
                    return null;
                default:
                    this.notifyError("Unknown method on string");
            }
        },

        executeInternalStringFunctionMethod: function(thisObject, functionObject, args, callExpression, callCommand)
        {
            var functionObjectValue = functionObject.jsValue;
            var functionName = (functionObjectValue || functionObject.iValue).name;

            if(functionName == "fromCharCode")
            {
                var fcThisValue =  thisObject.iValue;
                var globalObject = fcThisValue != null ? fcThisValue.globalObject
                                                       : functionObjectValue.fcValue.iValue.globalObject;

                var argumentValues = globalObject.getJsValues(args);

                return globalObject.internalExecutor.createInternalPrimitiveObject(callExpression, String.fromCharCode.apply(String, argumentValues));
            }
            else
            {
                return this.executeInternalStringMethod(args[0], functionObject, args.slice(1, args.length), callExpression, callCommand);
            }
        },

        isInternalStringFunctionMethod: function(functionObject)
        {
            return StringPrototype.CONST.INTERNAL_PROPERTIES.METHODS.indexOf(functionObject.name) != -1;
        },

        notifyError: function(message) { debugger; fString.notifyError(message); }
    };
})();