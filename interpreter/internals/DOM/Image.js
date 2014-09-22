(function()
{
    var fcInternals = Firecrow.Interpreter.Internals;
    fcInternals.ImageFunction = function(globalObject, codeConstruct)
    {
        this.initObject(globalObject);
        this.addProperty("src", this.globalObject.internalExecutor.createInternalPrimitiveObject(codeConstruct, ""));

        this.isInternalFunction = true;
        this.name = "Image";
    };

    fcInternals.ImageFunction.prototype = new fcInternals.Object();
})();