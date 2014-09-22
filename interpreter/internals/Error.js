(function() {
/*************************************************************************************/
    var fcInternals = Firecrow.Interpreter.Internals;

    fcInternals.Error = function(implementationObject, globalObject, codeConstruct)
    {
        this.initObject(globalObject, codeConstruct, implementationObject, globalObject.fcErrorPrototype);
        this.constructor = fcInternals.Error;

        this.addProperty("message", this.globalObject.internalExecutor.createInternalPrimitiveObject(codeConstruct, implementationObject.message), codeConstruct, false);
        this.addProperty("name", this.globalObject.internalExecutor.createInternalPrimitiveObject(codeConstruct, implementationObject.name), codeConstruct, false);
        this.addProperty("description", this.globalObject.internalExecutor.createInternalPrimitiveObject(codeConstruct, implementationObject.description), codeConstruct, false);
        this.addProperty("number", this.globalObject.internalExecutor.createInternalPrimitiveObject(codeConstruct, implementationObject.number), codeConstruct, false);
        this.addProperty("fileName", this.globalObject.internalExecutor.createInternalPrimitiveObject(codeConstruct, implementationObject.fileName), codeConstruct, false);
        this.addProperty("lineNumber", this.globalObject.internalExecutor.createInternalPrimitiveObject(codeConstruct, implementationObject.lineNumber), codeConstruct, false);
        this.addProperty("stack", this.globalObject.internalExecutor.createInternalPrimitiveObject(codeConstruct, implementationObject.stack), codeConstruct, false);
    };

    fcInternals.Error.notifyError = function(message) { alert("Error - " + message); };
    fcInternals.Error.prototype = new fcInternals.Object();

    fcInternals.ErrorPrototype = function(globalObject)
    {
        this.initObject(globalObject);
        this.name = "ErrorPrototype";
        this.constructor = fcInternals.ErrorPrototype;
    };

    fcInternals.ErrorPrototype.CONST =
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

    fcInternals.ErrorPrototype.prototype = new fcInternals.Object(null);

    fcInternals.ErrorFunction = function(globalObject)
    {
        this.initObject(globalObject);

        this.addProperty("prototype", globalObject.fcErrorPrototype);

        this.isInternalFunction = true;
        this.name = "Error";
    };

    fcInternals.ErrorFunction.prototype = new fcInternals.Object(null);
/*************************************************************************************/
})();