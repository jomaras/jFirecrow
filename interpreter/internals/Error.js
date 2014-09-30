(function() {
/*************************************************************************************/
    var Error = Firecrow.N_Interpreter.Error = function(implementationObject, globalObject, codeConstruct)
    {
        this.initObject(globalObject, codeConstruct, implementationObject, globalObject.fcErrorPrototype);
        this.constructor = Error;

        this.addProperty("message", this.globalObject.internalExecutor.createInternalPrimitiveObject(codeConstruct, implementationObject.message), codeConstruct, false);
        this.addProperty("name", this.globalObject.internalExecutor.createInternalPrimitiveObject(codeConstruct, implementationObject.name), codeConstruct, false);
        this.addProperty("description", this.globalObject.internalExecutor.createInternalPrimitiveObject(codeConstruct, implementationObject.description), codeConstruct, false);
        this.addProperty("number", this.globalObject.internalExecutor.createInternalPrimitiveObject(codeConstruct, implementationObject.number), codeConstruct, false);
        this.addProperty("fileName", this.globalObject.internalExecutor.createInternalPrimitiveObject(codeConstruct, implementationObject.fileName), codeConstruct, false);
        this.addProperty("lineNumber", this.globalObject.internalExecutor.createInternalPrimitiveObject(codeConstruct, implementationObject.lineNumber), codeConstruct, false);
        this.addProperty("stack", this.globalObject.internalExecutor.createInternalPrimitiveObject(codeConstruct, implementationObject.stack), codeConstruct, false);
    };

    Firecrow.N_Interpreter.Error.notifyError = function(message) { alert("Error - " + message); };
    Firecrow.N_Interpreter.Error.prototype = new Firecrow.N_Interpreter.Object();

    var ErrorPrototype = Firecrow.N_Interpreter.ErrorPrototype = function(globalObject)
    {
        this.initObject(globalObject);
        this.name = "ErrorPrototype";
        this.constructor = ErrorPrototype;
    };

    ErrorPrototype.CONST =
    {
        INTERNAL_PROPERTIES :
        {
            METHODS:[]
        },
        FUNCTION_PROPERTIES:
        {
            METHODS:  []
        }
    };

    ErrorPrototype.prototype = new Firecrow.N_Interpreter.Object(null);

    var ErrorFunction = Firecrow.N_Interpreter.ErrorFunction = function(globalObject)
    {
        this.initObject(globalObject);

        this.addProperty("prototype", globalObject.fcErrorPrototype);

        this.isInternalFunction = true;
        this.name = "Error";
    };

    ErrorFunction.prototype = new Firecrow.N_Interpreter.Object(null);
/*************************************************************************************/
})();