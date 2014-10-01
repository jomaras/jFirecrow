(function() {
    /*************************************************************************************/
    var ValueTypeHelper = Firecrow.ValueTypeHelper;
    var ASTHelper = Firecrow.ASTHelper;

    var VariableObject = Firecrow.N_Interpreter.VariableObject = function()
    {
        this.identifiers = [];
    };

    VariableObject.notifyError = function(message) { alert("VariableObject - " + message); };

    VariableObject.prototype =
    {
        registerIdentifier: function(identifier)
        {
            if(!ValueTypeHelper.isOfType(identifier, Firecrow.N_Interpreter.Identifier)) { VariableObject.notifyError("When registering an identifier has to be passed"); return; }

            var existingIdentifier = this.getIdentifier(identifier.name);

            if(existingIdentifier == null)
            {
                this.identifiers.push(identifier);
            }
            else if(existingIdentifier.value != null && ASTHelper.isFunctionDeclaration(existingIdentifier.value.codeConstruct)
                &&  identifier.value != null && !ASTHelper.isFunction(identifier.value.codeConstruct))
            {
                //a variable declaration can not override a function declaration
            }
            else if(ASTHelper.isFunctionParameter(existingIdentifier.declarationPosition.codeConstruct)
                && ASTHelper.getFunctionParent(existingIdentifier.declarationPosition.codeConstruct) == ASTHelper.getFunctionParent(identifier.declarationPosition.codeConstruct))
            {
                //don't shadow if the existing identifier is a parameter from the function parent
            }
            else
            {
                existingIdentifier.setValue(identifier.value, identifier.lastModificationPosition.codeConstruct);
            }
        },

        getIdentifierValue: function(identifierName)
        {
            var identifier = this.getIdentifier(identifierName);

            return identifier != null ? identifier.value : null;
        },

        getIdentifier: function(identifierName)
        {
            return ValueTypeHelper.findInArray
            (
                this.identifiers,
                identifierName,
                function(currentIdentifier, identifierName)
                {
                    return currentIdentifier.name === identifierName;
                }
            );
        },

        deleteIdentifier: function(identifierName)
        {
            var identifier = this.getIdentifier(identifierName);

            if(identifier != null)
            {
                ValueTypeHelper.removeFromArrayByElement(this.identifiers, identifier);
            }
        }
    };


    Firecrow.N_Interpreter.VariableObjectMixin =
    {
        getIdentifier: function(identifierName) { return this.iValue.getProperty(identifierName); },

        getIdentifierValue: function(identifierName, readConstruct, currentContext)
        {
            return this.iValue.getPropertyValue(identifierName, readConstruct, currentContext);
        },

        registerIdentifier: function(identifier)
        {
            var existingProperty = this.iValue.getOwnProperty(identifier.name);

            //TODO - problem with overriding global properties - they are only overriden when an assignement
            //is performed, not when a variable is declared - this mixin is only used for the globalObject
            //so if a property already exists, don't override it
            if(existingProperty == null)
            {
                this.iValue.addProperty
                (
                    identifier.name,
                    identifier.value,
                    identifier.declarationPosition != null ? identifier.declarationPosition.codeConstruct : null
                );
            }
        },

        deleteIdentifier: function(identifierName, deleteConstruct)
        {
            this.iValue.deleteProperty(identifierName, deleteConstruct);
        }
    };


    VariableObject.createFunctionVariableObject = function(functionIdentifier, formalParameters, calleeFunction, sentArguments, callCommand, globalObject)
    {
        var functionVariableObject = new VariableObject(null);

        functionVariableObject.functionIdentifier = functionIdentifier;
        functionVariableObject.formalParameters = formalParameters;
        functionVariableObject.calleeFunction = calleeFunction;
        functionVariableObject.sentArguments = sentArguments;

        var callConstruct = callCommand != null ? callCommand.codeConstruct : null;

        this._registerArgumentsVariable(functionVariableObject, callConstruct, sentArguments, globalObject);

        if(functionIdentifier != null) { functionVariableObject.registerIdentifier(functionIdentifier); }
        if(formalParameters != null) { this._registerFormalParameters(formalParameters, functionVariableObject, sentArguments, this._getArgumentsConstructs(callCommand, callConstruct, sentArguments));}

        return functionVariableObject;
    };

    VariableObject._registerArgumentsVariable = function(functionVariableObject, callConstruct, sentArguments, globalObject)
    {
        var argumentsValue = globalObject.internalExecutor.createNonConstructorObject(callConstruct);

        for(var i = 0; i < sentArguments.length;i++)
        {
            argumentsValue.iValue.addProperty(i +"", sentArguments[i], callConstruct);
            argumentsValue.jsValue[i] = sentArguments[i];
        }

        var length = globalObject.internalExecutor.createInternalPrimitiveObject(callConstruct, sentArguments.length);

        argumentsValue.iValue.addProperty("length", length, callConstruct);
        Object.defineProperty(argumentsValue.jsValue, "length", { enumerable: false, value: sentArguments.length, writable:true, configurable:true});

        argumentsValue.iValue.addProperty("callee", functionVariableObject.calleeFunction, callConstruct, false);
        Object.defineProperty(argumentsValue.jsValue, "callee", { enumerable: false, value: functionVariableObject.calleeFunction});

        functionVariableObject.registerIdentifier
        (
            new Firecrow.N_Interpreter.Identifier
            (
                "arguments",
                argumentsValue,
                callConstruct != null ? callConstruct.arguments : null,
                globalObject
            )
        );
    };

    VariableObject._getArgumentsConstructs = function(callCommand, callConstruct, sentArguments)
    {
        var argumentsConstruct = callConstruct != null ? callConstruct.arguments : [];

        if(callCommand != null)
        {
            if(callCommand.isCall)
            {
                argumentsConstruct = callConstruct.arguments.slice(1);
            }
            else if (callCommand.isApply)
            {
                var argumentsArray = callConstruct.arguments[1];

                argumentsConstruct = [];

                for(var i = 0; i < sentArguments.length; i++)
                {
                    argumentsConstruct.push(argumentsArray);
                }
            }
        }

        return argumentsConstruct || [];
    };

    VariableObject._registerFormalParameters = function(formalParameters, functionVariableObject, sentArguments, argumentConstructs)
    {
        if(sentArguments == null) { debugger; }

        for(var i = 0; i < formalParameters.length; i++)
        {
            var formalParameter = formalParameters[i];

            functionVariableObject.registerIdentifier(formalParameter);

            formalParameter.setValue
            (
                sentArguments[i] || new Firecrow.N_Interpreter.fcValue(undefined, undefined, formalParameter.declarationPosition != null ? formalParameter.declarationPosition.codeConstruct : null),
                argumentConstructs[i]
            );
        }
    };

    VariableObject.liftToVariableObject = function(object)
    {
        if(object == null || object.iValue == null) { VariableObject.notifyError("Can not lift object to variable object:"); };

        ValueTypeHelper.expand(object, Firecrow.N_Interpreter.VariableObjectMixin);

        return object;
    };
/***************************************************************************************/
})();