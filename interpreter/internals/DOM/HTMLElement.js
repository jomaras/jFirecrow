(function()
{
    var fHTMLElement = Firecrow.N_Interpreter.HTMLElement = function(globalObject)
    {
        this.initObject(globalObject);

        this.addProperty("prototype", globalObject.fcHtmlElementPrototype);

        this.name = "HTMLElement";
        this.constructor = fHTMLElement;
    };

    fHTMLElement.prototype = new Firecrow.N_Interpreter.Object();
    fHTMLElement.notifyError = function(message) { alert("HTMLElement - " + message);};

    var HTMLElementPrototype = Firecrow.N_Interpreter.HTMLElementPrototype = function(globalObject)
    {
        this.initObject(globalObject);
        this.addProperty("__proto__", globalObject.fcElementPrototype);

        this.constructor = HTMLElementPrototype;
        this.name = "HTMLElementPrototype";
    };

    HTMLElementPrototype.prototype = new Firecrow.N_Interpreter.Object();
})();