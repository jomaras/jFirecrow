(function() { with (FBL) {
    /*************************************************************************************/
    var ValueTypeHelper = Firecrow.ValueTypeHelper;

    var ClassList;
    Firecrow.N_Interpreter.ClassList = ClassList = function(htmlElement, globalObject, codeConstruct)
    {
        if(!ValueTypeHelper.isHtmlElement(htmlElement) && !ValueTypeHelper.isDocumentFragment(htmlElement)) { ClassList.notifyError("Constructor argument has to be a HTMLElement");}

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

        this.getJsPropertyValue = function(propertyName, codeConstruct) { ClassList.notifyError("get property Class not yet implemented"); };
        this.addJsProperty = function(propertyName, value, codeConstruct) { ClassList.notifyError("add property Class not yet implemented"); };
    };

    ClassList.notifyError = function(message) { alert("ClassList - " + message); };

    ClassList.prototype = new fcModel.Object();

    ClassList.createClassList = function(htmlElement, globalObject, codeConstruct)
    {
        var jClassList = new ClassList(htmlElement, globalObject, codeConstruct);
        return new Firecrow.N_Interpreter.fcValue(jClassList, jClassList, codeConstruct);
    };

    //https://developer.mozilla.org/en/DOM/element
    ClassList.CONST =
    {
        INTERNAL_PROPERTIES :
        {
            METHODS: [ "add", "remove", "toggle"]
        }
    };
}});