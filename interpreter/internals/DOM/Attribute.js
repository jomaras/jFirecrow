(function()
{ 
    var fcInternals = Firecrow.Interpreter.Internals;
    var ValueTypeHelper = Firecrow.ValueTypeHelper;

    fcInternals.Attribute = function(attribute, htmlElement, globalObject, codeConstruct)
    {
        this.initObject(globalObject, codeConstruct, attribute);

        this.htmlElement = htmlElement;
        this.attribute = attribute;

        this.constructor = fcInternals.Attribute;

        this.addProperty("isId", this.globalObject.internalExecutor.createInternalPrimitiveObject(codeConstruct, this.attribute.isId), null);
        this.addProperty("localName", this.globalObject.internalExecutor.createInternalPrimitiveObject(codeConstruct, this.attribute.localName), null);
        this.addProperty("name", this.globalObject.internalExecutor.createInternalPrimitiveObject(codeConstruct, this.attribute.name), null);
        this.addProperty("namespaceURI", this.globalObject.internalExecutor.createInternalPrimitiveObject(codeConstruct, this.attribute.namespaceURI), null);
        this.addProperty("nodeName", this.globalObject.internalExecutor.createInternalPrimitiveObject(codeConstruct, this.attribute.nodeName), null);
        this.addProperty("nodeType", this.globalObject.internalExecutor.createInternalPrimitiveObject(codeConstruct, this.attribute.nodeType), null);
        this.addProperty("nodeValue", this.globalObject.internalExecutor.createInternalPrimitiveObject(codeConstruct, this.attribute.nodeValue), null);
        this.addProperty("specified", this.globalObject.internalExecutor.createInternalPrimitiveObject(codeConstruct, this.attribute.specified), null);
        this.addProperty("textContent", this.globalObject.internalExecutor.createInternalPrimitiveObject(codeConstruct, this.attribute.textContent), null);
        this.addProperty("value", this.globalObject.internalExecutor.createInternalPrimitiveObject(codeConstruct, this.attribute.value), null);

        this.registerAddPropertyCallback(function(propertyName, propertyValue, codeConstruct)
        {
            fcInternals.HtmlElementExecutor.addDependencyIfImportantElement(this.htmlElement, this.globalObject, codeConstruct);
        }, this);

        this.getJsPropertyValue = function(propertyName, codeConstruct)
        {
            return this.getPropertyValue(propertyName, codeConstruct);
        };
        this.addJsProperty = function(propertyName, propertyFcValue, codeConstruct)
        {
            this.attribute[propertyName] = propertyFcValue.jsValue;
            this.addProperty(propertyName, propertyFcValue, codeConstruct);
        };
    };
    fcInternals.Attribute.notifyError = function(message) { debugger; alert("Attr - " + message); };

    fcInternals.Attribute.prototype = new fcInternals.Object();

    fcInternals.Attribute.wrapAttribute = function(attribute, globalObject, codeConstruct)
    {
        return new fcInternals.fcValue
        (
            attribute,
            new fcInternals.Attribute(attribute, null, globalObject, codeConstruct),
            codeConstruct
        );
    };

    fcInternals.Attribute.createAttributeList = function(htmlElement, globalObject, codeConstruct)
    {
        if(!ValueTypeHelper.isHtmlElement(htmlElement) && !ValueTypeHelper.isDocumentFragment(htmlElement))
        {
            fcInternals.Attribute.notifyError("Attr - when creating attribute list, the argument has to be an HTMLElement!");
        }

        var attributeList = [];
        var attributes = htmlElement.attributes;
        var attributeNameFcValueMap = {};

        if(attributes != null)
        {
            for(var i = 0, length = attributes.length; i < length; i++)
            {
                var attribute = attributes[i];
                var fcAttribute = new fcInternals.fcValue
                (
                    attribute,
                    new fcInternals.Attribute(attribute, htmlElement, globalObject, codeConstruct),
                    codeConstruct
                );

                attributeList.push(fcAttribute);

                attributeNameFcValueMap[attribute.name] = fcAttribute;
            }
        }

        var array = globalObject.internalExecutor.createArray(codeConstruct, attributeList);

        array.iValue.removePrototypeMethods();

        for(var attributeName in attributeNameFcValueMap)
        {
            array.iValue.addProperty(attributeName, attributeNameFcValueMap[attributeName]);
        }

        return array;
    };

    //https://developer.mozilla.org/en/DOM/element
    fcInternals.Attribute.CONST =
    {
        INTERNAL_PROPERTIES :
        {
            METHODS:[],
            PROPERTIES:
            [
                "childNodes", "firstChild", "isId", "lastChild", "localName", "name", "namespaceURI",
                "nextSibling", "nodeName", "nodeType", "nodeValue", "ownerDocument", "ownerElement", "parentElement",
                "parentNode", "prefix", "previousSibling", "specified", "textContent", "value"
            ]
        }
    };
})();