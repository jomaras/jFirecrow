(function()
{
    var ASTHelper = Firecrow.ASTHelper;

    var Identifier = Firecrow.N_Interpreter.Identifier = function(name, value, codeConstruct, globalObject)
    {
        this.id = Identifier.LAST_ID++;
        this.name = name;
        this.value = value;
        this.globalObject = globalObject;

        this.lastModificationPosition = null;

        if(codeConstruct != null)
        {
            this.declarationPosition = { codeConstruct: codeConstruct, evaluationPositionId: globalObject.getPreciseEvaluationPositionId()};

            if(ASTHelper.isObjectExpressionPropertyValue(codeConstruct))
            {
                this.lastModificationPosition = { codeConstruct: codeConstruct.value, evaluationPositionId: globalObject.getPreciseEvaluationPositionId()};
            }
            else
            {
                this.lastModificationPosition = this.declarationPosition;
            }
        }
    };

    Identifier.notifyError = function(message) { alert("Identifier - " + message); };

    Identifier.prototype =
    {
        setValue: function(newValue, modificationConstruct, keepOldValue)
        {
            if(this.writable === false) { return; }

            if(keepOldValue) { this.oldValue = this.value; }

            this.value = newValue;

            if(modificationConstruct != null)
            {
                this.lastModificationPosition = { codeConstruct: modificationConstruct, evaluationPositionId: this.globalObject.getPreciseEvaluationPositionId()};
                //this.modificationPositions.push({ codeConstruct: modificationConstruct, evaluationPositionId: this.globalObject.getPreciseEvaluationPositionId()});
            }

            if(this.declarationPosition == null) //internal property that is being overridden
            {
                this.declarationPosition = { codeConstruct: modificationConstruct, evaluationPositionId: this.globalObject.getPreciseEvaluationPositionId()};
            }
        },

        restoreOldValue: function()
        {
            if(this.oldValue)
            {
                this.value = this.oldValue;
            }
        }
    };

    Identifier.LAST_ID = 0;
    /****************************************************************************/
})();