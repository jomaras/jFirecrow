(function() {
/*************************************************************************************/
    var ValueTypeHelper = Firecrow.ValueTypeHelper;
    var fcInternals = Firecrow.Interpreter.Internals;

    fcInternals.Date = function(value, globalObject, codeConstruct)
    {
        try
        {
            this.initObject(globalObject);
            this.constructor = fcInternals.Date;

            this.value = value;

            this.addProperty("__proto__", this.globalObject.fcDatePrototype);
        }
        catch(e) { fcInternals.Date.notifyError("Error when creating a Date object: " + e); }
    };

    fcInternals.Date.notifyError = function(message) { alert("Date - " + message); };
    fcInternals.Date.prototype = new fcInternals.Object();

    fcInternals.DatePrototype = function(globalObject)
    {
        this.initObject(globalObject, null, Date.prototype, globalObject.fcObjectPrototype);
        this.constructor = fcInternals.DatePrototype;
        this.name = "DatePrototype";
        //https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Date#Methods_2
        fcInternals.DatePrototype.CONST.INTERNAL_PROPERTIES.METHODS.forEach(function(propertyName)
        {
            if(Date.prototype[propertyName] == null) { return; }
            this.addProperty
            (
                propertyName,
                new fcInternals.fcValue
                (
                    Date.prototype[propertyName],
                    fcInternals.Function.createInternalNamedFunction(globalObject, propertyName, this),
                    null
                ),
                null,
                false
            );
        }, this);
    };

    fcInternals.DatePrototype.CONST =
    {
        INTERNAL_PROPERTIES :
        {
            METHODS:
            [
                "getDate", "getDay", "getFullYear", "getHours", "getMilliseconds", "getMinutes",
                "getMonth", "getSeconds", "getTime", "getTimezoneOffset", "getUTCDate", "getUTCDay",
                "getUTCFullYear", "getUTCHours", "getUTCMilliseconds", "getUTCMinutes", "getUTCSeconds",
                "getYear", "setDate", "setFullYear", "setHours", "setMilliseconds", "setMinutes",
                "setMonth", "setSeconds", "setTime", "setUTCDate", "setUTCFullYear", "setUTCHours",
                "setUTCMilliseconds", "setUTCMinutes", "setUTCMonth", "setUTCSeconds", "setYear",
                "toDateString", "toISOString", "toJSON", "toGMTString", "toLocaleDateString",
                "toLocaleFormat", "toLocaleString", "toLocaleTimeString", "toSource", "toString",
                "toTimeString", "toUTCString", "valueOf"
            ]
        },
        FUNCTION_PROPERTIES:
        {
            METHODS:  ["now", "parse", "UTC"]
        }
    };

    fcInternals.DatePrototype.prototype = new fcInternals.Object(null);

    fcInternals.DateFunction = function(globalObject)
    {
        this.initObject(globalObject, null, Date, globalObject.fcFunctionPrototype);

        this.addProperty("prototype", globalObject.fcDatePrototype);

        this.isInternalFunction = true;
        this.name = "Date";
    };

    fcInternals.DateFunction.prototype = new fcInternals.Object(null);

    fcInternals.DateExecutor =
    {
        executeFunctionMethod: function(thisObject, functionObject, args, callExpression, globalObject)
        {
            return new fcInternals.fcValue
            (
                Date[functionObject.value.name].apply(null, globalObject.getJsValues(args)),
                null,
                callExpression
            );
        },

        executeInternalConstructor: function(callExpression, arguments, globalObject)
        {
            var date;

            if(arguments.length == 0)
            {
                if(globalObject.currentEventTime != null)
                {
                    date = new Date();
                }
                else
                {
                    date = new Date();
                }
            }
            else
            {
                date = new Date(arguments[0].jsValue)
            }

            return new fcInternals.fcValue(date, new fcInternals.Date(date, globalObject), callExpression);
        },

        executeInternalDateMethod : function(thisObject, functionObject, args, callExpression, callCommand)
        {
            if(!functionObject.isInternalFunction) { this.notifyError("The function should be internal when executing string method!"); return; }

            var functionObjectValue = functionObject.jsValue;
            var thisObjectValue = thisObject.jsValue;
            var functionName = functionObjectValue.name;
            var fcThisValue =  thisObject.iValue;
            var globalObject = fcThisValue != null ? fcThisValue.globalObject
                : functionObjectValue.fcValue.iValue.globalObject;

            var argumentValues = globalObject.getJsValues(args);

            if(functionName.indexOf("set") == 0)
            {
                var result = thisObjectValue[functionName].apply(thisObjectValue, argumentValues);
            }
            else
            {
                var result = thisObjectValue[functionName]();
            }

            return globalObject.internalExecutor.createInternalPrimitiveObject(callExpression, result);
        },
        notifyError: function(message) { fcInternals.String.notifyError(message); }
    };
/*************************************************************************************/
})();