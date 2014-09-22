(function()
{
    var fcInternals = Firecrow.Interpreter.Internals;
    var ValueTypeHelper = Firecrow.ValueTypeHelper;
    var ASTHelper = Firecrow.ASTHelper;

    fcInternals.Array = function (jsArray, globalObject, codeConstruct)
    {
        this.initObject(globalObject, codeConstruct, (this.jsArray = jsArray || []));

        this.constructor = fcInternals.Array;
        this.items = [];

        this._addDefaultProperties();
        this._addPreexistingObjects();

        this._registerCallbacks();
    };

    fcInternals.Array.notifyError = function (message)
    {
        debugger;
        alert("Array - " + message);
    };

    fcInternals.Array.prototype = new fcInternals.Object();

    fcInternals.Array.prototype.removePrototypeMethods = function ()
    {
        fcInternals.ArrayPrototype.CONST.INTERNAL_PROPERTIES.METHODS.forEach(function (propertyName)
        {
            this.addProperty(propertyName, this.globalObject.internalExecutor.createInternalPrimitiveObject(null, undefined));
        }, this);
    };

    fcInternals.Array.prototype.markAsNodeList = function ()
    {
        this.isNodeList = true;

        Object.defineProperty(this.jsArray, "isNodeList", {
            enumerable: false,
            configurable: false,
            writable: false,
            value: true
        });

        this.removePrototypeMethods();
    };

    fcInternals.Array.prototype.push = function (jsArray, args, codeConstruct, fcValue, dontFillJsArray)
    {
        this.addDependenciesToAllProperties(codeConstruct);

        var isCalledOnArray = this.constructor === fcInternals.Array;

        if (args != null && args.isNodeList && this.globalObject.throwsExceptionOnPushWithNodeList)
        {
            this.globalObject.executionContextStack.callExceptionCallbacks
            ({
                exceptionGeneratingConstruct: codeConstruct,
                isPushExpectedException: true
            });

            return;
        }

        if (!isCalledOnArray)
        {
            this.addDependencyToAllModifications(codeConstruct);
        }

        var lengthProperty = this.getPropertyValue("length");
        var length = lengthProperty != null ? lengthProperty.jsValue : 0;

        args = args.length !== null && args.length !== undefined ? args : [args];

        for (var i = 0, argsLength = args.length; i < argsLength; i++, length++)
        {
            var argument = args[i];

            if (isCalledOnArray)
            {
                this.items.push(argument);
                if (!dontFillJsArray)
                {
                    jsArray.push(argument);
                }
            }
            else
            {
                jsArray[length] = argument;
            }

            this.addProperty(length, argument, codeConstruct, true);
        }

        var lengthValue = this.globalObject.internalExecutor.createInternalPrimitiveObject(codeConstruct, length);
        this.addProperty("length", lengthValue, codeConstruct);

        if (!isCalledOnArray)
        {
            jsArray.length = lengthValue;
        }

        return lengthValue;
    };

    fcInternals.Array.prototype.pop = function (jsArray, args, codeConstruct)
    {
        this.addDependenciesToAllProperties(codeConstruct);
        var isCalledOnArray = this.constructor === fcInternals.Array;

        if (!isCalledOnArray)
        {
            this.addDependencyToAllModifications(codeConstruct);
        }

        var lengthProperty = this.getPropertyValue("length");
        var length = lengthProperty != null ? lengthProperty.jsValue : 0;

        var poppedItem = null;

        if (isCalledOnArray)
        {
            poppedItem = this.items.pop();
            jsArray.pop();
        }
        else
        {
            poppedItem = this.getPropertyValue(length - 1);
        }

        this.deleteProperty(length - 1, codeConstruct);

        this.addProperty("length", this.globalObject.internalExecutor.createInternalPrimitiveObject(codeConstruct, length - 1), codeConstruct, false);

        return poppedItem;
    };

    fcInternals.Array.prototype.reverse = function (jsArray, args, codeConstruct, fcValue)
    {
        this.addDependenciesToAllProperties(codeConstruct);

        var isCalledOnArray = this.constructor === fcInternals.Array;

        if (!isCalledOnArray)
        {
            this.addDependencyToAllModifications(codeConstruct);
        }

        var lengthProperty = this.getPropertyValue("length");
        var length = lengthProperty != null ? lengthProperty.jsValue : 0;

        if (isCalledOnArray)
        {
            ValueTypeHelper.reverseArray(this.items);
            ValueTypeHelper.reverseArray(jsArray);

            for (var i = 0; i < length; i++)
            {
                this.addProperty(i, this.items[i], codeConstruct, true);
            }
        }
        else
        {
            fcInternals.Array.notifyError("Not handling reverse on non arrays!");
        }

        return fcValue;
    };

    fcInternals.Array.prototype.shift = function (jsArray, args, codeConstruct)
    {
        this.addDependenciesToAllProperties(codeConstruct);

        var isCalledOnArray = this.constructor === fcInternals.Array;

        if (!isCalledOnArray)
        {
            this.addDependencyToAllModifications(codeConstruct);
        }

        var lengthProperty = this.getPropertyValue("length");
        var length = lengthProperty != null ? lengthProperty.jsValue : 0;

        var shiftedItem = null;

        if (isCalledOnArray)
        {
            shiftedItem = this.items.shift();
            jsArray.shift();

            for (var i = 0; i < this.items.length; i++)
            {
                this.addProperty(i, this.items[i], codeConstruct, true);
            }
        }
        else
        {
            shiftedItem = this.getPropertyValue("0");

            for (var i = 1; i < length; i++)
            {
                this.addProperty(i - 1, this.getPropertyValue(i), codeConstruct, true);
            }
        }

        this.deleteProperty(length - 1, codeConstruct);
        this.addProperty("length", this.globalObject.internalExecutor.createInternalPrimitiveObject(codeConstruct, length - 1), codeConstruct, false);

        return shiftedItem;
    };

    fcInternals.Array.prototype.unshift = function (jsArray, callArguments, callExpression)
    {
        this.addDependenciesToAllProperties(callExpression);

        var isCalledOnArray = this.constructor === fcInternals.Array;

        if (!isCalledOnArray) {
            alert("Unshift called on non-array!");
            return;
        }

        var lengthProperty = this.getPropertyValue("length");
        var length = lengthProperty != null ? lengthProperty.jsValue : 0;

        for (var i = 0; i < this.items.length; i++)
        {
            this.deleteProperty(i, callExpression);
        }

        for (var i = callArguments.length - 1; i >= 0; i--)
        {
            this.items.unshift(callArguments[i]);
            jsArray.unshift(callArguments[i]);
        }

        for (var i = 0; i < this.items.length; i++)
        {
            this.addProperty(i, this.items[i], callExpression, true);
        }

        var lengthValue = this.globalObject.internalExecutor.createInternalPrimitiveObject(callExpression, this.items.length);

        this.addProperty("length", lengthValue, callExpression, false);

        return lengthValue;
    };

    fcInternals.Array.prototype.sort = function (jsArray, args, codeConstruct, fcValue)
    {
        this.addDependenciesToAllProperties(codeConstruct);

        var isCalledOnArray = this.constructor === fcInternals.Array;

        if (!isCalledOnArray) { alert("Sort called on non-array!"); }

        var lengthProperty = this.getPropertyValue("length");
        var length = lengthProperty != null ? lengthProperty.jsValue : 0;

        for (var i = 0; i < this.items.length; i++)
        {
            this.deleteProperty(i, codeConstruct);
        }

        var sortFunction = null;

        if (args.length > 0)
        {
            return fcValue;
        }

        var sortFunction = function (a, b)
        {
            //just sort lexicographically
            if (a.jsValue == b.jsValue) {
                return 0;
            }

            return a.jsValue < b.jsValue ? -1 : 1;
        };

        this.items.sort(sortFunction);
        jsArray.sort(sortFunction);

        for (var i = 0; i < this.items.length; i++)
        {
            this.addProperty(i, this.items[i], codeConstruct, true);
        }

        return fcValue;
    };

    fcInternals.Array.prototype.splice = function (jsArray, args, codeConstruct)
    {
        this.addDependenciesToAllProperties(codeConstruct);

        var isCalledOnArray = this.constructor === fcInternals.Array;

        if (!isCalledOnArray)
        {
            return fcInternals.Array.prototype._spliceOnNonArray.call(this, jsArray, args, codeConstruct);
        }

        var lengthProperty = this.getPropertyValue("length");
        var length = lengthProperty != null ? lengthProperty.jsValue : 0;

        for (var i = 0; i < this.items.length; i++)
        {
            this.deleteProperty(i, codeConstruct);
        }

        var argumentValues = [];

        for (i = 0; i < args.length; i++)
        {
            if (i <= 1) {
                argumentValues.push(args[i].jsValue);
            }
            else {
                argumentValues.push(args[i]);
            }
        }

        var splicedItems = this.items.splice.apply(this.items, argumentValues);
        jsArray.splice.apply(jsArray, argumentValues);

        for (i = 0; i < this.items.length; i++)
        {
            this.addProperty(i, this.items[i], codeConstruct, true);
        }

        this.addProperty("length", this.globalObject.internalExecutor.createInternalPrimitiveObject(codeConstruct, this.items.length), codeConstruct, false);

        return this.globalObject.internalExecutor.createArray(codeConstruct, splicedItems);
    };

    fcInternals.Array.prototype._spliceOnNonArray = function (jsArray, args, codeConstruct)
    {
        this.addDependencyToAllModifications(codeConstruct);
        if (jsArray.length != null)
        {
            this.globalObject.dependencyCreator.createDataDependency(codeConstruct, jsArray.length.codeConstruct)
        }

        var adjustedArguments = [];

        jsArray.length = jsArray.length != null ? jsArray.length.jsValue : null;

        for (var i = 0; i < args.length; i++)
        {
            if (i <= 1)
            {
                adjustedArguments.push(args[i].jsValue);
            }
            else
            {
                adjustedArguments.push(args[i]);
            }
        }

        var oldLength = jsArray.length;

        var resultArray = Array.prototype.splice.apply(jsArray, adjustedArguments);

        var newLength = jsArray.length;

        for (var i = 0; i < newLength; i++)
        {
            this.addProperty(i + "", jsArray[i], codeConstruct, true);
        }
        for (i = newLength; i < oldLength; i++)
        {
            this.deleteProperty(i + "", codeConstruct);
        }

        jsArray.length = this.globalObject.internalExecutor.createInternalPrimitiveObject(codeConstruct, jsArray.length);
        this.addProperty("length", jsArray.length, codeConstruct, false);

        return this.globalObject.internalExecutor.createArray(codeConstruct, resultArray);
    };

    fcInternals.Array.prototype.concat = function (jsArray, callArguments, callExpression)
    {
        this.addDependenciesToAllProperties(callExpression);

        var isCalledOnArray = this.constructor === fcInternals.Array || this == this.globalObject.arrayPrototype;

        var lengthProperty = this.getPropertyValue("length");
        var length = lengthProperty != null ? lengthProperty.jsValue : 0;

        var newArray = this.globalObject.internalExecutor.createArray(callExpression);

        for (var i = 0; i < jsArray.length; i++)
        {
            newArray.iValue.push(newArray.jsValue, jsArray[i], callExpression);
        }

        for (var i = 0; i < callArguments.length; i++)
        {
            var argument = callArguments[i];

            if (ValueTypeHelper.isArray(argument.jsValue))
            {
                argument.iValue.addDependenciesToAllProperties(callExpression);
                for (var j = 0; j < argument.jsValue.length; j++)
                {
                    var item = argument.jsValue[j];
                    if (item == null)
                    {
                        item = this.globalObject.internalExecutor.createInternalPrimitiveObject(callExpression, undefined);
                    }

                    newArray.iValue.push(newArray.jsValue, item, callExpression);
                }
            }
            else
            {
                newArray.iValue.push(newArray.jsValue, argument, callExpression);
            }
        }

        return newArray;
    };

    fcInternals.Array.prototype.slice = function (jsArray, callArguments, callExpression)
    {
        this.addDependenciesToAllProperties(callExpression);
        var isCalledOnArray = this.constructor === fcInternals.Array;

        var lengthProperty = this.getProperty("length");
        var length = lengthProperty != null ? lengthProperty.value.jsValue : 0;

        if (!isCalledOnArray)
        {
            this.addDependencyToAllModifications(callExpression);

            if (lengthProperty != null && lengthProperty.lastModificationPosition != null)
            {
                this.globalObject.dependencyCreator.createDataDependency
                (
                    callExpression,
                    lengthProperty.lastModificationPosition.codeConstruct,
                    this.globalObject.getPreciseEvaluationPositionId(),
                    lengthProperty.lastModificationPosition.evaluationPositionId
                );
            }

            var indexProperties = this.getPropertiesWithIndexNames();

            var substituteObject = {};

            for (var i = 0; i < indexProperties.length; i++)
            {
                var property = indexProperties[i];
                substituteObject[property.name] = property.value;
            }

            substituteObject.length = length;
        }

        return this.globalObject.internalExecutor.createArray
        (
            callExpression,
            [].slice.apply((isCalledOnArray ? jsArray : substituteObject), this.globalObject.getJsValues(callArguments))
        );
    };

    fcInternals.Array.prototype.indexOf = function (jsArray, callArguments, callExpression)
    {
        this.addDependenciesToAllProperties(callExpression);
        var isCalledOnArray = this.constructor === fcInternals.Array;

        var lengthProperty = this.getProperty("length");
        var lengthPropertyValue = lengthProperty.value;
        var length = lengthPropertyValue != null ? lengthPropertyValue.jsValue : 0;

        var searchObject = jsArray;

        if (!isCalledOnArray)
        {
            this.addDependencyToAllModifications(callExpression);

            if (lengthProperty != null && lengthProperty.lastModificationPosition != null)
            {
                this.globalObject.dependencyCreator.createDataDependency
                (
                    callExpression,
                    lengthProperty.lastModificationPosition.codeConstruct,
                    this.globalObject.getPreciseEvaluationPositionId(),
                    lengthProperty.lastModificationPosition.evaluationPositionId
                );
            }

            var indexProperties = this.getPropertiesWithIndexNames();

            var substituteObject = {};

            for (var i = 0; i < indexProperties.length; i++)
            {
                var property = indexProperties[i];
                substituteObject[property.name] = property.value;
            }

            substituteObject.length = length;

            searchObject = substituteObject;
        }

        var searchForItem = callArguments[0];
        var fromIndex = callArguments[1] != null ? callArguments[1].jsValue : 0;

        if (fromIndex == null) { fromIndex = 0; }
        if (fromIndex < 0) { fromIndex = length + fromIndex; }

        for (var i = fromIndex; i < length; i++)
        {
            if (searchObject[i] === undefined) { return; }

            if (searchObject[i].jsValue === searchForItem.jsValue)
            {
                return this.globalObject.internalExecutor.createInternalPrimitiveObject(callExpression, i);
            }
        }

        return this.globalObject.internalExecutor.createInternalPrimitiveObject(callExpression, -1);
    };

    fcInternals.Array.prototype.lastIndexOf = function (jsArray, callArguments, callExpression)
    {
        this.addDependenciesToAllProperties(callExpression);
        var isCalledOnArray = this.constructor === fcInternals.Array;

        if (!isCalledOnArray) { alert("lastIndexOf called on non-array!"); }

        var lengthProperty = this.getPropertyValue("length");
        var length = lengthProperty != null ? lengthProperty.jsValue : 0;

        var searchForItem = callArguments[0];
        var fromIndex = callArguments[1] != null ? callArguments[1].jsValue : jsArray.length - 1;

        for (var i = fromIndex; i >= 0; i--)
        {
            if (jsArray[i].jsValue === searchForItem.jsValue)
            {
                return this.globalObject.internalExecutor.createInternalPrimitiveObject(callExpression, i);
            }
        }

        return this.globalObject.internalExecutor.createInternalPrimitiveObject(callExpression, -1);
    };

    fcInternals.Array.prototype.join = function (jsArray, callArguments, callExpression)
    {
        this.addDependenciesToAllProperties(callExpression);
        var isCalledOnArray = this.constructor === fcInternals.Array;

        if (!isCalledOnArray) {
            alert("join called on non-array!");
        }

        var lengthProperty = this.getPropertyValue("length");
        var length = lengthProperty != null ? lengthProperty.jsValue : 0;

        var glue = callArguments[0] != null ? callArguments[0].jsValue : ",";
        var result = "";

        var items = this.items;
        for (var i = 0, length = items.length; i < length; i++)
        {
            result += (i != 0 ? glue : "") + items[i].jsValue;
        }

        return this.globalObject.internalExecutor.createInternalPrimitiveObject(callExpression, result);
    };

    fcInternals.Array.prototype.getJsPropertyValue = function (propertyName, codeConstruct)
    {
        return this.getPropertyValue(propertyName, codeConstruct);
    };

    fcInternals.Array.prototype.addJsProperty = function (propertyName, propertyValue, codeConstruct)
    {
        if (ValueTypeHelper.isInteger(propertyName))
        {
            this.addDependenciesToAllProperties(codeConstruct);
            var oldLength = this.items.length;
            this.items[propertyName] = propertyValue;
            this.jsArray[propertyName] = propertyValue;
            this.addProperty(propertyName, propertyValue, codeConstruct, true);

            if (this.items.length != oldLength)
            {
                this.addProperty("length", this.globalObject.internalExecutor.createInternalPrimitiveObject(codeConstruct, this.items.length), codeConstruct, false);
            }
        }
        else
        {
            if (propertyName == "length")
            {
                if (this.jsArray[propertyName] !== propertyValue.jsValue)
                {
                    var oldLength = this.jsArray.length;
                    var newLength = propertyValue.jsValue

                    if (newLength < oldLength)
                    {
                        this.jsArray.length = newLength;
                        this.items.length = newLength;
                    }

                    for (var i = newLength; i < oldLength; i++)
                    {
                        this.deleteProperty(i, codeConstruct);
                    }
                }
            }

            this.addProperty(propertyName, propertyValue, codeConstruct, propertyName != "length");
        }
    };

    fcInternals.Array.prototype._registerCallbacks = function ()
    {
        this.registerGetPropertyCallback(function (getPropertyConstruct)
        {
            this.addDependenciesToAllProperties(getPropertyConstruct);
        }, this);

        this.registerObjectModifiedCallbackDescriptor
        (
            function (modification)
            {
                this.globalObject.dependencyCreator.createDataDependency
                (
                    this.dummyDependencyNode,
                    modification.codeConstruct,
                    this.globalObject.getPreciseEvaluationPositionId(),
                    modification.evaluationPositionId
                );
            },
            this
        );
    };

    fcInternals.Array.prototype._addDefaultProperties = function ()
    {
        this.addProperty("length", this.globalObject.internalExecutor.createInternalPrimitiveObject(this.creationCodeConstruct, 0), this.creationCodeConstruct, false);
        this.addProperty("__proto__", this.globalObject.fcArrayPrototype, null, false);

        this._addRegExResultArrayProperties();
    };

    fcInternals.Array.prototype._addRegExResultArrayProperties = function ()
    {
        if (this.jsArray.hasOwnProperty("index"))
        {
            this.addProperty("index", this.globalObject.internalExecutor.createInternalPrimitiveObject(this.creationCodeConstruct, this.jsArray.index), this.creationCodeConstruct);
        }
        if (this.jsArray.hasOwnProperty("input"))
        {
            this.addProperty("input", this.globalObject.internalExecutor.createInternalPrimitiveObject(this.creationCodeConstruct, this.jsArray.input), this.creationCodeConstruct);
        }
    };

    fcInternals.Array.prototype._addPreexistingObjects = function ()
    {
        var dependencyCreator = this.globalObject.dependencyCreator;

        for (var i = 0; i < this.jsArray.length; i++) {
            var item = this.jsArray[i];

            if (item === undefined) {
                item = this.globalObject.internalExecutor.createInternalPrimitiveObject(this.creationCodeConstruct, undefined);
            }

            this.push(this.jsArray, item, this.creationCodeConstruct, this, true);

            if (this.jsArray[i] != null && this.jsArray[i].codeConstruct != null) {
                dependencyCreator.createDataDependency(this.creationCodeConstruct, this.jsArray[i].codeConstruct);
            }
        }
    };
})();

