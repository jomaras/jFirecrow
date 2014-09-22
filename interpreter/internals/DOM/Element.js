(function()
{
    var fcInternals = Firecrow.Interpreter.Internals;

    fcInternals.Element = function(globalObject)
    {
        this.initObject(globalObject);

        this.addProperty("prototype", globalObject.fcElementPrototype);

        this.name = "Element";
    };

    fcInternals.Element.prototype = new fcInternals.Object();
    fcInternals.Element.notifyError = function(message) { alert("Element - " + message);};

    fcInternals.ElementPrototype = function(globalObject)
    {
        this.initObject(globalObject);
        this.constructor = fcInternals.ElementPrototype;
        this.name = "ElementPrototype";
    };

    fcInternals.ElementPrototype.prototype = new fcInternals.Object();
})();