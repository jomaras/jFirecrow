(function()
{
    var Element;
    Firecrow.N_Interpreter.Element = Element = function(globalObject)
    {
        this.initObject(globalObject);

        this.addProperty("prototype", globalObject.fcElementPrototype);

        this.name = "Element";
    };

    Element.prototype = new Firecrow.N_Interpreter.Object();
    Element.notifyError = function(message) { alert("Element - " + message);};

    var ElementPrototype;
    Firecrow.N_Interpreter.ElementPrototype = ElementPrototype = function(globalObject)
    {
        this.initObject(globalObject);
        this.constructor = ElementPrototype;
        this.name = "ElementPrototype";
    };

    ElementPrototype.prototype = new Firecrow.N_Interpreter.Object();
})();