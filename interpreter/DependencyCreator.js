(function() {
    /*************************************************************************************/
    var ASTHelper = Firecrow.ASTHelper;
    var ValueTypeHelper = Firecrow.ValueTypeHelper;

    var DependencyCreator = Firecrow.N_Interpreter.DependencyCreator = function(globalObject, executionContextStack)
    {
        this.globalObject = globalObject;
        this.executionContextStack = executionContextStack;
    };

    DependencyCreator.notifyError = function(message) { debugger; alert("DependencyCreator - " + message);};

    DependencyCreator.prototype =
    {
        createDependencyToConstructorPrototype: function(creationCodeConstruct, constructorFunction)
        {
            if(constructorFunction.iValue != null && constructorFunction.iValue.prototypeDefinitionConstruct != null)
            {
                this.globalObject.browser.createDependency
                (
                    creationCodeConstruct,
                    constructorFunction.iValue.prototypeDefinitionConstruct.codeConstruct,
                    this.globalObject.getPreciseEvaluationPositionId(),
                    constructorFunction.iValue.prototypeDefinitionConstruct.evaluationPositionId
                );
            }
        },

        createBreakContinueDependencies: function(breakContinueConstruct)
        {
            var dependencyCreationInfo = this.globalObject.getPreciseEvaluationPositionId();

            dependencyCreationInfo.shouldAlwaysBeFollowed = true;
            dependencyCreationInfo.isBreakReturnDependency = true;

            this.globalObject.browser.createDependency
            (
                ASTHelper.getBreakContinueReturnImportantAncestor(breakContinueConstruct),
                breakContinueConstruct,
                dependencyCreationInfo
            );
        },

        createExitFunctionDependencies: function(callFunctionCommand)
        {
            this.addDependenciesToPreviouslyExecutedBlockConstructs(callFunctionCommand.codeConstruct, this.executionContextStack.getPreviouslyExecutedBlockConstructs());

            if(callFunctionCommand.executedReturnCommand != null && callFunctionCommand.executedReturnCommand.codeConstruct.argument == null)
            {
                this.globalObject.browser.callControlDependencyEstablishedCallbacks
                (
                    callFunctionCommand.codeConstruct,
                    callFunctionCommand.executedReturnCommand.codeConstruct,
                    this.globalObject.getReturnExpressionPreciseEvaluationPositionId()
                );
            }
        },

        createDependenciesForObjectPropertyDefinition: function(propertyConstruct)
        {
            if(!ASTHelper.isObjectExpression(propertyConstruct)) { return; }

            var children = propertyConstruct.children;

            for(var i = 0; i < children.length; i++)
            {
                var child = children[i];
                this.createDataDependency(propertyConstruct, child);
                this.createDataDependency(propertyConstruct, child.value);
            }
        },

        createDataDependency: function(fromConstruct, toConstruct, evaluationPosition, toEvaluationPosition)
        {
            this.globalObject.browser.createDependency
            (
                fromConstruct,
                toConstruct,
                evaluationPosition || this.globalObject.getPreciseEvaluationPositionId(),
                toEvaluationPosition
            );
        },

        createValueDataDependency: function(fromConstruct, toConstruct, evaluationPosition, toEvaluationPosition)
        {
            this.globalObject.browser.createDependency
            (
                fromConstruct,
                toConstruct,
                evaluationPosition || this.globalObject.getPreciseEvaluationPositionId(),
                toEvaluationPosition,
                null, true
            );
        },

        markEnterFunctionPoints: function(enterFunctionCommand)
        {
            if(enterFunctionCommand == null || enterFunctionCommand.parentFunctionCommand == null) { return; }

            //TODO - this should not be here!
            var graphNode = enterFunctionCommand.parentFunctionCommand.codeConstruct.graphNode;

            if(graphNode != null)
            {
                var dataDependencies = graphNode.dataDependencies;

                if(dataDependencies.length > 0)
                {
                    if(graphNode.enterFunctionPoints == null) { graphNode.enterFunctionPoints = []; }

                    graphNode.enterFunctionPoints.push({lastDependencyIndex: dataDependencies[dataDependencies.length - 1].index});
                }
            }
        },

        createFunctionParametersDependencies: function(callCommand, formalParams, args)
        {
            if(callCommand == null) { return; }

            //this._createArgumentsToCallDependencies(callCommand, args);
            this._createFormalParameterDependencies(callCommand, formalParams, args);
        },

        _createArgumentsToCallDependencies: function(callCommand, args)
        {
            if(args == null) { return; }

            var evaluationPosition = this.globalObject.getPreciseEvaluationPositionId();

            for(var i = 0; i < args.length; i++)
            {
                this.globalObject.browser.createDependency(args[i], callCommand.codeConstruct, evaluationPosition);
            }
        },

        _createFormalParameterDependencies: function(callCommand, formalParams, args)
        {
            if(args == null) { return; }

            if(callCommand.isApply) { this._createFormalParameterDependenciesInApply(callCommand, formalParams, args); }
            else if (callCommand.isCall) { this._createFormalParameterDependenciesInCall(callCommand, formalParams, args); }
            else if (callCommand.isExecuteCallbackCommand()) {this._createFormalParameterDependenciesInCallback(callCommand, formalParams, args);}
            else { this._createFormalParameterDependenciesInStandard(callCommand, formalParams, args); }
        },

        _createFormalParameterDependenciesInApply: function(callCommand, formalParams, args)
        {
            var argumentValue = this.executionContextStack.getExpressionValue(args[1]);

            if(argumentValue == null) { return; }

            var evalPosition = this.globalObject.getPreciseEvaluationPositionId();
            var fcArray = argumentValue.iValue;

            for(var i = 0, length = formalParams.length; i < length; i++)
            {
                var arrayItem = fcArray.getProperty(i);
                var formalParameter = formalParams[i].value.codeConstruct;

                if(arrayItem != null && arrayItem.lastModificationPosition != null)
                {
                    this.globalObject.browser.createDependency(formalParameter, arrayItem.lastModificationPosition.codeConstruct, evalPosition);
                }

                this.globalObject.browser.createDependency(formalParameter, callCommand.codeConstruct, evalPosition);
            }
        },

        _createFormalParameterDependenciesInCall: function(callCommand, formalParams, args)
        {
            var evalPosition = this.globalObject.getPreciseEvaluationPositionId();

            for(var i = 0, length = formalParams.length; i < length; i++)
            {
                var formalParameter = formalParams[i].value.codeConstruct;

                this.globalObject.browser.createDependency(formalParameter, args[i + 1], evalPosition);
                this.globalObject.browser.createDependency(formalParameter, callCommand.codeConstruct, evalPosition);
            }
        },

        _createFormalParameterDependenciesInStandard: function(callCommand, formalParams, args)
        {
            var evalPosition = this.globalObject.getPreciseEvaluationPositionId();

            for(var i = 0, length = formalParams.length; i < length; i++)
            {
                var formalParam = formalParams[i].value.codeConstruct;

                this.globalObject.browser.createDependency(formalParam, args[i], evalPosition);
                this.globalObject.browser.createDependency(formalParam, callCommand.codeConstruct, evalPosition);
            }
        },

        addNewExpressionDependencies: function(newExpression)
        {
            var evaluationPosition = this.globalObject.getPreciseEvaluationPositionId();
            this.globalObject.dependencyCreator.createDataDependency(newExpression, newExpression.callee, evaluationPosition);

            for(var i = 0; i < newExpression.arguments.length; i++)
            {
                this.globalObject.dependencyCreator.createDataDependency(newExpression, newExpression.arguments[i], evaluationPosition);
            }
        },

        addCallExpressionDependencies: function(callConstruct)
        {
            //TODO - hack to cover problems of object[callExpression()] where only callExpression is important
            /*if(ASTHelper.isMemberExpressionProperty(callConstruct))
             {
             this.globalObject.dependencyCreator.createDataDependency(callConstruct, callConstruct.parent, this.globalObject.getPreciseEvaluationPositionId());
             } */
            var evaluationPosition = this.globalObject.getPreciseEvaluationPositionId();
            this.globalObject.dependencyCreator.createDataDependency(callConstruct, callConstruct.callee, evaluationPosition);

            if(callConstruct.arguments != null)
            {
                for(var i = 0; i < callConstruct.arguments.length; i++)
                {
                    this.globalObject.dependencyCreator.createDataDependency(callConstruct, callConstruct.arguments[i], evaluationPosition);
                }
            }
        },

        _createFormalParameterDependenciesInCallback: function(callCommand, formalParameters, args)
        {
            var params = callCommand.callbackFunction.codeConstruct.params;
            var evalPosition = this.globalObject.getPreciseEvaluationPositionId();

            for(var i = 0; i < params.length; i++)
            {
                var arg = callCommand.arguments[i];

                if(arg != null)
                {
                    this.globalObject.browser.createDependency(params[i], arg.codeConstruct, evalPosition);
                }

                this.globalObject.browser.createDependency(params[i], callCommand.codeConstruct, evalPosition);
                if(callCommand.parentInitCallbackCommand != null)
                {
                    this.globalObject.browser.createDependency(params[i], callCommand.parentInitCallbackCommand.codeConstruct, evalPosition);
                }
            }
        },

        addCallbackDependencies: function(callbackConstruct, callCallbackConstruct)
        {
            this.globalObject.browser.createDependency
            (
                callbackConstruct,
                callCallbackConstruct,
                this.globalObject.getPreciseEvaluationPositionId()
            );
        },

        createCallbackFunctionCommandDependencies: function(evalCallbackFunctionCommand){},

        createAssignmentDependencies: function(assignmentCommand)
        {
            var assignmentExpression = assignmentCommand.codeConstruct;

            var evaluationPosition = this.globalObject.getPreciseEvaluationPositionId();

            this.globalObject.browser.createDependency(assignmentExpression, assignmentCommand.leftSide, evaluationPosition);
            this.globalObject.browser.createDependency(assignmentExpression, assignmentCommand.rightSide, evaluationPosition);
        },

        _createAssignmentSimpleDependencies: function(assignmentCommand)
        {
            var assignmentExpression = assignmentCommand.codeConstruct;

            this._createSimpleDependency(assignmentExpression, assignmentCommand.leftSide);
            this._createSimpleDependency(assignmentExpression, assignmentCommand.rightSide);
        },

        createUpdateExpressionDependencies: function(updateExpression)
        {
            this.globalObject.browser.createDependency(updateExpression, updateExpression.argument, this.globalObject.getPreciseEvaluationPositionId());
        },

        createIdentifierDependencies:function(identifier, identifierConstruct, evaluationPosition)
        {
            this._addDependencyToIdentifierDeclaration(identifier, identifierConstruct, evaluationPosition);

            if(this._willIdentifierBeReadInAssignmentExpression(identifierConstruct))
            {
                this._addDependencyToLastModificationPoint(identifier, identifierConstruct, evaluationPosition);
            }

            if(identifier != null && identifier.value != null && identifier.value.iValue != null && identifier.value.iValue.dummyDependencyNode != null)
            {
                this.createDataDependency(identifierConstruct, identifier.value.iValue.dummyDependencyNode, evaluationPosition);
            }
        },

        _willIdentifierBeReadInAssignmentExpression: function(identifierConstruct)
        {
            return !ASTHelper.isAssignmentExpression(identifierConstruct.parent) || identifierConstruct.parent.left != identifierConstruct || identifierConstruct.parent.operator.length == 2;
        },

        _addDependencyToLastModificationPoint: function(identifier, identifierConstruct, evaluationPosition)
        {
            if(identifier.lastModificationPosition == null) { return; }

            this.globalObject.browser.createDependency
            (
                identifierConstruct,
                identifier.lastModificationPosition.codeConstruct,
                evaluationPosition,
                identifier.lastModificationPosition.evaluationPositionId,
                null,
                true
            );

            this.globalObject.browser.createDependency
            (
                identifierConstruct,
                identifier.value.codeConstruct,
                evaluationPosition,
                identifier.lastModificationPosition.evaluationPositionId,
                null,
                true
            );
        },

        _addDependencyToIdentifierDeclaration: function(identifier, identifierConstruct, evaluationPosition)
        {
            if(identifier.declarationPosition == null || identifier.declarationPosition == identifier.lastModificationPosition) { return; }

            this.globalObject.browser.createDependency
            (
                identifierConstruct,
                ASTHelper.isVariableDeclarator(identifier.declarationPosition.codeConstruct) ? identifier.declarationPosition.codeConstruct.id
                                                                                             : identifier.declarationPosition.codeConstruct,
                evaluationPosition,
                null, null,
                true
            );
        },

        createBinaryExpressionDependencies: function(binaryExpression)
        {
            var evaluationPosition = this.globalObject.getPreciseEvaluationPositionId();

            this.globalObject.browser.createDependency(binaryExpression, binaryExpression.left, evaluationPosition);
            this.globalObject.browser.createDependency(binaryExpression, binaryExpression.right, evaluationPosition);
        },

        createBinaryExpressionInDependencies: function(binaryExpression, objectFcValue, propertyNameFcValue)
        {
            if(objectFcValue == null || propertyNameFcValue == null) { return; }
            if(objectFcValue.iValue == null) { return; }

            var propertyValue = objectFcValue.iValue.getJsPropertyValue(propertyNameFcValue.jsValue, binaryExpression);
            var propertyExists = propertyValue !== undefined && propertyValue.jsValue !== undefined;

            var evaluationPosition = this.globalObject.getPreciseEvaluationPositionId();

            var fcProperty = objectFcValue.iValue.getProperty(propertyNameFcValue.jsValue, binaryExpression);

            if(fcProperty != null)
            {
                if(fcProperty.lastModificationPosition != null)
                {
                    this.globalObject.browser.createDependency
                    (
                        binaryExpression,
                        fcProperty.lastModificationPosition.codeConstruct,
                        evaluationPosition,
                        fcProperty.lastModificationPosition.evaluationPositionId,
                        null,
                        true
                    );
                }
                else  if(fcProperty.declarationPosition != null)
                {
                    this.globalObject.browser.createDependency
                    (
                        binaryExpression,
                        fcProperty.declarationPosition.codeConstruct,
                        evaluationPosition,
                        fcProperty.declarationPosition.evaluationPositionId,
                        null,
                        true
                    );
                }
            }

            if(!propertyExists)
            {
                var propertyDeletePosition = objectFcValue.iValue.getPropertyDeletionPosition(propertyNameFcValue.jsValue);

                if(propertyDeletePosition != null)
                {
                    this.globalObject.browser.createDependency(binaryExpression, propertyDeletePosition.codeConstruct, evaluationPosition, propertyDeletePosition.evaluationPosition);
                }
            }
        },

        createReturnDependencies: function(returnCommand)
        {
            this.globalObject.browser.callControlDependencyEstablishedCallbacks(returnCommand.codeConstruct, returnCommand.codeConstruct.argument, this.globalObject.getPreciseEvaluationPositionId());

            if(returnCommand.parentFunctionCommand == null || returnCommand.parentFunctionCommand.isExecuteCallbackCommand()) { return; }

            this.globalObject.browser.createDependency(returnCommand.parentFunctionCommand.codeConstruct, returnCommand.codeConstruct, this.globalObject.getReturnExpressionPreciseEvaluationPositionId());
        },

        createMemberExpressionDependencies: function(object, property, propertyValue, memberExpression)
        {
            var propertyExists = propertyValue !== undefined && propertyValue.jsValue !== undefined;

            var evaluationPosition = this.globalObject.getPreciseEvaluationPositionId();

            if(object.iValue != null)
            {
                var fcProperty = object.iValue.getProperty(property.jsValue, memberExpression);

                if(fcProperty != null && !ASTHelper.isLastPropertyInLeftHandAssignment(memberExpression.property))
                {
                    if(fcProperty.lastModificationPosition != null)
                    {
                        this.globalObject.browser.createDependency
                        (
                            memberExpression,
                            fcProperty.lastModificationPosition.codeConstruct,
                            evaluationPosition,
                            fcProperty.lastModificationPosition.evaluationPositionId,
                            null,
                            true
                        );
                    }
                    else  if(fcProperty.declarationPosition != null)
                    {
                        this.globalObject.browser.createDependency
                        (
                            memberExpression.property,
                            fcProperty.declarationPosition.codeConstruct,
                            evaluationPosition,
                            fcProperty.declarationPosition.evaluationPositionId,
                            null,
                            true
                        );
                    }
                }
            }

            this.globalObject.browser.createDependency(memberExpression, memberExpression.object, this.globalObject.getPreciseEvaluationPositionId());

            //Create a dependency only if the property exists, the problem is that if we don't ignore it here, that will lead to links to constructs where the property was not null
            if(propertyExists || !ASTHelper.isIdentifier(memberExpression.property) || ASTHelper.isLastPropertyInLeftHandAssignment(memberExpression.property))
            {
                this.globalObject.browser.createDependency(memberExpression, memberExpression.property, evaluationPosition);
            }
            else
            {
                var propertyDeletePosition = object.iValue.getPropertyDeletionPosition(property.jsValue);

                if(propertyDeletePosition != null)
                {
                    this.globalObject.browser.createDependency(memberExpression, propertyDeletePosition.codeConstruct, evaluationPosition, propertyDeletePosition.evaluationPosition, null, true);
                }

                this.globalObject.browser.createDependency(memberExpression, memberExpression.property, evaluationPosition, evaluationPosition, true);

                if(memberExpression.computed && ASTHelper.isIdentifier(memberExpression.property))
                {
                    var identifier = this.executionContextStack.getIdentifier(memberExpression.property.name);
                    if(identifier != null && identifier.declarationPosition != null)
                    {
                        this.globalObject.browser.createDependency(memberExpression, identifier.declarationPosition.codeConstruct, evaluationPosition, identifier.declarationPosition.evaluationPositionId, true);
                    }
                }
            }
        },

        createDependenciesInForInWhereCommand: function(forInWhereConstruct, whereObject, nextPropertyName, isFirstIteration)
        {
            var evaluationPosition = this.globalObject.getPreciseEvaluationPositionId();

            this.globalObject.browser.createDependency(forInWhereConstruct, forInWhereConstruct.right, evaluationPosition);
            this.globalObject.browser.createDependency(forInWhereConstruct.left, forInWhereConstruct.right, evaluationPosition);

            if(!nextPropertyName || !nextPropertyName.jsValue) { return; }

            var property = whereObject.iValue.getProperty(nextPropertyName.jsValue);

            if(property != null && property.lastModificationPosition != null)
            {
                this.globalObject.browser.createDependency
                (
                    forInWhereConstruct.left,
                    property.lastModificationPosition.codeConstruct,
                    evaluationPosition,
                    property.lastModificationPosition.evaluationPositionId
                );

                if (ASTHelper.isVariableDeclaration(forInWhereConstruct.left))
                {
                    var declarator = forInWhereConstruct.left.declarations[0];

                    this.globalObject.browser.createDependency
                    (
                        declarator.id,
                        property.lastModificationPosition.codeConstruct,
                        evaluationPosition,
                        property.lastModificationPosition.evaluationPositionId
                    );

                    this.globalObject.browser.createDependency(declarator, forInWhereConstruct.right, evaluationPosition);
                    this.globalObject.browser.createDependency(declarator.id, forInWhereConstruct.right, evaluationPosition);
                }

                if(isFirstIteration)
                {
                    this.globalObject.browser.createDependency
                    (
                        forInWhereConstruct.right,
                        property.lastModificationPosition.codeConstruct,
                        evaluationPosition,
                        property.lastModificationPosition.evaluationPositionId
                    );
                }
            }
        },

        createDependenciesForConditionalCommand: function(conditionalCommand)
        {
            var evaluationPosition = this.globalObject.getPreciseEvaluationPositionId();

            this.globalObject.browser.createDependency(conditionalCommand.codeConstruct, conditionalCommand.codeConstruct.test, evaluationPosition);
            this.globalObject.browser.createDependency(conditionalCommand.codeConstruct, conditionalCommand.startCommand.body, evaluationPosition);
        },

        createDependenciesForLogicalExpressionItemCommand: function(logicalExpression)
        {
            //TODO: not sure about this -> should it be for both
            //if(logicalExpression.operator == "&&")
            {
                //So that the dependecies fall into the expression inside the logical expression item
                this.globalObject.browser.createDependency
                (
                    logicalExpression.right,
                    logicalExpression.left,
                    this.globalObject.getPrecisePreviousEvaluationPositionId()
                );
            }
        },

        createDependenciesForLogicalExpression: function(logicalExpressionCommand)
        {
            var executedItemsCommands = logicalExpressionCommand.executedLogicalItemExpressionCommands;
            var evaluationPosition = this.globalObject.getPreciseEvaluationPositionId();

            for(var i = 0, length = executedItemsCommands.length; i < length; i++)
            {
                var executedLogicalExpressionItemConstruct = executedItemsCommands[i].codeConstruct;

                this.globalObject.browser.createDependency
                (
                    logicalExpressionCommand.codeConstruct,
                    executedLogicalExpressionItemConstruct,
                    evaluationPosition,
                    null, null, i == length - 1 //the data comes from the last
                );
            }
        },

        createDependenciesForCallInternalFunction: function(callInternalFunctionCommand)
        {
            var callExpression = callInternalFunctionCommand.codeConstruct;

            //Callback function called with an internal function
            if(callExpression == null) { return; }

            var args = callExpression.arguments;
            var evaluationPosition = this.globalObject.getPreciseEvaluationPositionId();

            this.globalObject.browser.createDependency(callExpression, callExpression.callee, evaluationPosition);

            if(callInternalFunctionCommand.isCall || callInternalFunctionCommand.isApply)
            {
                this._createDependenciesToCallApplyInternalFunctionCall(callInternalFunctionCommand, args, callExpression);
            }
            else
            {
                if(args == null) { return; }

                for(var i = 0, length = args.length; i < length; i++)
                {
                    this.globalObject.browser.createDependency(callExpression, args[i], evaluationPosition);
                }
            }
        },

        _createDependenciesToCallApplyInternalFunctionCall: function(callInternalFunctionCommand, args, callExpression)
        {
            var evaluationPosition = this.globalObject.getPreciseEvaluationPositionId();

            if(callInternalFunctionCommand.isCall)
            {
                for(var i = 1, length = arguments.length; i < length; i++)
                {
                    this.globalObject.browser.createDependency(callExpression, args[i], evaluationPosition);
                }
            }
            else
            {
                var secondArgumentValue = this.executionContextStack.getExpressionValue(args[1]);

                if(secondArgumentValue != null && ValueTypeHelper.isArray(secondArgumentValue.jsValue))
                {
                    secondArgumentValue.iValue.addDependenciesToAllProperties(callExpression);
                }
            }
        },

        createSequenceExpressionDependencies: function(sequenceExpression, lastExpression)
        {
            this.globalObject.browser.createDependency
            (
                sequenceExpression,
                lastExpression,
                this.globalObject.getPreciseEvaluationPositionId()
            );
        }
    };
    /*************************************************************************************/
})();