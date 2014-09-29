(function()
{
/*************************************************************************************/
var SlicingCriterion;
Firecrow.N_DependencyGraph.SlicingCriterion = SlicingCriterion = function(type)
{
    this.type = type;
};

SlicingCriterion.TYPES =
{
    READ_IDENTIFIER: "READ_IDENTIFIER",
    DOM_MODIFICATION: "DOM_MODIFICATION",
    LINE_EXECUTED: "LINE_EXECUTED"
};

SlicingCriterion.createReadIdentifierCriterion = function(fileName, lineNumber, identifierName)
{
    var criterion = new SlicingCriterion(SlicingCriterion.TYPES.READ_IDENTIFIER);

    criterion.fileName = fileName;
    criterion.lineNumber = lineNumber;
    criterion.identifierName = identifierName;

    return criterion;
};

SlicingCriterion.createModifyDomCriterion = function(cssSelector)
{
    var criterion = new SlicingCriterion(SlicingCriterion.TYPES.DOM_MODIFICATION);

    criterion.cssSelector = cssSelector;

    return criterion;
};

SlicingCriterion.createLineExecutedCriterion = function(fileName, lineNumber)
{
    var criterion = new SlicingCriterion(SlicingCriterion.TYPES.LINE_EXECUTED);

    criterion.fileName = fileName;
    criterion.lineNumber = lineNumber;
};
/*************************************************************************************/
})();