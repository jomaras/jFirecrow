(function()
{
/*************************************************************************************/
    var Math;

    Firecrow.N_Interpreter.Math = Math = function(globalObject)
    {
        this.initObject(globalObject);

        Math.CONST.INTERNAL_PROPERTIES.PROPERTIES.forEach(function(property)
        {
            var propertyValue = this.globalObject.internalExecutor.createInternalPrimitiveObject(null, Math[property]);
            this.addProperty(property, propertyValue, null);
            this[property] = propertyValue;
        }, this);

        Math.CONST.INTERNAL_PROPERTIES.METHODS.forEach(function(propertyName)
        {
            var propertyValue = new Firecrow.N_Interpreter.fcValue
            (
                Math[propertyName],
                Firecrow.N_Interpreter.Function.createInternalNamedFunction(globalObject, propertyName, this),
                null
            );

            propertyValue.isMathFunction = true;

            this.addProperty(propertyName, propertyValue, null, false);
        }, this);
    };

    Math.prototype = new Firecrow.N_Interpreter.Object();

    Math.notifyError = function(message){ alert("Math - " + message); };

    Math.CONST =
    {
        INTERNAL_PROPERTIES:
        {
            PROPERTIES: ["E", "LN2", "LN10", "LOG2E", "LOG10E", "PI", "SQRT1_2", "SQRT2"],
            METHODS:
            [
                "abs", "acos", "asin", "atan", "atan2", "ceil", "cos", "exp", "floor",
                "log", "max", "min", "pow", "random", "round", "sin", "sqrt", "tan"
            ]
        }
    }

    Math.prototype = new Firecrow.N_Interpreter.Object();

    Firecrow.N_Interpreter.MathExecutor =
    {
        executeInternalMethod: function(thisObject, functionObject, args, callExpression)
        {
            if(!functionObject.isInternalFunction) { Math.notifyError("The function should be internal when executing Math method!"); return; }

            return new Firecrow.N_Interpreter.fcValue
            (
                window.Math[functionObject.jsValue.name].apply(null, functionObject.iValue.globalObject.getJsValues(args)),
                null,
                callExpression
            );
        },

        isInternalMathMethod: function(functionObject)
        {
            return Firecrow.N_Interpreter.Math.CONST.INTERNAL_PROPERTIES.METHODS.indexOf(functionObject.name) != -1;
        }
    }
    /*************************************************************************************/
})();