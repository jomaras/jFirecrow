(function() {
    var fcInternals = Firecrow.Interpreter.Internals;
    var ValueTypeHelper = Firecrow.ValueTypeHelper;

    fcInternals.RegEx = function(jsRegExp, globalObject, codeConstruct)
    {
        this.jsRegExp = jsRegExp;
        this.constructor = fcInternals.RegEx;

        this.initObject(globalObject, codeConstruct, jsRegExp, globalObject.fcRegExPrototype);

        this.addProperty("lastIndex", this.globalObject.internalExecutor.createInternalPrimitiveObject(codeConstruct, 0), codeConstruct);
        this.addProperty("ignoreCase", this.globalObject.internalExecutor.createInternalPrimitiveObject(codeConstruct, jsRegExp.ignoreCase), codeConstruct);
        this.addProperty("global", this.globalObject.internalExecutor.createInternalPrimitiveObject(codeConstruct, jsRegExp.global), codeConstruct);
        this.addProperty("multiline", this.globalObject.internalExecutor.createInternalPrimitiveObject(codeConstruct, jsRegExp.multiline), codeConstruct);
        this.addProperty("source", this.globalObject.internalExecutor.createInternalPrimitiveObject(codeConstruct, jsRegExp.source), codeConstruct);

        fcInternals.RegExPrototype.CONST.INTERNAL_PROPERTIES.METHODS.forEach(function(propertyName)
        {
            this.addProperty
            (
                propertyName,
                new fcInternals.fcValue
                (
                    this.jsRegExp[propertyName],
                    fcInternals.Function.createInternalNamedFunction(globalObject, propertyName, this),
                    null
                ),
                null,
                false
            );
        }, this);

        this.modifications = [];

        this.registerGetPropertyCallback(function(getPropertyConstruct)
        {
            this.addDependenciesToAllModifications(getPropertyConstruct);
        }, this);

        this.getJsPropertyValue = function(propertyName, codeConstruct)
        {
            return this.getPropertyValue(propertyName, codeConstruct);
        };

        this.addDependenciesToAllModifications = function(codeConstruct)
        {
            if(codeConstruct == null) { return; }

            for(var i = 0, length = this.modifications.length; i < length; i++)
            {
                var modification = this.modifications[i];

                this.globalObject.dependencyCreator.createDataDependency
                (
                    codeConstruct,
                    modification.codeConstruct,
                    this.globalObject.getPreciseEvaluationPositionId(),
                    modification.evaluationPositionId
                );
            }
        }
    };

    fcInternals.RegEx.notifyError = function(message) { alert("RegEx - " + message); }
    fcInternals.RegEx.prototype = new fcInternals.Object();

    fcInternals.RegExPrototype = function(globalObject)
    {
        this.initObject(globalObject, null, RegExp.prototype, globalObject.fcObjectPrototype);
        this.constructor = fcInternals.RegExPrototype;
        this.name = "RegExPrototype";

        fcInternals.RegExPrototype.CONST.INTERNAL_PROPERTIES.METHODS.forEach(function(propertyName)
        {
            var internalFunction = globalObject.internalExecutor.createInternalFunction(RegExp.prototype[propertyName], propertyName, this, true);
            this[propertyName] = internalFunction;
            this.addProperty(propertyName, internalFunction, null, false);
        }, this);
    };

    fcInternals.RegExPrototype.prototype = new fcInternals.Object();

    fcInternals.RegExPrototype.CONST =
    {
        INTERNAL_PROPERTIES :
        {
            METHODS: ["exec","test","toSource"],
            PROPERTIES: ["global", "ignoreCase", "lastIndex", "multiline", "source"]
        }
    };

    fcInternals.RegExFunction = function(globalObject)
    {
        this.initObject(globalObject, null, RegExp, globalObject.fcFunctionPrototype);

        this.addProperty("prototype", globalObject.fcRegExPrototype);

        this.isInternalFunction = true;
        this.name = "RegExp";
    };

    fcInternals.RegExFunction.prototype = new fcInternals.Object();

    fcInternals.RegExExecutor =
    {
        executeInternalRegExMethod: function(thisObject, functionObject, args, callExpression)
        {
            if(!ValueTypeHelper.isRegExp(thisObject.jsValue)) { this.notifyError("The called on object should be a regexp!"); return; }
            if(!functionObject.isInternalFunction) { this.notifyError("The function should be internal when executing regexp method!"); return; }

            var functionObjectValue = functionObject.jsValue;
            var thisObjectValue = thisObject.jsValue;
            var functionName = functionObjectValue.name;
            var fcThisValue =  thisObject.iValue;
            var globalObject = fcThisValue.globalObject;

            switch(functionName)
            {
                case "exec":
                    var result = thisObjectValue[functionName].apply(thisObjectValue, globalObject.getJsValues(args));
                    fcThisValue.addProperty("lastIndex", new fcInternals.fcValue(thisObjectValue.lastIndex, thisObjectValue.lastIndex, callExpression),callExpression);

                    fcThisValue.addDependenciesToAllModifications(callExpression);
                    fcThisValue.modifications.push({codeConstruct: callExpression, evaluationPositionId: fcThisValue.globalObject.getPreciseEvaluationPositionId()});

                    if(result == null) { return new fcInternals.fcValue(null, null, callExpression); }
                    else if (ValueTypeHelper.isArray(result))
                    {
                        var internalPrimitives = [];

                        for(var i = 0; i < result.length; i++)
                        {
                            internalPrimitives.push(globalObject.internalExecutor.createInternalPrimitiveObject(callExpression, result[i]));
                        }

                        return fcThisValue.globalObject.internalExecutor.createArray(callExpression, internalPrimitives);
                    }
                    else
                    {
                        this.notifyError("Unknown result when exec regexp: " + result);
                        debugger;
                        return null;
                    }
                case "test":
                    var result = thisObjectValue[functionName].apply(thisObjectValue, globalObject.getJsValues(args));
                    return globalObject.internalExecutor.createInternalPrimitiveObject(callExpression, result);
                case "toSource":
                    this.notifyError("ToSource not supported on regExp!");
                    return null;
                default:
                    this.notifyError("Unknown method on string");
            }
        },

        notifyError: function(message) { fcInternals.RegEx.notifyError(message);}
    };
})();