(function()
{
    var fHTMLImageElement = Firecrow.N_Interpreter.HTMLImageElement = function(globalObject)
    {
        this.initObject(globalObject);

        this.addProperty("prototype", globalObject.fcHtmlImagePrototype);

        this.name = "HTMLImageElement";
        this.constructor = fHTMLImageElement;
    };

    fHTMLImageElement.prototype = new Firecrow.N_Interpreter.Object();
    fHTMLImageElement.notifyError = function(message) { alert("HTMLImageElement - " + message);};

    var HTMLImageElementPrototype = Firecrow.N_Interpreter.HTMLImageElementPrototype = function(globalObject)
    {
        this.initObject(globalObject);

        this.constructor = HTMLImageElementPrototype;
        this.name = "HTMLImageElementPrototype";
    };

    HTMLImageElementPrototype.prototype = new Firecrow.N_Interpreter.Object();
})();