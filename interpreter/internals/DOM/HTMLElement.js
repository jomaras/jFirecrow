(function()
{
    var HTMLElement;
    Firecrow.N_Interpreter.HTMLElement = HTMLElement = function(globalObject)
    {
        this.initObject(globalObject);

        this.addProperty("prototype", globalObject.fcHtmlElementPrototype);

        this.name = "HTMLElement";
        this.constructor = HTMLElement;
    };

    HTMLElement.prototype = new Firecrow.N_Interpreter.Object();
    HTMLElement.notifyError = function(message) { alert("HTMLElement - " + message);};

    var HTMLElementPrototype;
    Firecrow.N_Interpreter.HTMLElementPrototype = HTMLElementPrototype = function(globalObject)
    {
        this.initObject(globalObject);
        this.addProperty("__proto__", globalObject.fcElementPrototype);

        this.constructor = HTMLElementPrototype;
        this.name = "HTMLElementPrototype";
    };

    HTMLElementPrototype.prototype = new Firecrow.N_Interpreter.Object();
})();