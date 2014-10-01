(function()
{
    var fElement = Firecrow.N_Interpreter.Element = function(globalObject)
    {
        this.initObject(globalObject);

        this.addProperty("prototype", globalObject.fcElementPrototype);

        this.name = "Element";
    };

    fElement.prototype = new Firecrow.N_Interpreter.Object();
    fElement.notifyError = function(message) { alert("Element - " + message);};

    var ElementPrototype = Firecrow.N_Interpreter.ElementPrototype = function(globalObject)
    {
        this.initObject(globalObject);
        this.constructor = ElementPrototype;
        this.name = "ElementPrototype";
    };

    ElementPrototype.prototype = new Firecrow.N_Interpreter.Object();
})();