(function() {
/*************************************************************************************/

    var Function = Firecrow.N_Interpreter.Function = function(globalObject, scopeChain, codeConstruct, value)
    {
        this.initObject(globalObject, codeConstruct, value);

        this.object = this;
        this.codeConstruct = codeConstruct;
        this.scopeChain = scopeChain;

        this.value = value;

        this._setDefaultProperties();
    };
    Function.prototype = new Firecrow.N_Interpreter.Object();

    Function.createInternalNamedFunction = function(globalObject, name, ownerObject)
    {
        var functionObject = new Function(globalObject, []);

        functionObject.name = name;
        functionObject.isInternalFunction = true;
        functionObject.ownerObject = ownerObject;

        return functionObject;
    };

    Function.notifyError = function(message) { alert("Function - " + message); };

    Function.prototype.bind = function(args, callExpression)
    {
        this.isBound = true;
        this.bounder = args[0];
        this.argsToPrepend = args.slice(1);
        this.bindingExpression = callExpression;
    };

    Function.prototype.getJsPropertyValue = function(propertyName, codeConstruct)
    {
        return this.getPropertyValue(propertyName, codeConstruct);
    };
    Function.prototype._setDefaultProperties = function()
    {
        this.addProperty("prototype", this.globalObject.internalExecutor.createNonConstructorObject(this.codeConstruct, this.value != null ? this.value.prototype : null));
        this.addProperty("__proto__", this.globalObject.fcFunctionPrototype);

        this._setLengthProperty();
    };

    Function.prototype._setLengthProperty = function()
    {
        var length = 0;

        if(this.codeConstruct != null && this.codeConstruct.params != null)
        {
            length = this.codeConstruct.params.length;
        }

        this.addProperty("length", this.globalObject.internalExecutor.createInternalPrimitiveObject(this.codeConstruct, length), this.codeConstruct, false);
    };


    var FunctionPrototype = Firecrow.N_Interpreter.FunctionPrototype = function(globalObject)
    {
        this.initObject(globalObject, null, window.Function.prototype, globalObject.fcObjectPrototype);

        this.constructor = FunctionPrototype;
        this.proto = this.globalObject.fcObjectPrototype;
        this.name = "FunctionPrototype";
        //https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Function#Methods_2
    };

    FunctionPrototype.prototype = new Firecrow.N_Interpreter.Object();
    FunctionPrototype.prototype.initFunctionPrototype = function()
    {
        FunctionPrototype.CONST.INTERNAL_PROPERTIES.METHODS.forEach(function(propertyName)
        {
            if(Function.prototype[propertyName])
            {
                this.addProperty
                (
                    propertyName,
                    new Firecrow.N_Interpreter.fcValue
                    (
                        window.Function.prototype[propertyName],
                        Function.createInternalNamedFunction(this.globalObject, propertyName, this),
                        null
                    ),
                    null,
                    false
                );
            }
        }, this);
    }

    FunctionPrototype.CONST =
    {
        INTERNAL_PROPERTIES :
        {
            METHODS: ["apply", "call", "toString", "bind"]
        }
    };


    Firecrow.N_Interpreter.FunctionFunction = function(globalObject)
    {
        this.initObject(globalObject, null, window.Function, globalObject.fcFunctionPrototype);

        this.addProperty("prototype", this.globalObject.fcFunctionPrototype);

        this.isInternalFunction = true;
        this.name = "Function";
    };

    Firecrow.N_Interpreter.FunctionFunction.prototype = new Firecrow.N_Interpreter.Object();
    Firecrow.N_Interpreter.FunctionFunction.prototype.getJsPropertyValue = function(propertyName, codeConstruct)
    {
        return this.getPropertyValue(propertyName, codeConstruct);
    };
/*************************************************************************************/
})();