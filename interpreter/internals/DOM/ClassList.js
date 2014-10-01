(function() { with (FBL) {
    /*************************************************************************************/
    var ValueTypeHelper = Firecrow.ValueTypeHelper;

    var fClassList = Firecrow.N_Interpreter.ClassList = function(htmlElement, globalObject, codeConstruct)
    {
        if(!ValueTypeHelper.isHtmlElement(htmlElement) && !ValueTypeHelper.isDocumentFragment(htmlElement)) { fClassList.notifyError("Constructor argument has to be a HTMLElement");}

        this.initObject(this.globalObject, codeConstruct);

        this.htmlElement = htmlElement;

        var classList = htmlElement.classList;

        if(classList != null)
        {
            for(var i = 0, length = classList.length; i < length; i++)
            {
                this.addProperty(i, this.globalObject.internalExecutor.createInternalPrimitiveObject(codeConstruct, i), codeConstruct);
            }

            this.globalObject.internalExecutor.expandWithInternalFunction(classList.add, "add");
            this.globalObject.internalExecutor.expandWithInternalFunction(classList.remove, "remove");
            this.globalObject.internalExecutor.expandWithInternalFunction(classList.toggle, "toggle");
        }

        this.getJsPropertyValue = function(propertyName, codeConstruct) { fClassList.notifyError("get property Class not yet implemented"); };
        this.addJsProperty = function(propertyName, value, codeConstruct) { fClassList.notifyError("add property Class not yet implemented"); };
    };

    fClassList.notifyError = function(message) { alert("ClassList - " + message); };

    fClassList.prototype = new Firecrow.N_Interpreter.Object();

    fClassList.createClassList = function(htmlElement, globalObject, codeConstruct)
    {
        var jClassList = new fClassList(htmlElement, globalObject, codeConstruct);
        return new Firecrow.N_Interpreter.fcValue(jClassList, jClassList, codeConstruct);
    };

    //https://developer.mozilla.org/en/DOM/element
    fClassList.CONST =
    {
        INTERNAL_PROPERTIES :
        {
            METHODS: [ "add", "remove", "toggle"]
        }
    };
}});