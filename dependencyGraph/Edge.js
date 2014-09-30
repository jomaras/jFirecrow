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

    Edge.notifyError = function(message) { alert("Edge - " + message); }
    /*************************************************************************************/
})();