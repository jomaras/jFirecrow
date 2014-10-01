(function()
{
    /*************************************************************************************/
    var ValueTypeHelper = Firecrow.ValueTypeHelper;
    var ASTHelper = Firecrow.ASTHelper;

    var ExecutionContext = Firecrow.N_Interpreter.ExecutionContext = function(variableObject, scopeChain, thisObject, globalObject, contextCreationCommand)
    {
        this.id = ExecutionContext.LAST_ID++;

        this.variableObject = variableObject || globalObject.globalVariableObject;
        this.thisObject = thisObject || globalObject;

        if(this.thisObject != globalObject && !(this.thisObject instanceof Firecrow.N_Interpreter.fcValue))
        {
            this.thisObject = new Firecrow.N_Interpreter.fcValue(this.thisObject.implementationObject, thisObject);
        }

        this.globalObject = globalObject;

        this.scopeChain = ValueTypeHelper.createArrayCopy(scopeChain);
        this.scopeChain.push(this.variableObject);

        this.codeConstructValuesMapping = {};
        this.labelsMapping = {};
        this.commands = [];
    };

    ExecutionContext.createGlobalExecutionContext = function(globalObject)
    {
        return new Firecrow.N_Interpreter.ExecutionContext(globalObject, [], globalObject, globalObject);
    };

    ExecutionContext.LAST_ID = 0;
    ExecutionContext.notifyError = function(message) { alert("ExecutionContextStack - " + message);}

    ExecutionContext.prototype =
    {
        getCodeConstructValue: function(codeConstruct)
        {
            if(codeConstruct == null) { return null;}

            return this.codeConstructValuesMapping[codeConstruct.nodeId];
        },

        setCodeConstructValue: function(codeConstruct, value)
        {
            if(codeConstruct == null) { return null; }

            this.codeConstructValuesMapping[codeConstruct.nodeId] = value
        },

        registerIdentifier: function(identifier)
        {
            this.variableObject.registerIdentifier(identifier);
        },

        pushToScopeChain: function(variableObject)
        {
            this.scopeChain.push(variableObject);
        },

        popFromScopeChain: function()
        {
            return this.scopeChain.pop();
        },

        destruct: function()
        {
            delete this.variableObject;
            delete this.thisObject;

            delete this.globalObject;

            delete this.scopeChain;

            delete this.codeConstructValuesMapping;
            delete this.commands;

            delete this.labelsMapping;
        },

        logLabel: function(labelConstruct)
        {
            if(labelConstruct == null) { return; }

            this.labelsMapping[labelConstruct.nodeId] = labelConstruct;
        }
    };


    var ExecutionContextStack = Firecrow.N_Interpreter.ExecutionContextStack = function(globalObject, handlerInfo)
    {
        if(globalObject == null) { this.notifyError("GlobalObject can not be null when constructing execution context stack!"); return; }

        this.globalObject = globalObject;
        this.globalObject.executionContextStack = this;

        this.activeContext = null;
        this.stack = [];

        this.exceptionCallbacks = [];

        this.dependencyCreator = new Firecrow.N_Interpreter.DependencyCreator(globalObject, this);

        this._enterInitialContext(handlerInfo);
    };

    ExecutionContextStack.prototype =
    {
        destruct: function()
        {
            delete this.globalObject;

            delete this.activeContext;
            delete this.stack;

            delete this.exceptionCallbacks;

            delete this.dependencyCreator;
        },

        registerIdentifier: function(variableDeclarator)
        {
            if(!ASTHelper.isVariableDeclarator(variableDeclarator)) { this.notifyError("ExecutionContextStack: When registering an identifier, the argument has to be variable declarator"); }

            this.activeContext.registerIdentifier
            (
                new Firecrow.N_Interpreter.Identifier
                (
                    variableDeclarator.id.name,
                    new Firecrow.N_Interpreter.fcValue(undefined, undefined, variableDeclarator),
                    variableDeclarator,
                    this.globalObject
                )
            );
        },

        registerFunctionDeclaration: function(functionDeclaration)
        {
            if(!ASTHelper.isFunctionDeclaration(functionDeclaration)) { this.notifyError("When registering a function, the argument has to be a function declaration"); return; }

            this.activeContext.registerIdentifier(new Firecrow.N_Interpreter.Identifier(functionDeclaration.id.name, this.createFunctionInCurrentContext(functionDeclaration), functionDeclaration, this.globalObject));
        },

        getIdentifier: function(identifierName, codeConstruct)
        {
            for(var i = this.stack.length - 1; i >= 0; i--)
            {
                var scopeChain = this.stack[i].scopeChain;

                for(var j = scopeChain.length - 1; j >= 0; j--)
                {
                    var variableObject = scopeChain[j];

                    var identifier = variableObject.getIdentifier(identifierName);

                    if(identifier != null)
                    {
                        if(i != this.stack.length - 1 || j != scopeChain.length - 1)
                        {
                            this.globalObject.browser.logReadingIdentifierOutsideCurrentScope(identifier, codeConstruct);
                        }

                        return identifier;
                    }
                }
            }
        },

        getIdentifierValue: function(identifierName)
        {
            for(var i = this.stack.length - 1; i >= 0; i--)
            {
                var scopeChain = this.stack[i].scopeChain;

                for(var j = scopeChain.length - 1; j >= 0; j--)
                {
                    var variableObject = scopeChain[j];

                    var identifier = variableObject.getIdentifier(identifierName);

                    if(identifier != null) { return identifier.value; }
                }
            }
        },

        setIdentifierValue: function(identifierName, value, setCodeConstruct, keepOldValue)
        {
            for(var i = this.stack.length - 1; i >= 0; i--)
            {
                var scopeChain = this.stack[i].scopeChain;

                for(var j = scopeChain.length - 1; j >= 0; j--)
                {
                    var variableObject = scopeChain[j];

                    var identifier = variableObject.getIdentifier(identifierName);

                    if(identifier != null)
                    {
                        identifier.setValue(value, setCodeConstruct, keepOldValue);

                        if(variableObject != this.globalObject && !ValueTypeHelper.isOfType(variableObject, Firecrow.N_Interpreter.VariableObject))
                        {
                            variableObject[identifierName] = value;
                        }

                        if(i != this.stack.length - 1 || j != scopeChain.length - 1)
                        {
                            this.globalObject.browser.logModifyingExternalContextIdentifier(identifier);
                        }

                        return;
                    }
                }
            }

            this.stack[0].registerIdentifier(new Firecrow.N_Interpreter.Identifier(identifierName, value, setCodeConstruct, this.globalObject));
        },

        restoreIdentifier: function(identifierName)
        {
            for(var i = this.stack.length - 1; i >= 0; i--)
            {
                var scopeChain = this.stack[i].scopeChain;

                for(var j = scopeChain.length - 1; j >= 0; j--)
                {
                    var variableObject = scopeChain[j];

                    var identifier = variableObject.getIdentifier(identifierName);

                    if(identifier != null)
                    {
                        identifier.restoreOldValue();
                        return;
                    }
                }
            }
        },

        deleteIdentifier: function(identifierName)
        {
            for(var i = this.stack.length - 1; i >= 0; i--)
            {
                var scopeChain = this.stack[i].scopeChain;

                for(var j = scopeChain.length - 1; j >= 0; j--)
                {
                    var variableObject = scopeChain[j];

                    var identifier = variableObject.getIdentifier(identifierName);

                    if(identifier != null)
                    {
                        return variableObject.deleteIdentifier(identifier.name);
                    }
                }
            }
        },

        setExpressionValue: function(codeConstruct, value)
        {
            this.activeContext.setCodeConstructValue(codeConstruct, value);
        },

        setExpressionValueInPreviousContext: function(codeConstruct, value)
        {
            var previousExecutionContext = this.stack[this.stack.length - 2];

            if(previousExecutionContext == null) { this.notifyError("There is no previous context!"); return; }

            previousExecutionContext.setCodeConstructValue(codeConstruct, value);
        },

        getExpressionValue: function(codeConstruct)
        {
            var returnValue = this.activeContext.getCodeConstructValue(codeConstruct);

            if(returnValue == null && ASTHelper.isCallExpression(codeConstruct))
            {
                return new Firecrow.N_Interpreter.fcValue(undefined, undefined, codeConstruct);
            }

            return returnValue;
        },

        getExpressionsValues: function(expressions)
        {
            var values = [];

            for(var i = 0; i < expressions.length; i++)
            {
                values.push(this.getExpressionValue(expressions[i]));
            }

            return values;
        },

        getBaseObject: function(codeConstruct)
        {
            if(ASTHelper.isIdentifier(codeConstruct) || ASTHelper.isFunctionExpression(codeConstruct)
            || ASTHelper.isLogicalExpression(codeConstruct) || ASTHelper.isConditionalExpression(codeConstruct)
            || ASTHelper.isThisExpression(codeConstruct))
            {
                return this.globalObject;
            }
            else if (ASTHelper.isMemberExpression(codeConstruct)) { return this.getExpressionValue(codeConstruct.object); }
            else if (ASTHelper.isCallExpression(codeConstruct)) { return this.getExpressionValue(codeConstruct.callee); }
            else
            {
                this.notifyError("Not handling getting base object on other expressions");
                return this.globalObject;
            }
        },

        createFunctionInCurrentContext: function(functionCodeConstruct)
        {
            return this.globalObject.internalExecutor.createFunction(this.activeContext.scopeChain, functionCodeConstruct)
        },

        registerExceptionCallback: function(callback, thisObject)
        {
            if(!ValueTypeHelper.isFunction(callback)) { this.notifyError("Exception callback has to be a function!"); return; }

            this.exceptionCallbacks.push({callback: callback, thisObject: thisObject || this});
        },

        push: function(executionContext)
        {
            if(!ValueTypeHelper.isOfType(executionContext, Firecrow.N_Interpreter.ExecutionContext)) { this.notifyError("Argument is not ExecutionContext!"); return; }

            this.stack.push(executionContext);

            this.activeContext = executionContext;
        },

        pop: function()
        {
            if(this.stack.length == 0) { this.notifyError("Can not pop an empty stack"); return; }

            this.stack.pop();

            this.activeContext = this.stack[this.stack.length - 1];
        },

        callExceptionCallbacks: function(exceptionInfo)
        {
            this.exceptionCallbacks.forEach(function(callbackObject)
            {
                callbackObject.callback.call(callbackObject.thisObject, exceptionInfo);
            });
        },

        _enterInitialContext: function(handlerInfo)
        {
            this.handlerInfo = handlerInfo;

            if(this.handlerInfo == null)
            {
                this._enterGlobalContext();
            }
            else
            {
                this.enterEventHandlerContextCommand = Firecrow.N_Interpreter.Command.createEnterEventHandlerContextCommand(this.handlerInfo);
                this.enterFunctionContext(this.enterEventHandlerContextCommand);
            }
        },

        _enterGlobalContext: function()
        {
            this.push(Firecrow.N_Interpreter.ExecutionContext.createGlobalExecutionContext(this.globalObject));
        },

        enterFunctionContext: function(enterFunctionCommand)
        {
            if(enterFunctionCommand.callee == null) { this.notifyError("When processing enter function context the callee can not be null!"); return; }

            var callee = enterFunctionCommand.callee.iValue;
            this.dependencyCreator.markEnterFunctionPoints(enterFunctionCommand);

            var functionConstruct = enterFunctionCommand.callee.codeConstruct;
            var formalParameters = this._getFormalParameters(functionConstruct);

            var sentArgumentsValues = null;
            var arguments = [];

            this.globalObject.browser.logEnteringFunction
            (
                enterFunctionCommand.parentFunctionCommand != null ? enterFunctionCommand.parentFunctionCommand.codeConstruct : null,
                functionConstruct,
                Firecrow.N_Interpreter.ExecutionContext.LAST_ID
            );

            if(enterFunctionCommand.isEnterEventHandler) { sentArgumentsValues = enterFunctionCommand.argumentValues; }
            else
            {
                sentArgumentsValues = this._getSentArgumentValues(enterFunctionCommand.parentFunctionCommand);

                if(!enterFunctionCommand.parentFunctionCommand.isExecuteCallbackCommand())
                {
                    arguments = enterFunctionCommand.parentFunctionCommand.codeConstruct.arguments;
                }
            }

            if(callee.isBound && callee.argsToPrepend != null)
            {
                for(var i = 0; i < callee.argsToPrepend.length; i++)
                {
                    ValueTypeHelper.insertIntoArrayAtIndex(sentArgumentsValues, callee.argsToPrepend[i], 0);
                }
            }

            this.dependencyCreator.createFunctionParametersDependencies(enterFunctionCommand.parentFunctionCommand, formalParameters, arguments);

            this.push
            (
                new Firecrow.N_Interpreter.ExecutionContext
                (
                    Firecrow.N_Interpreter.VariableObject.createFunctionVariableObject
                    (
                        functionConstruct.id != null ? new Firecrow.N_Interpreter.Identifier(functionConstruct.id.name, enterFunctionCommand.callee, functionConstruct, this.globalObject)
                        : null,
                        formalParameters,
                        enterFunctionCommand.callee,
                        sentArgumentsValues,
                        enterFunctionCommand.parentFunctionCommand,
                        this.globalObject
                    ),
                    enterFunctionCommand.callee.iValue.scopeChain,
                    enterFunctionCommand.thisObject,
                    this.globalObject,
                    enterFunctionCommand
                )
            );
        },

        _getFormalParameters: function(functionConstruct)
        {
            if(functionConstruct == null)
            {
                debugger;
                this.notifyError("Error when getting formal parameters");
                return;
            }

            var identifiers = [];

            if(functionConstruct.params == null) { return identifiers; }

            for(var i = 0; i < functionConstruct.params.length; i++)
            {
                var param = functionConstruct.params[i];
                var identifier = new Firecrow.N_Interpreter.Identifier(param.name, new Firecrow.N_Interpreter.fcValue(undefined, undefined, param), param, this.globalObject);
                identifier.isFunctionFormalParameter = true;
                identifiers.push(identifier);
            }

            return identifiers;
        },

        _getSentArgumentValues: function(callCommand)
        {
            if(callCommand.isApply) { return this._getArgumentValuesFromApply(callCommand); }
            else if (callCommand.isCall) { return this._getArgumentValuesFromCall(callCommand); }
            else if (callCommand.isExecuteCallbackCommand()) { return callCommand.arguments;}
            else { return this._getArgumentValuesFromStandard(callCommand); }
        },

        _getArgumentValuesFromApply: function(callCommand)
        {
            var args = callCommand.codeConstruct.arguments;

            if(args == null) { return []; }

            var secondArgument = args[1];

            if(secondArgument == null) { return []; }

            var secondArgValue = this.getExpressionValue(secondArgument);

            return secondArgValue.jsValue || [];
        },

        _getArgumentValuesFromCall: function(callCommand)
        {
            var values = [];
            var args = callCommand.codeConstruct.arguments;

            if(args == null) { return values; }

            for(var i = 1; i < args.length; i++) { values.push(this.getExpressionValue(args[i]));}

            return values;
        },

        _getArgumentValuesFromStandard: function(callCommand)
        {
            var args = callCommand.codeConstruct.arguments;

            if(args == null) { return []; }

            return this.getExpressionsValues(args);
        },

        notifyError: function(message) { debugger; ExecutionContext.notifyError(message); }
    };
    /*************************************************************************************/
})();