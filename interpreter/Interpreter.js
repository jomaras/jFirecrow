(function() {
    /*************************************************************************************/
    var ExecutionContextStack = Firecrow.N_Interpreter.ExecutionContextStack;
    var CommandGenerator = Firecrow.N_Interpreter.CommandGenerator;
    var ValueTypeHelper = Firecrow.ValueTypeHelper;
    var ASTHelper = Firecrow.ASTHelper;

    var Interpreter;

    Firecrow.N_Interpreter.Interpreter = Interpreter = function(programAst, globalObject, handlerInfo)
    {
        this.programAst = programAst;
        this.globalObject = globalObject;
        this.handlerInfo = handlerInfo;
        this.tryStack = [];

        this.executionContextStack = new ExecutionContextStack(globalObject, handlerInfo);
        this.executionContextStack.registerExceptionCallback(this._removeCommandsAfterException, this);

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
            if(command.isStartTryStatementCommand() || command.isEndTryStatementCommand()) { this._processTryCommand(command); }
            if(command.isEvalThrowExpressionCommand())
            {
                this._processThrowCommand(command);
                this._removeCommandsAfterException(command);
            }
            if(command.isFinishEvalCommand(command))
            {
                command.lastEvaluatedConstruct = this._getLastEvaluatedConstruct();
            }

            this.executionContextStack.executeCommand(command);
            command.hasBeenExecuted = true;

            if (command.removesCommands) { this._processRemovingCommandsCommand(command); }
            if (command.generatesNewCommands) { this._processGeneratingNewCommandsCommand(command); }
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
                        + Firecrow.CodeTextGenerator.generateJsCode(this.commands[this.currentCommandIndex].codeConstruct)
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