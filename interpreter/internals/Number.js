(function()
{
    var Number = Firecrow.N_Interpreter.Number = function(value, globalObject, codeConstruct, isLiteral)
    {
        this.initObject(globalObject, codeConstruct);

        this.value = value;
        this.isLiteral = !!isLiteral;

        this.addProperty("__proto__", this.globalObject.fcNumberPrototype);
    };

    Number.notifyError = function(message) { alert("Number - " + message); };

    Number.prototype = new Firecrow.N_Interpreter.Object();
    Number.prototype.getJsPropertyValue = function(propertyName, codeConstruct)
    {
        return this.getPropertyValue(propertyName, codeConstruct);
    };

    var NumberFunction = Firecrow.N_Interpreter.NumberFunction = function(globalObject)
    {
        this.initObject(globalObject, null, window.Number, globalObject.fcFunctionPrototype);
        this.constructor = NumberPrototype;

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

    NumberFunction.prototype = new Firecrow.N_Interpreter.Object();

    var NumberPrototype = Firecrow.N_Interpreter.NumberPrototype = function(globalObject)
    {
        this.initObject(globalObject, null, window.Number.prototype, globalObject.fcObjectPrototype);
        this.name = "NumberPrototype";
    };

    NumberPrototype.prototype = new Firecrow.N_Interpreter.Object();
})();