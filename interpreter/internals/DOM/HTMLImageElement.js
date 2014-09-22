(function()
{
    var fcModel = Firecrow.Interpreter.Model;

    fcModel.HTMLImageElement = function(globalObject)
    {
        this.initObject(globalObject);

        this.addProperty("prototype", globalObject.fcHtmlImagePrototype);

        this.name = "HTMLImageElement";
    };

    fcModel.HTMLImageElement.prototype = new fcModel.Object();
    fcModel.HTMLImageElement.notifyError = function(message) { alert("HTMLImageElement - " + message);};

    fcModel.HTMLImageElementPrototype = function(globalObject)
    {
        this.initObject(globalObject);
        this.constructor = fcModel.HTMLImageElementPrototype;
        this.name = "HTMLImageElementPrototype";
    };

    fcModel.HTMLImageElementPrototype.prototype = new fcModel.Object();
})();