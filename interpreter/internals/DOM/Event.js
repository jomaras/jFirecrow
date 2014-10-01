(function()
{
    var fEvent = Firecrow.N_Interpreter.Event = function(implementationObject, globalObject, eventThisObject)
    {
        this.initObject(globalObject, null, implementationObject);

        this.constructor = fEvent;
        this.eventThisObject = eventThisObject;

        fEvent.CONST.INTERNAL_PROPERTIES.METHODS.forEach(function(method)
        {
            this.addProperty(method, this.globalObject.internalExecutor.createInternalFunction
            (
                eval("(function " + method + "(){})"),
                method,
                this
            ));
        }, this);
    };

    fEvent.prototype = new Firecrow.N_Interpreter.Object();

    fEvent.prototype.getJsPropertyValue = function (propertyName, codeConstruct)
    {
        return this.getPropertyValue(propertyName, codeConstruct);
    };

    fEvent.prototype.addJsProperty = function(propertyName, propertyValue, codeConstruct, isEnumerable)
    {
        this.addProperty(propertyName, propertyValue, codeConstruct, isEnumerable);
    };

    fEvent.notifyError = function(message) { alert("Event - " + message); }

    fEvent.CONST =
    {
        INTERNAL_PROPERTIES:
        {
            METHODS: ["preventDefault", "stopPropagation", "stopImmediatePropagation"]
        }
    };

    var EventPrototype = Firecrow.N_Interpreter.EventPrototype = function(globalObject)
    {
        this.initObject(globalObject);
        this.constructor = EventPrototype;
        this.name = "EventPrototype";

        EventPrototype.CONST.INTERNAL_PROPERTIES.METHODS.forEach(function(propertyName)
        {
            if(Event.prototype[propertyName] == null) { return; }
            this.addProperty
            (
                propertyName,
                new Firecrow.N_Interpreter.fcValue
                (
                    Event.prototype[propertyName],
                    Firecrow.N_Interpreter.Function.createInternalNamedFunction(globalObject, propertyName, this),
                    null
                ),
                null,
                false
            );
        }, this);
    };

    EventPrototype.CONST =
    {
        INTERNAL_PROPERTIES :
        {
            METHODS:
            [
                "initEvent", "preventDefault", "stopImmediatePropagation", "stopPropagation"
            ],
            PROPERTIES:
            [
                "bubbles", "cancelable", "currentTarget", "defaultPrevented", "eventPhase", "explicitOriginalTarget",
                "originalTarget", "target", "timeStamp", "type", "isTrusted"
            ]
        },
        FUNCTION_PROPERTIES:
        {
            METHODS:  ["now", "parse", "UTC"]
        }
    };

    EventPrototype.prototype = new Firecrow.N_Interpreter.Object(null);

    var EventFunction = Firecrow.N_Interpreter.EventFunction = function(globalObject)
    {
        this.initObject(globalObject);

        this.addProperty("prototype", globalObject.fcEventPrototype);

        this.isInternalFunction = true;
        this.name = "Event";
    };

    EventFunction.prototype = new Firecrow.N_Interpreter.Object(null);

    Firecrow.N_Interpreter.EventExecutor =
    {
        executeInternalMethod: function(thisObject, functionObject, args, callExpression)
        {
            if(!functionObject.isInternalFunction) { fEvent.notifyError("The function should be internal when executing html method!"); return; }

            var functionObjectValue = functionObject.jsValue;
            var thisObjectValue = thisObject.jsValue;
            var functionName = functionObjectValue.name;
            var fcThisValue =  thisObject.iValue;
            var globalObject = fcThisValue.globalObject;
            var jsArguments =  globalObject.getJsValues(args);

            if(Event.CONST.INTERNAL_PROPERTIES.METHODS.indexOf(functionName) == -1) { Event.notifyError("Unhandled event method!"); return; }

            if(fcThisValue.eventThisObject != null && fcThisValue.eventThisObject.jsValue instanceof Element)
            {
                Firecrow.N_Interpreter.HtmlElementExecutor.addDependencyIfImportantElement(fcThisValue.eventThisObject.jsValue, globalObject, callExpression);
            }
        }
    }
})();