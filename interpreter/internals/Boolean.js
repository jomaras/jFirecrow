(function(){
    var fcInternals = Firecrow.Interpreter.Internals;

    fcInternals.Boolean = function(value, globalObject, codeConstruct, isLiteral)
    {
        this.initObject(globalObject, codeConstruct);

        this.value = value;
        this.isLiteral = !!isLiteral;

        this.addProperty("__proto__", this.globalObject.fcBooleanPrototype);
    };

    fcInternals.Boolean.prototype = new fcInternals.Object();
    fcInternals.Boolean.prototype.getJsPropertyValue = function(propertyName, codeConstruct)
    {
        return this.getPropertyValue(propertyName, codeConstruct);
    };
    fcInternals.Boolean.prototype.isPrimitive = function()
    {
        return this.isLiteral;
    };

    fcInternals.BooleanFunction = function(globalObject)
    {
        this.initObject(globalObject);

        this.addProperty("prototype", globalObject.fcBooleanPrototype);
        this.proto = globalObject.fcFunctionPrototype;

        this.isInternalFunction = true;
        this.name = "Boolean";
    };

    fcInternals.BooleanFunction.prototype = new fcInternals.Object();

    fcInternals.BooleanPrototype = function(globalObject)
    {
        this.initObject(globalObject);
        this.constructor = fcInternals.BooleanPrototype;
        this.name = "BooleanPrototype";
    };

    fcInternals.BooleanPrototype.prototype = new fcInternals.Object();
})();