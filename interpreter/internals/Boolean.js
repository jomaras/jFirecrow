(function(){

    var fBoolean = Firecrow.N_Interpreter.Boolean = function(value, globalObject, codeConstruct, isLiteral)
    {
        this.initObject(globalObject, codeConstruct);

        this.value = value;
        this.isLiteral = !!isLiteral;

        this.constructor = fBoolean;

        this.addProperty("__proto__", this.globalObject.fcBooleanPrototype);
    };

    fBoolean.prototype = new Firecrow.N_Interpreter.Object();
    fBoolean.prototype.getJsPropertyValue = function(propertyName, codeConstruct)
    {
        return this.getPropertyValue(propertyName, codeConstruct);
    };
    fBoolean.prototype.isPrimitive = function()
    {
        return this.isLiteral;
    };

    var BooleanFunction = Firecrow.N_Interpreter.BooleanFunction = function(globalObject)
    {
        this.initObject(globalObject);

        this.addProperty("prototype", globalObject.fcBooleanPrototype);
        this.proto = globalObject.fcFunctionPrototype;

        this.isInternalFunction = true;
        this.name = "Boolean";
    };

    BooleanFunction.prototype = new Firecrow.N_Interpreter.Object();

    var BooleanPrototype = Firecrow.N_Interpreter.BooleanPrototype = function(globalObject)
    {
        this.initObject(globalObject);

        this.constructor = BooleanPrototype;
        this.name = "BooleanPrototype";
    };

    BooleanPrototype.prototype = new Firecrow.N_Interpreter.Object();
})();