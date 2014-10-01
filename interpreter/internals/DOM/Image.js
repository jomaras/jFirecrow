(function()
{
    var ImageFunction = Firecrow.N_Interpreter.ImageFunction = function(globalObject, codeConstruct)
    {
        this.initObject(globalObject);

        this.addProperty("src", this.globalObject.internalExecutor.createInternalPrimitiveObject(codeConstruct, ""));

        this.isInternalFunction = true;
        this.name = "Image";
        this.constructor = ImageFunction;
    };

    ImageFunction.prototype = new Firecrow.N_Interpreter.Object();
})();