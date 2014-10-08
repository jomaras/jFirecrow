(function()
{
    /*************************************************************************************/
    var ValueTypeHelper = Firecrow.ValueTypeHelper;

    var fDocument = Firecrow.N_Interpreter.Document = function(document, globalObject)
    {
        this.initObject(globalObject);
        ValueTypeHelper.expand(this, Firecrow.N_Interpreter.EventListenerMixin);

        this.document = document;
        this.htmlElement = document;
        this.implementationObject = document;

        this.constructor = fDocument;

        this.htmlElementToFcMapping = { };

        this._createDefaultProperties();
    };
    fDocument.notifyError = function(message) { alert("Document: " + message);}

    fDocument.prototype = new Firecrow.N_Interpreter.Object();

    fDocument.prototype.addJsProperty = function(propertyName, value, codeConstruct)
    {
        this.addProperty(propertyName, value, codeConstruct);

        if(Firecrow.N_Interpreter.DOM_PROPERTIES.isElementEventProperty(propertyName))
        {
            this.globalObject.registerHtmlElementEventHandler
            (
                this.globalObject.document, propertyName, value,
                {
                    codeConstruct: codeConstruct,
                    evaluationPositionId: this.globalObject.getPreciseEvaluationPositionId()
                }
            );
        }
    };

    fDocument.prototype.getJsPropertyValue = function(propertyName, codeConstruct)
    {
        var hasBeenHandled = false;

        if (Firecrow.N_Interpreter.DOM_PROPERTIES.isDocumentElement(propertyName) || Firecrow.N_Interpreter.DOM_PROPERTIES.isNodeElement(propertyName))
        {
            this.addProperty(propertyName, Firecrow.N_Interpreter.HtmlElementExecutor.wrapToFcElement(this.document[propertyName], this.globalObject, codeConstruct));
            hasBeenHandled = true;
        }
        else if (Firecrow.N_Interpreter.DOM_PROPERTIES.isDocumentElements(propertyName) || Firecrow.N_Interpreter.DOM_PROPERTIES.isNodeElements(propertyName))
        {
            var elements = this._getElements(propertyName, codeConstruct);

            var array = this.globalObject.internalExecutor.createArray(codeConstruct, elements);
            array.iValue.markAsNodeList();

            this.addProperty(propertyName, array);

            hasBeenHandled = true;
        }
        else if(Firecrow.N_Interpreter.DOM_PROPERTIES.isDocumentPrimitives(propertyName) || Firecrow.N_Interpreter.DOM_PROPERTIES.isNodePrimitives(propertyName))
        {
            this.addProperty(propertyName, this.getPropertyValue(propertyName, codeConstruct));
            hasBeenHandled = true;
        }
        else if(Firecrow.N_Interpreter.DOM_PROPERTIES.isDocumentOther(propertyName) || Firecrow.N_Interpreter.DOM_PROPERTIES.isNodeOther(propertyName))
        {
            if(propertyName == "defaultView") { return this.globalObject; }

            if (propertyName == "readyState" || propertyName == "location")
            {
                this.addProperty(propertyName, this.getPropertyValue(propertyName, codeConstruct));
                hasBeenHandled = true;
            }
            else if (propertyName == "ownerDocument" || propertyName == "attributes")
            {

            }
        }

        if(!this._isMethodName(propertyName) && !hasBeenHandled)
        {
            Firecrow.N_Interpreter.DOM_PROPERTIES.DOCUMENT.UNPREDICTED[propertyName] = propertyName;
        }

        return this.getPropertyValue(propertyName, codeConstruct);
    };

    fDocument.prototype.getElementByXPath = function(xPath)
    {
        if(xPath == null || xPath == "") { return new Firecrow.N_Interpreter.fcValue(null, null, null);}

        var simpleXPath = (new Firecrow.N_Interpreter.SimpleXPath(xPath)).removeLevel();
        var foundElement = this._getHtmlElement();

        while(!simpleXPath.isEmpty() && foundElement != null)
        {
            foundElement = this._getChild(foundElement, simpleXPath.getCurrentTag(), simpleXPath.getIndex());
            simpleXPath.removeLevel();
        }

        return Firecrow.N_Interpreter.HtmlElementExecutor.wrapToFcElement(foundElement, this.globalObject, null);
    };

    fDocument.prototype.getCookie = function()
    {
        var cookieValue = this.getPropertyValue("cookie");

        return cookieValue != null ? cookieValue.jsValue : "";
    };

    fDocument.prototype.setCookie = function(cookie)
    {
        this.addProperty("cookie", this.globalObject.internalExecutor.createInternalPrimitiveObject(null, cookie));
    }

    fDocument.prototype._getHtmlElement = function()
    {
        for(var i = 0; i < this.document.childNodes.length; i++)
        {
            var child = this.document.childNodes[i];

            if(child.tagName != null && child.tagName.toLowerCase() == "html")
            {
                return child;
            }
        }

        return null;
    };

    fDocument.prototype._createDefaultProperties = function()
    {
        Firecrow.N_Interpreter.DOM_PROPERTIES.DOCUMENT.METHODS.forEach(function(method)
        {
            this.addProperty(method, this.globalObject.internalExecutor.createInternalFunction(this.document[method], method, this, true));
        }, this);

        Firecrow.N_Interpreter.DOM_PROPERTIES.setPrimitives(this, this.document, Firecrow.N_Interpreter.DOM_PROPERTIES.DOCUMENT.PRIMITIVES);
        Firecrow.N_Interpreter.DOM_PROPERTIES.setPrimitives(this, this.document, Firecrow.N_Interpreter.DOM_PROPERTIES.NODE.PRIMITIVES);

        this.addProperty("readyState", this.globalObject.internalExecutor.createInternalPrimitiveObject(null, "loading"));
        this.addProperty("location", this.globalObject.internalExecutor.createLocationObject());
    };

    fDocument.prototype._getElements = function(propertyName, codeConstruct)
    {
        var array = [];
        var items = this.document[propertyName];

        if(items == null) { return array; }

        for(var i = 0, length = items.length; i < length; i++)
        {
            if(items[i].nodeType == 10) { continue; } //skip doctype
            array.push(Firecrow.N_Interpreter.HtmlElementExecutor.wrapToFcElement(items[i], this.globalObject, codeConstruct));
        }

        return array;
    };

    fDocument.prototype._getChild = function(htmlElement, tagName, index)
    {
        if(htmlElement == null || htmlElement.children == null) { return null;}

        var tagChildren = [];

        for(var i = 0; i < htmlElement.children.length; i++)
        {
            var child = htmlElement.children[i];

            if(child.nodeName.toUpperCase() == tagName.toUpperCase())
            {
                tagChildren.push(child);
            }
        }

        return tagChildren[index];
    };

    fDocument.prototype._isMethodName = function(name)
    {
        return Firecrow.N_Interpreter.DOM_PROPERTIES.DOCUMENT.METHODS.indexOf(name) != -1;
    };

    var DocumentFunction = Firecrow.N_Interpreter.DocumentFunction = function(globalObject)
    {
        this.initObject(globalObject);
        this.name = "Document";

        this.addProperty("prototype", globalObject.fcDocumentPrototype);
        this.proto = globalObject.fcFunctionPrototype;
    };

    DocumentFunction.prototype = new Firecrow.N_Interpreter.Object();

    var DocumentPrototype = Firecrow.N_Interpreter.DocumentPrototype = function(globalObject)
    {
        this.initObject(globalObject);
        this.constructor = DocumentPrototype;
    };

    DocumentPrototype.prototype = new Firecrow.N_Interpreter.Object();
    /**************************************************************************************/
})();