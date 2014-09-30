(function() {
    /*************************************************************************************/
    var ValueTypeHelper = Firecrow.ValueTypeHelper;

    var fcValue = Firecrow.N_Interpreter.fcValue = function(jsValue, iValue, codeConstruct, symbolicValue)
    {
        this.id = fcValue.LAST_ID++;
        this.jsValue = jsValue;
        this.iValue = iValue;
        this.codeConstruct = codeConstruct;
        this.symbolicValue = symbolicValue;

        if(this.iValue != null && this.iValue.isInternalFunction != undefined)
        {
            this.isInternalFunction = this.iValue.isInternalFunction;
        }
    };

    fcValue.LAST_ID = 0;
    fcValue.notifyError = function(message) { alert("FcValue - " + message); };

    fcValue.prototype =
    {
        isFunction: function() { return ValueTypeHelper.isFunction(this.jsValue); },
        isPrimitive: function() { return ValueTypeHelper.isPrimitive(this.jsValue); },
        isSymbolic: function() { return this.symbolicValue != null; },
        isNotSymbolic: function() { return this.symbolicValue == null; },

        getPropertyValue: function(propertyName)
        {
            if(propertyName == null || propertyName == "") { fcValue.notifyError("When getting property value, the property name must not be empty!"); return; }

            if(ValueTypeHelper.isPrimitive(this.jsValue)) { fcValue.notifyError("Still not handling getting properties from primitives"); return; }

            return null;
        },

        createCopy: function(codeConstruct)
        {
            return new fcValue(this.jsValue, this.iValue, this.codeConstruct, this.symbolicValue);
        }
    };
})();