(function ()
{
    var fcInternals = Firecrow.Interpreter.Internals;
    var ValueTypeHelper = Firecrow.ValueTypeHelper;

    fcInternals.ArrayCallbackEvaluator =
    {
        evaluateCallbackReturn: function(callbackCommand, returnValue, returnExpression)
        {
            var originatingObject = callbackCommand.originatingObject;

            var callbackFunctionValue = callbackCommand.callerFunction.jsValue;
            var targetObject = callbackCommand.targetObject;

            var valueCodeConstruct = returnExpression;

            if(valueCodeConstruct == null) { valueCodeConstruct = returnValue.codeConstruct; }

            if(callbackFunctionValue.name == "filter") { this._evaluateFilterCallback(targetObject, returnValue, callbackCommand, valueCodeConstruct); return; }
            else if(callbackFunctionValue.name == "map") { this._evaluateMapCallback(targetObject, returnValue, valueCodeConstruct); return; }
            else if(callbackFunctionValue.name == "sort") { this._evaluateSortCallback(targetObject, returnValue, callbackCommand, valueCodeConstruct); return;}
            else if(callbackFunctionValue.name == "every") { this._evaluateEveryCallback(targetObject, returnValue, callbackCommand, valueCodeConstruct); return; }
            else if(callbackFunctionValue.name == "some") { this._evaluateSomeCallback(targetObject, returnValue, callbackCommand, valueCodeConstruct); return; }
            else if(callbackFunctionValue.name == "reduce") { this._evaluateReduceCallback(targetObject, returnValue, callbackCommand, valueCodeConstruct); return; }
            else if(callbackFunctionValue.name == "reduceRight") { fcInternals.Array.notifyError("Still not handling evaluate return from reduceRight"); return; }
            else if(callbackFunctionValue.name == "forEach") { }
            else
            {
                debugger;
                fcInternals.Array.notifyError("Unknown callbackFunction!");
            }
        },

        _evaluateFilterCallback: function(targetObject, returnValue, callbackCommand, valueExpression)
        {
            var targetObjectValue = targetObject.jsValue;

            if(!ValueTypeHelper.isArray(targetObjectValue)) { fcInternals.Array.notifyError("A new array should be created when calling filter: "); return; }

            if(returnValue != null && returnValue.jsValue)
            {
                targetObject.iValue.push(targetObjectValue, [callbackCommand.arguments[0]], valueExpression.argument || valueExpression);
            }
        },

        _evaluateMapCallback: function(targetObject, returnValue, valueExpression)
        {
            var targetObjectValue = targetObject.jsValue;

            if(!ValueTypeHelper.isArray(targetObjectValue)) { fcInternals.Array.notifyError("A new array should be created when calling filter: "); return; }

            targetObject.iValue.push(targetObjectValue, [returnValue], valueExpression.argument || valueExpression);
        },

        _evaluateReduceCallback: function(targetObject, returnValue, callbackCommand, valueExpression)
        {
            var parentCommand = callbackCommand.parentInitCallbackCommand;
            var nextCommand = parentCommand.childCommands[callbackCommand.index + 1];

            if(nextCommand != null)
            {
                nextCommand.arguments[0] = returnValue;
            }
            else
            {
                parentCommand.originatingObject.iValue.globalObject.executionContextStack.setExpressionValueInPreviousContext(parentCommand.codeConstruct, returnValue);
            }
        },

        _evaluateSortCallback: function(targetObject, returnValue, callbackCommand, valueExpression)
        {
            var firstItem = callbackCommand.arguments[0];
            var secondItem = callbackCommand.arguments[1];

            var firstItemIndex = targetObject.jsValue.indexOf(firstItem);
            var secondItemIndex = targetObject.jsValue.indexOf(secondItem);

            targetObject.iValue.addModification(valueExpression, firstItemIndex);
            targetObject.iValue.addModification(callbackCommand.callCallbackCommand.codeConstruct, secondItemIndex);

            //if return value = 0 -> leave a and b unchanged
            if(returnValue.jsValue == 0) { return; }
            //if return value < 0 -> sort a to lower index than b;
            if(returnValue.jsValue < 0 && firstItemIndex <= secondItemIndex) { return; }
            //if return value > 0 -> sort b to lower index than a
            if(returnValue.jsValue > 0 && secondItemIndex <= firstItemIndex) { return; }

            this._swapArrayIndexes(targetObject, firstItemIndex, secondItemIndex, valueExpression);

            if(firstItemIndex + 1 < secondItemIndex)
            {
                this._swapArrayIndexes(targetObject, firstItemIndex + 1, secondItemIndex, valueExpression);
            }
        },

        _evaluateEveryCallback: function(targetObject, returnValue, callbackCommand)
        {
            var parentCommand = callbackCommand.parentInitCallbackCommand;
            parentCommand.originatingObject.iValue.globalObject.executionContextStack.setExpressionValueInPreviousContext(parentCommand.codeConstruct, returnValue);

            if(!returnValue.jsValue)
            {
                parentCommand.originatingObject.iValue.globalObject.browser.interpreter.removeOtherCallbackCommands(parentCommand)
            }
        },

        _evaluateSomeCallback: function(targetObject, returnValue, callbackCommand)
        {
            var parentCommand = callbackCommand.parentInitCallbackCommand;
            parentCommand.originatingObject.iValue.globalObject.executionContextStack.setExpressionValueInPreviousContext(parentCommand.codeConstruct, returnValue);

            if(returnValue.jsValue)
            {
                parentCommand.originatingObject.iValue.globalObject.browser.interpreter.removeOtherCallbackCommands(parentCommand)
            }
        },

        _swapArrayIndexes: function(arrayFcObject, indexA, indexB, modificationExpression)
        {
            var temp = arrayFcObject.jsValue[indexA];
            arrayFcObject.jsValue[indexA] = arrayFcObject.jsValue[indexB];
            arrayFcObject.jsValue[indexB] = temp;

            var temp = arrayFcObject.iValue.items[indexA];
            arrayFcObject.iValue.items[indexA] = arrayFcObject.iValue.items[indexB];
            arrayFcObject.iValue.items[indexB] = temp;

            arrayFcObject.iValue.addProperty(indexA, arrayFcObject.jsValue[indexA], modificationExpression, true);
            arrayFcObject.iValue.addProperty(indexB, arrayFcObject.jsValue[indexB], modificationExpression, true);
        }
    };
})();

