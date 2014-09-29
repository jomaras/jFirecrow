(function() {
    /*************************************************************************************/
    var Node;
    var fcGraph = Firecrow.N_DependencyGraph;
    Firecrow.N_DependencyGraph.Node = Node = function(model, type, isDynamic)
    {
        this.model = model;
        this.type = type;
        this.isDynamic = !!isDynamic;

        this.structuralDependencies = [];
        this.dataDependencies = [];
        this.reverseDependencies = [];

        this.model.graphNode = this;
        this.idNum = Node.LAST_ID++;
    };

    Node.notifyError = function(message) { alert("Node - " + message); }
    Node.LAST_ID = 0;

    Node.createHtmlNode = function(model, isDynamic) { return new Node(model, "html", isDynamic); };
    Node.createCssNode = function(model, isDynamic) { return new Node(model, "css", isDynamic); };
    Node.createJsNode = function(model, isDynamic) { return new Node(model, "js", isDynamic);};
    Node.createResourceNode = function(model, isDynamic) { return new Node(model, "resource", isDynamic);};

    Node.prototype =
    {
        isNodeOfType: function(type) { return this.type === type; },
        isHtmlNode: function() { return this.isNodeOfType("html"); },
        isCssNode: function() { return this.isNodeOfType("css"); },
        isJsNode: function() { return this.isNodeOfType("js"); },

        addStructuralDependency: function(destinationNode, isDynamic)
        {
            var edge = new fcGraph.Edge(this, destinationNode, isDynamic);

            this.structuralDependencies.push(edge);

            return edge;
        },

        addDataDependency: function(destinationNode, isDynamic, index, dependencyCreationInfo, destinationNodeDependencyInfo, shouldNotFollowDependency)
        {
            var edge = new fcGraph.Edge(this, destinationNode, isDynamic, index, dependencyCreationInfo, destinationNodeDependencyInfo, shouldNotFollowDependency);

            this.dataDependencies.push(edge);

            if(destinationNode != null)
            {
                destinationNode.reverseDependencies.push(edge);
            }

            this.lastDependency = edge;

            return edge;
        },

        addControlDependency: function(destinationNode, isDynamic, index, dependencyCreationInfo, destinationNodeDependencyInfo, shouldNotFollowDependency, isPreviouslyExecutedBlockStatementDependency)
        {
            var edge = new fcGraph.Edge(this, destinationNode, isDynamic, index, dependencyCreationInfo, destinationNodeDependencyInfo, shouldNotFollowDependency);

            edge.isPreviouslyExecutedBlockStatementDependency = isPreviouslyExecutedBlockStatementDependency;

            this.dataDependencies.push(edge);

            if(destinationNode != null)
            {
                destinationNode.reverseDependencies.push(edge);
            }

            this.lastDependency = edge;

            return edge;
        },

        getDependencies: function(maxIndex, destinationConstraint)
        {
            var selectedDependencies = [];

            if(maxIndex == null && destinationConstraint == null) { return this.dataDependencies; }

            var dependencies = this.dataDependencies;

            for(var i = dependencies.length - 1; i >= 0; i--)
            {
                var dependency = dependencies[i];

                if((dependency.isReturnDependency  || dependency.isBreakReturnDependency) && dependency.callDependencyMaxIndex <= maxIndex)
                {
                    selectedDependencies.push(dependency);
                }

                if(dependency.shouldAlwaysBeFollowed)
                {
                    selectedDependencies.push(dependency);
                }

                if(dependency.index > maxIndex) { continue; }
                if(!this.canFollowDependency(dependency, destinationConstraint)) { continue; }

                selectedDependencies.push(dependency);

                for(var j = i + 1; j < dependencies.length; j++)
                {
                    if(!this._areDependenciesInTheSameGroupAndCanBeFollowed(dependency, dependencies[j], destinationConstraint))
                    {
                        break;
                    }

                    selectedDependencies.push(dependencies[j]);
                }

                for(var j = i - 1; j >= 0; j--)
                {
                    if(!this._areDependenciesInTheSameGroupAndCanBeFollowed(dependency, dependencies[j], destinationConstraint))
                    {
                        break;
                    }

                    selectedDependencies.push(dependencies[j]);
                }

                break;
            }

            return selectedDependencies;
        },

        getUntraversedValueDependenciesFromContext:function(executionContextId)
        {
            var dependencies = this.dataDependencies;
            var selectedDependencies = [];

            for(var i = 0; i < dependencies.length; i++)
            {
                var dependency = dependencies[i];
                if(dependency.isValueDependency && !dependency.hasBeenTraversed && dependency.executionContextId == executionContextId)
                {
                    selectedDependencies.push(dependency);
                }
            }

            return selectedDependencies;
        },

        _areDependenciesInTheSameGroupAndCanBeFollowed: function(dependency1, dependency2, destinationConstraint)
        {
            return (dependency1.dependencyCreationInfo.groupId.indexOf(dependency2.dependencyCreationInfo.groupId) == 0
                 || dependency2.dependencyCreationInfo.groupId.indexOf(dependency1.dependencyCreationInfo.groupId) == 0)
                && this.canFollowDependency(dependency2, destinationConstraint);
        },

        canFollowDependency: function(dependency, destinationConstraint)
        {
            if(destinationConstraint == null) { return true; }

            return dependency.dependencyCreationInfo.currentCommandId <= destinationConstraint.currentCommandId;
        },

        generateId: function()
        {
                 if(this.isHtmlNode()) { return this._generateIdForHtmlNode(); }
            else if (this.isCssNode()) { return this._generateIdForCssNode(); }
            else if (this.isJsNode()) { return this._generateIdForJsNode(); }
            else { debugger; alert("Node.generateId - unknown node type!"); return ""; }
        },

        _generateIdForHtmlNode: function()
        {
            if(!this.isHtmlNode()) { return this.generateId(); }

            return this.idNum + ":" +  this.model.type;
        },

        _generateIdForCssNode: function()
        {
            if(!this.isCssNode()) { return this.generateId(); }

            return this.idNum + ":" + this.model.selector;
        },

        _generateIdForJsNode: function()
        {
            if(!this.isJsNode()) { return this.generateId(); }

            var additionalData = "";

            if(this.model.type == "Identifier") { additionalData = "->" + this.model.name; }
            else if (this.model.type == "Literal") { additionalData = "->" + this.model.value;}

            return this.idNum + ":@" + (this.model.loc != null ? this.model.loc.start.line : '?' )+  "-" + this.model.type + additionalData;
        }
    };
})();