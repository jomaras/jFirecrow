(function() {
/*************************************************************************************/
    var Date = Firecrow.N_Interpreter.Date = function(value, globalObject)
    {
        this.initObject(globalObject);
        this.constructor = Date;

        this.value = value;
        this.addProperty("__proto__", this.globalObject.fcDatePrototype);
    };

    Date.notifyError = function(message) { alert("Date - " + message); };
    Date.prototype = new Firecrow.N_Interpreter.Object();

    var DatePrototype;
    Firecrow.N_Interpreter.DatePrototype = DatePrototype = function(globalObject)
    {
        this.initObject(globalObject, null, window.Date.prototype, globalObject.fcObjectPrototype);

        this.constructor = DatePrototype;
        this.name = "DatePrototype";

        //https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Date#Methods_2
        DatePrototype.CONST.INTERNAL_PROPERTIES.METHODS.forEach(function(propertyName)
        {
            if(Date.prototype[propertyName] == null) { return; }
            this.addProperty
            (
                propertyName,
                new Firecrow.N_Interpreter.fcValue
                (
                    window.Date.prototype[propertyName],
                    Firecrow.N_Interpreter.Function.createInternalNamedFunction(globalObject, propertyName, this),
                    null
                ),
                null,
                false
            );
        }, this);
    };

    DatePrototype.CONST =
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

    DatePrototype.prototype = new Firecrow.N_Interpreter.Object(null);

    var DateFunction = Firecrow.N_Interpreter.DateFunction = function(globalObject)
    {
        this.initObject(globalObject, null, window.Date, globalObject.fcFunctionPrototype);

        this.addProperty("prototype", globalObject.fcDatePrototype);

        this.isInternalFunction = true;
        this.name = "Date";
    };

    DateFunction.prototype = new Firecrow.N_Interpreter.Object(null);

    Firecrow.N_Interpreter.DateExecutor =
    {
        executeFunctionMethod: function(thisObject, functionObject, args, callExpression, globalObject)
        {
            return new Firecrow.N_Interpreter.fcValue
            (
                window.Date[functionObject.value.name].apply(null, globalObject.getJsValues(args)),
                null,
                callExpression
            );
        },

        executeInternalConstructor: function(callExpression, arguments, globalObject)
        {
            var date = arguments.length == 0 ? new window.Date() : new window.Date(arguments[0].jsValue);

            return new Firecrow.N_Interpreter.fcValue(date, new Date(date, globalObject), callExpression);
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

        notifyError: function(message) { Date.notifyError(message); }
    };
/*************************************************************************************/
})();