(function()
{
    var fcInternals = Firecrow.Interpreter.Internals;
    var ASTHelper = Firecrow.ASTHelper;

    fcInternals.ArrayExecutor =
    {
        executeInternalArrayMethod : function(thisObject, functionObject, args, callExpression, callCommand)
        {
            try
            {
                if(!functionObject.isInternalFunction) { fcInternals.Array.notifyError("The function should be internal when executing array method!"); return; }

                var functionObjectValue = functionObject.jsValue;
                var thisObjectValue = thisObject.jsValue;
                var functionName = functionObjectValue.name;
                var fcThisValue =  thisObject.iValue;
                var globalObject = thisObject.iValue.globalObject;

                var isCalledOnArray = fcThisValue.constructor === fcInternals.Array;

                if(functionName == "reduce" || functionName == "reduceRight")
                {
                    if(thisObjectValue.length == 1 && args[1] == null) { return thisObjectValue[0]; }
                    else if (thisObjectValue.length == 0) { return args[1] || globalObject.internalExecutor.createInternalPrimitiveObject(callExpression, undefined); }
                }

                switch(functionName)
                {
                    case "toString":
                        var returnValue = isCalledOnArray ? "[object Array]" : "[object Object]";
                        return globalObject.internalExecutor.createInternalPrimitiveObject(callExpression, returnValue);
                    case "pop":
                    case "reverse":
                    case "shift":
                    case "push":
                    case "slice":
                    case "unshift":
                    case "splice":
                        if(callExpression != null && ASTHelper.isMemberExpression(callExpression.callee) && ASTHelper.isIdentifier(callExpression.callee.object))
                        {
                            if(!fcThisValue.isDefinedInCurrentContext())
                            {
                                globalObject.browser.logModifyingExternalContextObject(fcThisValue.creationCodeConstruct != null ? fcThisValue.creationCodeConstruct.nodeId : -1, callExpression.callee.object.name)
                            }
                        }
                    case "concat":
                    case "indexOf":
                    case "lastIndexOf":
                    case "join":
                        return fcInternals.Array.prototype[functionName].apply(fcThisValue, [thisObjectValue, args, callExpression, thisObject]);
                    case "sort":
                        //If there is no function argument to sort, execute the internal sort method
                        if(args == null || args.length == 0)
                        {
                            return fcInternals.Array.prototype[functionName].apply(fcThisValue, [thisObjectValue, args, callExpression, thisObject]);
                        }
                    case "forEach":
                    case "filter":
                    case "every":
                    case "some":
                    case "map":
                    case "reduce":
                        var callbackParams = null;

                        if(callCommand.isCall)
                        {
                            callbackParams = callExpression.arguments != null ? callExpression.arguments[1].params : [];
                        }
                        else if (callCommand.isApply)
                        {
                            //debugger;
                        }
                        else
                        {
                            callbackParams = callExpression.arguments != null ? callExpression.arguments[0].params : [];
                        }

                        callCommand.generatesNewCommands = true;
                        callCommand.generatesCallbacks = true;
                        callCommand.setCallbackFunction(args[0]);
                        callCommand.callbackArgumentGroups = this._generateCallbackArguments(thisObject, callbackParams || [], functionName, args, callExpression);
                        callCommand.thisObject =  args[1] || globalObject;
                        callCommand.originatingObject = thisObject;
                        callCommand.callerFunction = functionObject;

                        if(callCommand.originatingObject != null && callCommand.originatingObject.iValue != null && callCommand.originatingObject.iValue.addDependenciesToAllProperties)
                        {
                            callCommand.originatingObject.iValue.addDependenciesToAllProperties(callExpression)
                            if(callCommand.originatingObject.jsValue != null && callCommand.originatingObject.jsValue.length !== null
                                && callCommand.originatingObject.jsValue.length.jsValue != null)
                            {
                                var lengthProperty = callCommand.originatingObject.iValue.getProperty("length");

                                globalObject.internalExecutor.dependencyCreator.createDataDependency
                                (
                                    callExpression,
                                    lengthProperty.lastModificationPosition.codeConstruct,
                                    globalObject.getPreciseEvaluationPositionId()
                                )
                            }
                        }

                        if(functionName == "filter" || functionName == "map")
                        {
                            callCommand.targetObject = globalObject.internalExecutor.createArray(callExpression);
                            return callCommand.targetObject;
                        }
                        else if(functionName == "sort")
                        {
                            callCommand.targetObject = thisObject;
                            return callCommand.targetObject;
                        }
                        else
                        {
                            return new fcInternals.fcValue(undefined, undefined, callExpression);
                        }
                        break;
                    default:
                        fcInternals.Array.notifyError("Unknown internal array method: " + functionObjectValue.name);
                }
            }
            catch(e) { fcInternals.Array.notifyError("Error when executing internal array method: " + e + e.fileName + e.lineNumber); }
        },

        _generateCallbackArguments: function(thisObject, callbackParams, functionName, callArgs, callExpression)
        {
            if(functionName == "sort") { return this._generateSortCallbackArguments(thisObject, callbackParams); }
            if(functionName == "reduce") { return this._generateReduceCallbackArguments(thisObject, callbackParams, callArgs, callExpression);}
            else { return this._generateIterateOverAllItemsCallbackArguments(thisObject, callbackParams); }
        },

        _generateSortCallbackArguments: function(thisObject, callbackParams)
        {
            var thisObjectValue = thisObject.jsValue;

            var callbackArguments = [];

            var length = thisObjectValue.length;
            for(var i = 0; i < length - 1; i++)
            {
                for(var j = i + 1; j < length; j++)
                {
                    callbackArguments.push([thisObject.jsValue[i], thisObject.jsValue[j]]);
                }
            }

            return callbackArguments;
        },

        _generateReduceCallbackArguments: function(thisObject, callbackParams, callArgs, callExpression)
        {
            var callbackArguments = [];
            var hasInitialValue = callArgs[1] != null;
            var thisObjectValue = thisObject.jsValue;

            var length = thisObjectValue.length;
            for(var i = hasInitialValue ? 0 : 1; i < length; i++)
            {
                callbackArguments.push
                ([
                    i == 0 ? callArgs[1] : thisObject.jsValue[i - 1],
                    thisObject.jsValue[i],
                    thisObject.iValue.globalObject.internalExecutor.createInternalPrimitiveObject(callExpression, i),
                    thisObject
                ]);
            }

            return callbackArguments;
        },

        _generateIterateOverAllItemsCallbackArguments: function(thisObject, callbackParams)
        {
            var thisObjectValue = thisObject.jsValue;
            var globalObject = thisObject.iValue.globalObject;
            var callbackArguments = [];

            var length = thisObjectValue.length !== null && thisObjectValue.length.jsValue == null
                        ? thisObjectValue.length
                        : thisObjectValue.length.jsValue;

            for(var i = 0; i < length; i++)
            {
                var item = thisObjectValue[i];
                if(item !== undefined)
                {
                    callbackArguments.push([item, globalObject.internalExecutor.createInternalPrimitiveObject(callbackParams[i], i), thisObject]);
                }
            }

            return callbackArguments;
        },

        isInternalArrayMethod: function(potentialFunction)
        {
            var methods = fcInternals.ArrayPrototype.CONST.INTERNAL_PROPERTIES.METHODS;

            for(var i = 0; i < methods.length; i++)
            {
                if(Array.prototype[methods[i]] === potentialFunction)
                {
                    return true;
                }
            }

            return false;
        }
    };
})();

