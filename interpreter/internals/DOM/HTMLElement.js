(function()
{
    var fcModel = Firecrow.Interpreter.Model;

    fcModel.HTMLElement = function(globalObject)
    {
        this.initObject(globalObject);

        this.addProperty("prototype", globalObject.fcHtmlElementPrototype);

        this.name = "HTMLElement";
    };

    fcModel.HTMLElement.prototype = new fcModel.Object();
    fcModel.HTMLElement.notifyError = function(message) { alert("HTMLElement - " + message);};

    fcModel.HTMLElementPrototype = function(globalObject)
    {
        this.initObject(globalObject);
        this.addProperty("__proto__", globalObject.fcElementPrototype);
        this.constructor = fcModel.HTMLElementPrototype;
        this.name = "HTMLElementPrototype";
    };

    fcModel.HTMLElementPrototype.prototype = new fcModel.Object();
})();