(function()
{
    var HTMLImageElement;
    Firecrow.N_Interpreter.HTMLImageElement = HTMLImageElement = function(globalObject)
    {
        this.initObject(globalObject);

        this.addProperty("prototype", globalObject.fcHtmlImagePrototype);

        this.name = "HTMLImageElement";
        this.constructor = HTMLImageElement;
    };

    HTMLImageElement.prototype = new Firecrow.N_Interpreter.Object();
    HTMLImageElement.notifyError = function(message) { alert("HTMLImageElement - " + message);};

    var HTMLImageElementPrototype;
    Firecrow.N_Interpreter.HTMLImageElementPrototype = HTMLImageElementPrototype = function(globalObject)
    {
        this.initObject(globalObject);
        this.constructor = HTMLImageElementPrototype;
        this.name = "HTMLImageElementPrototype";
    };

    HTMLImageElementPrototype.prototype = new Firecrow.N_Interpreter.Object();
})();