(function()
{
    var fcInternals = Firecrow.Interpreter.Internals;

    fcInternals.Number = function(value, globalObject, codeConstruct, isLiteral)
    {
        this.initObject(globalObject, codeConstruct);

        this.value = value;
        this.isLiteral = !!isLiteral;

        this.addProperty("__proto__", this.globalObject.fcNumberPrototype);
    };

    fcInternals.Number.notifyError = function(message) { alert("Number - " + message); };
    fcInternals.Number.prototype = new fcInternals.Object();
    fcInternals.Number.prototype.getJsPropertyValue = function(propertyName, codeConstruct)
    {
        return this.getPropertyValue(propertyName, codeConstruct);
    };

    fcInternals.NumberFunction = function(globalObject)
    {
        this.initObject(globalObject, null, Number, globalObject.fcFunctionPrototype);
        this.constructor = fcInternals.NumberPrototype;

        this.addProperty("prototype", globalObject.fcNumberPrototype);
        this.proto = globalObject.fcFunctionPrototype;

        this.isInternalFunction = true;
        this.name = "Number";

        this.addProperty("MIN_VALUE", this.globalObject.internalExecutor.createInternalPrimitiveObject(null, Number.MIN_VALUE), null);
        this.addProperty("MAX_VALUE", this.globalObject.internalExecutor.createInternalPrimitiveObject(null, Number.MAX_VALUE), null);

        this.addProperty("NEGATIVE_INFINITY", this.globalObject.internalExecutor.createInternalPrimitiveObject(null, Number.NEGATIVE_INFINITY), null);
        this.addProperty("POSITIVE_INFINITY", this.globalObject.internalExecutor.createInternalPrimitiveObject(null, Number.POSITIVE_INFINITY), null);

        this.addProperty("NaN", this.globalObject.internalExecutor.createInternalPrimitiveObject(null, Number.NaN), null);
    };

    fcInternals.NumberFunction.prototype = new fcInternals.Object();

    fcInternals.NumberPrototype = function(globalObject)
    {
        this.initObject(globalObject, null, Number.prototype, globalObject.fcObjectPrototype);
        this.name = "NumberPrototype";
    };

    fcInternals.NumberPrototype.prototype = new fcInternals.Object();
});