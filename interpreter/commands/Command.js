/**
 * Created by Josip on 22.9.2014..
 */
(function() {
    /*************************************************************************************/
    var ASTHelper = Firecrow.ASTHelper;
    var Command = Firecrow.Interpreter.Command = function (codeConstruct, type, parentFunctionCommand)
    {
        this.id = Command.LAST_COMMAND_ID++;
        this.codeConstruct = codeConstruct;
        this.type = type;
        this.parentFunctionCommand = parentFunctionCommand;

        this.removesCommands = this.isEvalReturnExpressionCommand() || this.isEvalBreakCommand() || this.isEvalContinueCommand()
                            || this.isEvalThrowExpressionCommand() || this.isEvalLogicalExpressionItemCommand();

        this.generatesNewCommands = this.isEvalCallbackFunctionCommand() || this.isEvalNewExpressionCommand() || this.isEvalCallExpressionCommand()
                                 || this.isLoopStatementCommand() || this.isIfStatementCommand() || this.isEvalConditionalExpressionBodyCommand()
                                 || this.isCaseCommand() || this.isCallCallbackMethodCommand() || this.isConvertToPrimitiveCommand();
    };

    Command.LAST_COMMAND_ID = 0;

    Command.notifyError = function (message) { debugger; alert("Command - " + message); };

    Command.createAssignmentCommand = function (codeConstruct, parentFunctionCommand)
    {
        var command = new Command(codeConstruct, CommandType.EvalAssignmentExpression, parentFunctionCommand);

        if (ASTHelper.isVariableDeclarator(codeConstruct))
        {
            command.leftSide = codeConstruct.id;
            command.rightSide = codeConstruct.init;
            command.operator = "=";
        }
        else if (ASTHelper.isAssignmentExpression(codeConstruct))
        {
            command.leftSide = codeConstruct.left;
            command.rightSide = codeConstruct.right;
            command.operator = codeConstruct.operator;
        }
        else
        {
            this.notifyError("Assignment command can only be created on variable declarators and assignment expressions!");
        }

        return command;
    };

    Command.createEnterFunctionContextCommand = function (functionObject, thisObject, parentFunctionCommand)
    {
        var command = new Command(functionObject.codeConstruct, CommandType.EnterFunctionContext, parentFunctionCommand);

        if (functionObject == null || !ASTHelper.isFunction(functionObject.codeConstruct))
        {
            debugger;
            this.notifyError("Callee code construct has to be a function");
        }

        command.callee = functionObject;
        command.thisObject = thisObject;

        if (functionObject.iValue.bounder != null && functionObject.iValue.bounder.jsValue != null)
        {
            command.thisObject = functionObject.iValue.bounder;
        }

        return command;
    };

    Command.createEnterEventHandlerContextCommand = function (handlerInfo)
    {
        var command = new Command(handlerInfo.functionHandler.codeConstruct, CommandType.EnterFunctionContext, null);

        command.callee = handlerInfo.functionHandler;
        command.thisObject = handlerInfo.thisObject;
        command.argumentValues = handlerInfo.argumentValues;
        command.codeConstruct = handlerInfo.registrationPoint.codeConstruct;
        command.isEnterEventHandler = true;

        return command;
    };

    Command.createExitFunctionContextCommand = function (functionObject, parentFunctionCommand)
    {
        return new Command(functionObject.codeConstruct, CommandType.ExitFunctionContext, parentFunctionCommand);
    };

    Command.createObjectPropertyCommand = function (codeConstruct, objectExpressionCommand, parentFunctionCommand)
    {
        var command = new Command(codeConstruct, CommandType.ObjectPropertyCreation, parentFunctionCommand);

        command.objectExpressionCommand = objectExpressionCommand;

        return command;
    };

    Command.createArrayExpressionItemCommand = function (codeConstruct, arrayExpressionCommand, parentFunctionCommand)
    {
        var command = new Command(codeConstruct, CommandType.ArrayExpressionItemCreation, parentFunctionCommand);

        command.arrayExpressionCommand = arrayExpressionCommand;

        return command;
    };

    Command.createForInWhereCommand = function (codeConstruct, propertyNames, parentFunctionCommand)
    {
        var command = new Command(codeConstruct, CommandType.EvalForInWhere, parentFunctionCommand);

        command.propertyNames = propertyNames;

        return command;
    };

    Command.createCallInternalConstructorCommand = function (codeConstruct, functionObject, parentFunctionCommand)
    {
        var command = new Command(codeConstruct, CommandType.CallInternalConstructor, parentFunctionCommand);

        command.functionObject = functionObject;

        return command;
    };

    Command.createCallInternalConstructorCommand = function (codeConstruct, functionObject, parentFunctionCommand)
    {
        var command = new Command(codeConstruct, CommandType.CallInternalConstructor, parentFunctionCommand);

        command.functionObject = functionObject;

        return command;
    };

    Command.createCallInternalFunctionCommand = function (codeConstruct, functionObject, thisObject, parentFunctionCommand, parentCallExpressionCommand)
    {
        var command = new Command(codeConstruct, CommandType.CallInternalFunction, parentFunctionCommand);

        command.functionObject = functionObject;
        command.thisObject = thisObject;

        command.parentCallExpressionCommand = parentCallExpressionCommand;

        return command;
    };

    Command.createCallCallbackMethodCommand = function (codeConstruct, callCommand, parentFunctionCommand)
    {
        var command = new Command(codeConstruct, CommandType.CallCallbackMethod, parentFunctionCommand);

        command.generatesNewCommands = true;
        command.generatesCallbacks = true;
        command.setCallbackFunction(callCommand.callbackFunction);
        command.callbackArgumentGroups = callCommand.callbackArgumentGroups;
        command.thisObject = callCommand.thisObject;
        command.originatingObject = callCommand.originatingObject;
        command.callerFunction = callCommand.callerFunction;
        command.targetObject = callCommand.targetObject;

        return command;
    };

    Command.createExecuteCallbackCommand = function (callCallbackCommand, arguments, index)
    {
        var command = new Command(callCallbackCommand.callbackFunction.codeConstruct, CommandType.ExecuteCallback, callCallbackCommand.parentFunctionCommand);

        command.setCallbackFunction(callCallbackCommand.callbackFunction);
        command.callbackArgumentGroups = callCallbackCommand.callbackArgumentGroups;
        command.thisObject = callCallbackCommand.thisObject;
        command.originatingObject = callCallbackCommand.originatingObject;
        command.callerFunction = callCallbackCommand.callerFunction;
        command.targetObject = callCallbackCommand.targetObject;
        command.arguments = arguments;
        command.callCallbackCommand = callCallbackCommand;
        command.index = index;

        return command;
    };

    Command.prototype =
    {
        isDeclareVariableCommand: function () { return this.type == CommandType.DeclareVariable; },
        isDeclareFunctionCommand: function () { return this.type == CommandType.DeclareFunction; },
        isThisExpressionCommand: function () { return this.type == CommandType.ThisExpression; },
        isArrayExpressionCommand: function () { return this.type == CommandType.ArrayExpression; },
        isArrayExpressionItemCreationCommand: function () { return this.type == CommandType.ArrayExpressionItemCreation; },
        isObjectExpressionCommand: function () { return this.type == CommandType.ObjectExpression; },
        isObjectPropertyCreationCommand: function () { return this.type == CommandType.ObjectPropertyCreation; },
        isStartWithStatementCommand: function () { return this.type == CommandType.StartWithStatement; },
        isEndWithStatementCommand: function () { return this.type == CommandType.EndWithStatement; },
        isStartTryStatementCommand: function () { return this.type == CommandType.StartTryStatement; },
        isEndTryStatementCommand: function () { return this.type == CommandType.EndTryStatement; },
        isStartCatchStatementCommand: function () { return this.type == CommandType.StartCatchStatement; },
        isEndCatchStatementCommand: function () { return this.type == CommandType.EndCatchStatement; },
        isStartSwitchStatementCommand: function () { return this.type == CommandType.StartSwitchStatement; },
        isCaseCommand: function () { return this.type == CommandType.Case; },
        isEndSwitchStatementCommand: function () { return this.type == CommandType.EndSwitchStatement; },
        isFunctionExpressionCreationCommand: function () { return this.type == CommandType.FunctionExpressionCreation; },
        isEvalSequenceExpressionCommand: function () { return this.type == CommandType.EvalSequenceExpression; },
        isEvalUnaryExpressionCommand: function () { return this.type == CommandType.EvalUnaryExpression; },
        isEvalBinaryExpressionCommand: function () { return this.type == CommandType.EvalBinaryExpression; },
        isStartLogicalExpressionCommand: function () { return this.type == CommandType.StartEvalLogicalExpression; },
        isEvalLogicalExpressionItemCommand: function () { return this.type == CommandType.EvalLogicalExpressionItem; },
        isEndLogicalExpressionCommand: function () { return this.type == CommandType.EndEvalLogicalExpression; },
        isEvalAssignmentExpressionCommand: function () { return this.type == CommandType.EvalAssignmentExpression; },
        isEvalUpdateExpressionCommand: function () { return this.type == CommandType.EvalUpdateExpression; },
        isEvalBreakCommand: function () { return this.type == CommandType.EvalBreak; },
        isEvalContinueCommand: function () { return this.type == CommandType.EvalContinue; },
        isEvalConditionalExpressionCommand: function () { return this.type == CommandType.EvalConditionalExpression; },
        isEndEvalConditionalExpressionCommand: function () { return this.type == CommandType.EndEvalConditionalExpression; },
        isEvalConditionalExpressionBodyCommand: function () { return this.type == CommandType.EvalConditionalExpressionBody; },
        isEvalNewExpressionCommand: function () { return this.type == CommandType.EvalNewExpression; },
        isEvalCallExpressionCommand: function () { return this.type == CommandType.EvalCallExpression; },
        isEnterFunctionContextCommand: function () { return this.type == CommandType.EnterFunctionContext; },
        isExitFunctionContextCommand: function () { return this.type == CommandType.ExitFunctionContext; },
        isEvalCallbackFunctionCommand: function () { return this.type == CommandType.EvalCallbackFunction; },
        isEvalMemberExpressionCommand: function () { return this.type == CommandType.EvalMemberExpression; },
        isEvalMemberExpressionPropertyCommand: function () { return this.type == CommandType.EvalMemberExpressionProperty; },
        isEvalReturnExpressionCommand: function () { return this.type == CommandType.EvalReturnExpression; },
        isEvalThrowExpressionCommand: function () { return this.type == CommandType.EvalThrowExpression; },
        isEvalIdentifierCommand: function () { return this.type == CommandType.EvalIdentifier; },
        isEvalLiteralCommand: function () { return this.type == CommandType.EvalLiteral; },
        isEvalRegExCommand: function () { return this.type == CommandType.EvalRegExLiteral; },
        isIfStatementCommand: function () { return this.type == CommandType.IfStatement; },
        isEndIfCommand: function () { return this.type == CommandType.EndIf; },
        isStartDoWhileCommand: function () { return this.type == CommandType.StartDoWhileStatement; },
        isWhileStatementCommand: function () { return this.type == CommandType.WhileStatement; },
        isDoWhileStatementCommand: function () { return this.type == CommandType.DoWhileStatement; },
        isForStatementCommand: function () { return this.type == CommandType.ForStatement; },
        isForUpdateStatementCommand: function () { return this.type == CommandType.ForUpdateStatement; },
        isEvalForInWhereCommand: function () { return this.type == CommandType.EvalForInWhere; },
        isEndLoopStatementCommand: function () { return this.type == CommandType.EndLoopStatement; },
        isCallInternalConstructorCommand: function () { return this.type == CommandType.CallInternalConstructor; },
        isCallInternalFunctionCommand: function () { return this.type == CommandType.CallInternalFunction; },
        isCallCallbackMethodCommand: function () { return this.type == CommandType.CallCallbackMethod; },
        isExecuteCallbackCommand: function () { return this.type == CommandType.ExecuteCallback; },
        isFinishEvalCommand: function () { return this.type == CommandType.FinishEval; },
        isLabelCommand: function () { return this.type == CommandType.Label; },
        isConvertToPrimitiveCommand: function () { return this.type == CommandType.ConvertToPrimitive; },
        isStartEvalCommand: function () { return this.type == CommandType.StartEval; },
        isEndCommand: function () { return this.type.indexOf("End") == 0 || this.type.indexOf("Exit") == 0; },
        isLoopStatementCommand: function ()
        {
            return this.isWhileStatementCommand() || this.isDoWhileStatementCommand()
                || this.isForStatementCommand() || this.isEvalForInWhereCommand()
                || this.isStartDoWhileCommand();
        },

        setCallbackFunction: function (callbackFunction) { this.callbackFunction = callbackFunction; },

        getLineNo: function () { return this.codeConstruct != null && this.codeConstruct.loc != null ? this.codeConstruct.loc.start.line : -1; },
        toString: function () { return this.id + ":" + this.type + "@" + this.codeConstruct.loc.start.line; }
    };

    var CommandType = Command.COMMAND_TYPE =
    {
        DeclareVariable: "DeclareVariable",
        DeclareFunction: "DeclareFunction",

        ThisExpression: "ThisExpression",

        ArrayExpression: "ArrayExpression",
        ArrayExpressionItemCreation: "ArrayExpressionItemCreation",

        ObjectExpression: "ObjectExpression",
        ObjectPropertyCreation: "ObjectPropertyCreation",

        StartWithStatement: "StartWithStatement",
        EndWithStatement: "EndWithStatement",

        StartTryStatement: "StartTryStatement",
        EndTryStatement: "EndTryStatement",

        StartCatchStatement: "StartCatchStatement",
        EndCatchStatement: "EndCatchStatement",

        StartSwitchStatement: "StartSwitchStatement",
        EndSwitchStatement: "EndSwitchStatement",

        Case: "Case",

        FunctionExpressionCreation: "FunctionExpressionCreation",

        EvalSequenceExpression: "EvalSequenceExpression",
        EvalUnaryExpression: "EvalUnaryExpression",
        EvalBinaryExpression: "EvalBinaryExpression",
        EvalAssignmentExpression: "EvalAssignmentExpression",
        EvalUpdateExpression: "EvalUpdateExpression",

        EvalBreak: "EvalBreak",
        EvalContinue: "EvalContinue",

        EvalCallbackFunction: "EvalCallbackFunction",

        StartEvalLogicalExpression: "StartEvalLogicalExpression",
        EvalLogicalExpressionItem: "EvalLogicalExpressionItem",
        EndEvalLogicalExpression: "EndEvalLogicalExpression",

        EvalConditionalExpression: "EvalConditionalExpression",
        EndEvalConditionalExpression: "EndEvalConditionalExpression",
        EvalNewExpression: "EvalNewExpression",

        EvalCallExpression: "EvalCallExpression",

        EnterFunctionContext: "EnterFunctionContext",
        ExitFunctionContext: "ExitFunctionContext",

        EvalMemberExpression: "EvalMemberExpression",
        EvalMemberExpressionProperty: "EvalMemberExpressionProperty",

        EvalReturnExpression: "EvalReturnExpression",
        EvalThrowExpression: "EvalThrowExpression",

        EvalIdentifier: "EvalIdentifier",
        EvalLiteral: "EvalLiteral",
        EvalRegExLiteral: "EvalRegExLiteral",

        IfStatement: "IfStatement",
        EndIf: "EndIf",
        StartDoWhileStatement: "StartDoWhileStatement",
        WhileStatement: "WhileStatement",
        DoWhileStatement: "DoWhileStatement",

        ForStatement: "ForStatement",
        ForUpdateStatement: "ForUpdateStatement",

        EndLoopStatement: "EndLoopStatement",

        EvalForInWhere: "EvalForInWhere",

        EvalConditionalExpressionBody: "EvalConditionalExpressionBody",

        CallInternalConstructor: "CallInternalConstructor",
        CallInternalFunction: "CallInternalFunction",
        CallCallbackMethod: "CallCallbackMethod",

        ExecuteCallback: "ExecuteCallback",

        ConvertToPrimitive: "ConvertToPrimitive",

        Label: "Label",

        FinishEval: "FinishEval",
        StartEval: "StartEval"
    };
    /*************************************************************************************/
})();