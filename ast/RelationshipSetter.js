(function() {

    Firecrow.RelationshipSetter = function()
    {
        this._currentBranchingConstruct = null;
    };

    Firecrow.RelationshipSetter.prototype =
    {
        traverseHtmlElement: function(htmlElement, parent)
        {
            this.establishParentChildRelationshipAndSetChildId(htmlElement, parent);

            var childNodes = htmlElement.childNodes;
            for(var i = 0; i < childNodes.length; i++)
            {
                this.traverseHtmlElement(childNodes[i], htmlElement);
            }

            if (htmlElement.cssModel != null)
            {
                this.traverseCssModel(htmlElement.cssModel, htmlElement);
            }

            if (htmlElement.pathAndModel != null)
            {
                this.traverseProgram(htmlElement.pathAndModel.model, htmlElement);
            }
        },

        traverseProgram: function(program, htmlElement)
        {
            this.establishParentChildRelationshipAndSetChildId(program, htmlElement);

            var body = program.body;
            for (var i = 0; i < body.length; i++)
            {
                this.traverseStatement(body[i], program);
            }
        },

        traverseStatement: function(statement, parent)
        {
            if (statement == null) { return; }

            this.establishParentChildRelationshipAndSetChildId(statement, parent);

            switch (statement.type)
            {
                case "BlockStatement":
                    this.traverseBlockStatement(statement);
                    break;
                case "BreakStatement":
                    this.traverseBreakStatement(statement);
                    break;
                case "ContinueStatement":
                    this.traverseContinueStatement(statement);
                    break;
                case "DebuggerStatement":
                    this.traverseDebuggerStatement(statement);
                    break;
                case "DoWhileStatement":
                    this.traverseDoWhileStatement(statement);
                    break;
                case "EmptyStatement":
                    this.traverseEmptyStatement(statement);
                    break;
                case "ExpressionStatement":
                    this.traverseExpressionStatement(statement);
                    break;
                case "ForInStatement":
                    this.traverseForInStatement(statement);
                    break;
                case "ForOfStatement":
                    this.traverseForOfStatement(statement);
                    break;
                case "ForStatement":
                    this.traverseForStatement(statement);
                    break;
                case "WhileStatement":
                    this.traverseWhileStatement(statement);
                    break;
                case "IfStatement":
                    this.traverseIfStatement(statement);
                    break;
                case "LabeledStatement":
                    this.traverseLabeledStatement(statement);
                    break;
                case "LetStatement":
                    this.traverseLetStatement(statement);
                    break;
                case "ReturnStatement":
                    this.traverseReturnStatement(statement);
                    break;
                case "SwitchStatement":
                    this.traverseSwitchStatement(statement);
                    break;
                case "ThrowStatement":
                    this.traverseThrowStatement(statement);
                    break;
                case "TryStatement":
                    this.traverseTryStatement(statement);
                    break;
                case "WithStatement":
                    this.traverseWithStatement(statement);
                    break;
                case "FunctionDeclaration":
                    this.traverseFunctionDeclaration(statement);
                    break;
                case "VariableDeclaration":
                    this.traverseVariableDeclaration(statement);
                    break;
                default:
                    alert("Can not recognized statement");
            }
        },

        traverseVariableDeclaration: function(variableDeclaration)
        {
            var declarations = variableDeclaration.declarations;

            for(var i = 0; i < declarations.length; i++)
            {
                var variableDeclarator = declarations[i];
                this.establishParentChildRelationshipAndSetChildId(variableDeclarator, variableDeclaration);

                this.traverseExpression(variableDeclarator.id, variableDeclarator);
                this.traverseExpression(variableDeclarator.init, variableDeclarator);
            }
        },

        traverseTryStatement: function(tryStatement)
        {
            this.traverseStatement(tryStatement.block, tryStatement);
            this.traverseCatch(tryStatement.handler, tryStatement);
            this.traverseStatement(tryStatement.finalizer, tryStatement);
        },

        traverseCatch: function(catchClause, tryStatement)
        {
            this.establishParentChildRelationshipAndSetChildId(catchClause, tryStatement);

            this.traverseExpression(catchClause.param, catchClause);

            var oldBranchingConstruct = this._currentBranchingConstruct;
            this._currentBranchingConstruct = catchClause;

            this.traverseStatement(catchClause.body, catchClause);

            this._currentBranchingConstruct = oldBranchingConstruct;
        },

        traverseFunctionDeclaration: function(functionDeclaration)
        {
            var parameters = functionDeclaration.parameters;

            for(var i = 0; i < parameters.length; i++)
            {
                this.traverseExpression(parameters[i], functionDeclaration);
            }

            this.traverseExpression(functionDeclaration.rest, functionDeclaration);

            var oldBranchingConstruct = this._currentBranchingConstruct;
            this._currentBranchingConstruct = functionDeclaration;

            this.traverseStatement(functionDeclaration.body, functionDeclaration);

            this._currentBranchingConstruct = oldBranchingConstruct;
        },

        traverseWithStatement: function(withStatement)
        {
            this.traverseExpression(withStatement.object, withStatement);

            var oldBranchingConstruct = this._currentBranchingConstruct;
            this._currentBranchingConstruct = withStatement;

            this.traverseStatement(withStatement.body, withStatement);

            this._currentBranchingConstruct = oldBranchingConstruct;
        },

        traverseThrowStatement: function(throwStatement)
        {
            this.traverseExpression(throwStatement.argument, throwStatement);
        },

        traverseSwitchStatement: function(switchStatement)
        {
            var oldBranchingConstruct = this._currentBranchingConstruct;
            this._currentBranchingConstruct = switchStatement;

            this.traverseExpression(switchStatement.discriminant, switchStatement);

            var areAllTestsNumbers = true;

            var cases = switchStatement.cases;

            for(var i = 0; i < cases.Count; i++)
            {
                var switchCase = cases[i];

                this.traverseCase(switchCase, switchStatement, i);

                if (switchCase.test != null && !_IsNumeric(switchCase.test))
                {
                    areAllTestsNumbers = false;
                }
            }

            switchStatement.areAllTestsNumbers = areAllTestsNumbers;
            this._currentBranchingConstruct = oldBranchingConstruct;
        },

        traverseCase: function(switchCase, switchStatement, index)
        {
            this.establishParentChildRelationshipAndSetChildId(switchCase, switchStatement);
            switchCase.index = index;

            this.traverseExpression(switchCase.test, switchCase);

            var oldBranchingConstruct;

            if(switchCase.test != null)
            {
                oldBranchingConstruct = this._currentBranchingConstruct;
                this._currentBranchingConstruct = switchCase;
            }

            var consequent = switchCase.consequent;
            for(var i = 0; i < consequent.length; i++)
            {
                this.traverseStatement(consequent[i], switchCase);
            }

            if(switchCase.test != null)
            {
                this._currentBranchingConstruct = oldBranchingConstruct;
            }
        },

        traverseReturnStatement: function(returnStatement)
        {
            this.traverseExpression(returnStatement.argument, returnStatement);
        },

        traverseLetStatement: function(letStatement)
        {
            var head = letStatement.head;
            for(var i = 0; i < head.length; i++)
            {
                var item = head[i];

                this.establishParentChildRelationshipAndSetChildId(item, letStatement);
                this.traverseExpression(item.id, head);
                this.traverseExpression(item.init, head);
            }

            this.traverseStatement(letStatement.body, letStatement);
        },

        traverseLabeledStatement: function(labeledStatement)
        {
            this.traverseExpression(labeledStatement.label, labeledStatement);
        },

        traverseIfStatement: function(ifStatement)
        {
            this.traverseExpression(ifStatement.test, ifStatement);

            var oldBranchingConstruct = this._currentBranchingConstruct;
            this._currentBranchingConstruct = ifStatement;

            this.traverseStatement(ifStatement.consequent, ifStatement);
            this.traverseStatement(ifStatement.alternate, ifStatement);

            this._currentBranchingConstruct = oldBranchingConstruct;
        },

        traverseWhileStatement: function(whileStatement)
        {
            this.traverseExpression(whileStatement.test, whileStatement);

            var oldBranchingConstruct = this._currentBranchingConstruct;
            this._currentBranchingConstruct = whileStatement;

            this.traverseStatement(whileStatement.body, whileStatement);

            this._currentBranchingConstruct = oldBranchingConstruct;
        },

        traverseForStatement: function(forStatement)
        {
            this.traverseVarDeclarationExpression(forStatement.init, forStatement);
            this.traverseExpression(forStatement.test, forStatement);
            this.traverseExpression(forStatement.update, forStatement);

            var oldBranchingConstruct = this._currentBranchingConstruct;
            this._currentBranchingConstruct = forStatement;

            this.traverseStatement(forStatement.body, forStatement);

            this._currentBranchingConstruct = oldBranchingConstruct;
        },

        traverseForOfStatement: function(forOfStatement)
        {
            this.traverseVarDeclarationExpression(forOfStatement.left, forOfStatement);
            this.traverseExpression(forOfStatement.right, forOfStatement);

            var oldBranchingConstruct = this._currentBranchingConstruct;
            this._currentBranchingConstruct = forOfStatement;

            this.traverseStatement(forOfStatement.body, forOfStatement);

            this._currentBranchingConstruct = oldBranchingConstruct;
        },

        traverseForInStatement: function(forInStatement)
        {
            this.traverseVarDeclarationExpression(forInStatement.left, forInStatement);
            this.traverseExpression(forInStatement.right, forInStatement);

            var oldBranchingConstruct = this._currentBranchingConstruct;
            this._currentBranchingConstruct = forInStatement;

            this.traverseStatement(forInStatement.body, forInStatement);

            this._currentBranchingConstruct = oldBranchingConstruct;
        },

        traverseVarDeclarationExpression: function(node, parent)
        {
            node.type == "VariableDeclaration" ? this.traverseStatement(node, parent)
                                               : this.traverseExpression(node, parent);
        },

        traverseExpressionStatement: function(expressionStatement)
        {
            this.traverseExpression(expressionStatement.expression, expressionStatement);
        },

        traverseEmptyStatement: function(emptyStatement) { },

        traverseDoWhileStatement: function(doWhileStatement)
        {
            var oldBranchingConstruct = this._currentBranchingConstruct;
            this._currentBranchingConstruct = doWhileStatement;
            this.traverseStatement(doWhileStatement.body, doWhileStatement);

            this._currentBranchingConstruct = oldBranchingConstruct;

            this.traverseExpression(doWhileStatement.test, doWhileStatement);
        },

        traverseDebuggerStatement: function(debuggerStatement) { },

        traverseContinueStatement: function(continueStatement)
        {
            this.traverseExpression(continueStatement.label, continueStatement);
        },

        traverseBreakStatement: function(breakStatement)
        {
            this.traverseExpression(breakStatement.label, breakStatement);
        },

        traverseBlockStatement: function(statement)
        {
            var body = statement.body;
            for(var i = 0; i < body.length; i++)
            {
                this.traverseStatement(body[i], statement);
            }
        },

        traverseExpression: function(expression, parent)
        {
            if (expression == null) { return; }

            this.establishParentChildRelationshipAndSetChildId(expression, parent);

            switch (expression.type)
            {
                case "ThisExpression":
                    break;
                case "ArrayExpression":
                    this.traverseArrayExpression(expression);
                    break;
                case "ObjectExpression":
                    this.traverseObjectExpression(expression);
                    break;
                case "FunctionExpression":
                    this.traverseFunctionDeclaration(expression);
                    break;
                case "ArrowExpression":
                    alert("ArrowExpression not yet implemented!");
                    break;
                case "SequenceExpression":
                    this.traverseSequenceExpression(expression);
                    break;
                case "UnaryExpression":
                    this.traverseUnaryExpression(expression);
                    break;
                case "BinaryExpression":
                    this.traverseBinaryExpression(expression);
                    break;
                case "LogicalExpression":
                    this.traverseLogicalExpression(expression);
                    break;
                case "AssignmentExpression":
                    this.traverseAssignmentExpression(expression);
                    break;
                case "UpdateExpression":
                    this.traverseUpdateExpression(expression);
                    break;
                case "ConditionalExpression":
                    this.traverseConditionalExpression(expression);
                    break;
                case "CallExpression":
                    this.traverseCallExpression(expression);
                    break;
                case "MemberExpression":
                    this.traverseMemberExpression(expression);
                    break;
                case "YieldExpression":
                    this.traverseYieldExpression(expression);
                    break;
                case "ComprehensionExpression":
                    this.traverseComprehensionExpression(expression);
                    break;
                case "Identifier":
                    this.traverseIdentifier(expression);
                    break;
                case "Literal":
                    this.traverseLiteral(expression);
                    break;
                default:
                    alert("Unknown expression!");
            }
        },

        traverseLiteral: function(literal)
        {
            if(Firecrow.ASTHelper.isMemberExpression(literal.parent))
            {
                var memberExpression = literal.parent;

                if(memberExpression.property == literal)
                {
                    literal.isMemberExpressionProperty = true;

                    if(Firecrow.ASTHelper.isAssignmentExpression(memberExpression.parent))
                    {
                        literal.isAssignProperty = (memberExpression.parent).left == memberExpression;
                    }
                }
            }
        },

        traverseIdentifier: function(identifier)
        {
            if(Firecrow.ASTHelper.isMemberExpression(identifier.parent))
            {
                var memberExpression = identifier.parent;

                if(memberExpression.property == identifier)
                {
                    identifier.isMemberExpressionProperty = true;

                    if(Firecrow.ASTHelper.isAssignmentExpression(memberExpression.parent))
                    {
                        identifier.isAssignProperty = memberExpression.parent.left == memberExpression;
                    }
                }
            }
        },

        traverseArrayExpression: function(arrayExpression)
        {
            var elements = arrayExpression.elements;
            for (var i = 0; i < elements.length; i++)
            {
                this.traverseExpression(elements[i], arrayExpression);
            }
        },

        traverseObjectExpression: function(objectExpression)
        {
            var properties = objectExpression.properties;
            for(var i = 0; i < properties.length; i++)
            {
                var property = properties[i];

                this.establishParentChildRelationshipAndSetChildId(property, objectExpression);

                this.traverseExpression(property.key, property);
                this.traverseExpression(property.value, property);
            }
        },

        traverseSequenceExpression: function(sequenceExpression)
        {
            var expressions = sequenceExpression.expressions;
            for(var i = 0; i < expressions.length; i++)
            {
                this.traverseExpression(expressions[i], sequenceExpression);
            }
        },

        traverseUnaryExpression: function(unaryExpression)
        {
            this.traverseExpression(unaryExpression.argument, unaryExpression);
        },

        traverseBinaryExpression: function(binaryExpression)
        {
            this.traverseExpression(binaryExpression.left, binaryExpression);
            this.traverseExpression(binaryExpression.right, binaryExpression);
        },

        traverseLogicalExpression: function(logicalExpression)
        {
            this.traverseExpression(logicalExpression.left, logicalExpression);
            this.traverseExpression(logicalExpression.right, logicalExpression);
        },

        traverseAssignmentExpression: function(assignmentExpression)
        {
            this.traverseExpression(assignmentExpression.right, assignmentExpression);
            this.traverseExpression(assignmentExpression.left, assignmentExpression);
        },

        traverseUpdateExpression: function(updateExpression)
        {
            this.traverseExpression(updateExpression.argument, updateExpression);
        },

        traverseConditionalExpression: function(conditionalExpression)
        {
            this.traverseExpression(conditionalExpression.test, conditionalExpression);

            var oldBranchingConstruct = this._currentBranchingConstruct;
            this._currentBranchingConstruct = conditionalExpression;

            this.traverseExpression(conditionalExpression.consequent, conditionalExpression);
            this.traverseExpression(conditionalExpression.alternate, conditionalExpression);

            this._currentBranchingConstruct = oldBranchingConstruct;
        },

        traverseCallExpression: function(callExpression)
        {
            this.traverseExpression(callExpression.callee, callExpression);

            var args = callExpression.arguments;

            for(var i = 0; i < args.length; i++)
            {
                this.traverseExpression(args[i], callExpression);
            }
        },

        traverseMemberExpression: function(memberExpression)
        {
            this.traverseExpression(memberExpression.object, memberExpression);
            this.traverseExpression(memberExpression.property, memberExpression);

            memberExpression.isAssignLeftHand = Firecrow.ASTHelper.isAssignmentExpression(memberExpression.parent)
                                             && memberExpression.parent.left == memberExpression;
        },

        traverseCssModel: function(cssModel, htmlElement)
        {
            this.establishParentChildRelationshipAndSetChildId(cssModel, htmlElement);

            var rules = cssModel.rules;
            for(var i = 0; i < rules.length; i++)
            {
                this.establishParentChildRelationshipAndSetChildId(rules[i], cssModel);
            }
        },

        establishParentChildRelationshipAndSetChildId: function(child, parent)
        {
            if(child == null) { return; }

            child.parent = parent;
            child.children = [];
            child.parentBranching = this._currentBranchingConstruct;

            if(parent != null) { parent.children.push(child); }
        }
    };
})();