(function()
{
    var fcInternals = Firecrow.Interpreter.Internals;

    fcInternals.ArrayFunction = function(globalObject)
    {

        this.initObject(globalObject);

        this.addProperty("prototype", globalObject.fcArrayPrototype);
        this.proto = globalObject.fcFunctionPrototype;

        this.isInternalFunction = true;
        this.name = "Array";

        fcInternals.ArrayPrototype.CONST.INTERNAL_PROPERTIES.METHODS.forEach(function(propertyName)
        {
            //Right instanceof reuse HACK - the problem that the second
            //application is executed within the same scope, so they target the same global objects
            //RW the reuse process, to be independent in phantomJs
            this.addProperty
            (
                propertyName,
                new fcModel.fcValue
                (
                    FBL.Firecrow.INTERNAL_PROTOTYPE_FUNCTIONS.Array[propertyName],
                    fcInternals.Function.createInternalNamedFunction(globalObject, propertyName, this),
                    null
                ),
                null,
                false
            );
        }, this);
    };

    fcInternals.ArrayFunction.prototype = new fcInternals.Object();
})();

(function()
{
    var fcInternals = Firecrow.Interpreter.Model;

    fcInternals.ArrayPrototype = function(globalObject)
    {
        this.initObject(globalObject, null, Array.prototype, globalObject.fcObjectPrototype);

        this.constructor = fcInternals.ArrayPrototype;
        this.name = "ArrayPrototype";
        this.addProperty("__proto__", this.globalObject.fcObjectPrototype);

        fcInternals.ArrayPrototype.CONST.INTERNAL_PROPERTIES.METHODS.forEach(function(propertyName)
        {
            this.addProperty
            (
                propertyName,
                new fcInternals.fcValue
                (
                    Array.prototype[propertyName],
                    fcInternals.Function.createInternalNamedFunction(globalObject, propertyName, this),
                    null
                ),
                null,
                false
            );
        }, this);
    };

    fcInternals.ArrayPrototype.prototype = new fcInternals.Object();

    //https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array#Methods_2
    fcInternals.ArrayPrototype.CONST =
    {
        INTERNAL_PROPERTIES :
        {
            METHODS: ["pop","push","reverse","shift","sort","splice","unshift","concat","join","slice","indexOf","lastIndexOf","filter","forEach","every","map","some","reduce","reduceRight", "toString"],
            CALLBACK_METHODS: ["filter", "forEach", "every", "map", "some", "reduce", "reduceRight"]
        }
    };
})();