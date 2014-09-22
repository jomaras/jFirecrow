(function() {
/*************************************************************************************/
    var fcInternals = Firecrow.Interpreter.Internals;

    Firecrow.Interpreter.Model.FunctionFunction = function(globalObject)
    {
        this.initObject(globalObject, null, Function, globalObject.fcFunctionPrototype);

        this.addProperty("prototype", this.globalObject.fcFunctionPrototype);

        this.isInternalFunction = true;
        this.name = "Function";
    };

    Firecrow.Interpreter.Model.FunctionFunction.prototype = new fcInternals.Object();
    Firecrow.Interpreter.Model.FunctionFunction.prototype.getJsPropertyValue = function(propertyName, codeConstruct)
    {
        return this.getPropertyValue(propertyName, codeConstruct);
    };
/*************************************************************************************/
})();