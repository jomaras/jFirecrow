(function() {
/*************************************************************************************/
    Firecrow.N_Interpreter.FunctionFunction = function(globalObject)
    {
        this.initObject(globalObject, null, Function, globalObject.fcFunctionPrototype);

        this.addProperty("prototype", this.globalObject.fcFunctionPrototype);

        this.isInternalFunction = true;
        this.name = "Function";
    };

    Firecrow.N_Interpreter.FunctionFunction.prototype = new Firecrow.N_Interpreter.Object();
    Firecrow.N_Interpreter.FunctionFunction.prototype.getJsPropertyValue = function(propertyName, codeConstruct)
    {
        return this.getPropertyValue(propertyName, codeConstruct);
    };
/*************************************************************************************/
})();