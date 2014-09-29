(function() {
    /*************************************************************************************/
    var Edge;

    Firecrow.N_DependencyGraph.Edge = Edge = function(sourceNode, destinationNode, isDynamic, index, dependencyCreationInfo, destinationNodeDependencyConstraints, shouldNotFollowDependency)
    {
        this.sourceNode = sourceNode;
        this.destinationNode = destinationNode;
        this.isDynamic = !!isDynamic;
        this.index = index;

        this.dependencyCreationInfo = dependencyCreationInfo;
        this.destinationNodeDependencyConstraints = destinationNodeDependencyConstraints || dependencyCreationInfo;
        this.shouldNotFollowDependency = shouldNotFollowDependency;

        if(dependencyCreationInfo == null) { return; }

        this.isReturnDependency = dependencyCreationInfo.isReturnDependency;
        this.isBreakReturnDependency = dependencyCreationInfo.isBreakReturnDependency;
        this.shouldAlwaysBeFollowed = dependencyCreationInfo.shouldAlwaysBeFollowed;

        if(this.isReturnDependency)
        {
            this.callDependencyMaxIndex = dependencyCreationInfo.callDependencyMaxIndex || index;
        }
    };

    Edge.prototype.getEdgeSignature = function()
    {
        var sourceSignature = this.sourceNode.model != null ? this.sourceNode.model.nodeId : -1;
        var destinationSignature = this.destinationNode.model != null ? this.destinationNode.model.nodeId : -1;

        return sourceSignature + "-" + destinationSignature;
    };

    Edge.prototype.getSimplified = function()
    {
        return {
            sourceNodeId: this.sourceNode.model != null ? this.sourceNode.model.nodeId : -1,
            destinationNodeId: this.destinationNode.model != null ? this.destinationNode.model.nodeId : -1
        };
    };

    Edge.notifyError = function(message) { alert("Edge - " + message); }
    /*************************************************************************************/
})();