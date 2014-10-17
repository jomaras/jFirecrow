(function() {
    /*************************************************************************************/
    var ExecutionContextStack = Firecrow.N_Interpreter.ExecutionContextStack;
    var CommandGenerator = Firecrow.N_Interpreter.CommandGenerator;
    var ValueTypeHelper = Firecrow.ValueTypeHelper;
    var ASTHelper = Firecrow.ASTHelper;

    var Interpreter = Firecrow.N_Interpreter.Interpreter = function(programAst, globalObject, handlerInfo)
    {
        this.programAst = programAst;
        this.globalObject = globalObject;
        this.handlerInfo = handlerInfo;
        this.tryStack = [];

        this.executionContextStack = new ExecutionContextStack(globalObject, handlerInfo);
        this.executionContextStack.registerExceptionCallback(this._removeCommandsAfterException, this);

        this.dependencyCreator = new Firecrow.N_Interpreter.DependencyCreator(globalObject, this.executionContextStack);

        this.globalObject.executionContextStack = this.executionContextStack;

        this.commands = CommandGenerator.generateCommands(programAst);

        this.messageGeneratedCallbacks = [];
        this.controlFlowConnectionCallbacks = [];
    };

    Interpreter.prototype =
    {
        generateEvalCommands: function(callExpression, programAST)
        {
            ValueTypeHelper.insertElementsIntoArrayAtIndex(this.commands, CommandGenerator.generateEvalCommands(callExpression, programAST), this.currentCommandIndex + 1);
        },

        runSync: function()
        {
            for(this.currentCommandIndex = 0; this.currentCommandIndex < this.commands.length; this.currentCommandIndex++)
            {
                var command = this.commands[this.currentCommandIndex];

                this.globalObject.setCurrentCommand(command);

                this._processCommand(command);
            }
        },

        destruct: function()
        {
            delete this.programAst;
            delete this.globalObject;
            delete this.handlerInfo;
            delete this.tryStack;

            this.executionContextStack.destruct();
            delete this.executionContextStack;

            delete this.commands;

            delete this.messageGeneratedCallbacks;
            delete this.controlFlowConnectionCallbacks;
        },

        _processCommand: function(command)
        {
            switch(command.type)
            {
                case "DeclareVariable":

                    this.executionContextStack.registerIdentifier(command.codeConstruct);

                    break;

                case "DeclareFunction":

                    this.executionContextStack.registerFunctionDeclaration(command.codeConstruct);

                    break;

                case "ThisExpression":

                    this.executionContextStack.setExpressionValue(command.codeConstruct, this.executionContextStack.activeContext.thisObject);

                    break;

                case "ArrayExpression":

                    var newArray = this.globalObject.internalExecutor.createArray(command.codeConstruct);

                    this.executionContextStack.setExpressionValue(command.codeConstruct, newArray);

                    command.createdArray = newArray;

                    break;

                case "ArrayExpressionItemCreation":

                    var array = command.arrayExpressionCommand.createdArray;

                    var expressionItemValue = this.executionContextStack.getExpressionValue(command.codeConstruct);

                    array.iValue.push(array.jsValue, expressionItemValue, command.codeConstruct);

                    this.dependencyCreator.createDataDependency(command.arrayExpressionCommand.codeConstruct, command.codeConstruct, this.globalObject.getPreciseEvaluationPositionId());

                    break;

                case "ObjectExpression":

                    var newObject = this.globalObject.internalExecutor.createObject(null, command.codeConstruct);

                    this.executionContextStack.setExpressionValue(command.codeConstruct, newObject);

                    command.createdObject = newObject;

                    break;

                case "ObjectPropertyCreation":

                    var object = command.objectExpressionCommand.createdObject;

                    var propertyCodeConstruct = command.codeConstruct;

                    var propertyValue = this.executionContextStack.getExpressionValue(propertyCodeConstruct.value);

                    if(propertyValue.isPrimitive())
                    {
                        propertyValue = propertyValue.createCopy(propertyCodeConstruct);
                    }

                    var propertyKey = ASTHelper.isLiteral(propertyCodeConstruct.key) ? propertyCodeConstruct.key.value
                                                                                     : propertyCodeConstruct.key.name;

                    object.jsValue[propertyKey] = propertyValue;
                    object.iValue.addProperty(propertyKey, propertyValue, command.codeConstruct);

                    break;

                case "StartWithStatement":

                    this.executionContextStack.activeContext.pushToScopeChain(Firecrow.N_Interpreter.VariableObject.liftToVariableObject(this.executionContextStack.getExpressionValue(command.codeConstruct.object)));

                    break;

                case "EndWithStatement":

                    this.executionContextStack.activeContext.popFromScopeChain();

                    break;

                case "StartTryStatement":
                    //Fall through on purpose
                case "EndTryStatement":
                    this._processTryCommand(command);

                    break;

                case "StartCatchStatement":

                    this.executionContextStack.setIdentifierValue
                    (
                        command.codeConstruct.param.name,
                        command.exceptionArgument || this.globalObject.internalExecutor.createNonConstructorObject(command.codeConstruct),
                        command.throwingCommand != null ? command.throwingCommand.codeConstruct
                                                        : null,
                        true
                    );

                    if(command.exceptionArgument != null && command.exceptionArgument.codeConstruct != null)
                    {
                        this.dependencyCreator.createDataDependency(command.codeConstruct.param, command.exceptionArgument.codeConstruct);
                    }

                    break;

                case "EndCatchStatement":

                    this.executionContextStack.restoreIdentifier(command.codeConstruct.param.name);

                    break;

                case "StartSwitchStatement":

                    break;

                case "EndSwitchStatement":

                    break;

                case "Case":

                    break;

                case "FunctionExpressionCreation":

                    this.executionContextStack.setExpressionValue(command.codeConstruct, this.executionContextStack.createFunctionInCurrentContext(command.codeConstruct));

                    break;

                case "EvalSequenceExpression":

                    var sequenceExpression = command.codeConstruct;
                    var lastExpression = sequenceExpression.expressions[sequenceExpression.expressions.length - 1];

                    this.executionContextStack.setExpressionValue(sequenceExpression, this.executionContextStack.getExpressionValue(lastExpression));

                    this.dependencyCreator.createSequenceExpressionDependencies(sequenceExpression, lastExpression);

                    break;

                case "EvalUnaryExpression":

                    var unaryExpression = command.codeConstruct;
                    var argumentValue = this.executionContextStack.getExpressionValue(unaryExpression.argument);

                    this.dependencyCreator.createDataDependency(unaryExpression, unaryExpression.argument);

                    if(argumentValue == null && unaryExpression.operator != "typeof") { this._callExceptionCallbacks(command); return; }

                    var expressionValue = null;

                         if (unaryExpression.operator == "-") { expressionValue = -argumentValue.jsValue; }
                    else if (unaryExpression.operator == "+") { expressionValue = +argumentValue.jsValue; }
                    else if (unaryExpression.operator == "!") { expressionValue = !argumentValue.jsValue; }
                    else if (unaryExpression.operator == "~") { expressionValue = ~argumentValue.jsValue; }
                    else if (unaryExpression.operator == "typeof") { expressionValue = argumentValue == null ? "undefined" : typeof argumentValue.jsValue; }
                    else if (unaryExpression.operator == "void") { expressionValue = void argumentValue.jsValue;}
                    else if (unaryExpression.operator == "delete") { expressionValue = this._evalDeleteExpression(unaryExpression, command); }

                    this.executionContextStack.setExpressionValue(unaryExpression, this.globalObject.internalExecutor.createInternalPrimitiveObject(unaryExpression, expressionValue));

                    break;

                case "EvalBinaryExpression":

                    var binaryExpression = command.codeConstruct;

                    this.dependencyCreator.createBinaryExpressionDependencies(binaryExpression);

                    var leftValue = this.executionContextStack.getExpressionValue(binaryExpression.left);
                    var rightValue = this.executionContextStack.getExpressionValue(binaryExpression.right);

                    if(leftValue == null) { this._callExceptionCallbacks(command); return; }
                    if(rightValue == null) { this._callExceptionCallbacks(command); return; }

                    if(binaryExpression.operator == "in")
                    {
                        this.dependencyCreator.createBinaryExpressionInDependencies(binaryExpression, rightValue, leftValue);
                    }

                    var result = this._evalBinaryExpression(leftValue, rightValue, binaryExpression.operator);

                    this.executionContextStack.setExpressionValue
                    (
                        binaryExpression,
                        this.globalObject.internalExecutor.createInternalPrimitiveObject
                        (
                            binaryExpression,
                            result
                        )
                    );

                    break;

                case "EvalAssignmentExpression":

                    var assignmentExpression = command.codeConstruct;

                    this.dependencyCreator.createAssignmentDependencies(command);

                    var finalValue = this._getAssignmentValue(command);

                    if (command.leftSide.type == "Identifier") { this._assignToIdentifier(command.leftSide, finalValue, assignmentExpression); }
                    else if (command.leftSide.type == "MemberExpression") { this._assignToMemberExpression(command.leftSide, finalValue, assignmentExpression, command); }

                    this.executionContextStack.setExpressionValue(assignmentExpression, finalValue);

                    break;

                case "EvalUpdateExpression":

                    var updateExpression = command.codeConstruct;
                    var currentValue = this.executionContextStack.getExpressionValue(updateExpression.argument);

                    this.dependencyCreator.createUpdateExpressionDependencies(updateExpression);

                    if(currentValue == null || currentValue.jsValue == null) { this._callExceptionCallbacks(command); return; }

                    if(ASTHelper.isIdentifier(updateExpression.argument))
                    {
                        this._assignToIdentifier(updateExpression.argument, this._getUpdateValue(currentValue, updateExpression), updateExpression);
                    }
                    else if(ASTHelper.isMemberExpression(updateExpression.argument))
                    {
                        this._assignToMemberExpression(updateExpression.argument, this._getUpdateValue(currentValue, updateExpression), updateExpression, command);
                    }
                    else
                    {
                        this.notifyError(command, "Unknown code construct when updating expression!");
                    }

                    this.executionContextStack.setExpressionValue(updateExpression, this._getUpdatedCurrentValue(currentValue, updateExpression));

                    break;

                case "EvalBreak":
                    //Fall through on purpose
                case "EvalContinue":

                    this.executionContextStack._popTillBreakContinue(command.codeConstruct);

                    break;

                case "EvalCallbackFunction":

                    this.dependencyCreator.createCallbackFunctionCommandDependencies(command);

                    this.globalObject.logCallbackExecution
                    (
                        command.codeConstruct,
                        command.parentInitCallbackCommand != null ? command.parentInitCallbackCommand.codeConstruct : null
                    );

                    if(command.isLastCallbackCommand)
                    {
                        this.globalObject.browser.logEndExecutingCallbacks(command.codeConstruct);
                    }

                    break;

                case "StartEvalLogicalExpression":

                    break;

                case "EvalLogicalExpressionItem":

                    var parentExpressionCommand = command.parentLogicalExpressionCommand;

                    var wholeLogicalExpression = parentExpressionCommand.codeConstruct;
                    var logicalExpressionItem = command.codeConstruct;

                    command.parentEndLogicalExpressionCommand.executedLogicalItemExpressionCommands.push(command);

                    if(logicalExpressionItem == wholeLogicalExpression.left)
                    {
                        var value = this.executionContextStack.getExpressionValue(logicalExpressionItem);

                        this.executionContextStack.setExpressionValue(wholeLogicalExpression, value);

                        command.shouldDeleteFollowingLogicalCommands = this._isLogicalExpressionDoneWithEvaluation(value, wholeLogicalExpression.operator);
                    }
                    else if(logicalExpressionItem == wholeLogicalExpression.right)
                    {
                        this.executionContextStack.setExpressionValue(wholeLogicalExpression, this._getLogicalExpressionValue(wholeLogicalExpression, command));

                        this.dependencyCreator.createDependenciesForLogicalExpressionItemCommand(wholeLogicalExpression);
                    }
                    else { this.notifyError(command, "The expression item is neither left nor right expression"); return; }

                    break;

                case "EndEvalLogicalExpression":
                    this.dependencyCreator.createDependenciesForLogicalExpression(command);

                    var logicalExpression = command.codeConstruct;
                    var logicalExpressionValue = this.executionContextStack.getExpressionValue(logicalExpression);

                    if(logicalExpressionValue != null)
                    {
                        var executedLogicalItemCommands = command.executedLogicalItemExpressionCommands;

                        if(executedLogicalItemCommands.length == 0) { alert("There are no executed logical commands"); return; }
                    }

                    break;

                case "EvalConditionalExpression":

                    this.executionContextStack.setExpressionValue(command.codeConstruct, this.executionContextStack.getExpressionValue(command.startCommand.body));
                    this.dependencyCreator.createDependenciesForConditionalCommand(command);

                    break;
                case "EndEvalConditionalExpression":
                    break;
                case "EvalNewExpression":
                    break;
                case "EvalCallExpression":
                    break;
                case "EnterFunctionContext":

                    this.executionContextStack.enterFunctionContext(command);

                    break;

                case "ExitFunctionContext":

                    this.executionContextStack.exitFunctionContext(command);

                    break;

                case "EvalMemberExpression":
                    var memberExpression = command.codeConstruct;

                    var object = this.executionContextStack.getExpressionValue(memberExpression.object);

                    if(object == null || (object.jsValue == null && object != this.globalObject))
                    {
                        this._callExceptionCallbacks(command);
                        break;
                    }

                    var property = this.executionContextStack.getExpressionValue(memberExpression.property);
                    var propertyValue = this._getPropertyValue(object, property, memberExpression);

                    this.dependencyCreator.createMemberExpressionDependencies(object, property, propertyValue, memberExpression);

                    this.executionContextStack.setExpressionValue(memberExpression, propertyValue);

                    break;

                case "EvalMemberExpressionProperty":

                    var memberExpression = command.codeConstruct;
                    var property = memberExpression.property;

                    this.executionContextStack.setExpressionValue
                    (
                        property,
                        memberExpression.computed ? this.executionContextStack.getExpressionValue(property)
                                                  : this.globalObject.internalExecutor.createInternalPrimitiveObject(property, property.name)
                    );

                    break;

                case "EvalReturnExpression":

                    this.dependencyCreator.createReturnDependencies(command);

                    this.globalObject.browser.logBreakContinueReturnExecuted
                    (
                        command.codeConstruct,
                        this.globalObject.getPreciseEvaluationPositionId(),
                        command.parentFunctionCommand && command.parentFunctionCommand.isExecuteCallbackCommand()
                    );

                    //If return is in event handler function
                    if(command.parentFunctionCommand == null)
                    {
                        break;
                    }

                    command.parentFunctionCommand.executedReturnCommand = command;

                    var returnValue = this.executionContextStack.getExpressionValue(command.codeConstruct.argument);

                    if(command.parentFunctionCommand.isExecuteCallbackCommand())
                    {
                        this._handleReturnFromCallbackFunction(command);
                    }
                    else if (command.parentFunctionCommand.isEvalNewExpressionCommand()
                        && (returnValue.isPrimitive() || returnValue.jsValue == null))
                    {
                        //DO NOTHING, should only write if returnValue is not a primitive
                    }
                    else
                    {
                        this.executionContextStack.setExpressionValueInPreviousContext
                        (
                            command.parentFunctionCommand.codeConstruct,
                            command.codeConstruct.argument != null ? returnValue : null
                        );
                    }

                    break;

                case "EvalThrowExpression":

                    this._processThrowCommand(command);
                    this._removeCommandsAfterException(command);

                    this.dependencyCreator.createDataDependency
                    (
                        command.codeConstruct,
                        command.codeConstruct.argument,
                        this.globalObject.getPreciseEvaluationPositionId()
                    )

                    break;

                case "EvalIdentifier":

                    var identifierConstruct = command.codeConstruct;

                    var identifier = this.executionContextStack.getIdentifier(identifierConstruct.name, identifierConstruct);
                    var identifierValue = identifier != null ? identifier.value : null;
                    this.executionContextStack.setExpressionValue
                    (
                        identifierConstruct,
                        identifierValue != null && identifierValue.isPrimitive && identifierValue.isPrimitive() ? identifierValue.createCopy()
                                                                                                                : identifierValue
                    );

                    if(identifier != null)
                    {
                        this.dependencyCreator.createIdentifierDependencies(identifier, identifierConstruct, this.globalObject.getPreciseEvaluationPositionId());
                        this._checkSlicing(identifierConstruct);
                    }

                    break;

                case "EvalLiteral":

                    this.executionContextStack.setExpressionValue
                    (
                        command.codeConstruct,
                        this.globalObject.internalExecutor.createInternalPrimitiveObject(command.codeConstruct, command.codeConstruct.value)
                    );

                    break;
                case "EvalRegExLiteral":
                    var regEx = command.regExLiteral instanceof RegExp ? command.regExLiteral : eval(command.regExLiteral);

                    this.executionContextStack.setExpressionValue
                    (
                        command.codeConstruct,
                        this.globalObject.internalExecutor.createRegEx(command.codeConstruct, regEx)
                    );

                    break;

                case "IfStatement":
                    break;
                case "EndIf":
                    break;
                case "StartDoWhileStatement":
                    break;
                case "WhileStatement":
                    break;
                case "DoWhileStatement":
                    break;
                case "ForStatement":
                    break;
                case "ForUpdateStatement":
                    break;
                case "EndLoopStatement":
                    break;

                case "EvalForInWhere":

                    var forInWhereConstruct = command.codeConstruct;

                    var whereObject = this.executionContextStack.getExpressionValue(forInWhereConstruct.right);

                    if(whereObject.iValue == null) { command.willBodyBeExecuted = false; return; }

                    if(!command.propertyNames)
                    {
                        var isFirstIteration = true;
                        command.propertyNames = whereObject.iValue.getPropertyNames();
                    }

                    this._logForInIteration(command, whereObject.iValue, isFirstIteration);

                    while(command.propertyNames.length > 0 && !propertyValue)
                    {
                        var nextPropertyNameString = command.propertyNames[0];
                        ValueTypeHelper.removeFromArrayByIndex(command.propertyNames, 0);

                        var propertyValue = whereObject.iValue.getPropertyValue(nextPropertyNameString);
                    }

                    command.willBodyBeExecuted = !!propertyValue;

                    if(!propertyValue) { return; }

                    var propertyNameCodeConstruct = null;

                    var property = whereObject.iValue.getProperty(nextPropertyNameString);

                    if(property != null && property.declarationPosition != null && property.declarationPosition.codeConstruct != null)
                    {
                        var declarationConstruct = property.declarationPosition.codeConstruct;
                        if(declarationConstruct.key != null) //Object literal
                        {
                            propertyNameCodeConstruct = declarationConstruct.key;
                        }
                        else if(ASTHelper.isAssignmentExpression()) //Assignment
                        {
                            propertyNameCodeConstruct = declarationConstruct.left;
                        }
                    }
                    else
                    {
                        propertyNameCodeConstruct = forInWhereConstruct.left;
                    }

                    var nextPropertyName = this.globalObject.internalExecutor.createInternalPrimitiveObject(propertyNameCodeConstruct, nextPropertyNameString);

                    this.dependencyCreator.createDependenciesInForInWhereCommand(forInWhereConstruct, whereObject, nextPropertyName, isFirstIteration);

                    if(ASTHelper.isIdentifier(forInWhereConstruct.left))
                    {
                        this.executionContextStack.setIdentifierValue(forInWhereConstruct.left.name, nextPropertyName, forInWhereConstruct.left);
                    }
                    else if (ASTHelper.isVariableDeclaration(forInWhereConstruct.left))
                    {
                        var declarator = forInWhereConstruct.left.declarations[0];

                        this.executionContextStack.setIdentifierValue(declarator.id.name, nextPropertyName, declarator);
                    }
                    else { this.notifyError(command, "Unknown forIn left statement"); }

                    break;

                case "EvalConditionalExpressionBody":
                    break;

                case "CallInternalConstructor":
                    break;

                case "CallInternalFunction":
                    this.dependencyCreator.createDependenciesForCallInternalFunction(command);

                    this.executionContextStack.setExpressionValue
                    (
                        command.codeConstruct,
                        this.globalObject.internalExecutor.executeFunction
                        (
                            this._getThisObjectFromCallInternalFunctionCommand(command),
                            command.functionObject,
                            this._getArgumentsFromInternalFunctionCall
                            (
                                command,
                                command.codeConstruct != null ? command.codeConstruct.arguments : []
                            ),
                            command.codeConstruct,
                            command
                        )
                    );

                    break;

                case "CallCallbackMethod":
                    break;
                case "ExecuteCallback":
                    break;
                case "ConvertToPrimitive":
                    break;
                case "Label":
                    break;
                case "FinishEval":

                    command.lastEvaluatedConstruct = this._getLastEvaluatedConstruct();

                    this.executionContextStack.setExpressionValue
                    (
                        command.codeConstruct,
                        this.executionContextStack.getExpressionValue(command.lastEvaluatedConstruct)
                    );

                    break;
                case "StartEval":
                    break;
                default:
                    debugger;
            }

            if (command.removesCommands) { this._processRemovingCommandsCommand(command); }
            if (command.generatesNewCommands) { this._processGeneratingNewCommandsCommand(command); }
        },

        _isLogicalExpressionDoneWithEvaluation: function(value, operator)
        {
            return  (value.jsValue && operator == "||") || (!value.jsValue && operator == "&&");
        },

        _getLogicalExpressionValue: function(wholeLogicalExpression, command)
        {
            var leftValue = this.executionContextStack.getExpressionValue(wholeLogicalExpression.left);
            var rightValue = this.executionContextStack.getExpressionValue(wholeLogicalExpression.right);

            if(leftValue == null || rightValue == null) { this._callExceptionCallbacks(command); return; }

            var result = wholeLogicalExpression.operator == "&&" ? leftValue.jsValue && rightValue.jsValue
                                                                 : leftValue.jsValue || rightValue.jsValue;

            return ValueTypeHelper.isPrimitive(result) ? this.globalObject.internalExecutor.createInternalPrimitiveObject(wholeLogicalExpression, result)
                                                        : result === leftValue.jsValue ? leftValue
                                                                                       : rightValue;
        },

        _getUpdatedCurrentValue:function(currentValue, updateExpression)
        {
            var result = updateExpression.prefix ? updateExpression.operator == "++" ? ++currentValue.jsValue : --currentValue.jsValue
                                                                                     : updateExpression.operator == "++" ? currentValue.jsValue++
                                                                                                                         : currentValue.jsValue--;

            return this.globalObject.internalExecutor.createInternalPrimitiveObject(updateExpression, result);
        },

        _getUpdateValue: function(currentValue, updateExpression)
        {
            var result = updateExpression.operator == "++" ? (currentValue.jsValue - 0) + 1 : (currentValue.jsValue - 0) - 1;
            return this.globalObject.internalExecutor.createInternalPrimitiveObject(updateExpression, result);
        },

        _getAssignmentValue: function(assignmentCommand)
        {
            var finalValue = null;
            var operator = assignmentCommand.operator;

            if(operator === "=") { finalValue = this.executionContextStack.getExpressionValue(assignmentCommand.rightSide); }
            else
            {
                var leftValue = this.executionContextStack.getExpressionValue(assignmentCommand.leftSide);
                var rightValue = this.executionContextStack.getExpressionValue(assignmentCommand.rightSide);

                var result = null;

                     if (operator == "+=") { result = leftValue.jsValue + rightValue.jsValue; }
                else if (operator == "-=") { result = leftValue.jsValue - rightValue.jsValue; }
                else if (operator == "*=") { result = leftValue.jsValue * rightValue.jsValue; }
                else if (operator == "/=") { result = leftValue.jsValue / rightValue.jsValue; }
                else if (operator == "%=") { result = leftValue.jsValue % rightValue.jsValue; }
                else if (operator == "<<=") { result = leftValue.jsValue << rightValue.jsValue; }
                else if (operator == ">>=") { result = leftValue.jsValue >> rightValue.jsValue; }
                else if (operator == ">>>=") { result = leftValue.jsValue >>> rightValue.jsValue; }
                else if (operator == "|=") { result = leftValue.jsValue | rightValue.jsValue; }
                else if (operator == "^=") { result = leftValue.jsValue ^ rightValue.jsValue; }
                else if (operator == "&=") { result = leftValue.jsValue & rightValue.jsValue; }
                else { this.notifyError(assignmentCommand, "jsValue assignment operator!"); return; }

                finalValue = this.globalObject.internalExecutor.createInternalPrimitiveObject(assignmentCommand.codeConstruct, result);
            }

            return finalValue.isPrimitive() ? finalValue.createCopy(assignmentCommand.rightSide) : finalValue;
        },

        _evalBinaryExpression: function(leftValue, rightValue, operator)
        {
                 if (operator == "==") { return leftValue.jsValue == rightValue.jsValue;}
            else if (operator == "!=") { return leftValue.jsValue != rightValue.jsValue; }
            else if (operator == "===") { return leftValue.jsValue === rightValue.jsValue; }
            else if (operator == "!==") { return leftValue.jsValue !== rightValue.jsValue; }
            else if (operator == "<") { return leftValue.jsValue < rightValue.jsValue; }
            else if (operator == "<=") { return leftValue.jsValue <= rightValue.jsValue; }
            else if (operator == ">") { return leftValue.jsValue > rightValue.jsValue; }
            else if (operator == ">=") { return leftValue.jsValue >= rightValue.jsValue; }
            else if (operator == "<<") { return leftValue.jsValue << rightValue.jsValue; }
            else if (operator == ">>") { return leftValue.jsValue >> rightValue.jsValue; }
            else if (operator == ">>>") { return leftValue.jsValue >>> rightValue.jsValue; }
            else if (operator == "-") { return leftValue.jsValue - rightValue.jsValue; }
            else if (operator == "*") { return leftValue.jsValue * rightValue.jsValue; }
            else if (operator == "/") { return leftValue.jsValue / rightValue.jsValue; }
            else if (operator == "%") { return leftValue.jsValue % rightValue.jsValue; }
            else if (operator == "|") { return leftValue.jsValue | rightValue.jsValue; }
            else if (operator == "^") { return leftValue.jsValue ^ rightValue.jsValue; }
            else if (operator == "&") { return leftValue.jsValue & rightValue.jsValue; }
            else if (operator == "in") { return leftValue.jsValue in rightValue.jsValue; }
            else if (operator == "+") { return this._evalAdd(leftValue.jsValue, rightValue.jsValue); }
            else if (operator == "instanceof") { return this._evalInstanceOf(leftValue, rightValue);}
            else { this.notifyError(null, "Unknown operator when evaluating binary expression"); return; }
        },

        _evalDeleteExpression: function(deleteExpression, command)
        {
            if(ASTHelper.isIdentifier(deleteExpression.argument))
            {
                this.executionContextStack.deleteIdentifier(deleteExpression.argument.name);
                return true;
            }
            else if(ASTHelper.isMemberExpression(deleteExpression.argument))
            {
                var object = this.executionContextStack.getExpressionValue(deleteExpression.argument.object);

                if(object == null) { this._callExceptionCallbacks(command); return; }

                var propertyName = "";

                if(deleteExpression.argument.computed)
                {
                    var propertyValue = this.executionContextStack.getExpressionValue(deleteExpression.argument.property);
                    propertyName = propertyValue != null ? propertyValue.jsValue : "";
                }
                else
                {
                    propertyName = deleteExpression.argument.property.name;
                }

                object.iValue.deleteProperty(propertyName, deleteExpression);
                return delete object.jsValue[propertyName];
            }

            return false;
        },

        _assignToIdentifier: function(identifier, finalValue, assignmentExpression)
        {
            if(this.globalObject.satisfiesIdentifierSlicingCriteria(identifier))
            {
                this.globalObject.browser.logImportantConstructEvaluated(identifier);
            }

            this.executionContextStack.setIdentifierValue(identifier.name, finalValue, assignmentExpression);
        },

        _assignToMemberExpression: function(memberExpression, finalValue, assignmentExpression, command)
        {
            var object = this.executionContextStack.getExpressionValue(memberExpression.object);
            var property = this.executionContextStack.getExpressionValue(memberExpression.property);

            if(object == null || (object.jsValue == null && object != this.globalObject)) { this._callExceptionCallbacks(command); return; }

            if (this._hasAddJsPropertyFunction(object))
            {
                object.iValue.addJsProperty(property.jsValue, finalValue, assignmentExpression);
            }
            else
            {
                object.iValue.addProperty(property.jsValue, finalValue, assignmentExpression, true);
                object.jsValue[property.jsValue] = finalValue;
            }

            if(property.jsValue == "__proto__" || property.jsValue == "prototype")
            {
                object.jsValue[property.jsValue] = finalValue.jsValue;
            }

            var newProperty = object.iValue.getProperty(property.jsValue);

            if(newProperty != null)
            {
                newProperty.modificationContext = this.executionContextStack.activeContext;
            }
        },

        registerExceptionCallback: function(callback, thisObject)
        {
            if(!ValueTypeHelper.isFunction(callback)) { this.notifyError(null, "Exception callback has to be a function!"); return; }

            this.exceptionCallbacks.push({callback: callback, thisObject: thisObject || this});
        },

        _hasAddJsPropertyFunction: function(object)
        {
            return object != null && object.iValue != null && object.iValue.addJsProperty != null;
        },

        _checkSlicing: function(identifierConstruct)
        {
            if(this.globalObject.shouldTrackIdentifiers && this.globalObject.satisfiesIdentifierSlicingCriteria(identifierConstruct))
            {
                this.globalObject.browser.logImportantConstructEvaluated(identifierConstruct);
            }
        },

        _evalAdd: function(leftValue, rightValue)
        {
            if(ValueTypeHelper.arePrimitive(leftValue, rightValue))
            {
                return leftValue + rightValue;
            }

            //TODO - this needs more tests!
            if(typeof leftValue== "object" && !(leftValue instanceof String) && leftValue != null
           || (typeof rightValue== "object" && !(rightValue instanceof String) && rightValue != null))
            {
                //TODO - temp jQuery hack
                if(ValueTypeHelper.isArray(leftValue) && ValueTypeHelper.isArray(rightValue))
                {
                    return this.globalObject.getJsValues(leftValue).join("")
                        + this.globalObject.getJsValues(rightValue).join("")
                }
                else if (ValueTypeHelper.isObject(rightValue) || ValueTypeHelper.isObject(leftValue))
                {
                    console.log("Concatenating strings from object!");
                    return leftValue + rightValue;
                }
                else
                {
                    this.notifyError(null, "Still not handling implicit toString conversion in binary expression!");
                    return null;
                }
            }

            return null;
        },

        _evalInstanceOf: function(leftValue, rightValue)
        {
            var compareWith = null;

            if (rightValue == this.globalObject.arrayFunction || rightValue.jsValue == this.globalObject.arrayFunction) { compareWith = Array; }
            else if (rightValue == this.globalObject.stringFunction || rightValue.jsValue == this.globalObject.stringFunction) { compareWith = String; }
            else if (rightValue == this.globalObject.regExFunction || rightValue.jsValue == this.globalObject.regExFunction) { compareWith = RegExp; }
            else if (rightValue.jsValue != undefined) { compareWith = rightValue.jsValue; }
            else { this.notifyError(null, "Unhandled instanceof"); }

            return leftValue.jsValue instanceof compareWith;
        },

        _handleReturnFromCallbackFunction: function(returnCommand)
        {
            var executeCallbackCommand = returnCommand.parentFunctionCommand;
            var returnArgument = returnCommand.codeConstruct.argument;

            if(ValueTypeHelper.isArray(executeCallbackCommand.originatingObject.jsValue)
            || ValueTypeHelper.isArrayLike(executeCallbackCommand.originatingObject.jsValue))
            {
                Firecrow.N_Interpreter.ArrayCallbackEvaluator.evaluateCallbackReturn
                (
                    executeCallbackCommand,
                        returnArgument != null ? this.executionContextStack.getExpressionValue(returnArgument)
                        : null,
                    returnCommand.codeConstruct
                );
            }
            else if(ValueTypeHelper.isString(executeCallbackCommand.originatingObject.jsValue))
            {
                Firecrow.N_Interpreter.StringExecutor.evaluateCallbackReturn
                (
                    executeCallbackCommand,
                    returnArgument != null ? this.executionContextStack.getExpressionValue(returnArgument) : null,
                    returnCommand.codeConstruct,
                    this.globalObject
                );
            }
            else { this.notifyError(returnCommand, "Unhandled callback function"); }
        },

        _getPropertyValue: function(object, property, memberExpression)
        {
            var propertyValue = object.iValue.getJsPropertyValue(property.jsValue, memberExpression);


            if(!ValueTypeHelper.isOfType(propertyValue, Firecrow.N_Interpreter.fcValue) && propertyValue != this.globalObject)
            {
                if(propertyValue != null && propertyValue.fcValue != null && !ValueTypeHelper.isPrimitive(propertyValue)) { propertyValue = propertyValue.fcValue; }
                else if (ValueTypeHelper.isPrimitive(propertyValue)) { propertyValue = this.globalObject.internalExecutor.createInternalPrimitiveObject(memberExpression, propertyValue);}
                else { this.notifyError(null, "The property value should be of type JsValue"); return; }
            }

            return propertyValue;
        },

        _getThisObjectFromCallInternalFunctionCommand: function(callInternalFunctionCommand)
        {
            return callInternalFunctionCommand.isCall || callInternalFunctionCommand.isApply
                ? this.executionContextStack.getExpressionValue(callInternalFunctionCommand.codeConstruct.arguments[0])
                : callInternalFunctionCommand.thisObject;
        },

        _getArgumentsFromInternalFunctionCall: function(callInternalFunctionCommand, callExpressionArgs)
        {
            if(callInternalFunctionCommand.isCall)
            {
                return this.executionContextStack.getExpressionsValues(ValueTypeHelper.getWithoutFirstElement(callExpressionArgs));
            }

            if(callInternalFunctionCommand.isApply)
            {
                var secondArgumentValue = this.executionContextStack.getExpressionValue(callExpressionArgs[1]);

                return secondArgumentValue != null && secondArgumentValue.jsValue != null ? secondArgumentValue.jsValue : [];
            }
            return callExpressionArgs == null ? [] : this.executionContextStack.getExpressionsValues(callExpressionArgs);
        },

        _logForInIteration: function(forInWhereCommand, whereObject, isFirstIteration)
        {
            if(forInWhereCommand == null || !isFirstIteration || whereObject == null) { return; }

            this.globalObject.logForInIteration(forInWhereCommand.codeConstruct, whereObject.proto);
        },

        _callExceptionCallbacks: function(exceptionInfo)
        {
            this.exceptionCallbacks.forEach(function(callbackObject)
            {
                callbackObject.callback.call(callbackObject.thisObject, exceptionInfo);
            });
        },

        _getLastEvaluatedConstruct: function()
        {
            for(var i = this.currentCommandIndex - 1; i > 0 ; i--)
            {
                var currentCommand = this.commands[i];

                if(currentCommand.isExitFunctionContextCommand())
                {
                    return currentCommand.callExpressionCommand.codeConstruct;
                }

                if(!ASTHelper.isLoopStatement(currentCommand.codeConstruct)
                    && !ASTHelper.isIfStatement(currentCommand.codeConstruct)
                    && !ASTHelper.isSwitchCase(currentCommand.codeConstruct))
                {
                    return currentCommand.codeConstruct;
                }
            }

            return null;
        },

        _processThrowCommand: function(throwCommand)
        {
            this.throwExpressionValue = this.executionContextStack.getExpressionValue(throwCommand.codeConstruct.argument);
        },

        _processGeneratingNewCommandsCommand: function(command)
        {
                 if (command.isEvalCallbackFunctionCommand()) { this._generateCommandsAfterCallbackFunctionCommand(command); }
            else if (command.isEvalNewExpressionCommand()) { this._generateCommandsAfterNewExpressionCommand(command); }
            else if (command.isEvalCallExpressionCommand()) { this._generateCommandsAfterCallFunctionCommand(command); }
            else if (command.isCallInternalFunctionCommand()) { if(command.generatesCallbacks) { this._generateCommandsAfterCallbackFunctionCommand(command); this.globalObject.browser.logStartExecutingCallbacks(command.callbackFunction != null && command.callbackFunction.codeConstruct); }}
            else if (command.isLoopStatementCommand()) { this._generateCommandsAfterLoopCommand(command); }
            else if (command.isIfStatementCommand()) { this._generateCommandsAfterIfCommand(command); }
            else if (command.isEvalConditionalExpressionBodyCommand()) { this._generateCommandsAfterConditionalCommand(command); }
            else if (command.isCaseCommand()) { this._generateCommandsAfterCaseCommand(command); }
            else if (command.isConvertToPrimitiveCommand()) { this._generateCommandsAfterConvertToPrimitiveCommand(command); }
            else { Interpreter.notifyError("Unknown generating new commands command!"); }
        },

        _processRemovingCommandsCommand: function(command)
        {
                 if (command.isEvalReturnExpressionCommand()) { this._removeCommandsAfterReturnStatement(command); }
            else if (command.isEvalBreakCommand()) { this._removeCommandsAfterBreak(command); }
            else if (command.isEvalContinueCommand()) { this._removeCommandsAfterContinue(command); }
            else if (command.isEvalThrowExpressionCommand()) { this._removeCommandsAfterException(command); }
            else if (command.isEvalLogicalExpressionItemCommand()) { this._removeCommandsAfterLogicalExpressionItem(command); }
            else { Interpreter.notifyError("Unknown removing commands command: " + command.type); }
        },

        _processTryCommand: function(command)
        {
            if(command.isStartTryStatementCommand())
            {
                this.tryStack.push(command);
            }
            else if (command.isEndTryStatementCommand())
            {
                this._removeTryCommandFromStack(command);
            }
            else { Interpreter.notifyError("Unknown command type when processing try command"); }
        },

        _removeTryCommandFromStack: function(command)
        {
            var topCommand = this.tryStack[this.tryStack.length - 1];

            if(topCommand != null && topCommand.codeConstruct == command.codeConstruct)
            {
                this.tryStack.pop();
            }
            else if (topCommand == null || topCommand.codeConstruct != command.codeConstruct)
            {
                debugger;
                Interpreter.notifyError("No top command to remove from stack!");
            }
        },

        removeOtherCallbackCommands: function (command)
        {
            var endIndex = this.commands.indexOf(command.lastCallbackCommand);
            var hasFirstExitContextCommandBeenSkipped = false;
            for(var i = this.currentCommandIndex + 1; i <= endIndex;)
            {
                var currentCommand = this.commands[i];

                if(currentCommand.isExitFunctionContextCommand() && !hasFirstExitContextCommandBeenSkipped)
                {
                    i++;
                    hasFirstExitContextCommandBeenSkipped = true;
                }
                else
                {
                    ValueTypeHelper.removeFromArrayByIndex(this.commands, i);
                    endIndex--;
                }
            }
        },

        _removeCommandsAfterReturnStatement: function(returnCommand)
        {
            var callExpressionCommand = returnCommand.parentFunctionCommand;

            for(var i = this.currentCommandIndex + 1; i < this.commands.length;)
            {
                var command = this.commands[i];

                if(!command.isExitFunctionContextCommand() && command.parentFunctionCommand == callExpressionCommand)
                {
                    ValueTypeHelper.removeFromArrayByIndex(this.commands, i);

                    if(command.isEndTryStatementCommand() && command.startCommand.hasBeenExecuted)
                    {
                        this._removeTryCommandFromStack(command);
                    }
                }
                else { break; }
            }
        },

        _removeCommandsAfterBreak: function(breakCommand)
        {
            if(breakCommand.codeConstruct.label != null) { this._removeCommandsAfterLabeledBreak(breakCommand);}
            else { this._removeCommandsAfterNonLabeledBreak(breakCommand); }
        },

        _removeCommandsAfterLabeledBreak: function(breakCommand)
        {
            var breakParent = ASTHelper.getLoopOrSwitchParent(breakCommand.codeConstruct);

            var labelName = breakCommand.codeConstruct.label.name;
            var label = ASTHelper.getParentLabelStatement(breakCommand.codeConstruct, labelName);

            if(label == null) { this._removeCommandsAfterNonLabeledBreak(breakCommand); return; }

            var labeledStatement = label.body;

            for(var i = this.currentCommandIndex + 1; i < this.commands.length; )
            {
                var command = this.commands[i];
                var isThisLabel = command.codeConstruct == labeledStatement;

                if(command.isEndSwitchStatementCommand() || command.isEndLoopStatementCommand() ){ i++; }
                else { ValueTypeHelper.removeFromArrayByIndex(this.commands, i); }

                if((command.isLoopStatementCommand() || command.isEndSwitchStatementCommand())
                    && isThisLabel && command.codeConstruct == breakParent) { break;}
            }
        },

        _removeCommandsAfterNonLabeledBreak: function(breakCommand)
        {
            var breakParent = ASTHelper.getLoopOrSwitchParent(breakCommand.codeConstruct);

            for(var i = this.currentCommandIndex + 1; i < this.commands.length; )
            {
                var command = this.commands[i];

                if(!command.isEndSwitchStatementCommand() && !command.isEndLoopStatementCommand())
                {
                    ValueTypeHelper.removeFromArrayByIndex(this.commands, i);
                }
                else
                {
                    i++;
                }

                if((command.isLoopStatementCommand() || command.isEndSwitchStatementCommand())
                    && command.codeConstruct == breakParent) { break;}
            }
        },

        _removeCommandsAfterContinue: function(continueCommand)
        {
            if(continueCommand.codeConstruct.label != null) { this._removeCommandsAfterLabeledContinue(continueCommand); }
            else { this._removeCommandsAfterNonLabeledContinue(continueCommand); }
        },

        _removeCommandsAfterNonLabeledContinue: function(continueCommand)
        {
            var continueParent = ASTHelper.getLoopParent(continueCommand.codeConstruct);

            for(var i = this.currentCommandIndex + 1; i < this.commands.length; )
            {
                var command = this.commands[i];

                if(!command.isForUpdateStatementCommand()
                    && !command.isEndLoopStatementCommand()
                    && (!command.isEvalForInWhereCommand() || command.codeConstruct != continueParent ))
                {
                    ValueTypeHelper.removeFromArrayByIndex(this.commands, i);
                }
                else
                {
                    i++;
                }

                if((command.isLoopStatementCommand() || command.isForUpdateStatementCommand())
                    && command.codeConstruct == continueParent)
                {
                    break;
                }
            }
        },

        _removeCommandsAfterLabeledContinue: function(continueCommand)
        {
            var continueParent = ASTHelper.getLoopParent(continueCommand.codeConstruct);

            var labelName = continueCommand.codeConstruct.label.name;
            var label = ASTHelper.getParentLabelStatement(continueCommand.codeConstruct, labelName);

            if(label == null) { this._removeCommandsAfterNonLabeledContinue(continueCommand); return; }

            var labeledStatement = label.body;

            for(var i = this.currentCommandIndex + 1; i < this.commands.length; )
            {
                var command = this.commands[i];
                var isThisLabel = command.codeConstruct == labeledStatement;

                if(command.isForUpdateStatementCommand() && isThisLabel) { i++;}
                else if (command.isEndLoopStatementCommand()) { i++; }
                else if(command.isEvalForInWhereCommand() && command.codeConstruct != continueParent)
                {
                    this.notifyError("Haven't thought about this, possible bug!");
                    i++;
                }
                else { ValueTypeHelper.removeFromArrayByIndex(this.commands, i);}

                if((command.isLoopStatementCommand() || command.isForUpdateStatementCommand())
                    && isThisLabel && command.codeConstruct == continueParent)
                {
                    break;
                }
            }
        },

        _removeCommandsAfterException: function(exceptionGeneratingArgument)
        {
            if(exceptionGeneratingArgument == null ||
             !(exceptionGeneratingArgument.isDomStringException || exceptionGeneratingArgument.isPushExpectedException
           || (ValueTypeHelper.isOfType(exceptionGeneratingArgument, Firecrow.N_Interpreter.Command) && exceptionGeneratingArgument.isEvalThrowExpressionCommand())))
            {
                debugger;
                Interpreter.notifyError
                (
                        "Exception generating error at:" + " - "
                        + this.commands[this.currentCommandIndex].codeConstruct.loc.start.line + ": "
                        + Firecrow.CodeTextSerializer.generateJsCode(this.commands[this.currentCommandIndex].codeConstruct)
                        + "Call Stack: " + this.executionContextStack.getStackLines()
                );
            }

            if(this.tryStack.length == 0)
            {
                debugger;
                Interpreter.notifyError("Removing commands and there is no enclosing try catch block @ " + this.commands[this.currentCommandIndex].codeConstruct.loc.source);
                return;
            }

            for(var i = this.currentCommandIndex + 1; i < this.commands.length; )
            {
                var command = this.commands[i];

                if(command.isEndTryStatementCommand()) { break; }
                if(command.isExitFunctionContextCommand()) { i++; continue;}

                if(command.isEndIfCommand() || command.isEndLoopStatementCommand())
                {
                    if(command.startCommand != null && command.startCommand.hasBeenExecuted) { i++; continue; }
                }

                ValueTypeHelper.removeFromArrayByIndex(this.commands, i);
            }

            if(this.tryStack.length > 0)
            {
                if(ValueTypeHelper.isOfType(exceptionGeneratingArgument, Firecrow.Interpreter.Commands.Command))
                {
                    var expressionValue = this.executionContextStack.getExpressionValue(exceptionGeneratingArgument.codeConstruct.argument);

                    if(expressionValue != null)
                    {
                        exceptionGeneratingArgument = expressionValue;
                    }
                }

                ValueTypeHelper.insertElementsIntoArrayAtIndex
                (
                    this.commands,
                    CommandGenerator.generateCatchStatementExecutionCommands
                    (
                        this.tryStack[this.tryStack.length - 1],
                        exceptionGeneratingArgument,
                        this.commands[this.currentCommandIndex]
                    ),
                    i
                );
            }
        },

        _removeCommandsAfterLogicalExpressionItem: function(evalLogicalExpressionItemCommand)
        {
            if(evalLogicalExpressionItemCommand.shouldDeleteFollowingLogicalCommands)
            {
                var parentCommand = evalLogicalExpressionItemCommand.parentLogicalExpressionCommand;

                for(var i = this.currentCommandIndex + 1; i < this.commands.length; )
                {
                    var command = this.commands[i];

                    if(command.isEndLogicalExpressionCommand() && command.startCommand == parentCommand) { break;}

                    ValueTypeHelper.removeFromArrayByIndex(this.commands, i);
                }
            }
        },

        _generateCommandsAfterCallbackFunctionCommand: function(callInternalFunctionCommand)
        {
            ValueTypeHelper.insertElementsIntoArrayAtIndex
            (
                this.commands,
                CommandGenerator.generateCallbackFunctionExecutionCommands(callInternalFunctionCommand),
                this.currentCommandIndex + 1
            );
        },

        _generateCommandsAfterNewExpressionCommand: function(newCommand)
        {
            var callConstruct = newCommand.codeConstruct;
            var callee = this.executionContextStack.getExpressionValue(callConstruct.callee);
            var newObject = this.globalObject.internalExecutor.createObject
            (
                callee,
                newCommand.codeConstruct,
                this.executionContextStack.getExpressionsValues(callConstruct.arguments)
            );

            this.executionContextStack.setExpressionValue(newCommand.codeConstruct, newObject);

            ValueTypeHelper.insertElementsIntoArrayAtIndex
            (
                this.commands,
                CommandGenerator.generateFunctionExecutionCommands(newCommand, callee, newObject),
                this.currentCommandIndex + 1
            );
        },

        _generateCommandsAfterCallFunctionCommand: function(callExpressionCommand)
        {
            var callConstruct = callExpressionCommand.codeConstruct;

            var baseObject = this.executionContextStack.getBaseObject(callConstruct.callee);
            var callFunction = this.executionContextStack.getExpressionValue(callConstruct.callee);

            if(callFunction == null) { debugger; alert("Call function can not be null!"); }

            var baseObjectValue = baseObject.jsValue;
            var callFunctionValue = callFunction.jsValue;

            if(ValueTypeHelper.isFunction(baseObjectValue) && ValueTypeHelper.isFunction(callFunctionValue))
            {
                if(callFunctionValue.name == "call" || callFunctionValue.name == "apply")
                {
                    if(callFunctionValue.name == "call") { callExpressionCommand.isCall = true; }
                    else if(callFunctionValue.name == "apply") { callExpressionCommand.isApply = true; }

                    callFunction = baseObject;
                    baseObject = this.executionContextStack.getExpressionValue(callConstruct.arguments[0]);
                }
            }

            ValueTypeHelper.insertElementsIntoArrayAtIndex
            (
                this.commands,
                CommandGenerator.generateFunctionExecutionCommands(callExpressionCommand, callFunction, baseObject),
                this.currentCommandIndex + 1
            );
        },

        _generateCommandsAfterLoopCommand: function(loopCommand)
        {
            if(loopCommand == null || loopCommand.isStartDoWhileCommand()) { return; }

            ValueTypeHelper.insertElementsIntoArrayAtIndex
            (
                this.commands,
                CommandGenerator.generateLoopExecutionCommands
                (
                    loopCommand,
                    !loopCommand.isEvalForInWhereCommand() ? this.executionContextStack.getExpressionValue(loopCommand.codeConstruct.test).jsValue : null
                ),
                this.currentCommandIndex + 1
            );
        },

        _generateCommandsAfterIfCommand: function(ifCommand)
        {
            var ifConditionValue = this.executionContextStack.getExpressionValue(ifCommand.codeConstruct.test);

            var generatedCommands = CommandGenerator.generateIfStatementBodyCommands(ifCommand, ifConditionValue.jsValue, ifCommand.parentFunctionCommand);

            ValueTypeHelper.insertElementsIntoArrayAtIndex(this.commands, generatedCommands, this.currentCommandIndex + 1);
        },

        _generateCommandsAfterConditionalCommand: function(conditionalCommand)
        {
            var conditionValue = this.executionContextStack.getExpressionValue(conditionalCommand.codeConstruct.test);

            ValueTypeHelper.insertElementsIntoArrayAtIndex
            (
                this.commands,
                CommandGenerator.generateConditionalExpressionEvalBodyCommands
                (
                    conditionalCommand,
                    conditionValue.jsValue
                ),
                this.currentCommandIndex + 1
            );
        },

        _generateCommandsAfterCaseCommand: function(caseCommand)
        {
            var switchDiscriminantValue = this.executionContextStack.getExpressionValue(caseCommand.parent.codeConstruct.discriminant);
            var caseValue = caseCommand.codeConstruct.test != null ? this.executionContextStack.getExpressionValue(caseCommand.codeConstruct.test)
                : null;

            if(caseCommand.codeConstruct.test == null //is default
            || caseCommand.parent.hasBeenMatched //falls through
            || caseValue.jsValue == switchDiscriminantValue.jsValue)
            {
                caseCommand.parent.hasBeenMatched = true;
                caseCommand.parent.matchedCaseCommand = caseCommand;

                ValueTypeHelper.insertElementsIntoArrayAtIndex(this.commands, CommandGenerator.generateCaseExecutionCommands(caseCommand), this.currentCommandIndex + 1);
            }
        },

        _generateCommandsAfterConvertToPrimitiveCommand: function(convertToPrimitiveCommand)
        {
            var expression = convertToPrimitiveCommand.codeConstruct;
            var expressionValue = this.executionContextStack.getExpressionValue(expression);

            //Is null, don't do anything - will throw exception later when processing binary expression
            //If primitive, there is nothing to do
            if(expressionValue == null || expressionValue.isPrimitive()) { return; }

            var valueOfFunction = expressionValue.iValue.getPropertyValue("valueOf");

            //If there is no user-defined valueOf function just return
            if(valueOfFunction == null || valueOfFunction.iValue == null || valueOfFunction.isInternalFunction ) { return; }

            ValueTypeHelper.insertElementsIntoArrayAtIndex
            (
                this.commands,
                CommandGenerator.generateFunctionExecutionCommands(convertToPrimitiveCommand, valueOfFunction, expressionValue),
                this.currentCommandIndex + 1
            );
        }
    };
    /******************************************************************************************/
})();